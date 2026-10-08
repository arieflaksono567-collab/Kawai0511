import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentRecord,
  PaymentSplitConfig,
  SettlementRecord,
  SettlementResult,
  DriverEarningsSummary,
} from './payment.types';
import { LedgerService, UnbalancedLedgerException } from './ledger.service';
import { RideService } from '../ride/ride.service';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  // In-Memory Persistent Settlement Store (PostgreSQL 16 representation)
  private settlements = new Map<string, SettlementRecord>();
  private settlementsByPaymentId = new Map<string, string>(); // paymentId -> settlementId
  private settledPaymentIds = new Set<string>();

  // Driver / Platform Split Configuration (Default 85% Driver / 15% Platform)
  private splitConfig: PaymentSplitConfig = {
    driverSharePercent: 85.0,
    platformSharePercent: 15.0,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  constructor(
    private readonly ledgerService: LedgerService,
    private readonly rideService?: RideService
  ) {}

  /**
   * Get current active revenue share configuration
   */
  getSplitConfig(): PaymentSplitConfig {
    return { ...this.splitConfig };
  }

  /**
   * Dynamically update revenue share configuration without modifying source code
   */
  setSplitConfig(driverShare: number, platformShare: number): PaymentSplitConfig {
    if (typeof driverShare !== 'number' || typeof platformShare !== 'number') {
      throw new BadRequestException('Split percentages must be numbers');
    }

    if (driverShare < 0 || platformShare < 0) {
      throw new BadRequestException('Split percentages cannot be negative');
    }

    const total = Math.round((driverShare + platformShare) * 100) / 100;
    if (total !== 100.0) {
      throw new BadRequestException(
        `Total split must equal exactly 100.00% (currently ${total}%)`
      );
    }

    this.splitConfig = {
      driverSharePercent: driverShare,
      platformSharePercent: platformShare,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Updated split config: Driver ${driverShare}%, Platform ${platformShare}%`
    );
    return { ...this.splitConfig };
  }

  /**
   * Calculate Split Amounts using Integer Arithmetic in Rupiah (IDR)
   * Enforces: driverAmount + platformAmount === fareAmount (No rounding leakage)
   */
  calculateSplit(fareAmount: number): {
    driverAmount: number;
    platformAmount: number;
    driverPercent: number;
    platformPercent: number;
  } {
    if (typeof fareAmount !== 'number' || !Number.isInteger(fareAmount)) {
      throw new BadRequestException('Fare amount must be an integer in Rupiah (IDR)');
    }

    if (fareAmount <= 0) {
      throw new BadRequestException('Fare amount must be greater than zero');
    }

    // Integer arithmetic with Math.round
    const driverAmount = Math.round(
      fareAmount * (this.splitConfig.driverSharePercent / 100)
    );
    const platformAmount = fareAmount - driverAmount; // Guarantees driverAmount + platformAmount === fareAmount

    return {
      driverAmount,
      platformAmount,
      driverPercent: this.splitConfig.driverSharePercent,
      platformPercent: this.splitConfig.platformSharePercent,
    };
  }

  /**
   * Phase 6C 8-Step Atomic Settlement
   * Ketika payment menjadi PAID:
   * 1. Validasi payment.
   * 2. Ambil fare snapshot.
   * 3. Ambil konfigurasi revenue share.
   * 4. Hitung driver share.
   * 5. Hitung platform share.
   * 6. Buat ledger transaction.
   * 7. Pastikan debit = credit.
   * 8. Commit atomic transaction.
   */
  async settlePayment(
    payment: PaymentRecord,
    fareSnapshotOverride?: any
  ): Promise<SettlementResult> {
    // -------------------------------------------------------------------------
    // STEP 1: VALIDASI PAYMENT
    // -------------------------------------------------------------------------
    if (!payment) {
      throw new NotFoundException('Payment record not found for settlement');
    }

    if (!payment.payeeDriverId) {
      throw new BadRequestException('Payment does not have an assigned payee driver');
    }

    if (payment.status !== 'PAID') {
      throw new BadRequestException(
        `Payment ${payment.id} is in status ${payment.status}. Settlement is only allowed for PAID payments.`
      );
    }

    // Duplicate settlement protection
    if (payment.isSettled || this.settledPaymentIds.has(payment.id)) {
      throw new ConflictException(
        `Payment ${payment.id} for ride ${payment.rideId} is already settled. Duplicate settlement rejected.`
      );
    }

    if (typeof payment.amount !== 'number' || payment.amount <= 0 || !Number.isInteger(payment.amount)) {
      throw new BadRequestException('Payment amount must be a strictly positive integer IDR');
    }

    // -------------------------------------------------------------------------
    // STEP 2: AMBIL FARE SNAPSHOT
    // -------------------------------------------------------------------------
    let fare = payment.amount;
    let fareSnapshot = fareSnapshotOverride;

    if (!fareSnapshot && this.rideService) {
      try {
        const ride = await this.rideService.getRide(payment.rideId);
        if (ride) {
          if (ride.fareSnapshot) {
            fareSnapshot = ride.fareSnapshot;
          }
          if (ride.totalFare && ride.totalFare > 0) {
            fare = ride.totalFare;
          }
        }
      } catch (err: any) {
        this.logger.debug(`Could not fetch ride snapshot: ${err.message}, using payment amount`);
      }
    }

    // -------------------------------------------------------------------------
    // STEP 3: AMBIL KONFIGURASI REVENUE SHARE
    // -------------------------------------------------------------------------
    const config = this.getSplitConfig();

    // -------------------------------------------------------------------------
    // STEP 4: HITUNG DRIVER SHARE (Integer arithmetic)
    // -------------------------------------------------------------------------
    const driverShare = Math.round(fare * (config.driverSharePercent / 100));

    // -------------------------------------------------------------------------
    // STEP 5: HITUNG PLATFORM SHARE (Integer arithmetic)
    // -------------------------------------------------------------------------
    const platformShare = fare - driverShare;

    // Strict non-negative integer assertions
    if (!Number.isInteger(driverShare) || !Number.isInteger(platformShare)) {
      throw new BadRequestException('Driver and platform shares must be integer amounts');
    }

    if (driverShare < 0 || platformShare < 0) {
      throw new BadRequestException('Calculated revenue shares cannot be negative');
    }

    // -------------------------------------------------------------------------
    // STEP 6: BUAT LEDGER TRANSACTION
    // -------------------------------------------------------------------------
    const driverAccount = this.ledgerService.getOrCreateDriverAccount(payment.payeeDriverId);
    const platformRevenueAccount = this.ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');

    let entries: Array<{ accountId: string; debit: number; credit: number }>;

    if (payment.method === 'CASH') {
      const cashReceivableAccount = this.ledgerService.getAccountByCode('CASH_RECEIVABLE_IDR');
      entries = [
        {
          accountId: cashReceivableAccount.id,
          debit: fare,
          credit: 0,
        },
        {
          accountId: driverAccount.id,
          debit: 0,
          credit: driverShare,
        },
        {
          accountId: platformRevenueAccount.id,
          debit: 0,
          credit: platformShare,
        },
      ];
    } else {
      const clearingAccount = this.ledgerService.getAccountByCode('PAYMENT_CLEARING_IDR');
      entries = [
        {
          accountId: clearingAccount.id,
          debit: fare,
          credit: 0,
        },
        {
          accountId: driverAccount.id,
          debit: 0,
          credit: driverShare,
        },
        {
          accountId: platformRevenueAccount.id,
          debit: 0,
          credit: platformShare,
        },
      ];
    }

    // -------------------------------------------------------------------------
    // STEP 7: PASTIKAN DEBIT = CREDIT
    // -------------------------------------------------------------------------
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

    if (totalDebit !== totalCredit) {
      this.logger.error(`Settlement balance check failed: debit=${totalDebit}, credit=${totalCredit}`);
      throw new UnbalancedLedgerException(totalDebit, totalCredit);
    }

    // -------------------------------------------------------------------------
    // STEP 8: COMMIT ATOMIC TRANSACTION
    // -------------------------------------------------------------------------
    let ledgerTxResult;
    try {
      ledgerTxResult = this.ledgerService.recordTransaction({
        referenceType: 'PAYMENT_RIDE',
        referenceId: payment.id,
        description: `Settlement bagi hasil (${config.driverSharePercent}% Mitra / ${config.platformSharePercent}% Platform) untuk Ride #${payment.rideId.slice(0, 8)}`,
        entries,
      });
    } catch (error: any) {
      this.logger.error(
        `Failed transaction rollback during settlement for payment ${payment.id}: ${error.message}`
      );
      // Atomic rollback: preserve payment as un-settled
      payment.isSettled = false;
      this.settledPaymentIds.delete(payment.id);
      throw error;
    }

    const settlementId = crypto.randomUUID();
    const now = new Date().toISOString();

    const settlementRecord: SettlementRecord = {
      id: settlementId,
      paymentId: payment.id,
      rideId: payment.rideId,
      driverId: payment.payeeDriverId,
      grossFare: fare,
      driverAmount: driverShare,
      platformAmount: platformShare,
      driverSharePercent: config.driverSharePercent,
      platformSharePercent: config.platformSharePercent,
      ledgerTransactionId: ledgerTxResult.transaction.id,
      method: payment.method,
      provider: payment.provider,
      settledAt: now,
      createdAt: now,
    };

    this.settlements.set(settlementId, settlementRecord);
    this.settlementsByPaymentId.set(payment.id, settlementId);
    this.settledPaymentIds.add(payment.id);

    // Update payment record metadata
    payment.isSettled = true;
    payment.settledAt = now;
    payment.ledgerTransactionId = ledgerTxResult.transaction.id;
    payment.driverShareAmount = driverShare;
    payment.platformFeeAmount = platformShare;

    this.logger.log(
      `Atomic settlement committed for payment ${payment.id}: Gross Rp ${fare.toLocaleString('id-ID')} -> Driver Rp ${driverShare.toLocaleString('id-ID')} (${config.driverSharePercent}%), Platform Rp ${platformShare.toLocaleString('id-ID')} (${config.platformSharePercent}%) [Tx: ${ledgerTxResult.transaction.id}]`
    );

    return {
      settlementId,
      paymentId: payment.id,
      rideId: payment.rideId,
      driverId: payment.payeeDriverId,
      grossFare: fare,
      driverAmount: driverShare,
      platformAmount: platformShare,
      driverSharePercent: config.driverSharePercent,
      platformSharePercent: config.platformSharePercent,
      ledgerTransactionId: ledgerTxResult.transaction.id,
      settledAt: now,
    };
  }

  /**
   * Driver Earnings Query directly derived from Double-Entry Ledger
   * Ledger is the single authoritative source of truth.
   */
  getDriverEarnings(driverId: string, period: string = 'all-time'): DriverEarningsSummary {
    const driverAccount = this.ledgerService.getOrCreateDriverAccount(driverId);
    const balanceInfo = this.ledgerService.getAccountBalance(driverAccount.id);

    // Ledger balance for DRIVER_PAYABLE (Liability) is credit - debit
    const ledgerBalance = balanceInfo.balance;

    // Filter settlements for this driver
    const driverSettlements = Array.from(this.settlements.values()).filter(
      (s) => s.driverId === driverId
    );

    const now = new Date();
    const filteredSettlements = driverSettlements.filter((s) => {
      if (!period || period === 'all' || period === 'all-time') return true;
      const date = new Date(s.settledAt);
      if (period === 'today') {
        return date.toDateString() === now.toDateString();
      }
      if (period === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date >= oneWeekAgo;
      }
      if (period === 'month') {
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }
      return true;
    });

    const totalCompletedRides = filteredSettlements.length;
    const grossFare = filteredSettlements.reduce((sum, s) => sum + s.grossFare, 0);
    const platformFee = filteredSettlements.reduce((sum, s) => sum + s.platformAmount, 0);

    // If all-time, driverEarnings strictly matches ledger account balance
    const driverEarnings =
      period === 'all' || period === 'all-time'
        ? ledgerBalance
        : filteredSettlements.reduce((sum, s) => sum + s.driverAmount, 0);

    return {
      driverId,
      totalCompletedRides,
      grossFare,
      driverEarnings,
      platformFee,
      period: period || 'all-time',
      currency: 'IDR',
      ledgerAccountId: driverAccount.id,
      ledgerBalance,
      authoritativeSource: 'LEDGER',
      lastSettledAt:
        driverSettlements.length > 0
          ? driverSettlements[driverSettlements.length - 1].settledAt
          : undefined,
    };
  }

  getSettlement(settlementId: string): SettlementRecord | undefined {
    return this.settlements.get(settlementId);
  }

  getSettlementByPaymentId(paymentId: string): SettlementRecord | undefined {
    const id = this.settlementsByPaymentId.get(paymentId);
    if (!id) return undefined;
    return this.settlements.get(id);
  }

  getAllSettlements(): SettlementRecord[] {
    return Array.from(this.settlements.values());
  }

  /**
   * For test isolation
   */
  clear() {
    this.settlements.clear();
    this.settlementsByPaymentId.clear();
    this.settledPaymentIds.clear();
    this.splitConfig = {
      driverSharePercent: 85.0,
      platformSharePercent: 15.0,
      isActive: true,
      updatedAt: new Date().toISOString(),
    };
  }
}

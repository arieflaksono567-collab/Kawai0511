import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DriverEarningsLedgerRepository } from './driver-earnings-ledger.repository';
import {
  DriverEarningsLedgerRecord,
  DriverEarningsDashboardResponse,
  DriverEarningsMultiPeriodSummary,
} from './driver-earnings-ledger.types';
import { LedgerService } from './ledger.service';
import { SettlementService } from './settlement.service';
import { RideService } from '../ride/ride.service';
import { PaymentRecord } from './payment.types';

@Injectable()
export class DriverEarningsService {
  private readonly logger = new Logger(DriverEarningsService.name);

  constructor(
    private readonly earningsRepo: DriverEarningsLedgerRepository,
    private readonly ledgerService: LedgerService,
    private readonly settlementService: SettlementService,
    private readonly rideService?: RideService
  ) {}

  /**
   * Catat pendapatan driver dari perjalanan yang telah selesai (COMPLETED)
   * PRINSIP: Database ledger adalah sumber kebenaran pendapatan.
   * RULES:
   * 1. Ride yang belum COMPLETED tidak boleh menjadi earning final.
   * 2. Satu ride tidak boleh menghasilkan earning ledger ganda.
   * 3. Gunakan numeric/decimal presisi untuk uang (net + fee === gross).
   */
  async recordEarningsFromRide(
    rideId: string,
    options?: {
      paymentId?: string;
      actorUser?: { id: string; role: string; driverId?: string };
      skipAuth?: boolean;
    }
  ): Promise<DriverEarningsLedgerRecord> {
    if (!rideId) {
      throw new BadRequestException('ID perjalanan (rideId) wajib disertakan');
    }

    if (!this.rideService) {
      throw new BadRequestException('RideService tidak tersedia');
    }

    const ride = await this.rideService.getRide(rideId);
    if (!ride) {
      throw new NotFoundException(`Perjalanan dengan ID ${rideId} tidak ditemukan`);
    }

    // RULE 1: Ride yang belum COMPLETED tidak boleh menjadi earning final!
    if (ride.status === 'CANCELLED') {
      throw new BadRequestException(
        'Perjalanan yang dibatalkan (CANCELLED) tidak dapat dicatat sebagai pendapatan final mitra driver'
      );
    }

    if (ride.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Perjalanan masih berstatus ${ride.status}. Hanya perjalanan berstatus COMPLETED yang diizinkan dicatat ke buku besar pendapatan.`
      );
    }

    if (!ride.driverId) {
      throw new BadRequestException('Perjalanan ini tidak memiliki mitra driver yang bertugas');
    }

    // RULE 6: Driver Authorization check
    if (options?.actorUser && !options.skipAuth) {
      this.enforceDriverOrAdmin(ride.driverId, options.actorUser);
    }

    // RULE 2: Satu ride tidak boleh menghasilkan earning ledger ganda
    const existing = await this.earningsRepo.findByRideId(ride.id);
    if (existing) {
      throw new ConflictException(
        `Pendapatan driver untuk perjalanan ${ride.id} sudah pernah dicatat di buku besar`
      );
    }

    // Ambil gross fare dari ride atau snapshot fare
    const grossFare = Math.round(ride.totalFare || ride.fareSnapshot?.totalFare || 0);
    if (grossFare <= 0) {
      throw new BadRequestException('Total tarif perjalanan harus lebih besar dari 0 Rupiah');
    }

    // Hitung pembagian bagi hasil (Default 85% Driver / 15% Platform)
    const split = this.settlementService.calculateSplit(grossFare);
    const platformFee = split.platformAmount;
    const netAmount = split.driverAmount;

    // Catat ke Double-Entry Accounting Ledger
    let ledgerTxId: string | undefined;
    try {
      const driverAccount = this.ledgerService.getOrCreateDriverAccount(ride.driverId);
      const platformRevenueAccount = this.ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');
      const cashReceivableAccount = this.ledgerService.getAccountByCode('CASH_RECEIVABLE_IDR');

      const txResult = this.ledgerService.recordTransaction({
        referenceType: 'PAYMENT_RIDE',
        referenceId: options?.paymentId || ride.id,
        description: `Bagi hasil Driver untuk Ride #${ride.id.slice(0, 8)}: Net Rp ${netAmount.toLocaleString('id-ID')} / Fee Rp ${platformFee.toLocaleString('id-ID')}`,
        entries: [
          { accountId: cashReceivableAccount.id, debit: grossFare, credit: 0 },
          { accountId: driverAccount.id, debit: 0, credit: netAmount },
          { accountId: platformRevenueAccount.id, debit: 0, credit: platformFee },
        ],
      });
      ledgerTxId = txResult.transaction.id;
    } catch (err: any) {
      this.logger.debug(`Ledger double-entry note: ${err.message}`);
    }

    const periodDate = (ride.completedAt || new Date().toISOString()).slice(0, 10);

    const record = await this.earningsRepo.recordEarnings({
      driverId: ride.driverId,
      rideId: ride.id,
      paymentId: options?.paymentId,
      grossAmount: grossFare,
      platformFee,
      netAmount,
      currency: 'IDR',
      status: 'SETTLED',
      ledgerTransactionId: ledgerTxId,
      periodDate,
    });

    this.logger.log(
      `Pendapatan dicatat untuk driver ${ride.driverId} (Ride ${ride.id}): Gross Rp ${grossFare.toLocaleString('id-ID')} -> Net Rp ${netAmount.toLocaleString('id-ID')}, Fee Rp ${platformFee.toLocaleString('id-ID')}`
    );

    return record;
  }

  /**
   * Catat pendapatan driver dari event payment settlement (misal webhook atau pembayaran tunai)
   * RULE 3: Payment callback tidak boleh membuat earning ganda (idempotency key protection).
   */
  async recordEarningsFromPayment(
    payment: PaymentRecord,
    settlement?: {
      driverAmount: number;
      platformAmount: number;
      ledgerTransactionId?: string;
    }
  ): Promise<DriverEarningsLedgerRecord> {
    if (!payment.payeeDriverId) {
      throw new BadRequestException('Payment does not have an assigned payee driver');
    }

    // RULE 3 & RULE 4: Idempotency check — jika callback dikirim berulang kali
    const existing = await this.earningsRepo.findByRideId(payment.rideId);
    if (existing) {
      this.logger.log(
        `Payment callback retry untuk ride ${payment.rideId}: pendapatan sudah ada di ledger (ID: ${existing.id}), mengembalikan entri yang ada (idempotent)`
      );
      return existing;
    }

    // Pastikan ride tidak dalam status CANCELLED jika rideService tersedia
    if (this.rideService) {
      try {
        const ride = await this.rideService.getRide(payment.rideId);
        if (ride && ride.status === 'CANCELLED') {
          throw new BadRequestException(
            'Payment settlement ditolak: perjalanan dalam status CANCELLED'
          );
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
      }
    }

    const grossAmount = Math.round(payment.amount);
    let platformFee: number;
    let netAmount: number;

    if (settlement) {
      platformFee = Math.round(settlement.platformAmount);
      netAmount = Math.round(settlement.driverAmount);
    } else {
      const split = this.settlementService.calculateSplit(grossAmount);
      platformFee = split.platformAmount;
      netAmount = split.driverAmount;
    }

    const periodDate = (payment.paidAt || payment.settledAt || new Date().toISOString()).slice(0, 10);

    return await this.earningsRepo.recordEarnings({
      driverId: payment.payeeDriverId,
      rideId: payment.rideId,
      paymentId: payment.id,
      grossAmount,
      platformFee,
      netAmount,
      currency: 'IDR',
      status: 'SETTLED',
      ledgerTransactionId: settlement?.ledgerTransactionId || payment.ledgerTransactionId,
      periodDate,
    });
  }

  /**
   * Dashboard & Query pendapatan driver:
   * Mendukung filter:
   * - hari ini ('today' / 'hari ini')
   - minggu ini ('week' / 'minggu ini')
   - bulan ini ('month' / 'bulan ini')
   - semua ('all-time' / 'semua')
   * Dan mengembalikan metrik: totalTrips, totalGross, totalFee, totalNet
   */
  async getDriverEarningsDashboard(
    driverId: string,
    filter?: { period?: string; limit?: number; offset?: number },
    currentUser?: { id: string; role: string; driverId?: string }
  ): Promise<DriverEarningsDashboardResponse> {
    if (currentUser) {
      this.enforceDriverOrAdmin(driverId, currentUser);
    }

    const period = filter?.period || 'all-time';

    const result = await this.earningsRepo.queryDriverEarnings(
      {
        driverId,
        period,
        limit: filter?.limit,
        offset: filter?.offset,
      },
      currentUser
    );

    const driverAccount = this.ledgerService.getOrCreateDriverAccount(driverId);
    const balanceInfo = this.ledgerService.getAccountBalance(driverAccount.id);

    return {
      driverId,
      period,
      totalTrips: result.count,
      totalGross: result.totalGross,
      totalFee: result.totalPlatformFee,
      totalNet: result.totalNet,
      totalTips: result.totalTips,
      currency: 'IDR',
      authoritativeSource: 'LEDGER',
      ledgerAccountId: driverAccount.id,
      ledgerBalance: balanceInfo.balance,
      items: result.items,
    };
  }

  /**
   * Ringkasan multi-periode untuk dashboard driver:
   * Mengembalikan perbandingan Hari Ini, Minggu Ini, Bulan Ini, dan All-Time
   */
  async getDriverEarningsMultiPeriodSummary(
    driverId: string,
    currentUser?: { id: string; role: string; driverId?: string }
  ): Promise<DriverEarningsMultiPeriodSummary> {
    if (currentUser) {
      this.enforceDriverOrAdmin(driverId, currentUser);
    }

    const [todayRes, weekRes, monthRes, allRes] = await Promise.all([
      this.earningsRepo.queryDriverEarnings({ driverId, period: 'today' }),
      this.earningsRepo.queryDriverEarnings({ driverId, period: 'week' }),
      this.earningsRepo.queryDriverEarnings({ driverId, period: 'month' }),
      this.earningsRepo.queryDriverEarnings({ driverId, period: 'all-time' }),
    ]);

    const driverAccount = this.ledgerService.getOrCreateDriverAccount(driverId);
    const balanceInfo = this.ledgerService.getAccountBalance(driverAccount.id);

    return {
      driverId,
      today: {
        totalTrips: todayRes.count,
        totalGross: todayRes.totalGross,
        totalFee: todayRes.totalPlatformFee,
        totalNet: todayRes.totalNet,
        totalTips: todayRes.totalTips,
      },
      thisWeek: {
        totalTrips: weekRes.count,
        totalGross: weekRes.totalGross,
        totalFee: weekRes.totalPlatformFee,
        totalNet: weekRes.totalNet,
        totalTips: weekRes.totalTips,
      },
      thisMonth: {
        totalTrips: monthRes.count,
        totalGross: monthRes.totalGross,
        totalFee: monthRes.totalPlatformFee,
        totalNet: monthRes.totalNet,
        totalTips: monthRes.totalTips,
      },
      allTime: {
        totalTrips: allRes.count,
        totalGross: allRes.totalGross,
        totalFee: allRes.totalPlatformFee,
        totalNet: allRes.totalNet,
        totalTips: allRes.totalTips,
        ledgerBalance: balanceInfo.balance,
      },
      currency: 'IDR',
      authoritativeSource: 'LEDGER',
    };
  }

  /**
   * Ambil rincian pendapatan untuk perjalanan tertentu
   */
  async getEarningsByRideId(
    rideId: string,
    currentUser?: { id: string; role: string; driverId?: string }
  ): Promise<DriverEarningsLedgerRecord | null> {
    const record = await this.earningsRepo.findByRideId(rideId);
    if (!record) return null;

    if (currentUser) {
      this.enforceDriverOrAdmin(record.driverId, currentUser);
    }

    return record;
  }

  /**
   * RULE 6: Enforce driver authorization based on authenticated identity
   */
  private enforceDriverOrAdmin(
    targetDriverId: string,
    user: { id: string; role: string; driverId?: string }
  ) {
    if (user.role === 'ADMIN') return;

    const isAuthorized =
      user.role === 'DRIVER' &&
      (user.driverId === targetDriverId || user.id === targetDriverId);

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Akses ditolak: Anda tidak memiliki akses untuk melihat atau mengelola pendapatan pengemudi ini'
      );
    }
  }
}

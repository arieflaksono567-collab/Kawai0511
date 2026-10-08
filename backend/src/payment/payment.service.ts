import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  PaymentRecord,
  PaymentSplitConfig,
  CreatePaymentDto,
  PaymentMethod,
  SettlementResult,
  DriverEarningsSummary,
} from './payment.types';
import { LedgerService } from './ledger.service';
import { SettlementService } from './settlement.service';
import {
  PaymentProvider,
  CashPaymentProvider,
  MockDigitalPaymentProvider,
} from './payment-provider.interface';
import { RideService } from '../ride/ride.service';
import { Role } from '../auth/roles.enum';

export interface UserContext {
  id: string;
  role: Role | string;
  phoneNumber?: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  // In-Memory Persistent Store (PostgreSQL 16 representation)
  private payments = new Map<string, PaymentRecord>();
  private paymentsByRideId = new Map<string, string>(); // rideId -> paymentId
  private paymentsByIdempotency = new Map<string, string>(); // idempotencyKey -> paymentId
  private paymentsByProviderPaymentId = new Map<string, string>(); // providerPaymentId -> paymentId

  // Provider Abstraction Registry
  private providers = new Map<string, PaymentProvider>();
  private defaultDigitalProvider: PaymentProvider;
  private defaultCashProvider: PaymentProvider;

  // Webhook security: duplicate event protection & replay cache
  private processedWebhookEvents = new Set<string>();

  // Mutex locks for race-condition prevention per payment ID
  private mutexLocks = new Map<string, Promise<void>>();

  // Phase 6C Settlement Engine
  private readonly settlementService: SettlementService;

  constructor(
    private readonly ledgerService: LedgerService,
    private readonly rideService?: RideService,
    customProvider?: PaymentProvider,
    settlementService?: SettlementService
  ) {
    this.settlementService =
      settlementService || new SettlementService(this.ledgerService, this.rideService);

    this.defaultCashProvider = new CashPaymentProvider();
    this.defaultDigitalProvider =
      customProvider || new MockDigitalPaymentProvider();

    this.registerProvider(this.defaultCashProvider);
    this.registerProvider(this.defaultDigitalProvider);
  }

  registerProvider(provider: PaymentProvider) {
    this.providers.set(provider.providerName, provider);
  }

  getProvider(providerName: string): PaymentProvider | undefined {
    return this.providers.get(providerName);
  }

  setPaymentProvider(provider: PaymentProvider) {
    this.defaultDigitalProvider = provider;
    this.registerProvider(provider);
  }

  getSplitConfig(): PaymentSplitConfig {
    return this.settlementService.getSplitConfig();
  }

  setSplitConfig(driverShare: number, platformShare: number): PaymentSplitConfig {
    return this.settlementService.setSplitConfig(driverShare, platformShare);
  }

  /**
   * Simple Key-based Mutex to serialize concurrent updates for a specific resource
   */
  private async withLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
    while (this.mutexLocks.has(key)) {
      await this.mutexLocks.get(key);
    }

    let resolveNext!: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveNext = resolve;
    });
    this.mutexLocks.set(key, lockPromise);

    try {
      return await operation();
    } finally {
      this.mutexLocks.delete(key);
      resolveNext();
    }
  }

  /**
   * Calculate Split Amounts in Integer IDR Rupiah
   */
  calculateSplit(amount: number): {
    driverAmount: number;
    platformAmount: number;
    driverPercent: number;
    platformPercent: number;
  } {
    return this.settlementService.calculateSplit(amount);
  }

  /**
   * Create & Settle Payment for a Ride
   * Idempotent, Atomic, Double-Entry Balanced, Provider-Independent
   */
  async createPayment(dto: CreatePaymentDto): Promise<{
    payment: PaymentRecord;
    ledgerTransactionId?: string;
    split: { driverAmount: number; platformAmount: number };
  }> {
    // 1. AMOUNT VALIDATIONS (Integer IDR, strictly positive)
    if (dto.amount === undefined || dto.amount === null || typeof dto.amount !== 'number') {
      throw new BadRequestException('Payment amount is required and must be numeric');
    }

    if (!Number.isInteger(dto.amount)) {
      throw new BadRequestException('IDR payment amount must be an integer (Rupiah tidak boleh pecahan)');
    }

    if (dto.amount === 0) {
      throw new BadRequestException('Payment amount must be greater than zero (zero amount rejected)');
    }

    if (dto.amount < 0) {
      throw new BadRequestException('Payment amount cannot be negative (negative amount rejected)');
    }

    if (dto.currency && dto.currency !== 'IDR') {
      throw new BadRequestException(`Currency must be IDR (received ${dto.currency})`);
    }

    if (!['CASH', 'DIGITAL'].includes(dto.method)) {
      throw new BadRequestException(`Invalid payment method: ${dto.method}. Must be CASH or DIGITAL`);
    }

    if (!dto.idempotencyKey || dto.idempotencyKey.trim().length === 0) {
      throw new BadRequestException('idempotencyKey is required for payment processing');
    }

    // 2. IDEMPOTENCY CHECK
    const existingPaymentIdByRef = this.paymentsByIdempotency.get(dto.idempotencyKey);
    if (existingPaymentIdByRef) {
      const existingPayment = this.payments.get(existingPaymentIdByRef);
      if (existingPayment) {
        if (
          existingPayment.rideId === dto.rideId &&
          existingPayment.amount === dto.amount
        ) {
          // Idempotent duplicate request: return existing payment without duplicating ledger
          this.logger.log(
            `Idempotent payment hit for key ${dto.idempotencyKey}, returning payment ${existingPayment.id}`
          );
          const split = this.calculateSplit(existingPayment.amount);
          return {
            payment: existingPayment,
            ledgerTransactionId: `existing-ledger-${existingPayment.id}`,
            split: {
              driverAmount: split.driverAmount,
              platformAmount: split.platformAmount,
            },
          };
        } else {
          throw new ConflictException(
            `Idempotency key ${dto.idempotencyKey} already used with different parameters`
          );
        }
      }
    }

    // 3. INTEGRITY: 1 RIDE = 1 PAYMENT RECORD (Double payment rejected)
    const existingPaymentForRide = this.paymentsByRideId.get(dto.rideId);
    if (existingPaymentForRide) {
      throw new ConflictException(
        `Payment for ride ${dto.rideId} already exists. Duplicate payment rejected.`
      );
    }

    // 4. RIDE ELIGIBILITY VERIFICATION (Only COMPLETED rides can be paid)
    if (this.rideService) {
      const ride = await this.rideService.getRide(dto.rideId);
      if (!ride) {
        throw new NotFoundException(`Ride order ${dto.rideId} not found`);
      }

      if (ride.status !== 'COMPLETED') {
        throw new BadRequestException(
          `Ride ${dto.rideId} is in status ${ride.status}. Incomplete ride rejected: payment is only allowed for COMPLETED rides.`
        );
      }
    }

    // 5. CALCULATE 85/15 SPLIT
    const split = this.calculateSplit(dto.amount);
    const now = new Date().toISOString();
    const paymentId = crypto.randomUUID();

    // 6. PROCESS VIA APPROPRIATE PROVIDER ABSTRACTION
    let providerName: string;
    let providerPaymentId: string | undefined;
    let paymentStatus: PaymentRecord['status'] = 'PENDING';
    let paidAt: string | undefined;
    let actionUrl: string | undefined;
    let ledgerTxId: string | undefined;

    if (dto.method === 'CASH') {
      // CASH payment (Cash collected offline by driver upon ride completion)
      providerName = 'CASH';
      const cashProvider = this.defaultCashProvider;
      const res = await cashProvider.createPayment({
        paymentId,
        amount: dto.amount,
        currency: 'IDR',
        idempotencyKey: dto.idempotencyKey,
        metadata: {
          rideId: dto.rideId,
          payerId: dto.payerId,
          driverId: dto.payeeDriverId,
        },
      });

      providerPaymentId = res.providerPaymentId;
      paymentStatus = 'PAID';
      paidAt = res.paidAt || now;
    } else {
      // DIGITAL payment (MockDigitalPaymentProvider or specified provider)
      providerName = dto.provider || this.defaultDigitalProvider.providerName;
      const digitalProvider =
        this.providers.get(providerName) || this.defaultDigitalProvider;

      try {
        const providerRes = await digitalProvider.createPayment({
          paymentId,
          amount: dto.amount,
          currency: 'IDR',
          idempotencyKey: dto.idempotencyKey,
          metadata: {
            rideId: dto.rideId,
            payerId: dto.payerId,
            driverId: dto.payeeDriverId,
          },
        });

        providerPaymentId = providerRes.providerPaymentId;
        paymentStatus = providerRes.status;
        actionUrl = providerRes.actionUrl;
        if (paymentStatus === 'PAID') {
          paidAt = providerRes.paidAt || now;
        } else {
          paidAt = undefined;
        }
      } catch (err: any) {
        this.logger.error(`Provider payment error: ${err.message}`);
        paymentStatus = 'FAILED';
        paidAt = undefined;
      }

      if (paymentStatus === 'FAILED') {
        throw new BadRequestException('Payment processing failed at provider');
      }
    }

    // 7. PERSIST PAYMENT RECORD
    const paymentRecord: PaymentRecord = {
      id: paymentId,
      rideId: dto.rideId,
      payerId: dto.payerId,
      payeeDriverId: dto.payeeDriverId,
      amount: dto.amount,
      currency: 'IDR',
      method: dto.method,
      status: paymentStatus,
      provider: providerName,
      providerPaymentId,
      idempotencyKey: dto.idempotencyKey,
      actionUrl,
      paidAt,
      isSettled: false,
      createdAt: now,
      updatedAt: now,
    };

    // If payment is PAID (e.g. CASH or instant digital provider), run atomic Phase 6C settlement
    if (paymentStatus === 'PAID') {
      const settlement = await this.settlePaymentRecord(paymentRecord);
      ledgerTxId = settlement.ledgerTransactionId;
    }

    this.payments.set(paymentId, paymentRecord);
    this.paymentsByRideId.set(dto.rideId, paymentId);
    this.paymentsByIdempotency.set(dto.idempotencyKey, paymentId);
    if (providerPaymentId) {
      this.paymentsByProviderPaymentId.set(providerPaymentId, paymentId);
    }

    this.logger.log(
      `Payment ${paymentId} created with status ${paymentStatus}: Rp ${dto.amount.toLocaleString(
        'id-ID'
      )} (${dto.method}) -> Driver Rp ${split.driverAmount.toLocaleString(
        'id-ID'
      )} (${split.driverPercent}%), Platform Rp ${split.platformAmount.toLocaleString(
        'id-ID'
      )} (${split.platformPercent}%)`
    );

    return {
      payment: paymentRecord,
      ledgerTransactionId: ledgerTxId,
      split: {
        driverAmount: split.driverAmount,
        platformAmount: split.platformAmount,
      },
    };
  }

  /**
   * Internal helper: Record Cash Double-Entry Ledger
   */
  private recordCashSettlementLedger(
    paymentId: string,
    rideId: string,
    driverId: string,
    amount: number,
    split: { driverAmount: number; platformAmount: number }
  ): string {
    const driverAccount = this.ledgerService.getOrCreateDriverAccount(driverId);
    const platformRevenueAccount = this.ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');
    const cashReceivableAccount = this.ledgerService.getAccountByCode('CASH_RECEIVABLE_IDR');

    const entries = [
      {
        accountId: cashReceivableAccount.id,
        debit: amount,
        credit: 0,
      },
      {
        accountId: driverAccount.id,
        debit: 0,
        credit: split.driverAmount,
      },
      {
        accountId: platformRevenueAccount.id,
        debit: 0,
        credit: split.platformAmount,
      },
    ];

    const tx = this.ledgerService.recordTransaction({
      referenceType: 'PAYMENT_RIDE',
      referenceId: paymentId,
      description: `Pembayaran Tunai Ride #${rideId.slice(0, 8)} diterima Driver`,
      entries,
    });

    return tx.transaction.id;
  }

  /**
   * Internal helper: Record Digital Double-Entry Ledger
   */
  private recordDigitalSettlementLedger(
    paymentId: string,
    rideId: string,
    driverId: string,
    amount: number,
    split: { driverAmount: number; platformAmount: number },
    providerName: string
  ): string {
    const driverAccount = this.ledgerService.getOrCreateDriverAccount(driverId);
    const platformRevenueAccount = this.ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');
    const clearingAccount = this.ledgerService.getAccountByCode('PAYMENT_CLEARING_IDR');

    const entries = [
      {
        accountId: clearingAccount.id,
        debit: amount,
        credit: 0,
      },
      {
        accountId: driverAccount.id,
        debit: 0,
        credit: split.driverAmount,
      },
      {
        accountId: platformRevenueAccount.id,
        debit: 0,
        credit: split.platformAmount,
      },
    ];

    const tx = this.ledgerService.recordTransaction({
      referenceType: 'PAYMENT_RIDE',
      referenceId: paymentId,
      description: `Pembayaran Digital Ride #${rideId.slice(0, 8)} via ${providerName}`,
      entries,
    });

    return tx.transaction.id;
  }

  /**
   * Handle Inbound Webhook / Callback from Payment Provider
   * Includes Signature Verification, Replay Protection, Idempotency, Duplicate Event Protection
   */
  async handleWebhook(
    providerName: string,
    headers: Record<string, any>,
    payload: any
  ): Promise<{
    verified: boolean;
    duplicate?: boolean;
    status: string;
    payment?: PaymentRecord;
    message?: string;
  }> {
    const provider = this.providers.get(providerName) || this.defaultDigitalProvider;
    if (!provider) {
      throw new BadRequestException(`Unknown payment provider: ${providerName}`);
    }

    // 1. SIGNATURE & TIMESTAMP VERIFICATION VIA PROVIDER ABSTRACTION
    const verifyResult = await provider.verifyWebhook(headers, payload);
    if (!verifyResult.verified) {
      throw new UnauthorizedException(
        `Webhook verification failed: ${verifyResult.failedReason || 'Invalid signature or expired timestamp'}`
      );
    }

    // 2. REPLAY & DUPLICATE EVENT PROTECTION
    const eventId =
      verifyResult.eventId ||
      headers['x-webhook-event-id'] ||
      `${providerName}:${verifyResult.providerPaymentId}:${verifyResult.status}`;

    if (eventId && this.processedWebhookEvents.has(eventId)) {
      this.logger.warn(`Duplicate webhook event ignored: ${eventId}`);
      const paymentId =
        verifyResult.providerPaymentId ?
        this.paymentsByProviderPaymentId.get(verifyResult.providerPaymentId) : undefined;
      const existingPayment = paymentId ? this.payments.get(paymentId) : undefined;

      return {
        verified: true,
        duplicate: true,
        status: existingPayment?.status || 'ALREADY_PROCESSED',
        payment: existingPayment,
        message: 'Webhook event already processed (idempotent)',
      };
    }

    // 3. LOCATE PAYMENT RECORD
    const providerPaymentId = verifyResult.providerPaymentId;
    if (!providerPaymentId) {
      throw new BadRequestException('Webhook payload missing providerPaymentId');
    }

    let paymentId = this.paymentsByProviderPaymentId.get(providerPaymentId);
    if (!paymentId) {
      // Fallback search by ID or payload.paymentId
      if (payload.paymentId && this.payments.has(payload.paymentId)) {
        paymentId = payload.paymentId;
      } else {
        throw new NotFoundException(
          `Payment record not found for providerPaymentId ${providerPaymentId}`
        );
      }
    }

    // 4. ATOMIC STATE MUTEX LOCK PER PAYMENT ID
    return await this.withLock(paymentId!, async () => {
      const payment = this.payments.get(paymentId!)!;
      const now = new Date().toISOString();

      // Check current payment status
      if (payment.status === 'CANCELLED') {
        throw new ConflictException(
          `Payment ${paymentId} has already been CANCELLED. Cannot transition to ${verifyResult.status}`
        );
      }

      if (payment.status === 'PAID') {
        // Already paid (e.g. duplicate webhook arrival before eventId check)
        this.processedWebhookEvents.add(eventId);
        return {
          verified: true,
          duplicate: true,
          status: 'PAID',
          payment,
          message: 'Payment already marked PAID',
        };
      }

      if (payment.status === 'REFUNDED') {
        throw new ConflictException(
          `Payment ${paymentId} has already been REFUNDED`
        );
      }

      // 5. PROCESS NEW STATUS
      if (verifyResult.status === 'PAID') {
        payment.status = 'PAID';
        payment.paidAt = verifyResult.paidAt || now;
        payment.updatedAt = now;

        // Atomic Phase 6C settlement
        await this.settlePaymentRecord(payment);
      } else if (verifyResult.status === 'FAILED') {
        payment.status = 'FAILED';
        payment.failedAt = now;
        payment.updatedAt = now;
      }

      this.payments.set(payment.id, payment);
      this.processedWebhookEvents.add(eventId);

      this.logger.log(
        `Webhook successfully processed for payment ${payment.id}: status changed to ${payment.status}`
      );

      return {
        verified: true,
        duplicate: false,
        status: payment.status,
        payment,
      };
    });
  }

  /**
   * Cancel a PENDING payment
   */
  async cancelPayment(
    paymentId: string,
    reason?: string,
    user?: UserContext
  ): Promise<PaymentRecord> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    this.assertUserCanAccessPayment(payment, user);

    return await this.withLock(paymentId, async () => {
      if (payment.status === 'PAID') {
        throw new ConflictException(
          'Cannot cancel payment that has already been PAID'
        );
      }

      if (payment.status === 'REFUNDED') {
        throw new ConflictException(
          'Cannot cancel payment that has already been REFUNDED'
        );
      }

      if (payment.status === 'CANCELLED') {
        return payment; // Idempotent cancel
      }

      const now = new Date().toISOString();
      payment.status = 'CANCELLED';
      payment.cancelledAt = now;
      payment.updatedAt = now;

      this.payments.set(paymentId, payment);
      this.logger.log(
        `Payment ${paymentId} CANCELLED. Reason: ${reason || 'User cancelled'}`
      );
      return payment;
    });
  }

  /**
   * Refund a PAID payment
   */
  async refundPayment(
    paymentId: string,
    amount?: number,
    reason?: string,
    user?: UserContext
  ): Promise<{ payment: PaymentRecord; refundId: string }> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }

    if (user && user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Hanya ADMIN yang memiliki hak akses untuk memproses refund pembayaran'
      );
    }

    return await this.withLock(paymentId, async () => {
      if (payment.status === 'REFUNDED') {
        throw new ConflictException('Payment has already been refunded');
      }

      if (payment.status !== 'PAID') {
        throw new BadRequestException('Only PAID payments can be refunded');
      }

      const refundAmount = amount || payment.amount;
      if (refundAmount !== payment.amount) {
        throw new BadRequestException('Partial refund is not currently supported (must be full amount)');
      }

      const provider =
        this.providers.get(payment.provider) ||
        (payment.method === 'CASH' ? this.defaultCashProvider : this.defaultDigitalProvider);

      const refundRes = await provider.refundPayment(
        payment.providerPaymentId || payment.id,
        refundAmount,
        reason
      );

      // Record Double-Entry Reversal Ledger
      const split = this.calculateSplit(payment.amount);
      const driverAccount = this.ledgerService.getOrCreateDriverAccount(payment.payeeDriverId);
      const platformRevenueAccount = this.ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');
      const refundPayableAccount = this.ledgerService.getAccountByCode('REFUND_PAYABLE_IDR');

      const entries = [
        {
          accountId: driverAccount.id,
          debit: split.driverAmount,
          credit: 0,
        },
        {
          accountId: platformRevenueAccount.id,
          debit: split.platformAmount,
          credit: 0,
        },
        {
          accountId: refundPayableAccount.id,
          debit: 0,
          credit: refundAmount,
        },
      ];

      this.ledgerService.recordTransaction({
        referenceType: 'REFUND_PAYMENT',
        referenceId: refundRes.refundId,
        description: `Pengembalian Dana Pembayaran Ride #${payment.rideId.slice(0, 8)} (${reason || 'Refund'})`,
        entries,
      });

      const now = new Date().toISOString();
      payment.status = 'REFUNDED';
      payment.refundedAt = now;
      payment.refundId = refundRes.refundId;
      payment.updatedAt = now;

      this.payments.set(paymentId, payment);
      this.logger.log(
        `Payment ${paymentId} REFUNDED with refund ID ${refundRes.refundId}`
      );

      return { payment, refundId: refundRes.refundId };
    });
  }

  /**
   * Authorization check:
   * - Passenger only sees own payment (payment.payerId === user.id)
   * - Driver only sees payment associated with their ride (payment.payeeDriverId === user.id)
   * - Admin sees all
   */
  assertUserCanAccessPayment(payment: PaymentRecord, user?: UserContext) {
    if (!user) return; // Unauthenticated / internal testing context

    if (user.role === Role.ADMIN) {
      return; // Admin has full access
    }

    if (user.id === payment.payerId) {
      return; // Passenger owner
    }

    if (user.id === payment.payeeDriverId) {
      return; // Assigned driver
    }

    throw new ForbiddenException(
      'Akses ditolak: Anda tidak memiliki wewenang untuk mengakses data pembayaran ini'
    );
  }

  getPaymentById(id: string, user?: UserContext): PaymentRecord | undefined {
    const payment = this.payments.get(id);
    if (!payment) return undefined;
    this.assertUserCanAccessPayment(payment, user);
    return payment;
  }

  getPaymentStatus(
    id: string,
    user?: UserContext
  ): {
    id: string;
    rideId: string;
    status: PaymentRecord['status'];
    amount: number;
    currency: 'IDR';
    method: PaymentMethod;
    provider: string;
    providerPaymentId?: string;
    paidAt?: string;
    failedAt?: string;
    cancelledAt?: string;
    refundedAt?: string;
  } {
    const payment = this.getPaymentById(id, user);
    if (!payment) {
      throw new NotFoundException(`Payment ${id} not found`);
    }

    return {
      id: payment.id,
      rideId: payment.rideId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      paidAt: payment.paidAt,
      failedAt: payment.failedAt,
      cancelledAt: payment.cancelledAt,
      refundedAt: payment.refundedAt,
    };
  }

  getPaymentByRideId(rideId: string, user?: UserContext): PaymentRecord | undefined {
    const paymentId = this.paymentsByRideId.get(rideId);
    if (!paymentId) return undefined;
    return this.getPaymentById(paymentId, user);
  }

  getAllPayments(user?: UserContext): PaymentRecord[] {
    if (user && user.role !== Role.ADMIN) {
      throw new ForbiddenException('Hanya Admin yang dapat melihat seluruh daftar pembayaran');
    }
    return Array.from(this.payments.values());
  }

  /**
   * Phase 6C Settlement Execution for a specific payment ID
   */
  async settlePayment(paymentId: string): Promise<SettlementResult> {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      throw new NotFoundException(`Payment ${paymentId} not found`);
    }
    return this.settlePaymentRecord(payment);
  }

  /**
   * Internal/Service helper to settle a PaymentRecord via SettlementService
   */
  async settlePaymentRecord(payment: PaymentRecord, fareSnapshot?: any): Promise<SettlementResult> {
    const result = await this.settlementService.settlePayment(payment, fareSnapshot);
    this.payments.set(payment.id, payment);
    return result;
  }

  /**
   * Phase 6C Driver Earnings Query derived from Double-Entry Ledger
   */
  getDriverEarnings(driverId: string, period?: string): DriverEarningsSummary {
    return this.settlementService.getDriverEarnings(driverId, period);
  }

  getSettlement(settlementId: string) {
    return this.settlementService.getSettlement(settlementId);
  }

  getSettlementByPaymentId(paymentId: string) {
    return this.settlementService.getSettlementByPaymentId(paymentId);
  }

  getAllSettlements() {
    return this.settlementService.getAllSettlements();
  }

  /**
   * For test isolation
   */
  clear() {
    this.payments.clear();
    this.paymentsByRideId.clear();
    this.paymentsByIdempotency.clear();
    this.paymentsByProviderPaymentId.clear();
    this.processedWebhookEvents.clear();
    this.mutexLocks.clear();
    this.settlementService.clear();
  }
}

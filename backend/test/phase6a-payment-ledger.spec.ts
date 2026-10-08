/**
 * KAWAI 0511 - Phase 6A Acceptance Tests
 * Payment Database & Double-Entry Ledger Engine
 * 12 Mandatory Test Cases
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import { PaymentService } from '../src/payment/payment.service';
import { LedgerService, UnbalancedLedgerException } from '../src/payment/ledger.service';
import { MockPaymentProvider } from '../src/payment/payment-provider.interface';
import { RideService, RideOrder } from '../src/ride/ride.service';
import { FareService } from '../src/ride/fare.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { RedisGeoService } from '../src/location/redis-geo.service';

describe('Phase 6A: Payment Database & Double-Entry Ledger Engine', () => {
  let ledgerService: LedgerService;
  let paymentService: PaymentService;
  let rideService: RideService;

  const passengerId = 'b0000000-0000-0000-0000-000000000002';
  const driverId = 'd0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    ledgerService = new LedgerService();

    const fareService = new FareService();
    const freshnessService = new LocationFreshnessService();
    const redisGeoService = new RedisGeoService();
    const geospatialService = new GeospatialService(freshnessService, redisGeoService);
    const routingService = new RoutingService();
    const driverEligibilityService = new DriverEligibilityService();
    const dispatchService = new RideDispatchService(geospatialService, freshnessService, driverEligibilityService);

    rideService = new RideService(
      fareService,
      dispatchService,
      routingService,
      driverEligibilityService
    );

    paymentService = new PaymentService(ledgerService, rideService);
  });

  // Helper to create a dummy ride in a specified state
  const setupRideWithStatus = (rideId: string, status: any, fare: number = 20000): RideOrder => {
    const dummyRide: RideOrder = {
      id: rideId,
      passengerId,
      driverId,
      pickupAddress: 'Duta Mall Banjarmasin',
      pickupLat: -3.3198,
      pickupLng: 114.5912,
      destinationAddress: 'Universitas Lambung Mangkurat, Kayutangi',
      destinationLat: -3.2985,
      destinationLng: 114.5855,
      distanceKm: 4.2,
      durationMinutes: 14,
      totalFare: fare,
      fareSnapshot: {
        baseFare: 7000,
        perKmRate: 2200,
        perMinuteRate: 200,
        minimumFare: 10000,
        totalFare: fare,
        distanceFare: 9240,
        durationFare: 2800,
        distanceKm: 4.2,
        durationMinutes: 14,
        calculatedAt: new Date().toISOString(),
      },
      status,
      version: status === 'COMPLETED' ? 5 : 1,
      currentAttemptNumber: 1,
      attemptedDriverIds: [driverId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined,
    };

    (rideService as any).rides.set(rideId, dummyRide);
    return dummyRide;
  };

  // ==========================================================================
  // TEST 1: PAYMENT CREATION
  // ==========================================================================
  test('TEST 1: payment creation creates a valid payment record in Rupiah with provider abstraction', async () => {
    const rideId = 'ride-test-p1';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const result = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'DIGITAL',
      idempotencyKey: 'idem-p1-001',
    });

    assert.ok(result.payment.id, 'Payment ID must be generated');
    assert.equal(result.payment.rideId, rideId);
    assert.equal(result.payment.payerId, passengerId);
    assert.equal(result.payment.payeeDriverId, driverId);
    assert.equal(result.payment.amount, 20000);
    assert.equal(result.payment.currency, 'IDR');
    assert.equal(result.payment.method, 'DIGITAL');
    assert.equal(result.payment.status, 'PAID');
    assert.equal(result.payment.provider, 'MOCK_DIGITAL_GATEWAY');
    assert.ok(result.payment.providerPaymentId, 'Provider payment ID must be populated');
    assert.ok(result.payment.paidAt, 'paidAt must be timestamped');
    assert.ok(result.ledgerTransactionId, 'Ledger transaction ID must be returned');
  });

  // ==========================================================================
  // TEST 2: DUPLICATE PAYMENT REJECTED
  // ==========================================================================
  test('TEST 2: duplicate payment rejected (1 ride = 1 payment record)', async () => {
    const rideId = 'ride-test-p2';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    // First payment succeeds
    await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-p2-first',
    });

    // Second payment attempt for same ride with different idempotency key MUST be rejected
    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId,
          payerId: passengerId,
          payeeDriverId: driverId,
          amount: 20000,
          method: 'DIGITAL',
          idempotencyKey: 'idem-p2-second',
        });
      },
      { name: 'ConflictException' },
      'Payment for already paid ride must be rejected with ConflictException'
    );
  });

  // ==========================================================================
  // TEST 3: IDR AMOUNT (INTEGER RUPIAH)
  // ==========================================================================
  test('TEST 3: IDR amount must be whole integer Rupiah (fractions rejected)', async () => {
    const rideId = 'ride-test-p3';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    // Non-integer amount rejected
    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId,
          payerId: passengerId,
          payeeDriverId: driverId,
          amount: 20000.75, // Fractional Rupiah
          method: 'CASH',
          idempotencyKey: 'idem-p3-fraction',
        });
      },
      { name: 'BadRequestException' },
      'Fractional Rupiah amount must be rejected'
    );
  });

  // ==========================================================================
  // TEST 4: LEDGER BALANCE (SUM(debit) === SUM(credit))
  // ==========================================================================
  test('TEST 4: ledger balance strictly guarantees SUM(debit) === SUM(credit)', async () => {
    const rideId = 'ride-test-p4';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const result = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-p4-balance',
    });

    const entries = ledgerService.getEntriesForTransaction(result.ledgerTransactionId);
    assert.equal(entries.length, 3, 'Must have 3 ledger entries');

    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

    assert.equal(totalDebit, 20000, 'Total debit must be 20000');
    assert.equal(totalCredit, 20000, 'Total credit must be 20000');
    assert.equal(totalDebit, totalCredit, 'SUM(debit) must equal SUM(credit)');

    // System ledger auditor check
    const audit = ledgerService.auditAllTransactions();
    assert.equal(audit.balanced, true, 'Audit must confirm 100% balanced ledger');
  });

  // ==========================================================================
  // TEST 5: 85/15 SPLIT (CONFIGURABLE, NOT HARD-CODED)
  // ==========================================================================
  test('TEST 5: 85/15 split calculates driver Rp 17.000 & platform Rp 3.000 for Rp 20.000 fare, and supports reconfiguration', async () => {
    const rideId = 'ride-test-p5';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    // Default 85/15 split check
    const splitDefault = paymentService.calculateSplit(20000);
    assert.equal(splitDefault.driverAmount, 17000);
    assert.equal(splitDefault.platformAmount, 3000);
    assert.equal(splitDefault.driverPercent, 85);
    assert.equal(splitDefault.platformPercent, 15);

    const result = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-p5-split',
    });

    assert.equal(result.split.driverAmount, 17000);
    assert.equal(result.split.platformAmount, 3000);

    // Check account balances
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const platformAcc = ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');

    const driverBal = ledgerService.getAccountBalance(driverAcc.id);
    const platformBal = ledgerService.getAccountBalance(platformAcc.id);

    assert.equal(driverBal.balance, 17000, 'Driver balance must be Rp 17.000');
    assert.equal(platformBal.balance, 3000, 'Platform revenue must be Rp 3.000');

    // Test reconfiguration (e.g. 80/20)
    paymentService.setSplitConfig(80.0, 20.0);
    const reconfiguredSplit = paymentService.calculateSplit(20000);
    assert.equal(reconfiguredSplit.driverAmount, 16000);
    assert.equal(reconfiguredSplit.platformAmount, 4000);
  });

  // ==========================================================================
  // TEST 6: ZERO AMOUNT REJECTED
  // ==========================================================================
  test('TEST 6: zero amount rejected with BadRequestException', async () => {
    const rideId = 'ride-test-p6';
    setupRideWithStatus(rideId, 'COMPLETED', 0);

    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId,
          payerId: passengerId,
          payeeDriverId: driverId,
          amount: 0,
          method: 'CASH',
          idempotencyKey: 'idem-p6-zero',
        });
      },
      { name: 'BadRequestException' },
      'Zero payment amount must be rejected'
    );
  });

  // ==========================================================================
  // TEST 7: NEGATIVE AMOUNT REJECTED
  // ==========================================================================
  test('TEST 7: negative amount rejected with BadRequestException', async () => {
    const rideId = 'ride-test-p7';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId,
          payerId: passengerId,
          payeeDriverId: driverId,
          amount: -15000,
          method: 'DIGITAL',
          idempotencyKey: 'idem-p7-negative',
        });
      },
      { name: 'BadRequestException' },
      'Negative payment amount must be rejected'
    );
  });

  // ==========================================================================
  // TEST 8: COMPLETED RIDE PAYMENT
  // ==========================================================================
  test('TEST 8: completed ride payment succeeds and transitions to PAID', async () => {
    const rideId = 'ride-test-p8';
    setupRideWithStatus(rideId, 'COMPLETED', 19040);

    const result = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 19040,
      method: 'CASH',
      idempotencyKey: 'idem-p8-cash',
    });

    assert.equal(result.payment.status, 'PAID');
    assert.equal(result.payment.method, 'CASH');
    assert.equal(result.payment.amount, 19040);
    assert.ok(result.payment.paidAt);
  });

  // ==========================================================================
  // TEST 9: INCOMPLETE RIDE REJECTED
  // ==========================================================================
  test('TEST 9: incomplete ride rejected (SEARCHING, ASSIGNED, IN_TRIP cannot be paid)', async () => {
    const incompleteStatuses: any[] = ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'IN_TRIP', 'CANCELLED'];

    for (const status of incompleteStatuses) {
      const rideId = `ride-test-p9-${status}`;
      setupRideWithStatus(rideId, status, 20000);

      await assert.rejects(
        async () => {
          await paymentService.createPayment({
            rideId,
            payerId: passengerId,
            payeeDriverId: driverId,
            amount: 20000,
            method: 'DIGITAL',
            idempotencyKey: `idem-p9-${status}`,
          });
        },
        { name: 'BadRequestException' },
        `Incomplete ride in status ${status} must be rejected from payment`
      );
    }
  });

  // ==========================================================================
  // TEST 10: DUPLICATE LEDGER TRANSACTION REJECTED
  // ==========================================================================
  test('TEST 10: duplicate ledger transaction rejected for identical reference', async () => {
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const clearingAcc = ledgerService.getAccountByCode('PAYMENT_CLEARING_IDR');

    // First transaction record succeeds
    ledgerService.recordTransaction({
      referenceType: 'MANUAL_TEST',
      referenceId: 'ref-tx-001',
      description: 'Test manual transaction',
      entries: [
        { accountId: clearingAcc.id, debit: 10000, credit: 0 },
        { accountId: driverAcc.id, debit: 0, credit: 10000 },
      ],
    });

    // Attempting to record second transaction with same reference MUST be rejected
    assert.throws(
      () => {
        ledgerService.recordTransaction({
          referenceType: 'MANUAL_TEST',
          referenceId: 'ref-tx-001',
          description: 'Duplicate attempt',
          entries: [
            { accountId: clearingAcc.id, debit: 10000, credit: 0 },
            { accountId: driverAcc.id, debit: 0, credit: 10000 },
          ],
        });
      },
      { name: 'ConflictException' },
      'Duplicate ledger transaction reference must throw ConflictException'
    );
  });

  // ==========================================================================
  // TEST 11: BALANCED DEBIT/CREDIT CONSTRAINT
  // ==========================================================================
  test('TEST 11: balanced debit/credit constraint rejects unbalanced entries', async () => {
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const clearingAcc = ledgerService.getAccountByCode('PAYMENT_CLEARING_IDR');

    // Unbalanced entries: Debit 20.000 vs Credit 15.000
    assert.throws(
      () => {
        ledgerService.recordTransaction({
          referenceType: 'MANUAL_TEST',
          referenceId: 'ref-unbalanced-001',
          description: 'Unbalanced transaction test',
          entries: [
            { accountId: clearingAcc.id, debit: 20000, credit: 0 },
            { accountId: driverAcc.id, debit: 0, credit: 15000 },
          ],
        });
      },
      UnbalancedLedgerException,
      'Unbalanced ledger entry must throw UnbalancedLedgerException'
    );
  });

  // ==========================================================================
  // TEST 12: DATABASE TRANSACTION ROLLBACK
  // ==========================================================================
  test('TEST 12: database transaction rollback ensures payment is not saved if ledger recording fails', async () => {
    const rideId = 'ride-test-p12-rollback';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    // Mock ledgerService.recordTransaction to throw an unexpected database error
    const originalRecordTx = ledgerService.recordTransaction.bind(ledgerService);
    ledgerService.recordTransaction = () => {
      throw new Error('Simulated Database Crash / Unbalanced Ledger Entry on disk');
    };

    // Attempt payment creation
    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId,
          payerId: passengerId,
          payeeDriverId: driverId,
          amount: 20000,
          method: 'DIGITAL',
          idempotencyKey: 'idem-p12-fail',
        });
      },
      /Simulated Database Crash/,
      'Payment creation must throw when ledger fails'
    );

    // Verify rollback: Payment record was NOT persisted in payments store
    const storedPayment = paymentService.getPaymentByRideId(rideId);
    assert.equal(storedPayment, undefined, 'Rolled back payment must not exist in payments repository');

    // Restore original method
    ledgerService.recordTransaction = originalRecordTx;
  });
});

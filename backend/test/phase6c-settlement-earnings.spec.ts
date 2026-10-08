/**
 * KAWAI 0511 - Phase 6C Acceptance Tests
 * Settlement & Driver Earnings Engine
 * 8 Mandatory Test Cases:
 * 1. 85/15 split
 * 2. integer arithmetic
 * 3. rounding
 * 4. multiple rides
 * 5. duplicate settlement
 * 6. failed transaction rollback
 * 7. ledger remains balanced
 * 8. driver earnings matches ledger
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from '../src/payment/payment.service';
import { LedgerService, UnbalancedLedgerException } from '../src/payment/ledger.service';
import { SettlementService } from '../src/payment/settlement.service';
import { CashPaymentProvider, MockDigitalPaymentProvider } from '../src/payment/payment-provider.interface';
import { RideService, RideOrder } from '../src/ride/ride.service';
import { FareService } from '../src/ride/fare.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { RedisGeoService } from '../src/location/redis-geo.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { DriverService } from '../src/driver/driver.service';
import { LocalDocumentStorageProvider } from '../src/driver/storage/local-document-storage.provider';
import { PaymentRecord } from '../src/payment/payment.types';

describe('Phase 6C: Settlement & Driver Earnings Engine', () => {
  let ledgerService: LedgerService;
  let settlementService: SettlementService;
  let paymentService: PaymentService;
  let driverService: DriverService;
  let rideService: RideService;
  let mockDigitalProvider: MockDigitalPaymentProvider;

  const webhookSecret = 'phase6c-webhook-secret-0511';
  const passengerId = '11111111-1111-4111-a111-111111111111';
  const driverId = 'd0000000-0000-0000-0000-000000000001'; // Mitra Ahmad Gazali
  const secondDriverId = 'd0000000-0000-0000-0000-000000000002';

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

    settlementService = new SettlementService(ledgerService, rideService);
    mockDigitalProvider = new MockDigitalPaymentProvider(webhookSecret, 300000, true);
    paymentService = new PaymentService(ledgerService, rideService, mockDigitalProvider, settlementService);

    const storageProvider = new LocalDocumentStorageProvider();
    driverService = new DriverService(driverEligibilityService, storageProvider, settlementService);
  });

  const setupCompletedRide = (rideId: string, fare: number, assignedDriverId: string = driverId): RideOrder => {
    const dummyRide: RideOrder = {
      id: rideId,
      passengerId,
      driverId: assignedDriverId,
      pickupAddress: 'Duta Mall Banjarmasin',
      pickupLat: -3.3198,
      pickupLng: 114.5912,
      destinationAddress: 'Universitas Lambung Mangkurat, Banjarmasin',
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
        isSurgeApplied: false,
        surgeMultiplier: 1.0,
        calculatedAt: new Date().toISOString(),
      },
      status: 'COMPLETED',
      version: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    (rideService as any).rides.set(rideId, dummyRide);
    return dummyRide;
  };

  // ===========================================================================
  // TEST 1: 85/15 split
  // ===========================================================================
  test('1. 85/15 split: verifies default 85% driver share and 15% platform fee', async () => {
    const config = settlementService.getSplitConfig();
    assert.equal(config.driverSharePercent, 85.0);
    assert.equal(config.platformSharePercent, 15.0);

    // Case A: Rp 10.000 -> Driver Rp 8.500, Platform Rp 1.500
    const split10k = settlementService.calculateSplit(10000);
    assert.equal(split10k.driverAmount, 8500);
    assert.equal(split10k.platformAmount, 1500);
    assert.equal(split10k.driverAmount + split10k.platformAmount, 10000);

    // Case B: Rp 25.000 -> Driver Rp 21.250, Platform Rp 3.750
    const split25k = settlementService.calculateSplit(25000);
    assert.equal(split25k.driverAmount, 21250);
    assert.equal(split25k.platformAmount, 3750);
    assert.equal(split25k.driverAmount + split25k.platformAmount, 25000);

    // End-to-end Cash settlement test
    const rideId = 'ride-split-85-15-001';
    setupCompletedRide(rideId, 10000);

    const paymentRes = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 10000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-split-85-15-001',
    });

    assert.equal(paymentRes.payment.status, 'PAID');
    assert.equal(paymentRes.payment.isSettled, true);
    assert.equal(paymentRes.payment.driverShareAmount, 8500);
    assert.equal(paymentRes.payment.platformFeeAmount, 1500);

    // Check ledger entries
    const txEntries = ledgerService.getEntriesForTransaction(paymentRes.payment.ledgerTransactionId!);
    assert.equal(txEntries.length, 3);

    const debitEntry = txEntries.find((e) => e.debit > 0);
    assert.ok(debitEntry);
    assert.equal(debitEntry.debit, 10000);

    const driverAccount = ledgerService.getOrCreateDriverAccount(driverId);
    const driverEntry = txEntries.find((e) => e.accountId === driverAccount.id);
    assert.ok(driverEntry);
    assert.equal(driverEntry.credit, 8500);

    const platformAccount = ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');
    const platformEntry = txEntries.find((e) => e.accountId === platformAccount.id);
    assert.ok(platformEntry);
    assert.equal(platformEntry.credit, 1500);
  });

  // ===========================================================================
  // TEST 2: integer arithmetic
  // ===========================================================================
  test('2. integer arithmetic: all IDR amounts must be strictly integers without floating-point artifacts', () => {
    const testFares = [10000, 25000, 15750, 42999, 100000, 1];

    for (const fare of testFares) {
      const split = settlementService.calculateSplit(fare);

      assert.equal(Number.isInteger(split.driverAmount), true, `driverAmount ${split.driverAmount} must be integer`);
      assert.equal(Number.isInteger(split.platformAmount), true, `platformAmount ${split.platformAmount} must be integer`);
      assert.equal(split.driverAmount + split.platformAmount, fare, 'sum must equal fare exactly');
    }

    // Reject non-integer / floating point fares
    assert.throws(
      () => settlementService.calculateSplit(10000.5),
      (err: any) => err instanceof BadRequestException && err.message.includes('integer')
    );
  });

  // ===========================================================================
  // TEST 3: rounding
  // ===========================================================================
  test('3. rounding: handles non-round and fractional fares without 1 Rupiah leakage', () => {
    // Fare Rp 10.001: 85% = 8500.85 -> Math.round = 8501; platform = 10001 - 8501 = 1500
    const split1 = settlementService.calculateSplit(10001);
    assert.equal(split1.driverAmount, 8501);
    assert.equal(split1.platformAmount, 1500);
    assert.equal(split1.driverAmount + split1.platformAmount, 10001);

    // Fare Rp 15.750: 85% = 13387.5 -> Math.round = 13388; platform = 15750 - 13388 = 2362
    const split2 = settlementService.calculateSplit(15750);
    assert.equal(split2.driverAmount, 13388);
    assert.equal(split2.platformAmount, 2362);
    assert.equal(split2.driverAmount + split2.platformAmount, 15750);

    // Fare Rp 33.333: 85% = 28333.05 -> Math.round = 28333; platform = 33333 - 28333 = 5000
    const split3 = settlementService.calculateSplit(33333);
    assert.equal(split3.driverAmount, 28333);
    assert.equal(split3.platformAmount, 5000);
    assert.equal(split3.driverAmount + split3.platformAmount, 33333);

    // Smallest fare Rp 1: 85% = 0.85 -> Math.round = 1; platform = 0
    const splitSmall = settlementService.calculateSplit(1);
    assert.equal(splitSmall.driverAmount, 1);
    assert.equal(splitSmall.platformAmount, 0);
    assert.equal(splitSmall.driverAmount + splitSmall.platformAmount, 1);
  });

  // ===========================================================================
  // TEST 4: multiple rides
  // ===========================================================================
  test('4. multiple rides: multiple settled rides accumulate correctly in driver ledger balance', async () => {
    const ride1 = 'ride-multi-001';
    const ride2 = 'ride-multi-002';
    const ride3 = 'ride-multi-003';

    setupCompletedRide(ride1, 10000); // Driver: 8.500, Platform: 1.500
    setupCompletedRide(ride2, 25000); // Driver: 21.250, Platform: 3.750
    setupCompletedRide(ride3, 40000); // Driver: 34.000, Platform: 6.000

    await paymentService.createPayment({
      rideId: ride1,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 10000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-multi-001',
    });

    await paymentService.createPayment({
      rideId: ride2,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 25000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-multi-002',
    });

    await paymentService.createPayment({
      rideId: ride3,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 40000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-multi-003',
    });

    // Check driver earnings
    const earnings = driverService.getDriverEarnings(driverId);
    assert.equal(earnings.totalCompletedRides, 3);
    assert.equal(earnings.grossFare, 75000);
    assert.equal(earnings.driverEarnings, 63750); // 8500 + 21250 + 34000 = 63750
    assert.equal(earnings.platformFee, 11250);   // 1500 + 3750 + 6000 = 11250

    // Direct ledger verification
    const driverAccount = ledgerService.getOrCreateDriverAccount(driverId);
    const balance = ledgerService.getAccountBalance(driverAccount.id);
    assert.equal(balance.balance, 63750);
  });

  // ===========================================================================
  // TEST 5: duplicate settlement
  // ===========================================================================
  test('5. duplicate settlement: attempting to settle the same payment twice is strictly rejected', async () => {
    const rideId = 'ride-dup-settle-001';
    setupCompletedRide(rideId, 20000);

    const paymentRes = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-dup-settle-001',
    });

    assert.equal(paymentRes.payment.isSettled, true);

    const driverAccount = ledgerService.getOrCreateDriverAccount(driverId);
    const balanceBefore = ledgerService.getAccountBalance(driverAccount.id).balance;
    assert.equal(balanceBefore, 17000); // 85% of 20000

    // Attempting duplicate settlement directly on SettlementService
    await assert.rejects(
      async () => {
        await settlementService.settlePayment(paymentRes.payment);
      },
      (err: any) => {
        return (
          err instanceof ConflictException &&
          err.message.includes('already settled') &&
          err.message.includes('Duplicate settlement rejected')
        );
      }
    );

    // Attempting duplicate settlement via PaymentService.settlePayment
    await assert.rejects(
      async () => {
        await paymentService.settlePayment(paymentRes.payment.id);
      },
      (err: any) => err instanceof ConflictException
    );

    // Verify driver balance DID NOT increase
    const balanceAfter = ledgerService.getAccountBalance(driverAccount.id).balance;
    assert.equal(balanceAfter, 17000);
  });

  // ===========================================================================
  // TEST 6: failed transaction rollback
  // ===========================================================================
  test('6. failed transaction rollback: settlement aborts and leaves payment un-settled when ledger fails', async () => {
    const rideId = 'ride-rollback-001';
    setupCompletedRide(rideId, 20000);

    const dummyPayment: PaymentRecord = {
      id: 'pay-rollback-test-001',
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'CASH',
      status: 'PAID',
      provider: 'CASH',
      idempotencyKey: 'idem-rollback-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isSettled: false,
    };

    const driverAccount = ledgerService.getOrCreateDriverAccount(driverId);
    const initialBalance = ledgerService.getAccountBalance(driverAccount.id).balance;

    // Simulate ledger failure by inserting conflicting transaction reference before settlement
    ledgerService.recordTransaction({
      referenceType: 'PAYMENT_RIDE',
      referenceId: dummyPayment.id,
      description: 'Pre-existing conflicting transaction',
      entries: [
        { accountId: driverAccount.id, debit: 0, credit: 5000 },
        { accountId: ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR').id, debit: 5000, credit: 0 },
      ],
    });

    const balanceAfterConflict = ledgerService.getAccountBalance(driverAccount.id).balance;

    // Now try to settle the payment; it should encounter ConflictException on ledger and rollback
    await assert.rejects(
      async () => {
        await settlementService.settlePayment(dummyPayment);
      },
      (err: any) => err instanceof ConflictException
    );

    // Verify payment was NOT marked as settled
    assert.equal(dummyPayment.isSettled, false);
    assert.equal(dummyPayment.settledAt, undefined);

    // Verify driver balance was not affected by the failed settlement
    const balanceFinal = ledgerService.getAccountBalance(driverAccount.id).balance;
    assert.equal(balanceFinal, balanceAfterConflict);
  });

  // ===========================================================================
  // TEST 7: ledger remains balanced
  // ===========================================================================
  test('7. ledger remains balanced: all double-entry ledger transactions have SUM(debit) === SUM(credit)', async () => {
    const ride1 = 'ride-audit-001';
    const ride2 = 'ride-audit-002';
    const ride3 = 'ride-audit-003';

    setupCompletedRide(ride1, 10001);
    setupCompletedRide(ride2, 25000);
    setupCompletedRide(ride3, 33333);

    await paymentService.createPayment({
      rideId: ride1,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 10001,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-audit-001',
    });

    await paymentService.createPayment({
      rideId: ride2,
      payerId: passengerId,
      payeeDriverId: secondDriverId,
      amount: 25000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-audit-002',
    });

    await paymentService.createPayment({
      rideId: ride3,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 33333,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-audit-003',
    });

    // Run audit across all transactions
    const auditResult = ledgerService.auditAllTransactions();
    assert.equal(auditResult.balanced, true);
    assert.ok(auditResult.totalTransactions >= 3);
    assert.ok(auditResult.totalEntries >= 9);
  });

  // ===========================================================================
  // TEST 8: driver earnings matches ledger
  // ===========================================================================
  test('8. driver earnings matches ledger: read-only earnings strictly matches double-entry ledger balance', async () => {
    const ride1 = 'ride-earnings-001';
    const ride2 = 'ride-earnings-002';

    setupCompletedRide(ride1, 15000); // 85% = 12.750, 15% = 2.250
    setupCompletedRide(ride2, 35000); // 85% = 29.750, 15% = 5.250

    await paymentService.createPayment({
      rideId: ride1,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 15000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-earn-001',
    });

    await paymentService.createPayment({
      rideId: ride2,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 35000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-earn-002',
    });

    // 1. Query via driverService.getDriverEarnings (as called by GET /drivers/me/earnings)
    const earnings = driverService.getDriverEarnings(driverId);

    // 2. Query ledger account directly
    const driverAccount = ledgerService.getOrCreateDriverAccount(driverId);
    const accountBalance = ledgerService.getAccountBalance(driverAccount.id);

    // 3. Strict match assertion
    assert.equal(earnings.driverEarnings, accountBalance.balance);
    assert.equal(earnings.ledgerBalance, accountBalance.balance);
    assert.equal(earnings.driverEarnings, 42500); // 12750 + 29750 = 42500
    assert.equal(earnings.grossFare, 50000);      // 15000 + 35000 = 50000
    assert.equal(earnings.platformFee, 7500);     // 2250 + 5250 = 7500
    assert.equal(earnings.totalCompletedRides, 2);
    assert.equal(earnings.authoritativeSource, 'LEDGER');
    assert.equal(earnings.currency, 'IDR');
  });

  // ===========================================================================
  // EXTRA TEST: Dynamic Revenue Share Configuration Update
  // ===========================================================================
  test('9. dynamic revenue share configuration: can be changed at runtime without altering source code', async () => {
    // Change revenue share to 80% Driver / 20% Platform
    const updated = settlementService.setSplitConfig(80.0, 20.0);
    assert.equal(updated.driverSharePercent, 80.0);
    assert.equal(updated.platformSharePercent, 20.0);

    const rideId = 'ride-dynamic-config-001';
    setupCompletedRide(rideId, 20000);

    const paymentRes = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-dynamic-001',
    });

    assert.equal(paymentRes.payment.driverShareAmount, 16000); // 80% of 20000
    assert.equal(paymentRes.payment.platformFeeAmount, 4000);  // 20% of 20000

    // Reset back to 85/15 default
    settlementService.setSplitConfig(85.0, 15.0);
  });

  // ===========================================================================
  // EXTRA TEST: Digital Payment Webhook Settle Flow
  // ===========================================================================
  test('10. digital payment webhook settle: webhook PAID status triggers atomic 8-step settlement', async () => {
    const rideId = 'ride-digital-settle-001';
    setupCompletedRide(rideId, 30000);

    // Create DIGITAL payment -> PENDING
    const createRes = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 30000,
      currency: 'IDR',
      method: 'DIGITAL',
      idempotencyKey: 'idem-digital-settle-001',
    });

    assert.equal(createRes.payment.status, 'PENDING');
    assert.equal(createRes.payment.isSettled, false);

    // Generate valid webhook payload and headers
    const timestamp = Date.now();
    const webhookPayload = {
      providerPaymentId: createRes.payment.providerPaymentId,
      status: 'PAID',
      amount: 30000,
      currency: 'IDR',
      eventId: 'evt-webhook-settle-001',
    };

    const signature = mockDigitalProvider.generateSignature(webhookPayload, timestamp);
    const webhookHeaders = {
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp,
    };

    // Process webhook
    const webhookRes = await paymentService.handleWebhook(
      mockDigitalProvider.providerName,
      webhookHeaders,
      webhookPayload
    );

    assert.equal(webhookRes.status, 'PAID');
    assert.equal(webhookRes.payment?.status, 'PAID');
    assert.equal(webhookRes.payment?.isSettled, true);
    assert.equal(webhookRes.payment?.driverShareAmount, 25500); // 85% of 30000
    assert.equal(webhookRes.payment?.platformFeeAmount, 4500);  // 15% of 30000

    // Verify driver earnings now reflect the settled digital payment
    const earnings = driverService.getDriverEarnings(driverId);
    assert.equal(earnings.driverEarnings, 25500);
    assert.equal(earnings.grossFare, 30000);
  });
});

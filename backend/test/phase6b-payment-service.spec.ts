/**
 * KAWAI 0511 - Phase 6B Acceptance Tests
 * Payment Service, Provider Abstraction, Webhooks, Authorization & Concurrency
 * 12 Mandatory Test Cases
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentService } from '../src/payment/payment.service';
import { LedgerService } from '../src/payment/ledger.service';
import {
  MockDigitalPaymentProvider,
  CashPaymentProvider,
} from '../src/payment/payment-provider.interface';
import { RideService, RideOrder } from '../src/ride/ride.service';
import { FareService } from '../src/ride/fare.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { RedisGeoService } from '../src/location/redis-geo.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { Role } from '../src/auth/roles.enum';

describe('Phase 6B: Payment Service, Providers, Webhooks & Concurrency', () => {
  let paymentService: PaymentService;
  let ledgerService: LedgerService;
  let rideService: RideService;
  let mockDigitalProvider: MockDigitalPaymentProvider;
  let cashProvider: CashPaymentProvider;

  const webhookSecret = 'test-webhook-secret-0511';
  const passengerId = '11111111-1111-4111-a111-111111111111';
  const otherPassengerId = '22222222-2222-4222-a222-222222222222';
  const driverId = '33333333-3333-4333-a333-333333333333';
  const otherDriverId = '44444444-4444-4444-a444-444444444444';
  const adminId = '99999999-9999-4999-a999-999999999999';

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

    // Instantiate digital provider with asyncMode = true (COMPLETED -> PENDING -> Webhook -> PAID)
    mockDigitalProvider = new MockDigitalPaymentProvider(webhookSecret, 300000, true);
    cashProvider = new CashPaymentProvider();

    paymentService = new PaymentService(ledgerService, rideService, mockDigitalProvider);
  });

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
        isSurgeApplied: false,
        surgeMultiplier: 1.0,
        calculatedAt: new Date().toISOString(),
      },
      status,
      version: 5,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: status === 'COMPLETED' ? new Date().toISOString() : undefined,
    };

    (rideService as any).rides.set(rideId, dummyRide);
    return dummyRide;
  };

  // ==========================================================================
  // TEST 1: CASH PAYMENT
  // ==========================================================================
  test('TEST 1: cash payment for completed ride transitions to PAID immediately and settles ledger', async () => {
    const rideId = 'ride-cash-01';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const result = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-cash-01',
    });

    assert.equal(result.payment.status, 'PAID', 'Cash payment must be PAID immediately');
    assert.equal(result.payment.method, 'CASH');
    assert.equal(result.payment.provider, 'CASH');
    assert.ok(result.payment.paidAt, 'paidAt must be recorded');
    assert.ok(result.ledgerTransactionId, 'Ledger transaction must be recorded immediately');

    // Check ledger balances: 85% driver (17.000) and 15% platform (3.000)
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalCredit, 17000);

    const platformAcc = ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');
    const platformBal = ledgerService.getAccountBalance(platformAcc.id);
    assert.equal(platformBal.totalCredit, 3000);

    const cashReceivableAcc = ledgerService.getAccountByCode('CASH_RECEIVABLE_IDR');
    const cashBal = ledgerService.getAccountBalance(cashReceivableAcc.id);
    assert.equal(cashBal.totalDebit, 20000);
  });

  // ==========================================================================
  // TEST 2: DIGITAL PAYMENT
  // ==========================================================================
  test('TEST 2: digital payment returns PENDING status and gateway actionUrl without initial ledger settlement', async () => {
    const rideId = 'ride-dig-02';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const result = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'DIGITAL',
      idempotencyKey: 'idem-dig-02',
    });

    assert.equal(result.payment.status, 'PENDING', 'Digital payment must be PENDING initially');
    assert.equal(result.payment.method, 'DIGITAL');
    assert.ok(result.payment.actionUrl, 'Must contain gateway action URL / QRIS link');
    assert.ok(result.payment.providerPaymentId, 'Must contain provider payment ID');
    assert.equal(result.payment.paidAt, undefined, 'paidAt must be undefined while PENDING');
    assert.equal(result.ledgerTransactionId, undefined, 'Ledger transaction must not be created while PENDING');

    // Verify driver balance is still 0
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalCredit, 0, 'Driver balance must remain 0 while payment is pending');
  });

  // ==========================================================================
  // TEST 3: DUPLICATE PAYMENT
  // ==========================================================================
  test('TEST 3: duplicate payment for same ride is rejected with ConflictException', async () => {
    const rideId = 'ride-dup-03';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-dup-03-first',
    });

    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId,
          payerId: passengerId,
          payeeDriverId: driverId,
          amount: 20000,
          currency: 'IDR',
          method: 'DIGITAL',
          idempotencyKey: 'idem-dup-03-second',
        });
      },
      ConflictException,
      'Must reject duplicate payment for the same ride'
    );
  });

  // ==========================================================================
  // TEST 4: DUPLICATE WEBHOOK
  // ==========================================================================
  test('TEST 4: duplicate webhook event is recognized idempotently and does not duplicate ledger entries', async () => {
    const rideId = 'ride-dup-wh-04';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const init = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-wh-04',
    });

    const timestamp = Date.now();
    const payload = {
      eventId: 'evt-wh-004-unique',
      providerPaymentId: init.payment.providerPaymentId,
      status: 'PAID',
      amount: 20000,
      paidAt: new Date(timestamp).toISOString(),
    };
    const signature = mockDigitalProvider.generateSignature(payload, timestamp);
    const headers = {
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp,
      'x-webhook-event-id': 'evt-wh-004-unique',
    };

    // First webhook: transitions PENDING to PAID
    const firstRes = await paymentService.handleWebhook('MOCK_DIGITAL_GATEWAY', headers, payload);
    assert.equal(firstRes.status, 'PAID');
    assert.equal(firstRes.duplicate, false);

    // Verify 1 ledger transaction recorded
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    let driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalCredit, 17000);

    // Second webhook (replay / duplicate): handled idempotently
    const secondRes = await paymentService.handleWebhook('MOCK_DIGITAL_GATEWAY', headers, payload);
    assert.equal(secondRes.duplicate, true, 'Second webhook must be identified as duplicate');
    assert.equal(secondRes.status, 'PAID');

    // Verify driver balance remains 17000 (no duplicate credit!)
    driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalCredit, 17000, 'Driver balance must not be credited twice');
  });

  // ==========================================================================
  // TEST 5: INVALID WEBHOOK
  // ==========================================================================
  test('TEST 5: invalid webhook signature or drifted timestamp is rejected with UnauthorizedException', async () => {
    const rideId = 'ride-inv-wh-05';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const init = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-inv-wh-05',
    });

    const payload = {
      eventId: 'evt-inv-01',
      providerPaymentId: init.payment.providerPaymentId,
      status: 'PAID',
    };

    // A. Invalid signature
    const badHeaders = {
      'x-webhook-signature': 'totally-wrong-signature-12345',
      'x-webhook-timestamp': Date.now(),
    };

    await assert.rejects(
      async () => {
        await paymentService.handleWebhook('MOCK_DIGITAL_GATEWAY', badHeaders, payload);
      },
      UnauthorizedException,
      'Bad signature must throw UnauthorizedException'
    );

    // B. Expired timestamp (> 5 minutes drift)
    const oldTimestamp = Date.now() - 400000; // 6.6 minutes ago
    const validSigForOldTime = mockDigitalProvider.generateSignature(payload, oldTimestamp);
    const expiredHeaders = {
      'x-webhook-signature': validSigForOldTime,
      'x-webhook-timestamp': oldTimestamp,
    };

    await assert.rejects(
      async () => {
        await paymentService.handleWebhook('MOCK_DIGITAL_GATEWAY', expiredHeaders, payload);
      },
      UnauthorizedException,
      'Drifted timestamp must throw UnauthorizedException for replay protection'
    );
  });

  // ==========================================================================
  // TEST 6: UNAUTHORIZED PAYMENT ACCESS
  // ==========================================================================
  test('TEST 6: unauthorized payment access enforces RBAC (passenger only sees own, driver sees ride, admin sees all)', async () => {
    const rideId = 'ride-auth-06';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const res = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'CASH',
      idempotencyKey: 'idem-auth-06',
    });
    const paymentId = res.payment.id;

    // 1. Passenger owner CAN access
    const passengerView = paymentService.getPaymentById(paymentId, {
      id: passengerId,
      role: Role.CUSTOMER,
    });
    assert.equal(passengerView?.id, paymentId);

    // 2. Different passenger CANNOT access (Forbidden)
    assert.throws(
      () => {
        paymentService.getPaymentById(paymentId, {
          id: otherPassengerId,
          role: Role.CUSTOMER,
        });
      },
      ForbiddenException,
      'Other customer must be forbidden from viewing foreign payment'
    );

    // 3. Assigned driver CAN access
    const driverView = paymentService.getPaymentById(paymentId, {
      id: driverId,
      role: Role.DRIVER,
    });
    assert.equal(driverView?.id, paymentId);

    // 4. Different driver CANNOT access (Forbidden)
    assert.throws(
      () => {
        paymentService.getPaymentById(paymentId, {
          id: otherDriverId,
          role: Role.DRIVER,
        });
      },
      ForbiddenException,
      'Other driver must be forbidden from viewing unrelated payment'
    );

    // 5. Admin CAN access all payments
    const adminView = paymentService.getPaymentById(paymentId, {
      id: adminId,
      role: Role.ADMIN,
    });
    assert.equal(adminView?.id, paymentId);
  });

  // ==========================================================================
  // TEST 7: PAYMENT FOR INCOMPLETE RIDE
  // ==========================================================================
  test('TEST 7: payment for incomplete ride (SEARCHING, ASSIGNED, IN_TRIP) is rejected with BadRequestException', async () => {
    const incompleteStatuses = ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'IN_TRIP'];

    for (const status of incompleteStatuses) {
      const rideId = `ride-inc-${status.toLowerCase()}`;
      setupRideWithStatus(rideId, status, 20000);

      await assert.rejects(
        async () => {
          await paymentService.createPayment({
            rideId,
            payerId: passengerId,
            payeeDriverId: driverId,
            amount: 20000,
            method: 'CASH',
            idempotencyKey: `idem-inc-${status}`,
          });
        },
        BadRequestException,
        `Payment creation must be rejected when ride is in status ${status}`
      );
    }
  });

  // ==========================================================================
  // TEST 8: SUCCESSFUL PAYMENT
  // ==========================================================================
  test('TEST 8: successful digital payment webhook transitions PENDING to PAID and records balanced ledger', async () => {
    const rideId = 'ride-success-08';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const init = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-succ-08',
    });
    assert.equal(init.payment.status, 'PENDING');

    const timestamp = Date.now();
    const payload = {
      eventId: 'evt-succ-08',
      providerPaymentId: init.payment.providerPaymentId,
      status: 'PAID',
      amount: 20000,
    };
    const signature = mockDigitalProvider.generateSignature(payload, timestamp);
    const headers = {
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp,
    };

    const webhookRes = await paymentService.handleWebhook('MOCK_DIGITAL_GATEWAY', headers, payload);
    assert.equal(webhookRes.status, 'PAID');
    assert.equal(webhookRes.payment?.status, 'PAID');
    assert.ok(webhookRes.payment?.paidAt);

    // Verify double-entry ledger is strictly balanced
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalCredit, 17000);

    const platformAcc = ledgerService.getAccountByCode('PLATFORM_REVENUE_IDR');
    const platformBal = ledgerService.getAccountBalance(platformAcc.id);
    assert.equal(platformBal.totalCredit, 3000);

    const audit = ledgerService.auditAllTransactions();
    assert.equal(audit.balanced, true);
  });

  // ==========================================================================
  // TEST 9: FAILED PAYMENT
  // ==========================================================================
  test('TEST 9: failed payment webhook transitions PENDING to FAILED without ledger settlement', async () => {
    const rideId = 'ride-failed-09';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const init = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-fail-09',
    });

    const timestamp = Date.now();
    const payload = {
      eventId: 'evt-fail-09',
      providerPaymentId: init.payment.providerPaymentId,
      status: 'FAILED',
      amount: 20000,
    };
    const signature = mockDigitalProvider.generateSignature(payload, timestamp);
    const headers = {
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp,
    };

    const webhookRes = await paymentService.handleWebhook('MOCK_DIGITAL_GATEWAY', headers, payload);
    assert.equal(webhookRes.status, 'FAILED');
    assert.equal(webhookRes.payment?.status, 'FAILED');
    assert.ok(webhookRes.payment?.failedAt);

    // Verify driver balance remains 0
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalCredit, 0, 'No driver payable must be created for failed payment');
  });

  // ==========================================================================
  // TEST 10: REFUND STATE
  // ==========================================================================
  test('TEST 10: refund state reverses driver payable and platform revenue, and prevents double refund', async () => {
    const rideId = 'ride-ref-10';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const init = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'CASH',
      idempotencyKey: 'idem-ref-10',
    });
    const paymentId = init.payment.id;
    assert.equal(init.payment.status, 'PAID');

    // Admin executes refund
    const refundRes = await paymentService.refundPayment(
      paymentId,
      20000,
      'Driver vehicle breakdown after start',
      { id: adminId, role: Role.ADMIN }
    );

    assert.equal(refundRes.payment.status, 'REFUNDED');
    assert.ok(refundRes.payment.refundedAt);
    assert.ok(refundRes.refundId);

    // Check reversing ledger entries:
    // Driver Payable debit = 17000, credit = 17000 (net balance = 0)
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalDebit, 17000);
    assert.equal(driverBal.totalCredit, 17000);
    assert.equal(driverBal.balance, 0, 'Driver net balance must be 0 after full refund');

    // Attempt second refund: must throw ConflictException
    await assert.rejects(
      async () => {
        await paymentService.refundPayment(
          paymentId,
          20000,
          'Duplicate refund attempt',
          { id: adminId, role: Role.ADMIN }
        );
      },
      ConflictException,
      'Double refund must be rejected with ConflictException'
    );
  });

  // ==========================================================================
  // TEST 11: CONCURRENT WEBHOOK
  // ==========================================================================
  test('TEST 11: concurrent webhook calls are serialized by lock, guaranteeing exactly one ledger transaction', async () => {
    const rideId = 'ride-concur-11';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const init = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      method: 'DIGITAL',
      idempotencyKey: 'idem-concur-11',
    });

    const timestamp = Date.now();
    const payload = {
      eventId: 'evt-concur-11',
      providerPaymentId: init.payment.providerPaymentId,
      status: 'PAID',
      amount: 20000,
    };
    const signature = mockDigitalProvider.generateSignature(payload, timestamp);
    const headers = {
      'x-webhook-signature': signature,
      'x-webhook-timestamp': timestamp,
    };

    // Fire 5 concurrent webhook calls simultaneously
    const concurrentCalls = [1, 2, 3, 4, 5].map(() =>
      paymentService.handleWebhook('MOCK_DIGITAL_GATEWAY', headers, payload)
    );

    const results = await Promise.all(concurrentCalls);

    // All must succeed
    for (const r of results) {
      assert.equal(r.verified, true);
      assert.equal(r.status, 'PAID');
    }

    // Exactly one call should have duplicate: false, the rest duplicate: true
    const nonDuplicates = results.filter((r) => r.duplicate === false);
    assert.equal(nonDuplicates.length, 1, 'Exactly one concurrent call must record the transaction');

    // Verify ledger balance is exactly 17000, NOT multiplied by 5
    const driverAcc = ledgerService.getOrCreateDriverAccount(driverId);
    const driverBal = ledgerService.getAccountBalance(driverAcc.id);
    assert.equal(driverBal.totalCredit, 17000, 'Driver balance must be exactly 17000');
  });

  // ==========================================================================
  // TEST 12: IDEMPOTENCY
  // ==========================================================================
  test('TEST 12: createPayment with duplicate idempotencyKey returns existing record without re-charging', async () => {
    const rideId = 'ride-idem-12';
    setupRideWithStatus(rideId, 'COMPLETED', 20000);

    const first = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-key-exact-12',
    });

    const second = await paymentService.createPayment({
      rideId,
      payerId: passengerId,
      payeeDriverId: driverId,
      amount: 20000,
      currency: 'IDR',
      method: 'CASH',
      idempotencyKey: 'idem-key-exact-12',
    });

    assert.equal(first.payment.id, second.payment.id, 'Must return the identical payment record');
    assert.equal(first.payment.status, second.payment.status);

    // If same idempotencyKey is attempted with different amount: must throw ConflictException
    await assert.rejects(
      async () => {
        await paymentService.createPayment({
          rideId,
          payerId: passengerId,
          payeeDriverId: driverId,
          amount: 50000, // Different amount
          currency: 'IDR',
          method: 'CASH',
          idempotencyKey: 'idem-key-exact-12',
        });
      },
      ConflictException,
      'Reusing idempotencyKey with different parameters must throw ConflictException'
    );
  });
});

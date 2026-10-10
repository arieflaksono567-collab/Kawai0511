/**
 * KAWAI 0511 - Phase 7.3 Acceptance Tests
 * Driver Earnings Ledger: Settlement, Idempotency, Authorization & Multi-Period Dashboard
 *
 * Mandatory Verification Tests:
 * 1. Completed Ride: Records gross fare, platform fee (15%), net amount (85%), status SETTLED, and ledger relation.
 * 2. Cancelled & In-Progress Ride: Rejects earnings creation for CANCELLED, SEARCHING, or IN_TRIP rides (Rule 1).
 * 3. Duplicate Earning Prevention: Rejects second earnings record on same ride with 409 Conflict (Rule 2).
 * 4. Payment Callback & Webhook Retry: Idempotent handling prevents double earnings crediting (Rule 3 & 4).
 * 5. Driver Authorization: Scoped to authenticated driver only (Rule 6). Other drivers & customers rejected (403). Admin allowed.
 * 6. Date Aggregation (Hari ini / Today): Correct totalTrips, totalGross, totalFee, and totalNet for today.
 * 7. Date Aggregation (Minggu ini / Week): Correct aggregation for rolling 7-day period.
 * 8. Date Aggregation (Bulan ini / Month): Correct aggregation for current month.
 * 9. Date Aggregation (All-Time): Total lifetime rides and ledger-authoritative balance match.
 * 10. Multi-Period Summary: Unified dashboard summary returns today, week, month, and all-time cards.
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DriverEarningsLedgerRepository } from '../src/payment/driver-earnings-ledger.repository';
import { DriverEarningsService } from '../src/payment/driver-earnings.service';
import { LedgerService } from '../src/payment/ledger.service';
import { SettlementService } from '../src/payment/settlement.service';
import { PaymentService } from '../src/payment/payment.service';
import { RideService, RideOrder } from '../src/ride/ride.service';
import { FareService } from '../src/ride/fare.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { RedisGeoService } from '../src/location/redis-geo.service';
import { DriverService } from '../src/driver/driver.service';
import { LocalDocumentStorageProvider } from '../src/driver/storage/local-document-storage.provider';
import { PaymentRecord } from '../src/payment/payment.types';

describe('Phase 7.3: Driver Earnings Ledger — Source of Truth, Settlement & Aggregation', () => {
  let earningsRepo: DriverEarningsLedgerRepository;
  let ledgerService: LedgerService;
  let settlementService: SettlementService;
  let rideService: RideService;
  let paymentService: PaymentService;
  let driverEarningsService: DriverEarningsService;
  let driverService: DriverService;

  const passengerId = 'b0000000-0000-0000-0000-000000000002'; // Arief Laksono
  const driverProfileId = 'd0000000-0000-0000-0000-000000000001'; // Ahmad Gazali Driver Profile
  const otherDriverProfileId = 'd0000000-0000-0000-0000-000000000099';
  const adminUserId = 'a0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    earningsRepo = new DriverEarningsLedgerRepository();
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

    driverEarningsService = new DriverEarningsService(
      earningsRepo,
      ledgerService,
      settlementService,
      rideService
    );

    paymentService = new PaymentService(
      ledgerService,
      rideService,
      undefined,
      settlementService,
      driverEarningsService
    );

    const storageProvider = new LocalDocumentStorageProvider();
    driverService = new DriverService(
      driverEligibilityService,
      storageProvider,
      settlementService,
      driverEarningsService
    );
  });

  const setupMockRide = (
    rideId: string,
    status: 'COMPLETED' | 'CANCELLED' | 'IN_TRIP' | 'SEARCHING',
    fare: number = 20000,
    driverId: string = driverProfileId,
    completedAt?: string
  ): RideOrder => {
    const ride: RideOrder = {
      id: rideId,
      passengerId,
      driverId,
      pickupAddress: 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
      pickupLat: -3.319437,
      pickupLng: 114.590822,
      destinationAddress: 'Kampus ULM Banjarmasin, Kayu Tangi',
      destinationLat: -3.29851,
      destinationLng: 114.58802,
      distanceKm: 4.5,
      durationMinutes: 15,
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
      currentAttemptNumber: 1,
      attemptedDriverIds: [driverId],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt: status === 'COMPLETED' ? (completedAt || new Date().toISOString()) : undefined,
      cancelledAt: status === 'CANCELLED' ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    };

    (rideService as any).rides.set(rideId, ride);
    return ride;
  };

  // ===========================================================================
  // TEST 1: COMPLETED RIDE EARNINGS RECORDING
  // ===========================================================================
  test('1. Completed Ride: accurately records gross fare, platform fee (15%), net amount (85%), and ledger link', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000073001';
    setupMockRide(rideId, 'COMPLETED', 20000);

    const record = await driverEarningsService.recordEarningsFromRide(rideId, {
      paymentId: 'pay-73-001',
      actorUser: { id: driverProfileId, role: 'DRIVER', driverId: driverProfileId },
    });

    assert.ok(record.id);
    assert.equal(record.driverId, driverProfileId);
    assert.equal(record.rideId, rideId);
    assert.equal(record.grossAmount, 20000);
    assert.equal(record.platformFee, 3000); // 15%
    assert.equal(record.netAmount, 17000);   // 85%
    assert.equal(record.currency, 'IDR');
    assert.equal(record.status, 'SETTLED');
    assert.equal(record.netAmount + record.platformFee, record.grossAmount);
    assert.ok(record.createdAt);
    assert.ok(record.periodDate);

    // Verify Double-Entry Accounting Ledger
    const driverAccount = ledgerService.getOrCreateDriverAccount(driverProfileId);
    const balance = ledgerService.getAccountBalance(driverAccount.id);
    assert.equal(balance.balance, 17000, 'Ledger balance must strictly match net earnings');
  });

  // ===========================================================================
  // TEST 2: CANCELLED & IN-PROGRESS RIDE REJECTION (RULE 1)
  // ===========================================================================
  test('2. Cancelled & In-Progress Ride: rejects earnings creation for non-COMPLETED rides', async () => {
    const cancelledRideId = 'r0000000-0000-0000-0000-000000073002';
    setupMockRide(cancelledRideId, 'CANCELLED', 15000);

    await assert.rejects(
      async () => {
        await driverEarningsService.recordEarningsFromRide(cancelledRideId);
      },
      BadRequestException,
      'Cancelled ride must be rejected from creating earnings'
    );

    const inTripRideId = 'r0000000-0000-0000-0000-000000073003';
    setupMockRide(inTripRideId, 'IN_TRIP', 18000);

    await assert.rejects(
      async () => {
        await driverEarningsService.recordEarningsFromRide(inTripRideId);
      },
      BadRequestException,
      'In-trip ride must be rejected from creating earnings'
    );

    const searchingRideId = 'r0000000-0000-0000-0000-000000073004';
    setupMockRide(searchingRideId, 'SEARCHING', 12000);

    await assert.rejects(
      async () => {
        await driverEarningsService.recordEarningsFromRide(searchingRideId);
      },
      BadRequestException,
      'Searching ride must be rejected from creating earnings'
    );
  });

  // ===========================================================================
  // TEST 3: DUPLICATE EARNING REJECTION (RULE 2)
  // ===========================================================================
  test('3. Duplicate Earning: rejects second earnings record attempt on same ride with 409 Conflict', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000073005';
    setupMockRide(rideId, 'COMPLETED', 25000);

    // First recording succeeds
    await driverEarningsService.recordEarningsFromRide(rideId);

    // Second recording attempt on same ride must throw ConflictException
    await assert.rejects(
      async () => {
        await driverEarningsService.recordEarningsFromRide(rideId);
      },
      ConflictException,
      'Duplicate earnings on same ride must throw ConflictException'
    );

    assert.equal(earningsRepo.count(), 1, 'Total earnings count must remain 1');
  });

  // ===========================================================================
  // TEST 4: PAYMENT CALLBACK & RETRY IDEMPOTENCY (RULE 3 & 4)
  // ===========================================================================
  test('4. Payment Callback & Retry: idempotent handling prevents double earnings crediting', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000073006';
    setupMockRide(rideId, 'COMPLETED', 16000);

    const payment: PaymentRecord = {
      id: 'pay-retry-001',
      rideId,
      payerId: passengerId,
      payeeDriverId: driverProfileId,
      amount: 16000,
      currency: 'IDR',
      method: 'DIGITAL',
      status: 'PAID',
      provider: 'QRIS_MOCK',
      idempotencyKey: 'idem-qris-001',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // First callback execution
    const firstRecord = await driverEarningsService.recordEarningsFromPayment(payment);
    assert.ok(firstRecord.id);
    assert.equal(firstRecord.grossAmount, 16000);
    assert.equal(firstRecord.netAmount, 13600); // 85%
    assert.equal(firstRecord.platformFee, 2400); // 15%

    // Webhook retry execution with same payment & ride
    const retryRecord = await driverEarningsService.recordEarningsFromPayment(payment);
    assert.equal(retryRecord.id, firstRecord.id, 'Must return same existing record (idempotent)');
    assert.equal(earningsRepo.count(), 1, 'Earnings ledger must not duplicate entries');

    // Also verify via PaymentService settlement
    const secondPayment: PaymentRecord = {
      id: 'pay-settle-002',
      rideId: 'r0000000-0000-0000-0000-000000073007',
      payerId: passengerId,
      payeeDriverId: driverProfileId,
      amount: 14000,
      currency: 'IDR',
      method: 'CASH',
      status: 'PAID',
      provider: 'CASH',
      idempotencyKey: 'idem-cash-002',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setupMockRide(secondPayment.rideId, 'COMPLETED', 14000);

    const settleRes = await paymentService.settlePaymentRecord(secondPayment);
    assert.ok(settleRes.settlementId);

    // Verify auto-synced into earnings repository
    const syncedEarning = await earningsRepo.findByRideId(secondPayment.rideId);
    assert.ok(syncedEarning);
    assert.equal(syncedEarning.grossAmount, 14000);
    assert.equal(syncedEarning.netAmount, 11900);
    assert.equal(syncedEarning.platformFee, 2100);
  });

  // ===========================================================================
  // TEST 5: DRIVER AUTHORIZATION (RULE 6)
  // ===========================================================================
  test('5. Driver Authorization: only authenticated driver or admin can access earnings', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000073008';
    setupMockRide(rideId, 'COMPLETED', 22000);
    await driverEarningsService.recordEarningsFromRide(rideId);

    // Authenticated driver accesses own earnings -> SUCCESS
    const driverSelf = { id: driverProfileId, role: 'DRIVER', driverId: driverProfileId };
    const ownDashboard = await driverEarningsService.getDriverEarningsDashboard(
      driverProfileId,
      { period: 'today' },
      driverSelf
    );
    assert.equal(ownDashboard.driverId, driverProfileId);
    assert.equal(ownDashboard.totalTrips, 1);
    assert.equal(ownDashboard.totalGross, 22000);

    // Other driver attempting to snoop on driverProfileId -> 403 Forbidden
    const otherDriver = { id: otherDriverProfileId, role: 'DRIVER', driverId: otherDriverProfileId };
    await assert.rejects(
      async () => {
        await driverEarningsService.getDriverEarningsDashboard(
          driverProfileId,
          { period: 'today' },
          otherDriver
        );
      },
      ForbiddenException,
      'Other driver must be rejected with ForbiddenException'
    );

    // Passenger attempting to view driver earnings -> 403 Forbidden
    const passengerUser = { id: passengerId, role: 'CUSTOMER' };
    await assert.rejects(
      async () => {
        await driverEarningsService.getDriverEarningsDashboard(
          driverProfileId,
          { period: 'today' },
          passengerUser
        );
      },
      ForbiddenException,
      'Customer must be rejected with ForbiddenException'
    );

    // Admin accessing driver earnings -> SUCCESS
    const adminUser = { id: adminUserId, role: 'ADMIN' };
    const adminDashboard = await driverEarningsService.getDriverEarningsDashboard(
      driverProfileId,
      { period: 'today' },
      adminUser
    );
    assert.equal(adminDashboard.totalTrips, 1);
  });

  // ===========================================================================
  // TEST 6: DATE AGGREGATION — HARI INI / TODAY
  // ===========================================================================
  test('6. Date Aggregation (Hari Ini / Today): calculates correct totalTrips, totalGross, totalFee, and totalNet', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    const ride1 = 'r0000000-0000-0000-0000-000000073010';
    const ride2 = 'r0000000-0000-0000-0000-000000073011';
    setupMockRide(ride1, 'COMPLETED', 20000, driverProfileId, new Date().toISOString());
    setupMockRide(ride2, 'COMPLETED', 15000, driverProfileId, new Date().toISOString());

    await driverEarningsService.recordEarningsFromRide(ride1);
    await driverEarningsService.recordEarningsFromRide(ride2);

    // Query with English keyword 'today'
    const todayEng = await driverEarningsService.getDriverEarningsDashboard(driverProfileId, {
      period: 'today',
    });
    assert.equal(todayEng.totalTrips, 2);
    assert.equal(todayEng.totalGross, 35000);
    assert.equal(todayEng.totalFee, 5250); // 15% of 35000
    assert.equal(todayEng.totalNet, 29750); // 85% of 35000
    assert.equal(todayEng.items.length, 2);

    // Query with Indonesian keyword 'hari ini'
    const todayIdn = await driverEarningsService.getDriverEarningsDashboard(driverProfileId, {
      period: 'hari ini',
    });
    assert.equal(todayIdn.totalTrips, 2);
    assert.equal(todayIdn.totalGross, 35000);
    assert.equal(todayIdn.totalNet, 29750);
  });

  // ===========================================================================
  // TEST 7: DATE AGGREGATION — MINGGU INI / WEEK
  // ===========================================================================
  test('7. Date Aggregation (Minggu Ini / Week): aggregates trips within 7 days', async () => {
    // Trip today
    const rideToday = 'r0000000-0000-0000-0000-000000073020';
    setupMockRide(rideToday, 'COMPLETED', 20000, driverProfileId);
    await driverEarningsService.recordEarningsFromRide(rideToday);

    // Trip 3 days ago (in this week)
    const threeDaysAgoIso = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: 'r0000000-0000-0000-0000-000000073021',
      grossAmount: 30000,
      platformFee: 4500,
      netAmount: 25500,
      periodDate: threeDaysAgoIso.slice(0, 10),
    });

    // Trip 14 days ago (outside this week)
    const twoWeeksAgoIso = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: 'r0000000-0000-0000-0000-000000073022',
      grossAmount: 50000,
      platformFee: 7500,
      netAmount: 42500,
      periodDate: twoWeeksAgoIso.slice(0, 10),
      createdAt: twoWeeksAgoIso,
    });

    const weekRes = await driverEarningsService.getDriverEarningsDashboard(driverProfileId, {
      period: 'week',
    });
    // Should include trip today and trip 3 days ago (2 trips), but NOT trip 14 days ago
    assert.equal(weekRes.totalTrips, 2);
    assert.equal(weekRes.totalGross, 50000); // 20000 + 30000
    assert.equal(weekRes.totalFee, 7500);   // 3000 + 4500
    assert.equal(weekRes.totalNet, 42500);   // 17000 + 25500
  });

  // ===========================================================================
  // TEST 8: DATE AGGREGATION — BULAN INI / MONTH
  // ===========================================================================
  test('8. Date Aggregation (Bulan Ini / Month): aggregates trips within current calendar month', async () => {
    const thisMonthPrefix = new Date().toISOString().slice(0, 7);

    // Trip 1 today
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: 'r0000000-0000-0000-0000-000000073030',
      grossAmount: 20000,
      platformFee: 3000,
      netAmount: 17000,
      periodDate: `${thisMonthPrefix}-02`,
    });

    // Trip 2 earlier this month
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: 'r0000000-0000-0000-0000-000000073031',
      grossAmount: 40000,
      platformFee: 6000,
      netAmount: 34000,
      periodDate: `${thisMonthPrefix}-05`,
    });

    // Trip last year
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: 'r0000000-0000-0000-0000-000000073032',
      grossAmount: 100000,
      platformFee: 15000,
      netAmount: 85000,
      periodDate: '2025-01-15',
      createdAt: '2025-01-15T10:00:00.000Z',
    });

    const monthRes = await driverEarningsService.getDriverEarningsDashboard(driverProfileId, {
      period: 'month',
    });
    assert.equal(monthRes.totalTrips, 2);
    assert.equal(monthRes.totalGross, 60000);
    assert.equal(monthRes.totalFee, 9000);
    assert.equal(monthRes.totalNet, 51000);
  });

  // ===========================================================================
  // TEST 9: DATE AGGREGATION — ALL-TIME & SINGLE SOURCE OF TRUTH
  // ===========================================================================
  test('9. All-Time Aggregation: ledger account balance strictly matches total net earnings', async () => {
    const ride1 = 'r0000000-0000-0000-0000-000000073040';
    const ride2 = 'r0000000-0000-0000-0000-000000073041';
    setupMockRide(ride1, 'COMPLETED', 20000);
    setupMockRide(ride2, 'COMPLETED', 30000);

    await driverEarningsService.recordEarningsFromRide(ride1);
    await driverEarningsService.recordEarningsFromRide(ride2);

    const allTimeRes = await driverEarningsService.getDriverEarningsDashboard(driverProfileId, {
      period: 'all-time',
    });

    assert.equal(allTimeRes.totalTrips, 2);
    assert.equal(allTimeRes.totalGross, 50000);
    assert.equal(allTimeRes.totalFee, 7500);
    assert.equal(allTimeRes.totalNet, 42500);
    assert.equal(allTimeRes.authoritativeSource, 'LEDGER');
    assert.equal(allTimeRes.ledgerBalance, 42500);
  });

  // ===========================================================================
  // TEST 10: MULTI-PERIOD DASHBOARD SUMMARY
  // ===========================================================================
  test('10. Multi-Period Summary: returns unified summary for today, week, month, and all-time cards', async () => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthPrefix = todayStr.slice(0, 7);

    // Trip today: Rp 20,000
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: 'r0000000-0000-0000-0000-000000073050',
      grossAmount: 20000,
      platformFee: 3000,
      netAmount: 17000,
      periodDate: todayStr,
    });

    // Trip 4 days ago: Rp 30,000
    const fourDaysAgoStr = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: 'r0000000-0000-0000-0000-000000073051',
      grossAmount: 30000,
      platformFee: 4500,
      netAmount: 25500,
      periodDate: fourDaysAgoStr,
      createdAt: fourDaysAgoStr + 'T12:00:00.000Z',
    });

    const summary = await driverEarningsService.getDriverEarningsMultiPeriodSummary(driverProfileId);

    assert.equal(summary.driverId, driverProfileId);
    assert.equal(summary.authoritativeSource, 'LEDGER');

    // Today card
    assert.equal(summary.today.totalTrips, 1);
    assert.equal(summary.today.totalGross, 20000);
    assert.equal(summary.today.totalNet, 17000);

    // This week card
    assert.equal(summary.thisWeek.totalTrips, 2);
    assert.equal(summary.thisWeek.totalGross, 50000);
    assert.equal(summary.thisWeek.totalNet, 42500);

    // All-time card
    assert.equal(summary.allTime.totalTrips, 2);
    assert.equal(summary.allTime.totalGross, 50000);
    assert.equal(summary.allTime.totalNet, 42500);
  });
});

/**
 * KAWAI 0511 - Phase 7.4 Acceptance Tests
 * Passenger & Driver Trip History Engine: Data Isolation, Pagination, Sorting & Security
 *
 * Mandatory Verification Tests:
 * 1. Passenger isolation: Passenger only sees their own rides. Cannot view other passengers' rides or driver earnings.
 * 2. Driver isolation: Driver only sees rides assigned to them. Cannot view other drivers' rides.
 * 3. Pagination: Accurate page slicing, total count, totalPages, hasNextPage, and hasPrevPage.
 * 4. Sorting: Default newest first (createdAt DESC) and verified descending chronological order.
 * 5. Empty history: Users with zero rides receive valid empty list (total: 0, items: []) without error.
 * 6. Unauthorized access: Unauthenticated requests rejected (401) and cross-user detail access rejected (403).
 * 7. Zero sensitive leakage: Strictly NO password, passwordHash, token, tokenHash, OTP, or secrets exposed.
 * 8. Status & Date filtering: Filters by ride status (COMPLETED, CANCELLED) and date ranges.
 * 9. Composite joins: Accurately joins payment, rating, fare breakdown, and safe summaries.
 * 10. Controller integration & Admin audit: Controller returns compliant DTO; Admin can audit rides.
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TripHistoryRepository } from '../src/ride/trip-history.repository';
import { TripHistoryService } from '../src/ride/trip-history.service';
import { RideController } from '../src/ride/ride.controller';
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
import { RatingRepository } from '../src/rating/rating.repository';
import { DriverEarningsLedgerRepository } from '../src/payment/driver-earnings-ledger.repository';
import { PaymentService } from '../src/payment/payment.service';
import { LedgerService } from '../src/payment/ledger.service';
import { SettlementService } from '../src/payment/settlement.service';
import { AuthService } from '../src/auth/auth.service';
import { MockOtpProvider } from '../src/auth/providers/mock-otp.provider';

describe('Phase 7.4: Passenger & Driver Trip History — Data Isolation, Pagination & Security', () => {
  let rideService: RideService;
  let ratingRepo: RatingRepository;
  let earningsRepo: DriverEarningsLedgerRepository;
  let paymentService: PaymentService;
  let authService: AuthService;
  let driverService: DriverService;
  let historyRepo: TripHistoryRepository;
  let historyService: TripHistoryService;
  let rideController: RideController;

  const passengerAId = 'b0000000-0000-0000-0000-000000000002'; // Arief Laksono
  const passengerBId = 'b0000000-0000-0000-0000-000000000088'; // Second passenger
  const driverAProfileId = 'd0000000-0000-0000-0000-000000000001'; // Ahmad Gazali
  const driverBProfileId = 'd0000000-0000-0000-0000-000000000002'; // Second driver
  const adminId = 'a0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    ratingRepo = new RatingRepository();
    earningsRepo = new DriverEarningsLedgerRepository();

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

    const storageProvider = new LocalDocumentStorageProvider();
    driverService = new DriverService(driverEligibilityService, storageProvider);

    const otpProvider = new MockOtpProvider();
    authService = new AuthService(otpProvider);

    const ledgerService = new LedgerService();
    const settlementService = new SettlementService(ledgerService, rideService);
    paymentService = new PaymentService(ledgerService, settlementService, rideService);

    historyRepo = new TripHistoryRepository(
      rideService,
      ratingRepo,
      earningsRepo,
      paymentService,
      authService,
      driverService
    );

    historyService = new TripHistoryService(historyRepo);
    rideController = new RideController(rideService, undefined, historyService);

    // Clear sample seeded rides for clean deterministic tests
    (rideService as any).rides.clear();
  });

  const createTestRide = (
    rideId: string,
    pId: string,
    dId: string | undefined,
    status: 'COMPLETED' | 'CANCELLED' | 'IN_TRIP' = 'COMPLETED',
    totalFare: number = 20000,
    createdOffsetMs: number = 0
  ): RideOrder => {
    const createdAt = new Date(Date.now() - createdOffsetMs).toISOString();
    const ride: RideOrder = {
      id: rideId,
      passengerId: pId,
      driverId: dId,
      pickupAddress: 'Jl. Ahmad Yani Km 2, Banjarmasin',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'Jl. Lambung Mangkurat, Banjarmasin',
      destinationLat: -3.3225,
      destinationLng: 114.5942,
      distanceKm: 4.5,
      durationMinutes: 15,
      totalFare,
      fareSnapshot: {
        baseFare: 7000,
        perKmRate: 2200,
        perMinuteRate: 200,
        minimumFare: 10000,
        distanceKm: 4.5,
        durationMinutes: 15,
        distanceFare: 9900,
        durationFare: 3000,
        rawFare: 19900,
        totalFare,
        calculatedAt: createdAt,
      },
      status,
      version: 5,
      currentAttemptNumber: 1,
      attemptedDriverIds: dId ? [dId] : [],
      createdAt,
      assignedAt: dId ? new Date(new Date(createdAt).getTime() + 60000).toISOString() : undefined,
      arrivedAt: dId ? new Date(new Date(createdAt).getTime() + 180000).toISOString() : undefined,
      startedAt: dId ? new Date(new Date(createdAt).getTime() + 240000).toISOString() : undefined,
      completedAt: status === 'COMPLETED' ? new Date(new Date(createdAt).getTime() + 900000).toISOString() : undefined,
      cancelledAt: status === 'CANCELLED' ? new Date(new Date(createdAt).getTime() + 120000).toISOString() : undefined,
      updatedAt: createdAt,
      driver: dId
        ? {
            id: dId,
            name: dId === driverAProfileId ? 'Ahmad Gazali' : 'Bambang Sudirman',
            phone: '+6281390511200',
            vehiclePlate: 'DA 5110 KAW',
            vehicleModel: 'Honda Vario 160',
            rating: 4.9,
          }
        : undefined,
    };

    (rideService as any).rides.set(rideId, ride);
    return ride;
  };

  // ===========================================================================
  // TEST 1: PASSENGER ISOLATION
  // ===========================================================================
  test('1. Passenger isolation: Passenger only sees own rides and driver earnings are hidden', async () => {
    // Passenger A has Ride 1 & Ride 2
    createTestRide('ride-pA-1', passengerAId, driverAProfileId, 'COMPLETED', 15000, 3600000);
    createTestRide('ride-pA-2', passengerAId, driverAProfileId, 'COMPLETED', 22000, 1800000);

    // Passenger B has Ride 3
    createTestRide('ride-pB-3', passengerBId, driverBProfileId, 'COMPLETED', 30000, 900000);

    // Record driver earnings on ride-pA-1
    await earningsRepo.recordEarnings({
      driverId: driverAProfileId,
      rideId: 'ride-pA-1',
      grossAmount: 15000,
      platformFee: 2250,
      netAmount: 12750,
    });

    // Passenger A queries history
    const resultA = await historyService.getTripHistory({
      id: passengerAId,
      role: 'CUSTOMER',
    });

    assert.equal(resultA.total, 2);
    assert.equal(resultA.items.length, 2);
    assert.ok(resultA.items.every((item) => item.passengerId === passengerAId));
    assert.equal(resultA.items.some((item) => item.rideId === 'ride-pB-3'), false);

    // Passenger must NOT see driver earnings ledger breakdown
    const itemWithEarnings = resultA.items.find((i) => i.rideId === 'ride-pA-1');
    assert.ok(itemWithEarnings);
    assert.equal(itemWithEarnings.earnings, undefined);

    // Passenger A attempting to view Passenger B's ride detail throws 403 Forbidden
    await assert.rejects(
      async () => {
        await historyService.getTripDetail('ride-pB-3', {
          id: passengerAId,
          role: 'CUSTOMER',
        });
      },
      ForbiddenException,
      'Passenger cannot view another passenger trip detail'
    );
  });

  // ===========================================================================
  // TEST 2: DRIVER ISOLATION
  // ===========================================================================
  test('2. Driver isolation: Driver only sees rides assigned to them and receives safe passenger summary', async () => {
    // Driver A has Ride 1
    createTestRide('ride-dA-1', passengerAId, driverAProfileId, 'COMPLETED', 18000, 3600000);
    // Driver B has Ride 2
    createTestRide('ride-dB-2', passengerBId, driverBProfileId, 'COMPLETED', 25000, 1800000);

    // Record driver earnings on ride-dA-1
    await earningsRepo.recordEarnings({
      driverId: driverAProfileId,
      rideId: 'ride-dA-1',
      grossAmount: 18000,
      platformFee: 2700,
      netAmount: 15300,
    });

    // Driver A queries history
    const resultDriverA = await historyService.getTripHistory({
      id: driverAProfileId,
      role: 'DRIVER',
      driverId: driverAProfileId,
    });

    assert.equal(resultDriverA.total, 1);
    assert.equal(resultDriverA.items.length, 1);
    assert.equal(resultDriverA.items[0].rideId, 'ride-dA-1');
    assert.equal(resultDriverA.items[0].driverId, driverAProfileId);

    // Driver sees earnings for their own ride
    assert.ok(resultDriverA.items[0].earnings);
    assert.equal(resultDriverA.items[0].earnings?.grossAmount, 18000);
    assert.equal(resultDriverA.items[0].earnings?.netAmount, 15300);

    // Driver A attempting to view Driver B's ride detail throws 403 Forbidden
    await assert.rejects(
      async () => {
        await historyService.getTripDetail('ride-dB-2', {
          id: driverAProfileId,
          role: 'DRIVER',
          driverId: driverAProfileId,
        });
      },
      ForbiddenException,
      'Driver cannot view another driver trip detail'
    );
  });

  // ===========================================================================
  // TEST 3: PAGINATION
  // ===========================================================================
  test('3. Pagination: handles multi-page slicing, total count, totalPages, and boundary flags', async () => {
    // Create 5 completed rides for Passenger A
    for (let i = 1; i <= 5; i++) {
      createTestRide(`ride-page-${i}`, passengerAId, driverAProfileId, 'COMPLETED', 10000 * i, (6 - i) * 600000);
    }

    const user = { id: passengerAId, role: 'CUSTOMER' as const };

    // Page 1 with limit 2
    const page1 = await historyService.getTripHistory(user, { page: 1, limit: 2 });
    assert.equal(page1.total, 5);
    assert.equal(page1.items.length, 2);
    assert.equal(page1.page, 1);
    assert.equal(page1.totalPages, 3);
    assert.equal(page1.pagination.hasNextPage, true);
    assert.equal(page1.pagination.hasPrevPage, false);

    // Page 2 with limit 2
    const page2 = await historyService.getTripHistory(user, { page: 2, limit: 2 });
    assert.equal(page2.total, 5);
    assert.equal(page2.items.length, 2);
    assert.equal(page2.page, 2);
    assert.equal(page2.pagination.hasNextPage, true);
    assert.equal(page2.pagination.hasPrevPage, true);

    // Page 3 with limit 2
    const page3 = await historyService.getTripHistory(user, { page: 3, limit: 2 });
    assert.equal(page3.total, 5);
    assert.equal(page3.items.length, 1);
    assert.equal(page3.page, 3);
    assert.equal(page3.pagination.hasNextPage, false);
    assert.equal(page3.pagination.hasPrevPage, true);

    // Verify non-overlapping items across pages
    const idsPage1 = page1.items.map((i) => i.rideId);
    const idsPage2 = page2.items.map((i) => i.rideId);
    const idsPage3 = page3.items.map((i) => i.rideId);

    const allIds = [...idsPage1, ...idsPage2, ...idsPage3];
    assert.equal(allIds.length, 5);
    const uniqueIds = new Set(allIds);
    assert.equal(uniqueIds.size, 5);
  });

  // ===========================================================================
  // TEST 4: SORTING
  // ===========================================================================
  test('4. Sorting: default newest first (createdAt DESC) and supports asc/desc ordering', async () => {
    // 3 rides created at 3 hours ago, 1 hour ago, and 5 minutes ago
    createTestRide('ride-old', passengerAId, driverAProfileId, 'COMPLETED', 12000, 10800000); // 3h ago
    createTestRide('ride-middle', passengerAId, driverAProfileId, 'COMPLETED', 15000, 3600000); // 1h ago
    createTestRide('ride-newest', passengerAId, driverAProfileId, 'COMPLETED', 20000, 300000); // 5m ago

    const user = { id: passengerAId, role: 'CUSTOMER' as const };

    // Default query -> newest first
    const defaultSort = await historyService.getTripHistory(user);
    assert.equal(defaultSort.items[0].rideId, 'ride-newest');
    assert.equal(defaultSort.items[1].rideId, 'ride-middle');
    assert.equal(defaultSort.items[2].rideId, 'ride-old');

    // Ascending query -> oldest first
    const ascSort = await historyService.getTripHistory(user, { sortOrder: 'asc' });
    assert.equal(ascSort.items[0].rideId, 'ride-old');
    assert.equal(ascSort.items[1].rideId, 'ride-middle');
    assert.equal(ascSort.items[2].rideId, 'ride-newest');
  });

  // ===========================================================================
  // TEST 5: EMPTY HISTORY
  // ===========================================================================
  test('5. Empty history: returns empty list with valid pagination metadata and zero errors', async () => {
    const emptyUser = { id: 'b0000000-0000-0000-0000-000000000999', role: 'CUSTOMER' as const };

    const result = await historyService.getTripHistory(emptyUser);

    assert.equal(result.total, 0);
    assert.equal(result.items.length, 0);
    assert.equal(result.page, 1);
    assert.equal(result.totalPages, 0);
    assert.equal(result.pagination.hasNextPage, false);
    assert.equal(result.pagination.hasPrevPage, false);
  });

  // ===========================================================================
  // TEST 6: UNAUTHORIZED ACCESS
  // ===========================================================================
  test('6. Unauthorized access: unauthenticated requests rejected (401) and unauthorized details rejected (403)', async () => {
    // 1. Missing or undefined user throws UnauthorizedException
    await assert.rejects(
      async () => {
        await historyService.getTripHistory(undefined as any);
      },
      UnauthorizedException,
      'Unauthenticated history query must throw UnauthorizedException'
    );

    await assert.rejects(
      async () => {
        await historyService.getTripDetail('ride-any-id', null as any);
      },
      UnauthorizedException,
      'Unauthenticated detail lookup must throw UnauthorizedException'
    );

    // 2. Non-existent ride throws NotFoundException
    await assert.rejects(
      async () => {
        await historyService.getTripDetail('ride-does-not-exist', {
          id: passengerAId,
          role: 'CUSTOMER',
        });
      },
      NotFoundException,
      'Non-existent ride detail must throw NotFoundException'
    );
  });

  // ===========================================================================
  // TEST 7: ZERO SENSITIVE LEAKAGE
  // ===========================================================================
  test('7. Zero sensitive leakage: no OTP, passwords, tokens, or secrets exposed in trip history', async () => {
    createTestRide('ride-leak-check', passengerAId, driverAProfileId, 'COMPLETED', 25000, 600000);

    const passengerResult = await historyService.getTripHistory({
      id: passengerAId,
      role: 'CUSTOMER',
    });

    const driverResult = await historyService.getTripHistory({
      id: driverAProfileId,
      role: 'DRIVER',
      driverId: driverAProfileId,
    });

    const stringifiedPassenger = JSON.stringify(passengerResult);
    const stringifiedDriver = JSON.stringify(driverResult);

    const forbiddenKeys = [
      'password',
      'passwordHash',
      'otpHash',
      'tokenHash',
      'refreshToken',
      'accessToken',
      'secret',
    ];

    for (const key of forbiddenKeys) {
      assert.equal(
        stringifiedPassenger.includes(`"${key}"`),
        false,
        `Passenger view must not leak sensitive key: ${key}`
      );
      assert.equal(
        stringifiedDriver.includes(`"${key}"`),
        false,
        `Driver view must not leak sensitive key: ${key}`
      );
    }

    // Verify safe summaries
    const pItem = passengerResult.items[0];
    assert.ok(pItem.driver);
    assert.equal(pItem.driver?.name, 'Ahmad Gazali');
    assert.equal(pItem.driver?.vehiclePlate, 'DA 5110 KAW');

    const dItem = driverResult.items[0];
    assert.ok(dItem.passenger);
    assert.equal(dItem.passenger?.fullName, 'Arief Laksono');
    // Masked phone format verified
    if (dItem.passenger?.phoneNumber) {
      assert.ok(dItem.passenger.phoneNumber.includes('****'));
    }
  });

  // ===========================================================================
  // TEST 8: STATUS & DATE FILTERING
  // ===========================================================================
  test('8. Status & Date filtering: filters accurately by status and date boundaries', async () => {
    // 2 Completed, 1 Cancelled
    createTestRide('ride-stat-1', passengerAId, driverAProfileId, 'COMPLETED', 20000, 7200000); // 2h ago
    createTestRide('ride-stat-2', passengerAId, driverAProfileId, 'COMPLETED', 22000, 3600000); // 1h ago
    createTestRide('ride-stat-3', passengerAId, undefined, 'CANCELLED', 10000, 1800000); // 30m ago

    const user = { id: passengerAId, role: 'CUSTOMER' as const };

    // Filter COMPLETED
    const completedList = await historyService.getTripHistory(user, { status: 'COMPLETED' });
    assert.equal(completedList.total, 2);
    assert.ok(completedList.items.every((i) => i.status === 'COMPLETED'));

    // Filter CANCELLED
    const cancelledList = await historyService.getTripHistory(user, { status: 'CANCELLED' });
    assert.equal(cancelledList.total, 1);
    assert.equal(cancelledList.items[0].rideId, 'ride-stat-3');
    assert.equal(cancelledList.items[0].status, 'CANCELLED');

    // Date range filter
    const now = Date.now();
    const oneHourAgo = new Date(now - 3500000).toISOString();
    const future = new Date(now + 10000).toISOString();

    const dateFiltered = await historyService.getTripHistory(user, {
      startDate: oneHourAgo,
      endDate: future,
    });
    // Only ride-stat-3 (30m ago) falls in this window
    assert.equal(dateFiltered.total, 1);
    assert.equal(dateFiltered.items[0].rideId, 'ride-stat-3');
  });

  // ===========================================================================
  // TEST 9: COMPOSITE JOINS (PAYMENT, RATING, FARE)
  // ===========================================================================
  test('9. Composite joins: accurately binds payment, rating, fare breakdown, and coordinates', async () => {
    const rideId = 'ride-composite-full';
    createTestRide(rideId, passengerAId, driverAProfileId, 'COMPLETED', 18400, 3600000);

    // Add Rating
    await ratingRepo.create({
      rideId,
      reviewerId: passengerAId,
      reviewedUserId: driverAProfileId,
      driverId: driverAProfileId,
      score: 5.0,
      comment: 'Driver sangat ramah dan tepat waktu',
    });

    const detail = await historyService.getTripDetail(rideId, {
      id: passengerAId,
      role: 'CUSTOMER',
    });

    // Check ride coordinates & minimal data
    assert.equal(detail.rideId, rideId);
    assert.equal(detail.status, 'COMPLETED');
    assert.equal(detail.distanceKm, 4.5);
    assert.equal(detail.durationMinutes, 15);
    assert.equal(detail.pickup.address, 'Jl. Ahmad Yani Km 2, Banjarmasin');
    assert.equal(detail.destination.address, 'Jl. Lambung Mangkurat, Banjarmasin');

    // Check fare breakdown
    assert.equal(detail.fare.totalFare, 18400);
    assert.equal(detail.fare.baseFare, 7000);

    // Check joined rating
    assert.ok(detail.rating);
    assert.equal(detail.rating?.score, 5.0);
    assert.equal(detail.rating?.comment, 'Driver sangat ramah dan tepat waktu');

    // Check joined payment
    assert.ok(detail.payment);
    assert.equal(detail.payment?.status, 'PAID');
    assert.equal(detail.payment?.amount, 18400);
  });

  // ===========================================================================
  // TEST 10: CONTROLLER INTEGRATION & ADMIN AUDIT
  // ===========================================================================
  test('10. Controller integration & Admin audit: Controller returns compliant DTO and Admin can audit any ride', async () => {
    createTestRide('ride-admin-audit-1', passengerAId, driverAProfileId, 'COMPLETED', 20000, 600000);

    // 1. Controller test via Passenger mock request
    const mockPassengerReq = {
      user: {
        id: passengerAId,
        role: 'CUSTOMER',
      },
    };

    const controllerResult = await rideController.getTripHistory(mockPassengerReq, {
      page: 1,
      limit: 10,
    });

    assert.equal(controllerResult.total, 1);
    assert.equal(controllerResult.items[0].rideId, 'ride-admin-audit-1');
    assert.ok(controllerResult.pagination);

    // 2. Controller single detail test
    const controllerDetail = await rideController.getTripHistoryDetail(
      mockPassengerReq,
      'ride-admin-audit-1'
    );
    assert.equal(controllerDetail.rideId, 'ride-admin-audit-1');

    // 3. Admin user can audit this trip
    const adminDetail = await historyService.getTripDetail('ride-admin-audit-1', {
      id: adminId,
      role: 'ADMIN',
    });

    assert.equal(adminDetail.rideId, 'ride-admin-audit-1');
    assert.ok(adminDetail.passenger);
    assert.ok(adminDetail.driver);
  });
});

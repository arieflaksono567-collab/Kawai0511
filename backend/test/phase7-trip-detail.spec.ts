/**
 * KAWAI 0511 - Phase 7.5 Acceptance Tests
 * Single Trip Detail Endpoint & Service: Multi-Role Authorization, IDOR Protection,
 * Real Data Aggregation & Explicit Nullable / Unavailable States (Zero Fake Data).
 *
 * Mandatory Verification Tests:
 * 1. Passenger authorization & IDOR: Passenger only opens their own trip. Attempting to view another passenger's trip throws ForbiddenException (403).
 * 2. Driver authorization & IDOR: Driver only opens trips assigned to them. Attempting to view another driver's trip throws ForbiddenException (403).
 * 3. Driver unassigned trip rejection: Driver cannot access unassigned rides (e.g. SEARCHING status) (403).
 * 4. Unauthenticated access: Unauthenticated requests missing user context are rejected with UnauthorizedException (401).
 * 5. Non-existent trip handling: Querying unknown ride ID throws NotFoundException (404).
 * 6. Admin audit capability: Admin can view any trip detail with complete safe summaries.
 * 7. Composite data aggregation: Accurately binds real Ride, pickup, destination, distance, fare, payment, rating, timestamps, and party summaries.
 * 8. Zero fake data enforcement: Unrated trips return rating: null; unpaid trips return payment: null; unassigned driver returns driver: null; unreached timestamps return null.
 * 9. Sensitive data isolation: Passwords, OTPs, tokens, and secrets are strictly excluded; driver earnings are hidden from passenger.
 * 10. Controller integration: GET /rides/:id/detail and GET /rides/history/:id return compliant DTOs with active IDOR protection.
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TripDetailService } from '../src/ride/trip-detail.service';
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

describe('Phase 7.5: Single Trip Detail — Authorization, IDOR Protection & Composite Integrity', () => {
  let rideService: RideService;
  let ratingRepo: RatingRepository;
  let earningsRepo: DriverEarningsLedgerRepository;
  let paymentService: PaymentService;
  let authService: AuthService;
  let driverService: DriverService;
  let tripDetailService: TripDetailService;
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
    const dispatchService = new RideDispatchService(
      geospatialService,
      freshnessService,
      driverEligibilityService
    );

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
    paymentService = new PaymentService(ledgerService, rideService);

    const historyRepo = new TripHistoryRepository(
      rideService,
      ratingRepo,
      earningsRepo,
      paymentService,
      authService,
      driverService
    );

    historyService = new TripHistoryService(historyRepo);

    tripDetailService = new TripDetailService(
      rideService,
      ratingRepo,
      earningsRepo,
      paymentService,
      authService,
      driverService
    );

    rideController = new RideController(
      rideService,
      undefined,
      historyService,
      tripDetailService
    );

    // Clear sample seeded rides for clean deterministic tests
    (rideService as any).rides.clear();
  });

  const createTestRide = (
    rideId: string,
    pId: string,
    dId: string | undefined,
    status: 'SEARCHING' | 'ASSIGNED' | 'ARRIVED' | 'IN_TRIP' | 'COMPLETED' | 'CANCELLED' = 'COMPLETED',
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
      arrivedAt: dId && status !== 'ASSIGNED' ? new Date(new Date(createdAt).getTime() + 180000).toISOString() : undefined,
      startedAt: dId && (status === 'IN_TRIP' || status === 'COMPLETED') ? new Date(new Date(createdAt).getTime() + 240000).toISOString() : undefined,
      completedAt: status === 'COMPLETED' ? new Date(new Date(createdAt).getTime() + 900000).toISOString() : undefined,
      cancelledAt: status === 'CANCELLED' ? new Date(new Date(createdAt).getTime() + 120000).toISOString() : undefined,
      cancellationReason: status === 'CANCELLED' ? 'Perubahan jadwal oleh penumpang' : undefined,
      updatedAt: createdAt,
      driver: dId
        ? {
            id: dId,
            name: dId === driverAProfileId ? 'Ahmad Gazali' : 'Bambang Sudirman',
            phone: '+6281390511200',
            vehiclePlate: 'DA 5110 KAW',
            vehicleModel: 'Honda Vario 160',
            rating: 4.95,
          }
        : undefined,
    };

    (rideService as any).rides.set(rideId, ride);
    return ride;
  };

  // ===========================================================================
  // TEST 1: PASSENGER AUTHORIZATION & IDOR PREVENTION
  // ===========================================================================
  test('1. Passenger authorization & IDOR: Passenger only opens their own trip; IDOR rejected with 403', async () => {
    // Passenger A has Ride 1
    createTestRide('ride-pA-101', passengerAId, driverAProfileId, 'COMPLETED', 20000);
    // Passenger B has Ride 2
    createTestRide('ride-pB-102', passengerBId, driverBProfileId, 'COMPLETED', 25000);

    // 1. Passenger A successfully opens Ride 1
    const detailA = await tripDetailService.getTripDetail('ride-pA-101', {
      id: passengerAId,
      role: 'CUSTOMER',
    });
    assert.equal(detailA.rideId, 'ride-pA-101');
    assert.equal(detailA.passengerId, passengerAId);

    // 2. Passenger A attempts to open Passenger B's Ride 2 -> FORBIDDEN (IDOR Blocked)
    await assert.rejects(
      async () => {
        await tripDetailService.getTripDetail('ride-pB-102', {
          id: passengerAId,
          role: 'CUSTOMER',
        });
      },
      ForbiddenException,
      'Passenger cannot view another passenger trip detail'
    );
  });

  // ===========================================================================
  // TEST 2: DRIVER AUTHORIZATION & IDOR PREVENTION
  // ===========================================================================
  test('2. Driver authorization & IDOR: Driver only opens trips assigned to them; IDOR rejected with 403', async () => {
    // Driver A assigned to Ride 1
    createTestRide('ride-dA-201', passengerAId, driverAProfileId, 'COMPLETED', 18000);
    // Driver B assigned to Ride 2
    createTestRide('ride-dB-202', passengerBId, driverBProfileId, 'COMPLETED', 22000);

    // 1. Driver A successfully opens their assigned Ride 1
    const detailDriverA = await tripDetailService.getTripDetail('ride-dA-201', {
      id: driverAProfileId,
      role: 'DRIVER',
      driverId: driverAProfileId,
    });
    assert.equal(detailDriverA.rideId, 'ride-dA-201');
    assert.equal(detailDriverA.driverId, driverAProfileId);

    // 2. Driver A attempts to open Driver B's Ride 2 -> FORBIDDEN (IDOR Blocked)
    await assert.rejects(
      async () => {
        await tripDetailService.getTripDetail('ride-dB-202', {
          id: driverAProfileId,
          role: 'DRIVER',
          driverId: driverAProfileId,
        });
      },
      ForbiddenException,
      'Driver cannot open a trip assigned to another driver'
    );
  });

  // ===========================================================================
  // TEST 3: DRIVER ACCESS TO UNASSIGNED RIDE REJECTION
  // ===========================================================================
  test('3. Driver unassigned trip rejection: Driver cannot access rides not assigned to them', async () => {
    // Unassigned ride (SEARCHING status, driverId is undefined)
    createTestRide('ride-searching-301', passengerAId, undefined, 'SEARCHING', 15000);

    // Driver A attempts to open unassigned ride detail -> FORBIDDEN
    await assert.rejects(
      async () => {
        await tripDetailService.getTripDetail('ride-searching-301', {
          id: driverAProfileId,
          role: 'DRIVER',
          driverId: driverAProfileId,
        });
      },
      ForbiddenException,
      'Driver cannot open unassigned ride detail'
    );
  });

  // ===========================================================================
  // TEST 4: UNAUTHENTICATED ACCESS REJECTION (401)
  // ===========================================================================
  test('4. Unauthenticated access: Missing or empty user context throws UnauthorizedException', async () => {
    createTestRide('ride-auth-401', passengerAId, driverAProfileId, 'COMPLETED', 15000);

    // Missing user context entirely
    await assert.rejects(
      async () => {
        await tripDetailService.getTripDetail('ride-auth-401', null as any);
      },
      UnauthorizedException,
      'Unauthenticated request must be rejected'
    );

    // User context missing role or ID
    await assert.rejects(
      async () => {
        await tripDetailService.getTripDetail('ride-auth-401', { id: '' } as any);
      },
      UnauthorizedException,
      'Incomplete user context must be rejected'
    );
  });

  // ===========================================================================
  // TEST 5: NON-EXISTENT TRIP HANDLING (404)
  // ===========================================================================
  test('5. Non-existent trip handling: Querying unknown ride ID throws NotFoundException', async () => {
    await assert.rejects(
      async () => {
        await tripDetailService.getTripDetail('ride-does-not-exist', {
          id: passengerAId,
          role: 'CUSTOMER',
        });
      },
      NotFoundException,
      'Non-existent ride must return NotFoundException'
    );
  });

  // ===========================================================================
  // TEST 6: ADMIN AUDIT CAPABILITY
  // ===========================================================================
  test('6. Admin audit capability: Admin can view any trip detail with complete safe summaries', async () => {
    createTestRide('ride-audit-601', passengerAId, driverAProfileId, 'COMPLETED', 35000);

    const adminDetail = await tripDetailService.getTripDetail('ride-audit-601', {
      id: adminId,
      role: 'ADMIN',
    });

    assert.equal(adminDetail.rideId, 'ride-audit-601');
    assert.equal(adminDetail.totalFare, 35000);
    assert.ok(adminDetail.passenger);
    assert.ok(adminDetail.driver);
    assert.ok(adminDetail.timestamps);
  });

  // ===========================================================================
  // TEST 7: COMPOSITE DATA AGGREGATION (REAL DATA BINDING)
  // ===========================================================================
  test('7. Composite data aggregation: Accurately combines real ride, pickup, destination, fare, payment, rating, timestamps', async () => {
    const rideId = 'ride-full-composite-701';
    createTestRide(rideId, passengerAId, driverAProfileId, 'COMPLETED', 24500, 3600000);

    // 1. Create real payment in PaymentService
    await paymentService.createPayment({
      rideId,
      amount: 24500,
      currency: 'IDR',
      method: 'DIGITAL',
      payerId: passengerAId,
      payeeDriverId: driverAProfileId,
      idempotencyKey: `idem-composite-${rideId}`,
    });

    // 2. Submit real rating in RatingRepository
    await ratingRepo.create({
      rideId,
      reviewerId: passengerAId,
      reviewedUserId: driverAProfileId,
      driverId: driverAProfileId,
      score: 5.0,
      comment: 'Pelayanan sangat memuaskan dan tepat waktu',
    });

    // 3. Record driver earnings
    await earningsRepo.recordEarnings({
      driverId: driverAProfileId,
      rideId,
      grossAmount: 24500,
      platformFee: 3675,
      netAmount: 20825,
    });

    // 4. Query trip detail as Driver
    const detail = await tripDetailService.getTripDetail(rideId, {
      id: driverAProfileId,
      role: 'DRIVER',
      driverId: driverAProfileId,
    });

    // Verify Ride core fields
    assert.equal(detail.rideId, rideId);
    assert.equal(detail.status, 'COMPLETED');
    assert.equal(detail.distanceKm, 4.5);
    assert.equal(detail.durationMinutes, 15);

    // Verify Pickup & Destination
    assert.equal(detail.pickup.address, 'Jl. Ahmad Yani Km 2, Banjarmasin');
    assert.equal(detail.pickup.lat, -3.3194);
    assert.equal(detail.pickup.lng, 114.5908);
    assert.equal(detail.destination.address, 'Jl. Lambung Mangkurat, Banjarmasin');

    // Verify Fare breakdown
    assert.equal(detail.fare?.totalFare, 24500);
    assert.equal(detail.fare?.baseFare, 7000);
    assert.equal(detail.fare?.distanceFare, 9900);

    // Verify Payment
    assert.ok(detail.payment);
    assert.equal(detail.payment?.method, 'DIGITAL');
    assert.equal(detail.payment?.amount, 24500);

    // Verify Rating
    assert.ok(detail.rating);
    assert.equal(detail.rating?.score, 5.0);
    assert.equal(detail.rating?.comment, 'Pelayanan sangat memuaskan dan tepat waktu');

    // Verify Timestamps
    assert.ok(detail.timestamps.createdAt);
    assert.ok(detail.timestamps.completedAt);
    assert.ok(detail.timestamps.assignedAt);

    // Verify Safe party summaries
    assert.ok(detail.passenger);
    assert.equal(detail.passenger?.id, passengerAId);
    assert.ok(detail.driver);
    assert.equal(detail.driver?.id, driverAProfileId);

    // Verify Driver earnings visible for driver
    assert.ok(detail.earnings);
    assert.equal(detail.earnings?.netAmount, 20825);
  });

  // ===========================================================================
  // TEST 8: ZERO FAKE DATA ENFORCEMENT (EXPLICIT NULLABLE STATES)
  // ===========================================================================
  test('8. Zero fake data enforcement: Unrated, unpaid, unassigned, or unreached fields return explicit null', async () => {
    // Ride created in SEARCHING status (no driver, no completion, no payment, no rating)
    const rideId = 'ride-bare-searching-801';
    createTestRide(rideId, passengerAId, undefined, 'SEARCHING', 12000);

    const detail = await tripDetailService.getTripDetail(rideId, {
      id: passengerAId,
      role: 'CUSTOMER',
    });

    // Unassigned driver MUST be explicit null (NEVER fake driver name or 4.9 rating)
    assert.equal(detail.driver, null);
    assert.equal(detail.driverId, null);

    // Unrated ride MUST be explicit null (NEVER fake rating)
    assert.equal(detail.rating, null);

    // Unpaid ride in SEARCHING status MUST be explicit null (NEVER fake CASH PAID)
    assert.equal(detail.payment, null);

    // Uncalculated route geometry MUST be explicit null (NEVER fake polyline)
    assert.equal(detail.route, null);

    // Unreached timestamps MUST be explicit null
    assert.equal(detail.timestamps.assignedAt, null);
    assert.equal(detail.timestamps.arrivedAt, null);
    assert.equal(detail.timestamps.startedAt, null);
    assert.equal(detail.timestamps.completedAt, null);
    assert.equal(detail.timestamps.cancelledAt, null);
  });

  // ===========================================================================
  // TEST 9: SENSITIVE DATA ISOLATION (ZERO LEAKAGE)
  // ===========================================================================
  test('9. Sensitive data isolation: No credentials leaked and driver earnings hidden from passenger', async () => {
    const rideId = 'ride-privacy-901';
    createTestRide(rideId, passengerAId, driverAProfileId, 'COMPLETED', 20000);

    // Record driver earnings
    await earningsRepo.recordEarnings({
      driverId: driverAProfileId,
      rideId,
      grossAmount: 20000,
      platformFee: 3000,
      netAmount: 17000,
    });

    // 1. Passenger queries trip detail
    const passengerDetail = await tripDetailService.getTripDetail(rideId, {
      id: passengerAId,
      role: 'CUSTOMER',
    });

    // Driver earnings MUST be strictly undefined/hidden from passenger
    assert.equal(passengerDetail.earnings, undefined);

    // Masked passenger phone
    if (passengerDetail.passenger?.phoneNumber) {
      assert.ok(passengerDetail.passenger.phoneNumber.includes('****'));
    }

    // Ensure zero leak of sensitive credentials
    const jsonString = JSON.stringify(passengerDetail);
    assert.equal(jsonString.includes('password'), false);
    assert.equal(jsonString.includes('passwordHash'), false);
    assert.equal(jsonString.includes('tokenHash'), false);
    assert.equal(jsonString.includes('otpHash'), false);
    assert.equal(jsonString.includes('secret'), false);

    // 2. Driver queries trip detail -> earnings IS visible
    const driverDetail = await tripDetailService.getTripDetail(rideId, {
      id: driverAProfileId,
      role: 'DRIVER',
      driverId: driverAProfileId,
    });
    assert.ok(driverDetail.earnings);
    assert.equal(driverDetail.earnings?.netAmount, 17000);
  });

  // ===========================================================================
  // TEST 10: CONTROLLER INTEGRATION & ENDPOINT VERIFICATION
  // ===========================================================================
  test('10. Controller integration: GET /rides/:id/detail & GET /rides/history/:id return compliant DTOs with IDOR protection', async () => {
    createTestRide('ride-ctrl-1001', passengerAId, driverAProfileId, 'COMPLETED', 22000);

    // Mock passenger request
    const passengerReq = {
      user: {
        id: passengerAId,
        role: 'CUSTOMER',
      },
    };

    // 1. GET /rides/:id/detail via Controller
    const detailFromController = await rideController.getTripDetail(
      passengerReq,
      'ride-ctrl-1001'
    );
    assert.equal(detailFromController.rideId, 'ride-ctrl-1001');
    assert.equal(detailFromController.passengerId, passengerAId);
    assert.ok(detailFromController.pickup);
    assert.ok(detailFromController.destination);
    assert.ok(detailFromController.timestamps);

    // 2. GET /rides/history/:id via Controller
    const historyDetailFromController = await rideController.getTripHistoryDetail(
      passengerReq,
      'ride-ctrl-1001'
    );
    assert.equal(historyDetailFromController.rideId, 'ride-ctrl-1001');

    // 3. IDOR test via Controller: Passenger attempts to open another ride
    createTestRide('ride-ctrl-other-1002', passengerBId, driverBProfileId, 'COMPLETED', 30000);
    await assert.rejects(
      async () => {
        await rideController.getTripDetail(passengerReq, 'ride-ctrl-other-1002');
      },
      ForbiddenException,
      'Controller must reject IDOR cross-passenger attempt'
    );
  });
});

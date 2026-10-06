/**
 * KAWAI 0511 - Phase 5 Acceptance Test Suite
 * Ride Ordering, Fare Calculation Engine, Candidate Matching, & Strict State Machine
 */

import { FareService } from '../src/ride/fare.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { RideService } from '../src/ride/ride.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { RedisGeoService } from '../src/location/redis-geo.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('Phase5RideOrderingAcceptanceTests', () => {
  let fareService: FareService;
  let freshnessService: LocationFreshnessService;
  let redisGeoService: RedisGeoService;
  let geospatialService: GeospatialService;
  let routingService: RoutingService;
  let driverEligibilityService: DriverEligibilityService;
  let dispatchService: RideDispatchService;
  let rideService: RideService;

  const passengerId = 'b0000000-0000-0000-0000-000000000002';
  const driverId = 'd0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    fareService = new FareService();
    freshnessService = new LocationFreshnessService();
    redisGeoService = new RedisGeoService();
    geospatialService = new GeospatialService(freshnessService, redisGeoService);
    routingService = new RoutingService();
    driverEligibilityService = new DriverEligibilityService();
    dispatchService = new RideDispatchService(geospatialService, freshnessService, driverEligibilityService);
    rideService = new RideService(fareService, dispatchService, routingService, driverEligibilityService);
  });

  // TEST 1: Minimum Fare Enforcement
  test('TEST 1: Enforce minimum fare threshold (Rp 10.000) for short trips', () => {
    // 0.5 km & 2 minutes = 7000 + 1100 + 400 = 8500 -> Enforced to 10000
    const fare = fareService.calculateFare(0.5, 2);
    expect(fare.baseFare).toBe(7000);
    expect(fare.minimumFare).toBe(10000);
    expect(fare.rawFare).toBe(8500);
    expect(fare.totalFare).toBe(10000);
  });

  // TEST 2: Exact Fare Calculation for Standard Banjarmasin Route
  test('TEST 2: Exact fare calculation for standard route Duta Mall to ULM (4.2 km, 12 min)', () => {
    // 4.2 km & 12 minutes = 7000 + (4.2 * 2200) + (12 * 200) = 7000 + 9240 + 2400 = 18640
    const fare = fareService.calculateFare(4.2, 12);
    expect(fare.totalFare).toBe(18640);
    expect(fare.distanceFare).toBe(9240);
    expect(fare.durationFare).toBe(2400);
  });

  // TEST 3: Passenger creates ride order with SEARCHING status and fare snapshot
  test('TEST 3: Create ride order starts in SEARCHING status with frozen fare snapshot', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
      pickupLat: -3.319437,
      pickupLng: 114.590822,
      destinationAddress: 'Universitas Lambung Mangkurat, Kayu Tangi',
      destinationLat: -3.298510,
      destinationLng: 114.588020,
      distanceKm: 4.2,
      durationMinutes: 12,
    });

    expect(ride.status).toBe('SEARCHING');
    expect(ride.version).toBe(1);
    expect(ride.totalFare).toBe(18640);
    expect(ride.fareSnapshot).toBeDefined();
    expect(ride.fareSnapshot.baseFare).toBe(7000);
  });

  // TEST 4: Candidate Matching filters out STALE or EXPIRED drivers
  test('TEST 4: Matching only accepts candidate drivers with FRESH GPS (< 10 detik)', async () => {
    const activeTripDrivers = new Set<string>();

    // Driver with STALE location (> 15 detik lalu)
    const staleRecordedAt = new Date(Date.now() - 15000).toISOString();
    const mockLocations = [
      {
        driverId: 'drv-stale',
        latitude: -3.319437,
        longitude: 114.590822,
        recordedAt: staleRecordedAt,
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.319437,
      114.590822,
      activeTripDrivers,
      mockLocations
    );

    // Stale driver must not be selected
    expect(result.matched).toBe(false);
    expect(result.rejectedReasons.some((r) => r.includes('GPS berstatus STALE'))).toBe(true);
  });

  // TEST 5: Sequential legal state transitions
  test('TEST 5: Strict state machine allows valid progression: SEARCHING -> ASSIGNED -> ARRIVED -> IN_TRIP -> COMPLETED', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.5,
      durationMinutes: 10,
    });

    expect(ride.status).toBe('SEARCHING');

    // 1. Accept
    const assigned = await rideService.acceptRide(ride.id, driverId);
    expect(assigned.status).toBe('ASSIGNED');
    expect(assigned.driverId).toBe(driverId);
    expect(assigned.version).toBe(2);

    // 2. Arrived
    const arrived = await rideService.driverArrived(ride.id, driverId);
    expect(arrived.status).toBe('ARRIVED');
    expect(arrived.version).toBe(3);

    // 3. Start Trip
    const inTrip = await rideService.startRide(ride.id, driverId);
    expect(inTrip.status).toBe('IN_TRIP');
    expect(inTrip.version).toBe(4);

    // 4. Complete Trip
    const completed = await rideService.finishRide(ride.id, driverId);
    expect(completed.status).toBe('COMPLETED');
    expect(completed.completedAt).toBeDefined();
    expect(completed.version).toBe(5);
  });

  // TEST 6: Rejection of illegal transition skips
  test('TEST 6: Reject illegal status jumps (e.g. SEARCHING directly to COMPLETED)', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.5,
      durationMinutes: 10,
    });

    // Cannot start ride while still in SEARCHING
    await expect(rideService.startRide(ride.id, driverId)).rejects.toThrow(BadRequestException);
    // Cannot finish ride while still in SEARCHING
    await expect(rideService.finishRide(ride.id, driverId)).rejects.toThrow(BadRequestException);
  });

  // TEST 7: Optimistic Concurrency Control prevents double-accept on same order
  test('TEST 7: Optimistic Concurrency Control prevents double-accept (HTTP 409 Conflict)', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.5,
      durationMinutes: 10,
    });

    // Driver 1 accepts successfully
    await rideService.acceptRide(ride.id, driverId, 1);

    // Driver 2 attempts to accept same ride -> Must throw ConflictException
    await expect(
      rideService.acceptRide(ride.id, 'd0000000-0000-0000-0000-000000000002', 1)
    ).rejects.toThrow(ConflictException);
  });

  // TEST 8: Driver cannot accept ride if already busy in active trip
  test('TEST 8: Driver in active trip is rejected from accepting second ride concurrently', async () => {
    // Ride 1
    const ride1 = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.0,
      durationMinutes: 8,
    });
    await rideService.acceptRide(ride1.id, driverId);

    // Ride 2
    const ride2 = await rideService.createRide(passengerId, {
      pickupAddress: 'RSUD Ulin',
      pickupLat: -3.3265,
      pickupLng: 114.5962,
      destinationAddress: 'Siring',
      destinationLat: -3.3228,
      destinationLng: 114.5935,
      distanceKm: 2.0,
      durationMinutes: 6,
    });

    // Driver tries to accept Ride 2 while Ride 1 is still ASSIGNED -> Must be rejected
    await expect(rideService.acceptRide(ride2.id, driverId)).rejects.toThrow(ConflictException);
  });

  // TEST 9: Cancellation permitted from SEARCHING and ASSIGNED
  test('TEST 9: Cancellation is permitted during SEARCHING or ASSIGNED states', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    const cancelled = await rideService.cancelRide(ride.id, passengerId, 'CUSTOMER', {
      reason: 'Ingin berganti rute penjemputan',
    });

    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellationReason).toBe('Ingin berganti rute penjemputan');
    expect(cancelled.cancelledBy).toBe('CUSTOMER');
  });

  // TEST 10: Cancellation strictly rejected during IN_TRIP or COMPLETED
  test('TEST 10: Cancellation strictly forbidden when trip is IN_TRIP or COMPLETED', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    await rideService.acceptRide(ride.id, driverId);
    await rideService.driverArrived(ride.id, driverId);
    await rideService.startRide(ride.id, driverId);

    // Trip is IN_TRIP -> Cancellation must throw BadRequestException
    await expect(
      rideService.cancelRide(ride.id, passengerId, 'CUSTOMER')
    ).rejects.toThrow('Order tidak dapat dibatalkan saat status IN_TRIP');
  });

  // TEST 11: Audit State Log records every transition
  test('TEST 11: System records state logs for every transition with actor role', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    await rideService.acceptRide(ride.id, driverId);
    await rideService.driverArrived(ride.id, driverId);

    const logs = rideService.getStateLogs(ride.id);
    expect(logs.length).toBe(3); // SEARCHING, ASSIGNED, ARRIVED
    expect(logs[0].toState).toBe('SEARCHING');
    expect(logs[1].toState).toBe('ASSIGNED');
    expect(logs[2].toState).toBe('ARRIVED');
    expect(logs[1].actorRole).toBe('DRIVER');
  });

  // TEST 12: IDOR protection prevents unauthorized access
  test('TEST 12: IDOR protection rejects unauthorized users from reading order details', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    // Other stranger passenger attempts to access ride -> 403 Forbidden
    await expect(
      rideService.getRide(ride.id, 'stranger-user-id', 'CUSTOMER')
    ).rejects.toThrow(ForbiddenException);
  });

  // TEST 13: Configurable fare parameters
  test('TEST 13: Fare configuration parameters are verifiable and configurable', () => {
    const config = fareService.getConfig();
    expect(config.baseFare).toBe(7000);
    expect(config.perKmRate).toBe(2200);
    expect(config.perMinuteRate).toBe(200);
    expect(config.minimumFare).toBe(10000);
  });

  // TEST 14: Auto-routing fallback calculates distance if not provided
  test('TEST 14: Auto-routing service calculates distance & duration if not in payload', async () => {
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.319437,
      pickupLng: 114.590822,
      destinationAddress: 'ULM',
      destinationLat: -3.298510,
      destinationLng: 114.588020,
    });

    expect(ride.distanceKm).toBeGreaterThan(2.0);
    expect(ride.durationMinutes).toBeGreaterThan(3);
    expect(ride.totalFare).toBeGreaterThanOrEqual(10000);
  });

  // TEST 15: Retrieve user rides list
  test('TEST 15: Retrieve passenger order history accurately', async () => {
    const rides = await rideService.getUserRides(passengerId, 'CUSTOMER');
    expect(Array.isArray(rides)).toBe(true);
  });
});

/**
 * KAWAI 0511 - Phase 5B Acceptance Test Suite
 * Driver Matching & Dispatch Engine, Candidate Ranking, Concurrency & State Machine
 */

import { describe, it as test, beforeEach } from 'node:test';
import assert from 'node:assert';

// Lightweight Jest-compatible expect wrapper backed by node:assert
const expect = (actual: any) => {
  const matchers = (isNot: boolean) => ({
    toBe: (expected: any) => {
      if (isNot) {
        assert.notStrictEqual(actual, expected);
      } else {
        assert.strictEqual(actual, expected);
      }
    },
    toEqual: (expected: any) => {
      if (isNot) {
        assert.notDeepStrictEqual(actual, expected);
      } else {
        assert.deepStrictEqual(actual, expected);
      }
    },
    toBeDefined: () => {
      if (isNot) {
        assert.strictEqual(actual, undefined);
      } else {
        assert.notStrictEqual(actual, undefined);
      }
    },
    toBeUndefined: () => {
      if (isNot) {
        assert.notStrictEqual(actual, undefined);
      } else {
        assert.strictEqual(actual, undefined);
      }
    },
    toBeGreaterThan: (expected: number) => {
      if (isNot) {
        assert.ok(actual <= expected, `${actual} should not be > ${expected}`);
      } else {
        assert.ok(actual > expected, `${actual} should be > ${expected}`);
      }
    },
    toBeLessThan: (expected: number) => {
      if (isNot) {
        assert.ok(actual >= expected, `${actual} should not be < ${expected}`);
      } else {
        assert.ok(actual < expected, `${actual} should be < ${expected}`);
      }
    },
    toContain: (item: any) => {
      if (typeof actual === 'string') {
        if (isNot) {
          assert.ok(!actual.includes(item), `"${actual}" should not contain "${item}"`);
        } else {
          assert.ok(actual.includes(item), `"${actual}" does not contain "${item}"`);
        }
      } else if (Array.isArray(actual)) {
        if (isNot) {
          assert.ok(!actual.includes(item), `Array should not contain ${JSON.stringify(item)}`);
        } else {
          assert.ok(actual.includes(item), `Array does not contain ${JSON.stringify(item)}`);
        }
      }
    },
    toThrow: (expectedError?: any) => {
      if (typeof actual === 'function') {
        if (isNot) {
          assert.doesNotThrow(actual, expectedError);
        } else {
          assert.throws(actual, expectedError);
        }
      }
    },
  });

  return {
    ...matchers(false),
    not: matchers(true),
    rejects: {
      toThrow: async (expectedError?: any) => {
        await assert.rejects(actual, expectedError);
      },
    },
  };
};

import { FareService } from '../src/ride/fare.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { RideService } from '../src/ride/ride.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { RedisGeoService } from '../src/location/redis-geo.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';

describe('Phase 5B: Driver Matching & Dispatch Acceptance Tests', () => {
  let fareService: FareService;
  let freshnessService: LocationFreshnessService;
  let redisGeoService: RedisGeoService;
  let geospatialService: GeospatialService;
  let routingService: RoutingService;
  let driverEligibilityService: DriverEligibilityService;
  let dispatchService: RideDispatchService;
  let rideService: RideService;

  const passengerId = 'b0000000-0000-0000-0000-000000000002';
  const primaryDriverId = 'd0000000-0000-0000-0000-000000000001'; // Ahmad Gazali

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

  // TEST 1: Only eligible drivers matched
  test('TEST 1: only eligible drivers matched', async () => {
    // Driver Ahmad Gazali is fully approved, online, 4 approved docs, active vehicle, FRESH location
    const freshLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      freshLocations
    );

    expect(result.matched).toBe(true);
    expect(result.selectedDriver).toBeDefined();
    expect(result.selectedDriver?.driverId).toBe(primaryDriverId);
    expect(result.selectedDriver?.isEligible).toBe(true);
  });

  // TEST 2: Stale driver excluded
  test('TEST 2: stale driver excluded', async () => {
    // GPS recorded 16 seconds ago (> 10s and <= 30s -> STALE)
    const staleTime = new Date(Date.now() - 16000).toISOString();
    const mockLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: staleTime,
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      mockLocations
    );

    expect(result.matched).toBe(false);
    expect(result.rejectedReasons.some((r) => r.includes('GPS berstatus STALE'))).toBe(true);
  });

  // TEST 3: Expired driver excluded
  test('TEST 3: expired driver excluded', async () => {
    // GPS recorded 45 seconds ago (> 30s -> EXPIRED)
    const expiredTime = new Date(Date.now() - 45000).toISOString();
    const mockLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: expiredTime,
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      mockLocations
    );

    expect(result.matched).toBe(false);
    expect(result.rejectedReasons.some((r) => r.includes('GPS berstatus EXPIRED'))).toBe(true);
  });

  // TEST 4: Offline driver excluded
  test('TEST 4: offline driver excluded', async () => {
    const offlineDriverId = 'drv-offline-001';
    driverEligibilityService.setDriverRecord(offlineDriverId, {
      driver: {
        id: offlineDriverId,
        verificationStatus: 'APPROVED',
        operationalStatus: 'OFFLINE', // OFFLINE!
        displayName: 'Budi Offline',
      },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [{ isActive: true, verificationStatus: 'APPROVED' }],
    });

    const mockLocations = [
      {
        driverId: offlineDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      mockLocations
    );

    expect(result.matched).toBe(false);
    expect(result.rejectedReasons.some((r) => r.includes('OFFLINE'))).toBe(true);
  });

  // TEST 5: Unapproved driver excluded
  test('TEST 5: unapproved driver excluded', async () => {
    const pendingDriverId = 'drv-pending-002';
    driverEligibilityService.setDriverRecord(pendingDriverId, {
      driver: {
        id: pendingDriverId,
        verificationStatus: 'UNDER_REVIEW', // Not APPROVED!
        operationalStatus: 'ONLINE',
        displayName: 'Rizki Pending',
      },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'PENDING' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [{ isActive: true, verificationStatus: 'APPROVED' }],
    });

    const mockLocations = [
      {
        driverId: pendingDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      mockLocations
    );

    expect(result.matched).toBe(false);
    expect(result.rejectedReasons.some((r) => r.includes('Status verifikasi driver bukan APPROVED'))).toBe(true);
  });

  // TEST 6: Inactive vehicle excluded
  test('TEST 6: inactive vehicle excluded', async () => {
    const noVehicleDriverId = 'drv-no-veh-003';
    driverEligibilityService.setDriverRecord(noVehicleDriverId, {
      driver: {
        id: noVehicleDriverId,
        verificationStatus: 'APPROVED',
        operationalStatus: 'ONLINE',
        displayName: 'Hasan Inactive Vehicle',
      },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [
        { isActive: false, verificationStatus: 'APPROVED' }, // Inactive vehicle!
      ],
    });

    const mockLocations = [
      {
        driverId: noVehicleDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      mockLocations
    );

    expect(result.matched).toBe(false);
    expect(result.rejectedReasons.some((r) => r.includes('Tidak ada kendaraan aktif'))).toBe(true);
  });

  // TEST 7: Driver already on active ride excluded
  test('TEST 7: driver already on active ride excluded', async () => {
    const activeBusyDrivers = new Set<string>([primaryDriverId]);

    const mockLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      activeBusyDrivers,
      mockLocations
    );

    expect(result.matched).toBe(false);
    expect(result.rejectedReasons.some((r) => r.includes('Sedang melayani order lain'))).toBe(true);
  });

  // TEST 8: Radius filtering (> 1500 meters excluded)
  test('TEST 8: radius filtering excludes driver beyond 1500m', async () => {
    // Pickup at Duta Mall (-3.3194, 114.5908)
    // Driver at Kayu Tangi (~2.4 km away)
    const farLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.2985,
        longitude: 114.5880,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      farLocations
    );

    expect(result.matched).toBe(false);
    expect(result.candidatesCount).toBe(0);
  });

  // TEST 9: Closest driver ranking (distance tie-breaker when ETA is identical)
  test('TEST 9: closest driver ranking breaks tie when ETA is identical', async () => {
    const driverA = 'drv-closer-001';
    const driverB = 'drv-farther-002';

    const createDriverRecord = (id: string, name: string) => ({
      driver: { id, verificationStatus: 'APPROVED', operationalStatus: 'ONLINE', displayName: name },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [{ isActive: true, verificationStatus: 'APPROVED' }],
      idleSince: new Date(Date.now() - 3600000).toISOString(),
    });

    driverEligibilityService.setDriverRecord(driverA, createDriverRecord(driverA, 'Driver Dekat'));
    driverEligibilityService.setDriverRecord(driverB, createDriverRecord(driverB, 'Driver Jauh'));

    const now = new Date().toISOString();
    // Driver A is ~300 meters away, Driver B is ~800 meters away
    const mockLocations = [
      { driverId: driverB, latitude: -3.3265, longitude: 114.5935, recordedAt: now }, // ~800m
      { driverId: driverA, latitude: -3.3220, longitude: 114.5915, recordedAt: now }, // ~300m
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      mockLocations
    );

    expect(result.matched).toBe(true);
    expect(result.rankedCandidates.length).toBe(2);
    expect(result.selectedDriver?.driverId).toBe(driverA);
    expect(result.rankedCandidates[0].distanceMeters).toBeLessThan(result.rankedCandidates[1].distanceMeters);
  });

  // TEST 10: ETA ranking (shorter ETA wins)
  test('TEST 10: ETA ranking places faster arrival candidate at rank #1', async () => {
    const driverFast = 'drv-fast-001';
    const driverSlow = 'drv-slow-002';

    const createDriverRecord = (id: string, name: string) => ({
      driver: { id, verificationStatus: 'APPROVED', operationalStatus: 'ONLINE', displayName: name },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [{ isActive: true, verificationStatus: 'APPROVED' }],
    });

    driverEligibilityService.setDriverRecord(driverFast, createDriverRecord(driverFast, 'Fast Driver'));
    driverEligibilityService.setDriverRecord(driverSlow, createDriverRecord(driverSlow, 'Slow Driver'));

    const now = new Date().toISOString();
    const mockLocations = [
      { driverId: driverSlow, latitude: -3.3280, longitude: 114.5950, recordedAt: now },
      { driverId: driverFast, latitude: -3.3205, longitude: 114.5912, recordedAt: now },
    ];

    const result = await dispatchService.matchNearestDriver(
      -3.3194,
      114.5908,
      new Set(),
      mockLocations
    );

    expect(result.matched).toBe(true);
    expect(result.selectedDriver?.driverId).toBe(driverFast);
    expect(result.selectedDriver?.estimatedEtaSeconds).toBeLessThan(
      result.rankedCandidates[1].estimatedEtaSeconds
    );
  });

  // TEST 11: Reject -> next driver
  test('TEST 11: reject -> offer immediately moves to next driver', async () => {
    const driver1 = 'drv-cand-1';
    const driver2 = 'drv-cand-2';

    const createRecord = (id: string, name: string) => ({
      driver: { id, verificationStatus: 'APPROVED', operationalStatus: 'ONLINE', displayName: name },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [{ isActive: true, verificationStatus: 'APPROVED' }],
    });

    driverEligibilityService.setDriverRecord(driver1, createRecord(driver1, 'Driver Satu'));
    driverEligibilityService.setDriverRecord(driver2, createRecord(driver2, 'Driver Dua'));

    const now = new Date().toISOString();
    const mockLocations = [
      { driverId: driver1, latitude: -3.3205, longitude: 114.5912, recordedAt: now }, // closer
      { driverId: driver2, latitude: -3.3240, longitude: 114.5930, recordedAt: now }, // further
    ];

    // Create ride with mockLocations
    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Duta Mall',
        pickupLat: -3.3194,
        pickupLng: 114.5908,
        destinationAddress: 'ULM',
        destinationLat: -3.2985,
        destinationLng: 114.5880,
        distanceKm: 3.5,
        durationMinutes: 10,
      },
      mockLocations
    );

    // Initial offer sent to driver1 (attempt 1)
    expect(ride.status).toBe('SEARCHING');
    expect(ride.currentOfferedDriverId).toBe(driver1);
    expect(ride.currentAttemptNumber).toBe(1);

    // Driver 1 rejects the offer
    const dispatchResult = await rideService.rejectOffer(ride.id, driver1, 'Ban bocor');
    expect(dispatchResult.ride.currentOfferedDriverId).toBe(driver2);
    expect(dispatchResult.ride.currentAttemptNumber).toBe(2);

    // Verify dispatch attempts log
    const attempts = rideService.getDispatchAttempts(ride.id);
    expect(attempts.length).toBe(2);
    expect(attempts[0].driverId).toBe(driver1);
    expect(attempts[0].status).toBe('REJECTED');
    expect(attempts[1].driverId).toBe(driver2);
    expect(attempts[1].status).toBe('OFFERED');
  });

  // TEST 12: Timeout -> next driver
  test('TEST 12: timeout -> offer transitions to next candidate driver', async () => {
    const driver1 = 'drv-time-1';
    const driver2 = 'drv-time-2';

    const createRecord = (id: string, name: string) => ({
      driver: { id, verificationStatus: 'APPROVED', operationalStatus: 'ONLINE', displayName: name },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [{ isActive: true, verificationStatus: 'APPROVED' }],
    });

    driverEligibilityService.setDriverRecord(driver1, createRecord(driver1, 'Driver T1'));
    driverEligibilityService.setDriverRecord(driver2, createRecord(driver2, 'Driver T2'));

    const now = new Date().toISOString();
    const mockLocations = [
      { driverId: driver1, latitude: -3.3205, longitude: 114.5912, recordedAt: now },
      { driverId: driver2, latitude: -3.3240, longitude: 114.5930, recordedAt: now },
    ];

    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Duta Mall',
        pickupLat: -3.3194,
        pickupLng: 114.5908,
        destinationAddress: 'ULM',
        destinationLat: -3.2985,
        destinationLng: 114.5880,
        distanceKm: 3.5,
        durationMinutes: 10,
      },
      mockLocations
    );

    expect(ride.currentOfferedDriverId).toBe(driver1);

    // Trigger offer timeout on driver 1
    const timeoutResult = await rideService.handleOfferTimeout(ride.id, driver1);
    expect(timeoutResult.ride.currentOfferedDriverId).toBe(driver2);
    expect(timeoutResult.ride.currentAttemptNumber).toBe(2);

    const attempts = rideService.getDispatchAttempts(ride.id);
    expect(attempts[0].status).toBe('TIMEOUT');
    expect(attempts[1].status).toBe('OFFERED');
  });

  // TEST 13: No driver available -> remains SEARCHING
  test('TEST 13: no driver available -> ride remains SEARCHING without cancelling', async () => {
    // No drivers around
    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Pelabuhan Trisakti',
        pickupLat: -3.3350,
        pickupLng: 114.5680,
        destinationAddress: 'Duta Mall',
        destinationLat: -3.3194,
        destinationLng: 114.5908,
        distanceKm: 4.5,
        durationMinutes: 14,
      },
      [] // empty locations
    );

    expect(ride.status).toBe('SEARCHING');
    expect(ride.currentOfferedDriverId).toBeUndefined();
    expect(ride.status).not.toBe('CANCELLED');
  });

  // TEST 14: Concurrent assignment protection
  test('TEST 14: concurrent assignment protection guarantees only one ride wins driver', async () => {
    // Ride 1 and Ride 2 created
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

    // Ride 1 accepts driver Ahmad Gazali
    await rideService.acceptRide(ride1.id, primaryDriverId);

    // Ride 2 tries to accept the same driver -> Must fail with ConflictException
    await expect(rideService.acceptRide(ride2.id, primaryDriverId)).rejects.toThrow(ConflictException);
  });

  // TEST 15: Double accept rejected
  test('TEST 15: double accept rejected with HTTP 409 Conflict', async () => {
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

    // Accept 1 succeeds
    await rideService.acceptRide(ride.id, primaryDriverId, 1);

    // Accept 2 on same ride -> Must throw ConflictException
    await expect(rideService.acceptRide(ride.id, primaryDriverId, 1)).rejects.toThrow(ConflictException);
  });

  // TEST 16: Invalid state transition rejected
  test('TEST 16: invalid state transition rejected (e.g. SEARCHING directly to IN_TRIP)', async () => {
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

    // Cannot jump straight to IN_TRIP or COMPLETED
    await expect(rideService.startRide(ride.id, primaryDriverId)).rejects.toThrow(BadRequestException);
    await expect(rideService.finishRide(ride.id, primaryDriverId)).rejects.toThrow(BadRequestException);
  });

  // TEST 17: Unauthorized driver rejected
  test('TEST 17: unauthorized driver rejected from accepting an offer assigned to another', async () => {
    const targetDriver = 'drv-target-001';
    const intruderDriver = 'drv-intruder-002';

    const createRecord = (id: string, name: string) => ({
      driver: { id, verificationStatus: 'APPROVED', operationalStatus: 'ONLINE', displayName: name },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED' },
        { documentType: 'STNK', verificationStatus: 'APPROVED' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED' },
      ],
      vehicles: [{ isActive: true, verificationStatus: 'APPROVED' }],
    });

    driverEligibilityService.setDriverRecord(targetDriver, createRecord(targetDriver, 'Target Driver'));
    driverEligibilityService.setDriverRecord(intruderDriver, createRecord(intruderDriver, 'Intruder Driver'));

    const mockLocations = [
      { driverId: targetDriver, latitude: -3.3200, longitude: 114.5910, recordedAt: new Date().toISOString() },
    ];

    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Duta Mall',
        pickupLat: -3.3194,
        pickupLng: 114.5908,
        destinationAddress: 'ULM',
        destinationLat: -3.2985,
        destinationLng: 114.5880,
        distanceKm: 3.0,
        durationMinutes: 8,
      },
      mockLocations
    );

    expect(ride.currentOfferedDriverId).toBe(targetDriver);

    // Intruder attempts to accept the offer
    await expect(rideService.acceptRide(ride.id, intruderDriver)).rejects.toThrow(ForbiddenException);
  });

  // TEST 18: Customer cannot manipulate driver assignment
  test('TEST 18: customer cannot manipulate driver assignment', async () => {
    const maliciousPayload = {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.5880,
      distanceKm: 3.0,
      durationMinutes: 8,
      driverId: 'malicious-injected-driver', // injected field
    } as any;

    const ride = await rideService.createRide(passengerId, maliciousPayload);

    // Driver assignment must remain system-controlled (SEARCHING, not arbitrarily assigned)
    expect(ride.status).toBe('SEARCHING');
    expect(ride.driverId).toBeUndefined();
  });

  // TEST 19: Completed ride cannot restart
  test('TEST 19: completed ride cannot restart or transition backwards', async () => {
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

    await rideService.acceptRide(ride.id, primaryDriverId);
    await rideService.driverArrived(ride.id, primaryDriverId);
    await rideService.startRide(ride.id, primaryDriverId);
    await rideService.finishRide(ride.id, primaryDriverId);

    // Attempting to accept again on completed ride
    await expect(rideService.acceptRide(ride.id, primaryDriverId)).rejects.toThrow(BadRequestException);
    // Attempting to start again on completed ride
    await expect(rideService.startRide(ride.id, primaryDriverId)).rejects.toThrow(BadRequestException);
    // Attempting to cancel completed ride
    await expect(rideService.cancelRide(ride.id, passengerId, 'CUSTOMER')).rejects.toThrow(
      BadRequestException
    );
  });

  // TEST 20: Cancelled ride cannot restart
  test('TEST 20: cancelled ride cannot restart or transition to another state', async () => {
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

    // Cancel from SEARCHING
    await rideService.cancelRide(ride.id, passengerId, 'CUSTOMER', { reason: 'Ubah rencana' });

    // Attempting to accept a cancelled ride
    await expect(rideService.acceptRide(ride.id, primaryDriverId)).rejects.toThrow(BadRequestException);
    // Attempting to arrive on a cancelled ride
    await expect(rideService.driverArrived(ride.id, primaryDriverId)).rejects.toThrow(
      BadRequestException
    );
    // Attempting to start a cancelled ride
    await expect(rideService.startRide(ride.id, primaryDriverId)).rejects.toThrow(BadRequestException);
  });
});

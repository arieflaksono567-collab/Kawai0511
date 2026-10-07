/**
 * KAWAI 0511 - Standalone Phase 5B Acceptance Test Runner
 * Executes all 20 mandatory Phase 5B tests using tsx
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

async function runTests() {
  console.log('========================================================');
  console.log('KAWAI 0511 - PHASE 5B ACCEPTANCE TESTS RUNNER');
  console.log('DRIVER MATCHING & DISPATCH ENGINE (20 TESTS)');
  console.log('========================================================\n');

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, message: string) {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  async function test(name: string, fn: () => Promise<void> | void) {
    try {
      await fn();
      console.log(`✅ [PASS] ${name}`);
      passedCount++;
    } catch (err: any) {
      console.error(`❌ [FAIL] ${name}: ${err.message}`);
      if (err.stack) console.error(err.stack);
      failedCount++;
    }
  }

  const passengerId = 'b0000000-0000-0000-0000-000000000002';
  const primaryDriverId = 'd0000000-0000-0000-0000-000000000001';

  function initServices() {
    const fareService = new FareService();
    const freshnessService = new LocationFreshnessService();
    const redisGeoService = new RedisGeoService();
    const geospatialService = new GeospatialService(freshnessService, redisGeoService);
    const routingService = new RoutingService();
    const driverEligibilityService = new DriverEligibilityService();
    const dispatchService = new RideDispatchService(geospatialService, freshnessService, driverEligibilityService);
    const rideService = new RideService(fareService, dispatchService, routingService, driverEligibilityService);
    return {
      fareService,
      freshnessService,
      redisGeoService,
      geospatialService,
      routingService,
      driverEligibilityService,
      dispatchService,
      rideService,
    };
  }

  // TEST 1
  await test('TEST 1: only eligible drivers matched', async () => {
    const { dispatchService } = initServices();
    const freshLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), freshLocations);
    assert(result.matched === true, 'Matching should succeed');
    assert(result.selectedDriver?.driverId === primaryDriverId, 'Primary driver should be matched');
    assert(result.selectedDriver?.isEligible === true, 'Driver should be eligible');
  });

  // TEST 2
  await test('TEST 2: stale driver excluded', async () => {
    const { dispatchService } = initServices();
    const staleTime = new Date(Date.now() - 16000).toISOString();
    const mockLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: staleTime,
      },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), mockLocations);
    assert(result.matched === false, 'Stale driver must not be matched');
    assert(
      result.rejectedReasons.some((r) => r.includes('GPS berstatus STALE')),
      'Should report STALE rejection reason'
    );
  });

  // TEST 3
  await test('TEST 3: expired driver excluded', async () => {
    const { dispatchService } = initServices();
    const expiredTime = new Date(Date.now() - 45000).toISOString();
    const mockLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: expiredTime,
      },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), mockLocations);
    assert(result.matched === false, 'Expired driver must not be matched');
    assert(
      result.rejectedReasons.some((r) => r.includes('GPS berstatus EXPIRED')),
      'Should report EXPIRED rejection reason'
    );
  });

  // TEST 4
  await test('TEST 4: offline driver excluded', async () => {
    const { dispatchService, driverEligibilityService } = initServices();
    const offlineDriverId = 'drv-offline-001';
    driverEligibilityService.setDriverRecord(offlineDriverId, {
      driver: {
        id: offlineDriverId,
        verificationStatus: 'APPROVED',
        operationalStatus: 'OFFLINE',
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

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), mockLocations);
    assert(result.matched === false, 'Offline driver must not be matched');
    assert(
      result.rejectedReasons.some((r) => r.includes('OFFLINE')),
      'Should report OFFLINE rejection reason'
    );
  });

  // TEST 5
  await test('TEST 5: unapproved driver excluded', async () => {
    const { dispatchService, driverEligibilityService } = initServices();
    const pendingDriverId = 'drv-pending-002';
    driverEligibilityService.setDriverRecord(pendingDriverId, {
      driver: {
        id: pendingDriverId,
        verificationStatus: 'UNDER_REVIEW',
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

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), mockLocations);
    assert(result.matched === false, 'Unapproved driver must not be matched');
    assert(
      result.rejectedReasons.some((r) => r.includes('Status verifikasi driver bukan APPROVED')),
      'Should report unapproved reason'
    );
  });

  // TEST 6
  await test('TEST 6: inactive vehicle excluded', async () => {
    const { dispatchService, driverEligibilityService } = initServices();
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
      vehicles: [{ isActive: false, verificationStatus: 'APPROVED' }],
    });

    const mockLocations = [
      {
        driverId: noVehicleDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), mockLocations);
    assert(result.matched === false, 'Inactive vehicle driver must not be matched');
    assert(
      result.rejectedReasons.some((r) => r.includes('Tidak ada kendaraan aktif')),
      'Should report inactive vehicle reason'
    );
  });

  // TEST 7
  await test('TEST 7: driver already on active ride excluded', async () => {
    const { dispatchService } = initServices();
    const activeBusyDrivers = new Set<string>([primaryDriverId]);

    const mockLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.3194,
        longitude: 114.5908,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, activeBusyDrivers, mockLocations);
    assert(result.matched === false, 'Driver on active ride must not be matched');
    assert(
      result.rejectedReasons.some((r) => r.includes('Sedang melayani order lain')),
      'Should report busy driver reason'
    );
  });

  // TEST 8
  await test('TEST 8: radius filtering', async () => {
    const { dispatchService } = initServices();
    const farLocations = [
      {
        driverId: primaryDriverId,
        latitude: -3.2985,
        longitude: 114.588,
        recordedAt: new Date().toISOString(),
      },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), farLocations);
    assert(result.matched === false, 'Driver beyond 1500m must be excluded');
  });

  // TEST 9
  await test('TEST 9: closest driver ranking', async () => {
    const { dispatchService, driverEligibilityService } = initServices();
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
    const mockLocations = [
      { driverId: driverB, latitude: -3.3265, longitude: 114.5935, recordedAt: now },
      { driverId: driverA, latitude: -3.322, longitude: 114.5915, recordedAt: now },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), mockLocations);
    assert(result.matched === true, 'Matching should find drivers');
    assert(result.selectedDriver?.driverId === driverA, 'Closer driver should be selected');
  });

  // TEST 10
  await test('TEST 10: ETA ranking', async () => {
    const { dispatchService, driverEligibilityService } = initServices();
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
      { driverId: driverSlow, latitude: -3.328, longitude: 114.595, recordedAt: now },
      { driverId: driverFast, latitude: -3.3205, longitude: 114.5912, recordedAt: now },
    ];

    const result = await dispatchService.matchNearestDriver(-3.3194, 114.5908, new Set(), mockLocations);
    assert(result.matched === true, 'Matching should succeed');
    assert(result.selectedDriver?.driverId === driverFast, 'Faster ETA driver should be selected');
  });

  // TEST 11
  await test('TEST 11: reject → next driver', async () => {
    const { rideService, driverEligibilityService } = initServices();
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
      { driverId: driver1, latitude: -3.3205, longitude: 114.5912, recordedAt: now },
      { driverId: driver2, latitude: -3.324, longitude: 114.593, recordedAt: now },
    ];

    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Duta Mall',
        pickupLat: -3.3194,
        pickupLng: 114.5908,
        destinationAddress: 'ULM',
        destinationLat: -3.2985,
        destinationLng: 114.588,
        distanceKm: 3.5,
        durationMinutes: 10,
      },
      mockLocations
    );

    assert(ride.status === 'SEARCHING', 'Status should be SEARCHING');
    assert(ride.currentOfferedDriverId === driver1, 'Initial offer should be driver1');
    assert(ride.currentAttemptNumber === 1, 'Attempt number should be 1');

    const dispatchResult = await rideService.rejectOffer(ride.id, driver1, 'Ban bocor');
    assert(dispatchResult.ride.currentOfferedDriverId === driver2, 'Next offer should be driver2');
    assert(dispatchResult.ride.currentAttemptNumber === 2, 'Attempt number should be 2');

    const attempts = rideService.getDispatchAttempts(ride.id);
    assert(attempts[0].driverId === driver1 && attempts[0].status === 'REJECTED', 'Attempt 1 rejected');
    assert(attempts[1].driverId === driver2 && attempts[1].status === 'OFFERED', 'Attempt 2 offered');
  });

  // TEST 12
  await test('TEST 12: timeout → next driver', async () => {
    const { rideService, driverEligibilityService } = initServices();
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
      { driverId: driver2, latitude: -3.324, longitude: 114.593, recordedAt: now },
    ];

    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Duta Mall',
        pickupLat: -3.3194,
        pickupLng: 114.5908,
        destinationAddress: 'ULM',
        destinationLat: -3.2985,
        destinationLng: 114.588,
        distanceKm: 3.5,
        durationMinutes: 10,
      },
      mockLocations
    );

    assert(ride.currentOfferedDriverId === driver1, 'Initial offer driver1');
    const timeoutResult = await rideService.handleOfferTimeout(ride.id, driver1);
    assert(timeoutResult.ride.currentOfferedDriverId === driver2, 'Next offer driver2');

    const attempts = rideService.getDispatchAttempts(ride.id);
    assert(attempts[0].status === 'TIMEOUT', 'Attempt 1 timed out');
    assert(attempts[1].status === 'OFFERED', 'Attempt 2 offered');
  });

  // TEST 13
  await test('TEST 13: no driver available → SEARCHING', async () => {
    const { rideService } = initServices();
    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Pelabuhan Trisakti',
        pickupLat: -3.335,
        pickupLng: 114.568,
        destinationAddress: 'Duta Mall',
        destinationLat: -3.3194,
        destinationLng: 114.5908,
        distanceKm: 4.5,
        durationMinutes: 14,
      },
      []
    );

    assert(ride.status === 'SEARCHING', 'Ride should remain in SEARCHING');
    assert(ride.currentOfferedDriverId === undefined, 'No driver offered');
    assert(ride.status !== 'CANCELLED', 'Ride must not be cancelled');
  });

  // TEST 14
  await test('TEST 14: concurrent assignment protection', async () => {
    const { rideService } = initServices();
    const ride1 = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.588,
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

    await rideService.acceptRide(ride1.id, primaryDriverId);

    let threwConflict = false;
    try {
      await rideService.acceptRide(ride2.id, primaryDriverId);
    } catch (err: any) {
      if (err instanceof ConflictException) threwConflict = true;
    }
    assert(threwConflict === true, 'Concurrent accept on second ride must throw ConflictException');
  });

  // TEST 15
  await test('TEST 15: double accept rejected', async () => {
    const { rideService } = initServices();
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.588,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    await rideService.acceptRide(ride.id, primaryDriverId, 1);

    let threwDoubleConflict = false;
    try {
      await rideService.acceptRide(ride.id, primaryDriverId, 1);
    } catch (err: any) {
      if (err instanceof ConflictException) threwDoubleConflict = true;
    }
    assert(threwDoubleConflict === true, 'Double accept must throw ConflictException');
  });

  // TEST 16
  await test('TEST 16: invalid state transition rejected', async () => {
    const { rideService } = initServices();
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.588,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    let threwStart = false;
    try {
      await rideService.startRide(ride.id, primaryDriverId);
    } catch (err: any) {
      if (err instanceof BadRequestException) threwStart = true;
    }
    assert(threwStart === true, 'Direct start from SEARCHING must throw BadRequestException');

    let threwFinish = false;
    try {
      await rideService.finishRide(ride.id, primaryDriverId);
    } catch (err: any) {
      if (err instanceof BadRequestException) threwFinish = true;
    }
    assert(threwFinish === true, 'Direct finish from SEARCHING must throw BadRequestException');
  });

  // TEST 17
  await test('TEST 17: unauthorized driver rejected', async () => {
    const { rideService, driverEligibilityService } = initServices();
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
      { driverId: targetDriver, latitude: -3.32, longitude: 114.591, recordedAt: new Date().toISOString() },
    ];

    const ride = await rideService.createRide(
      passengerId,
      {
        pickupAddress: 'Duta Mall',
        pickupLat: -3.3194,
        pickupLng: 114.5908,
        destinationAddress: 'ULM',
        destinationLat: -3.2985,
        destinationLng: 114.588,
        distanceKm: 3.0,
        durationMinutes: 8,
      },
      mockLocations
    );

    assert(ride.currentOfferedDriverId === targetDriver, 'Offer should be targetDriver');

    let threwForbidden = false;
    try {
      await rideService.acceptRide(ride.id, intruderDriver);
    } catch (err: any) {
      if (err instanceof ForbiddenException) threwForbidden = true;
    }
    assert(threwForbidden === true, 'Intruder accept must throw ForbiddenException');
  });

  // TEST 18
  await test('TEST 18: customer cannot manipulate driver assignment', async () => {
    const { rideService } = initServices();
    const maliciousPayload = {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.588,
      distanceKm: 3.0,
      durationMinutes: 8,
      driverId: 'malicious-injected-driver',
    } as any;

    const ride = await rideService.createRide(passengerId, maliciousPayload);
    assert(ride.status === 'SEARCHING', 'Status must start in SEARCHING');
    assert(ride.driverId === undefined, 'Customer cannot pre-set driverId');
  });

  // TEST 19
  await test('TEST 19: completed ride cannot restart', async () => {
    const { rideService } = initServices();
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.588,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    await rideService.acceptRide(ride.id, primaryDriverId);
    await rideService.driverArrived(ride.id, primaryDriverId);
    await rideService.startRide(ride.id, primaryDriverId);
    await rideService.finishRide(ride.id, primaryDriverId);

    let threwCompleted = false;
    try {
      await rideService.startRide(ride.id, primaryDriverId);
    } catch (err: any) {
      if (err instanceof BadRequestException) threwCompleted = true;
    }
    assert(threwCompleted === true, 'Restarting completed ride must throw BadRequestException');
  });

  // TEST 20
  await test('TEST 20: cancelled ride cannot restart', async () => {
    const { rideService } = initServices();
    const ride = await rideService.createRide(passengerId, {
      pickupAddress: 'Duta Mall',
      pickupLat: -3.3194,
      pickupLng: 114.5908,
      destinationAddress: 'ULM',
      destinationLat: -3.2985,
      destinationLng: 114.588,
      distanceKm: 3.0,
      durationMinutes: 8,
    });

    await rideService.cancelRide(ride.id, passengerId, 'CUSTOMER', { reason: 'Ubah rencana' });

    let threwCancelled = false;
    try {
      await rideService.acceptRide(ride.id, primaryDriverId);
    } catch (err: any) {
      if (err instanceof BadRequestException) threwCancelled = true;
    }
    assert(threwCancelled === true, 'Accepting cancelled ride must throw BadRequestException');
  });

  console.log('\n========================================================');
  console.log(`SUMMARY: ${passedCount} PASSED, ${failedCount} FAILED (TOTAL: 20 TESTS)`);
  console.log('========================================================');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});

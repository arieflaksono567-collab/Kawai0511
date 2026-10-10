/**
 * KAWAI 0511 - Phase 7.2 Acceptance Tests
 * Rating System: Passenger & Driver Post-Trip Rating
 *
 * Mandatory Tests Required by Specification:
 * 1. valid passenger rating (Passenger rates Driver after COMPLETED)
 * 2. valid driver rating (Driver rates Passenger after COMPLETED)
 * 3. invalid score (Rejection of scores < 1, > 5, or invalid types)
 * 4. rating sebelum COMPLETED (Rejection of rating on SEARCHING, ASSIGNED, ARRIVED, IN_TRIP, CANCELLED)
 * 5. rating oleh user yang tidak terkait (Rejection of rating by third party / unrelated user)
 * 6. duplicate rating (Rejection of multiple ratings by the same reviewer on the same ride)
 * 7. self-rating (Rejection when reviewer and reviewed user are the same)
 *
 * Additional Validation Tests:
 * 8. driver rating aggregation (Incremental average and count calculation)
 * 9. server-side identity validation (Ignores client-provided IDs, enforces authenticated identity)
 * 10. optional comment and tags persistence
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { RatingService } from '../src/rating/rating.service';
import { RatingRepository } from '../src/rating/rating.repository';
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

describe('Phase 7.2: Rating System — Passenger & Driver Post-Trip Feedback', () => {
  let ratingRepo: RatingRepository;
  let ratingService: RatingService;
  let rideService: RideService;
  let driverService: DriverService;

  const passengerUserId = 'b0000000-0000-0000-0000-000000000002'; // Arief Laksono
  const driverUserId = 'c0000000-0000-0000-0000-000000000003';    // Ahmad Gazali User ID
  const driverProfileId = 'd0000000-0000-0000-0000-000000000001'; // Ahmad Gazali Driver Profile ID
  const unrelatedUserId = '99999999-9999-4999-a999-999999999999'; // Stranger

  beforeEach(() => {
    ratingRepo = new RatingRepository();

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

    ratingService = new RatingService(ratingRepo, rideService, driverService);
  });

  const setupRideWithStatus = (
    rideId: string,
    status: 'SEARCHING' | 'ASSIGNED' | 'ARRIVED' | 'IN_TRIP' | 'COMPLETED' | 'CANCELLED',
    pId: string = passengerUserId,
    dId: string = driverProfileId
  ): RideOrder => {
    const ride: RideOrder = {
      id: rideId,
      passengerId: pId,
      driverId: dId,
      pickupAddress: 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
      pickupLat: -3.319437,
      pickupLng: 114.590822,
      destinationAddress: 'Universitas Lambung Mangkurat, Kayu Tangi',
      destinationLat: -3.29851,
      destinationLng: 114.58802,
      distanceKm: 4.2,
      durationMinutes: 14,
      totalFare: 18400,
      fareSnapshot: {
        baseFare: 7000,
        perKmRate: 2200,
        perMinuteRate: 200,
        minimumFare: 10000,
        totalFare: 18400,
        isSurgeApplied: false,
        surgeMultiplier: 1.0,
        calculatedAt: new Date().toISOString(),
      },
      status,
      version: 5,
      currentAttemptNumber: 1,
      attemptedDriverIds: [dId],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      assignedAt: new Date(Date.now() - 3500000).toISOString(),
      arrivedAt: new Date(Date.now() - 3300000).toISOString(),
      startedAt: new Date(Date.now() - 3200000).toISOString(),
      completedAt: status === 'COMPLETED' ? new Date(Date.now() - 2500000).toISOString() : undefined,
      cancelledAt: status === 'CANCELLED' ? new Date(Date.now() - 2500000).toISOString() : undefined,
      updatedAt: new Date().toISOString(),
      driver: {
        id: dId,
        name: 'Ahmad Gazali',
        phone: '+6281390511200',
        vehiclePlate: 'DA 5110 KAW',
        vehicleModel: 'Honda Vario 160',
        rating: 4.9,
      },
    };

    (rideService as any).rides.set(rideId, ride);
    return ride;
  };

  // ===========================================================================
  // TEST 1: VALID PASSENGER RATING
  // ===========================================================================
  test('1. Valid passenger rating: Passenger successfully rates Driver after ride COMPLETED', async () => {
    const rideId = 'ride-rating-test-001';
    setupRideWithStatus(rideId, 'COMPLETED');

    const passengerAuth = {
      id: passengerUserId,
      role: 'CUSTOMER',
    };

    const res = await ratingService.submitRating(rideId, passengerAuth, {
      score: 5,
      comment: 'Pelayanan sangat ramah, helm bersih dan motor wangi!',
      tags: ['RAMAH', 'HELM_BERSIH', 'TEPAT_WAKTU'],
      tipAmount: 5000,
    });

    assert.ok(res.rating.id);
    assert.equal(res.rating.rideId, rideId);
    assert.equal(res.rating.reviewerId, passengerUserId);
    assert.equal(res.rating.reviewedUserId, driverUserId);
    assert.equal(res.rating.driverId, driverProfileId);
    assert.equal(res.rating.score, 5);
    assert.equal(res.rating.comment, 'Pelayanan sangat ramah, helm bersih dan motor wangi!');
    assert.deepEqual(res.rating.tags, ['RAMAH', 'HELM_BERSIH', 'TEPAT_WAKTU']);
    assert.equal(res.rating.tipAmount, 5000);
    assert.ok(res.driverSummary);
    assert.ok(res.driverSummary?.ratingCount! > 0);
  });

  // ===========================================================================
  // TEST 2: VALID DRIVER RATING
  // ===========================================================================
  test('2. Valid driver rating: Driver successfully rates Passenger after ride COMPLETED', async () => {
    const rideId = 'ride-rating-test-002';
    setupRideWithStatus(rideId, 'COMPLETED');

    const driverAuth = {
      id: driverUserId,
      role: 'DRIVER',
      driverId: driverProfileId,
    };

    const res = await ratingService.submitRating(rideId, driverAuth, {
      score: 5,
      comment: 'Penumpang ramah dan titik jemput sangat akurat di lobi Duta Mall.',
      tags: ['TITIK_AKURAT', 'RAMAH'],
    });

    assert.ok(res.rating.id);
    assert.equal(res.rating.rideId, rideId);
    assert.equal(res.rating.reviewerId, driverUserId);
    assert.equal(res.rating.reviewedUserId, passengerUserId);
    assert.equal(res.rating.driverId, driverProfileId);
    assert.equal(res.rating.score, 5);
    assert.equal(res.rating.comment, 'Penumpang ramah dan titik jemput sangat akurat di lobi Duta Mall.');
    assert.deepEqual(res.rating.tags, ['TITIK_AKURAT', 'RAMAH']);
  });

  // ===========================================================================
  // TEST 3: INVALID SCORE REJECTION
  // ===========================================================================
  test('3. Invalid score: rejects scores outside 1-5 range or non-numbers', async () => {
    const rideId = 'ride-rating-test-003';
    setupRideWithStatus(rideId, 'COMPLETED');

    const passengerAuth = { id: passengerUserId, role: 'CUSTOMER' };

    // Score 0 (too low)
    await assert.rejects(
      async () => {
        await ratingService.submitRating(rideId, passengerAuth, { score: 0 });
      },
      BadRequestException,
      'Score 0 must be rejected'
    );

    // Score 6 (too high)
    await assert.rejects(
      async () => {
        await ratingService.submitRating(rideId, passengerAuth, { score: 6 });
      },
      BadRequestException,
      'Score 6 must be rejected'
    );

    // Score -1 (negative)
    await assert.rejects(
      async () => {
        await ratingService.submitRating(rideId, passengerAuth, { score: -1 });
      },
      BadRequestException,
      'Negative score must be rejected'
    );

    // Score NaN
    await assert.rejects(
      async () => {
        await ratingService.submitRating(rideId, passengerAuth, { score: NaN });
      },
      BadRequestException,
      'NaN score must be rejected'
    );
  });

  // ===========================================================================
  // TEST 4: RATING SEBELUM COMPLETED REJECTION
  // ===========================================================================
  test('4. Rating sebelum COMPLETED: rejects rating when ride is in progress or cancelled', async () => {
    const passengerAuth = { id: passengerUserId, role: 'CUSTOMER' };

    // SEARCHING
    setupRideWithStatus('ride-searching', 'SEARCHING');
    await assert.rejects(
      async () => {
        await ratingService.submitRating('ride-searching', passengerAuth, { score: 5 });
      },
      BadRequestException,
      'Rating on SEARCHING ride must be rejected'
    );

    // ASSIGNED
    setupRideWithStatus('ride-assigned', 'ASSIGNED');
    await assert.rejects(
      async () => {
        await ratingService.submitRating('ride-assigned', passengerAuth, { score: 5 });
      },
      BadRequestException,
      'Rating on ASSIGNED ride must be rejected'
    );

    // ARRIVED
    setupRideWithStatus('ride-arrived', 'ARRIVED');
    await assert.rejects(
      async () => {
        await ratingService.submitRating('ride-arrived', passengerAuth, { score: 5 });
      },
      BadRequestException,
      'Rating on ARRIVED ride must be rejected'
    );

    // IN_TRIP
    setupRideWithStatus('ride-intrip', 'IN_TRIP');
    await assert.rejects(
      async () => {
        await ratingService.submitRating('ride-intrip', passengerAuth, { score: 5 });
      },
      BadRequestException,
      'Rating on IN_TRIP ride must be rejected'
    );

    // CANCELLED
    setupRideWithStatus('ride-cancelled', 'CANCELLED');
    await assert.rejects(
      async () => {
        await ratingService.submitRating('ride-cancelled', passengerAuth, { score: 1 });
      },
      BadRequestException,
      'Rating on CANCELLED ride must be rejected'
    );
  });

  // ===========================================================================
  // TEST 5: RATING OLEH USER YANG TIDAK TERKAIT REJECTION
  // ===========================================================================
  test('5. Rating oleh user tidak terkait: rejects rating attempts by third-party users', async () => {
    const rideId = 'ride-rating-test-005';
    setupRideWithStatus(rideId, 'COMPLETED');

    const unrelatedAuth = {
      id: unrelatedUserId,
      role: 'CUSTOMER',
    };

    await assert.rejects(
      async () => {
        await ratingService.submitRating(rideId, unrelatedAuth, {
          score: 5,
          comment: 'Saya tidak ikut naik tapi mau rating',
        });
      },
      ForbiddenException,
      'Third party rating must be rejected with 403 Forbidden'
    );
  });

  // ===========================================================================
  // TEST 6: DUPLICATE RATING REJECTION
  // ===========================================================================
  test('6. Duplicate rating: rejects multiple ratings by the same reviewer for the same ride', async () => {
    const rideId = 'ride-rating-test-006';
    setupRideWithStatus(rideId, 'COMPLETED');

    const passengerAuth = { id: passengerUserId, role: 'CUSTOMER' };

    // First attempt succeeds
    await ratingService.submitRating(rideId, passengerAuth, {
      score: 4,
      comment: 'Cukup baik',
    });

    // Second attempt by the same passenger on the same ride must be rejected
    await assert.rejects(
      async () => {
        await ratingService.submitRating(rideId, passengerAuth, {
          score: 5,
          comment: 'Mau ubah jadi 5',
        });
      },
      ConflictException,
      'Duplicate rating must be rejected with 409 Conflict'
    );
  });

  // ===========================================================================
  // TEST 7: SELF-RATING REJECTION
  // ===========================================================================
  test('7. Self-rating: rejects when passenger and driver are the same user', async () => {
    const rideId = 'ride-rating-test-007';
    // Ride where passenger is mistakenly identical to driver user
    setupRideWithStatus(rideId, 'COMPLETED', driverUserId, driverProfileId);

    const sameUserAuth = {
      id: driverUserId,
      role: 'CUSTOMER',
    };

    await assert.rejects(
      async () => {
        await ratingService.submitRating(rideId, sameUserAuth, {
          score: 5,
          comment: 'Rating sendiri',
        });
      },
      BadRequestException,
      'Self-rating must be rejected with 400 Bad Request'
    );
  });

  // ===========================================================================
  // TEST 8: DRIVER RATING AGGREGATION CALCULATION
  // ===========================================================================
  test('8. Driver rating aggregation: recalculates ratingAverage and ratingCount incrementally', async () => {
    const driver = driverService.getDriverById(driverProfileId)!;
    const initialCount = driver.ratingCount;
    const initialAvg = driver.ratingAverage;

    const rideId = 'ride-rating-test-008';
    setupRideWithStatus(rideId, 'COMPLETED');

    const res = await ratingService.submitRating(
      rideId,
      { id: passengerUserId, role: 'CUSTOMER' },
      { score: 5 }
    );

    assert.ok(res.driverSummary);
    assert.equal(res.driverSummary?.ratingCount, initialCount + 1);

    // Updated driver profile must match
    const updatedDriver = driverService.getDriverById(driverProfileId)!;
    assert.equal(updatedDriver.ratingCount, initialCount + 1);
    assert.equal(updatedDriver.ratingAverage, res.driverSummary?.ratingAverage);
  });

  // ===========================================================================
  // TEST 9: CLIENT-SIDE SPOOFING PREVENTION
  // ===========================================================================
  test('9. Client-side spoofing prevention: uses authenticated identity and ignores client IDs', async () => {
    const rideId = 'ride-rating-test-009';
    setupRideWithStatus(rideId, 'COMPLETED');

    const passengerAuth = { id: passengerUserId, role: 'CUSTOMER' };

    // Malicious payload trying to inject arbitrary reviewer and target
    const maliciousPayload: any = {
      score: 5,
      comment: 'Legit',
      reviewerId: unrelatedUserId,
      reviewedUserId: unrelatedUserId,
      driverId: 'fake-driver-id',
    };

    const res = await ratingService.submitRating(rideId, passengerAuth, maliciousPayload);

    // Server must have assigned actual passenger and driver IDs
    assert.equal(res.rating.reviewerId, passengerUserId);
    assert.equal(res.rating.reviewedUserId, driverUserId);
    assert.equal(res.rating.driverId, driverProfileId);
  });

  // ===========================================================================
  // TEST 10: RATINGS RETRIEVAL & PERMISSIONS
  // ===========================================================================
  test('10. Ratings retrieval: allows participants and admin to view ride ratings, blocks others', async () => {
    const rideId = 'ride-rating-test-010';
    setupRideWithStatus(rideId, 'COMPLETED');

    // Submit ratings from both passenger and driver
    await ratingService.submitRating(
      rideId,
      { id: passengerUserId, role: 'CUSTOMER' },
      { score: 5, comment: 'Great driver' }
    );
    await ratingService.submitRating(
      rideId,
      { id: driverUserId, role: 'DRIVER', driverId: driverProfileId },
      { score: 5, comment: 'Great passenger' }
    );

    // 1. Passenger can retrieve ratings for the ride
    const passengerRatings = await ratingService.getRatingsForRide(rideId, {
      id: passengerUserId,
      role: 'CUSTOMER',
    });
    assert.equal(passengerRatings.length, 2);

    // 2. Driver can retrieve ratings for the ride
    const driverRatings = await ratingService.getRatingsForRide(rideId, {
      id: driverUserId,
      role: 'DRIVER',
      driverId: driverProfileId,
    });
    assert.equal(driverRatings.length, 2);

    // 3. Admin can retrieve ratings for the ride
    const adminRatings = await ratingService.getRatingsForRide(rideId, {
      id: 'admin-01',
      role: 'ADMIN',
    });
    assert.equal(adminRatings.length, 2);

    // 4. Stranger is blocked from viewing ratings for the ride
    await assert.rejects(
      async () => {
        await ratingService.getRatingsForRide(rideId, {
          id: unrelatedUserId,
          role: 'CUSTOMER',
        });
      },
      ForbiddenException,
      'Stranger cannot view ride ratings'
    );
  });
});

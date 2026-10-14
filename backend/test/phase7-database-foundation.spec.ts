/**
 * KAWAI 0511 - Phase 7.1 Acceptance Tests
 * Database Foundation: Rating, Earnings Ledger, and Trip History
 *
 * 10 Mandatory Database Foundation Verification Tests:
 * 1. Migration 010 SQL Schema, DDL structure, constraints & indexes validation
 * 2. Rating entity relationship completeness (Ride, Reviewer, Reviewed User, Score, Comment, Timestamps)
 * 3. Rating score boundary enforcement (1.0 to 5.0)
 * 4. Unique constraint: Prevent duplicate rating on same ride by same reviewer (HTTP 409 Conflict)
 * 5. Reviewer cannot rate themselves (Self-rating rejection)
 * 6. Driver earnings ledger schema compliance (Driver, Ride, Gross, Platform Fee, Net, Currency, Status, Timestamps)
 * 7. Monetary decimal/numeric integrity (Zero float leakage, net + fee === gross)
 * 8. Unique constraint: Prevent duplicate earnings record per driver and ride (HTTP 409 Conflict)
 * 9. Composite Trip History query & index simulation with pagination
 * 10. Authorization scoping layer (Passenger only sees own data, Driver only sees own earnings, IDOR prevention)
 */

import { describe, it as test, beforeEach } from 'node:test';
import * as assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { RatingRepository } from '../src/rating/rating.repository';
import { DriverEarningsLedgerRepository } from '../src/payment/driver-earnings-ledger.repository';
import { TripHistoryRepository } from '../src/ride/trip-history.repository';
import { RideService, RideOrder } from '../src/ride/ride.service';
import { FareService } from '../src/ride/fare.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { RedisGeoService } from '../src/location/redis-geo.service';

describe('Phase 7.1: Database Foundation — Rating, Earnings Ledger & Trip History', () => {
  let ratingRepo: RatingRepository;
  let earningsRepo: DriverEarningsLedgerRepository;
  let historyRepo: TripHistoryRepository;
  let rideService: RideService;

  const passengerId = 'b0000000-0000-0000-0000-000000000002'; // Arief Laksono
  const driverUserId = 'c0000000-0000-0000-0000-000000000003'; // Ahmad Gazali User ID
  const driverProfileId = 'd0000000-0000-0000-0000-000000000001'; // Ahmad Gazali Driver Profile
  const otherPassengerId = 'b0000000-0000-0000-0000-000000000099';
  const otherDriverId = 'd0000000-0000-0000-0000-000000000099';

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

    historyRepo = new TripHistoryRepository(rideService, ratingRepo, earningsRepo);
  });

  const setupCompletedRide = (rideId: string, fare: number = 18400): RideOrder => {
    const dummyRide: RideOrder = {
      id: rideId,
      passengerId,
      driverId: driverProfileId,
      pickupAddress: 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
      pickupLat: -3.319437,
      pickupLng: 114.590822,
      destinationAddress: 'Kampus ULM Banjarmasin, Kayu Tangi',
      destinationLat: -3.29851,
      destinationLng: 114.58802,
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
      currentAttemptNumber: 1,
      attemptedDriverIds: [driverProfileId],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      assignedAt: new Date(Date.now() - 3500000).toISOString(),
      arrivedAt: new Date(Date.now() - 3300000).toISOString(),
      startedAt: new Date(Date.now() - 3200000).toISOString(),
      completedAt: new Date(Date.now() - 2500000).toISOString(),
      updatedAt: new Date().toISOString(),
      driver: {
        id: driverProfileId,
        name: 'Ahmad Gazali',
        phone: '+6281390511200',
        vehiclePlate: 'DA 5110 KAW',
        vehicleModel: 'Honda Vario 160',
        rating: 4.9,
      },
    };

    (rideService as any).rides.set(rideId, dummyRide);
    return dummyRide;
  };

  // ===========================================================================
  // TEST 1: MIGRATION 010 SQL FILE VALIDATION
  // ===========================================================================
  test('1. Migration 010 SQL: validates DDL syntax, constraints, foreign keys, and indexes', () => {
    let migrationPath = path.resolve(process.cwd(), 'database/migrations/010_rating_earnings_history.sql');
    if (!fs.existsSync(migrationPath)) {
      migrationPath = path.resolve(process.cwd(), '../database/migrations/010_rating_earnings_history.sql');
    }
    assert.ok(fs.existsSync(migrationPath), 'Migration 010 file must exist in database/migrations');

    const sql = fs.readFileSync(migrationPath, 'utf8');

    // 1. Table Definitions
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS ride_ratings'), 'Must define ride_ratings table');
    assert.ok(sql.includes('CREATE TABLE IF NOT EXISTS driver_earnings_ledger'), 'Must define driver_earnings_ledger table');

    // 2. Foreign Keys & Referential Integrity
    assert.ok(sql.includes('REFERENCES rides(id)'), 'Must reference rides table');
    assert.ok(sql.includes('REFERENCES users(id)'), 'Must reference users table');
    assert.ok(sql.includes('REFERENCES drivers(id)'), 'Must reference drivers table');

    // 3. Constraints
    assert.ok(sql.includes('CONSTRAINT uq_ride_reviewer UNIQUE (ride_id, reviewer_id)'), 'Must enforce unique constraint on (ride_id, reviewer_id)');
    assert.ok(sql.includes('CONSTRAINT check_rating_score_range CHECK (score >= 1.0 AND score <= 5.0)'), 'Must enforce score check constraint');
    assert.ok(sql.includes('CONSTRAINT uq_driver_ride_earning UNIQUE (driver_id, ride_id)'), 'Must enforce unique constraint on driver earnings per ride');
    assert.ok(sql.includes('CONSTRAINT check_earnings_math_balance CHECK (net_amount + platform_fee = gross_amount)'), 'Must enforce financial math balance');

    // 4. Numeric & Timestamp Data Types
    assert.ok(sql.includes('NUMERIC(12, 2)'), 'Must use numeric/decimal for monetary amounts');
    assert.ok(sql.includes('TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP'), 'Must use standardized timestamptz');

    // 5. Indexes
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_ratings_ride'), 'Must index ratings by ride_id');
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_ratings_reviewer'), 'Must index ratings by reviewer_id');
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_ratings_driver'), 'Must index ratings by driver_id');
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_date'), 'Must index driver earnings by driver and date');
    assert.ok(sql.includes('CREATE INDEX IF NOT EXISTS idx_rides_passenger_status_created'), 'Must index rides by passenger, status, created_at');

    // 6. View
    assert.ok(sql.includes('CREATE OR REPLACE VIEW view_trip_history_details'), 'Must create view_trip_history_details');
  });

  // ===========================================================================
  // TEST 2: RATING RELATIONSHIP COMPLETENESS
  // ===========================================================================
  test('2. Rating entity: accurately records Ride, Reviewer, Reviewed User, Score, Comment, and Timestamps', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000001';
    setupCompletedRide(rideId);

    const rating = await ratingRepo.create({
      rideId,
      reviewerId: passengerId,
      reviewedUserId: driverUserId,
      driverId: driverProfileId,
      score: 5.0,
      comment: 'Pelayanan sangat ramah, helm bersih dan wangi khas Banjar!',
      tags: ['RAMAH', 'HELM_BERSIH', 'TEPAT_WAKTU'],
      tipAmount: 5000,
    });

    assert.ok(rating.id, 'Rating must have generated UUID');
    assert.equal(rating.rideId, rideId);
    assert.equal(rating.reviewerId, passengerId);
    assert.equal(rating.reviewedUserId, driverUserId);
    assert.equal(rating.driverId, driverProfileId);
    assert.equal(rating.score, 5.0);
    assert.equal(rating.comment, 'Pelayanan sangat ramah, helm bersih dan wangi khas Banjar!');
    assert.deepEqual(rating.tags, ['RAMAH', 'HELM_BERSIH', 'TEPAT_WAKTU']);
    assert.equal(rating.tipAmount, 5000);
    assert.ok(rating.createdAt, 'Must have createdAt timestamp');
    assert.ok(rating.updatedAt, 'Must have updatedAt timestamp');
  });

  // ===========================================================================
  // TEST 3: SCORE BOUNDARY ENFORCEMENT
  // ===========================================================================
  test('3. Rating score boundaries: strictly enforces score range between 1.0 and 5.0', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000002';
    setupCompletedRide(rideId);

    // Below 1.0 (e.g. 0.5) must fail
    await assert.rejects(
      async () => {
        await ratingRepo.create({
          rideId,
          reviewerId: passengerId,
          reviewedUserId: driverUserId,
          score: 0.5,
        });
      },
      BadRequestException,
      'Score below 1.0 must be rejected'
    );

    // Above 5.0 (e.g. 5.5) must fail
    await assert.rejects(
      async () => {
        await ratingRepo.create({
          rideId,
          reviewerId: passengerId,
          reviewedUserId: driverUserId,
          score: 5.5,
        });
      },
      BadRequestException,
      'Score above 5.0 must be rejected'
    );

    // Boundary 1.0 must pass
    const r1 = await ratingRepo.create({
      rideId,
      reviewerId: passengerId,
      reviewedUserId: driverUserId,
      score: 1.0,
      comment: 'Kurang memuaskan',
    });
    assert.equal(r1.score, 1.0);
  });

  // ===========================================================================
  // TEST 4: UNIQUE CONSTRAINT (PREVENT DUPLICATE RATING)
  // ===========================================================================
  test('4. Unique constraint: prevents duplicate rating on the same ride by the same reviewer', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000003';
    setupCompletedRide(rideId);

    // First rating succeeds
    await ratingRepo.create({
      rideId,
      reviewerId: passengerId,
      reviewedUserId: driverUserId,
      driverId: driverProfileId,
      score: 4.8,
      comment: 'Mantap',
    });

    // Second rating on same ride by same passenger must throw ConflictException
    await assert.rejects(
      async () => {
        await ratingRepo.create({
          rideId,
          reviewerId: passengerId,
          reviewedUserId: driverUserId,
          driverId: driverProfileId,
          score: 5.0,
          comment: 'Mencoba rating kedua kali',
        });
      },
      ConflictException,
      'Duplicate rating attempt on same ride must throw ConflictException'
    );
  });

  // ===========================================================================
  // TEST 5: SELF-RATING REJECTION
  // ===========================================================================
  test('5. Self-rating rejection: prevents reviewer from rating themselves', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000004';
    setupCompletedRide(rideId);

    await assert.rejects(
      async () => {
        await ratingRepo.create({
          rideId,
          reviewerId: passengerId,
          reviewedUserId: passengerId, // Same user!
          score: 5.0,
        });
      },
      BadRequestException,
      'Self-rating must be rejected'
    );
  });

  // ===========================================================================
  // TEST 6: DRIVER EARNINGS LEDGER SCHEMA COMPLIANCE
  // ===========================================================================
  test('6. Driver earnings ledger: records Driver, Ride, Gross, Platform Fee, Net, Currency, Status, and Timestamps', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000005';
    setupCompletedRide(rideId, 20000);

    const record = await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId,
      paymentId: 'pay-001',
      grossAmount: 20000,
      platformFee: 3000, // 15%
      netAmount: 17000,   // 85%
      tipAmount: 2000,
      currency: 'IDR',
      status: 'SETTLED',
      periodDate: '2026-10-09',
    });

    assert.ok(record.id);
    assert.equal(record.driverId, driverProfileId);
    assert.equal(record.rideId, rideId);
    assert.equal(record.paymentId, 'pay-001');
    assert.equal(record.grossAmount, 20000);
    assert.equal(record.platformFee, 3000);
    assert.equal(record.netAmount, 17000);
    assert.equal(record.tipAmount, 2000);
    assert.equal(record.currency, 'IDR');
    assert.equal(record.status, 'SETTLED');
    assert.equal(record.periodDate, '2026-10-09');
    assert.ok(record.createdAt);
  });

  // ===========================================================================
  // TEST 7: MONETARY ARITHMETIC INTEGRITY
  // ===========================================================================
  test('7. Monetary integrity: enforces net + fee === gross without floating-point artifacts', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000006';
    setupCompletedRide(rideId, 18400);

    // Mismatched split: 15640 + 2000 !== 18400 -> must fail
    await assert.rejects(
      async () => {
        await earningsRepo.recordEarnings({
          driverId: driverProfileId,
          rideId,
          grossAmount: 18400,
          platformFee: 2000,
          netAmount: 15640,
        });
      },
      BadRequestException,
      'Unbalanced earnings split must be rejected'
    );

    // Negative amounts must fail
    await assert.rejects(
      async () => {
        await earningsRepo.recordEarnings({
          driverId: driverProfileId,
          rideId,
          grossAmount: -1000,
          platformFee: 0,
          netAmount: -1000,
        });
      },
      BadRequestException,
      'Negative amounts must be rejected'
    );

    // Correct exact integer split passes
    const valid = await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId,
      grossAmount: 18400,
      platformFee: 2760, // 15%
      netAmount: 15640,   // 85%
    });
    assert.equal(valid.netAmount + valid.platformFee, valid.grossAmount);
  });

  // ===========================================================================
  // TEST 8: EARNINGS UNIQUE CONSTRAINT PER DRIVER & RIDE
  // ===========================================================================
  test('8. Earnings unique constraint: prevents duplicate earnings record per driver and ride', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000007';
    setupCompletedRide(rideId, 12000);

    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId,
      grossAmount: 12000,
      platformFee: 1800,
      netAmount: 10200,
    });

    // Second record for same driver and ride must throw ConflictException
    await assert.rejects(
      async () => {
        await earningsRepo.recordEarnings({
          driverId: driverProfileId,
          rideId,
          grossAmount: 12000,
          platformFee: 1800,
          netAmount: 10200,
        });
      },
      ConflictException,
      'Duplicate earnings record for same ride must throw ConflictException'
    );
  });

  // ===========================================================================
  // TEST 9: COMPOSITE TRIP HISTORY QUERY WITH PAGINATION
  // ===========================================================================
  test('9. Trip History: joins rides, ratings, and earnings with status filtering and pagination', async () => {
    const rideId1 = 'r0000000-0000-0000-0000-000000000010';
    const rideId2 = 'r0000000-0000-0000-0000-000000000011';

    setupCompletedRide(rideId1, 15000);
    setupCompletedRide(rideId2, 25000);

    // Add rating to ride 1
    await ratingRepo.create({
      rideId: rideId1,
      reviewerId: passengerId,
      reviewedUserId: driverUserId,
      driverId: driverProfileId,
      score: 5.0,
      comment: 'Bagus',
    });

    // Add earnings to ride 1
    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId: rideId1,
      grossAmount: 15000,
      platformFee: 2250,
      netAmount: 12750,
    });

    const history = await historyRepo.getTripHistory({
      userId: passengerId,
      role: 'CUSTOMER',
      status: 'COMPLETED',
      limit: 10,
      offset: 0,
    });

    assert.ok(history.total >= 2);
    assert.ok(history.items.length >= 2);

    const itemWithRating = history.items.find((item) => item.rideId === rideId1);
    assert.ok(itemWithRating);
    assert.ok(itemWithRating.rating);
    assert.equal(itemWithRating.rating?.score, 5.0);
    assert.equal(itemWithRating.rating?.comment, 'Bagus');

    // Customer should not see internal driver earnings ledger breakdown
    assert.equal(itemWithRating.earnings, undefined);
  });

  // ===========================================================================
  // TEST 10: AUTHORIZATION LAYER SCOPING
  // ===========================================================================
  test('10. Authorization layer: prevents unauthorized access across users and roles', async () => {
    const rideId = 'r0000000-0000-0000-0000-000000000020';
    setupCompletedRide(rideId, 18000);

    await ratingRepo.create({
      rideId,
      reviewerId: passengerId,
      reviewedUserId: driverUserId,
      driverId: driverProfileId,
      score: 4.9,
      comment: 'Puas',
    });

    await earningsRepo.recordEarnings({
      driverId: driverProfileId,
      rideId,
      grossAmount: 18000,
      platformFee: 2700,
      netAmount: 15300,
    });

    // 1. Other passenger cannot query this passenger's ratings
    await assert.rejects(
      async () => {
        await ratingRepo.findByReviewerId(passengerId, {
          id: otherPassengerId,
          role: 'CUSTOMER',
        });
      },
      ForbiddenException,
      'Cross-user passenger rating lookup must be rejected'
    );

    // 2. Other driver cannot query this driver's earnings
    await assert.rejects(
      async () => {
        await earningsRepo.queryDriverEarnings(
          { driverId: driverProfileId },
          { id: otherDriverId, role: 'DRIVER', driverId: otherDriverId }
        );
      },
      ForbiddenException,
      'Cross-driver earnings query must be rejected'
    );

    // 3. Authorized driver can query their own earnings
    const driverEarnings = await earningsRepo.queryDriverEarnings(
      { driverId: driverProfileId },
      { id: driverProfileId, role: 'DRIVER', driverId: driverProfileId }
    );
    assert.ok(driverEarnings.totalGross >= 18000);

    // 4. Admin can query any driver's earnings
    const adminQuery = await earningsRepo.queryDriverEarnings(
      { driverId: driverProfileId },
      { id: 'admin-01', role: 'ADMIN' }
    );
    assert.ok(adminQuery.totalGross >= 18000);
  });
});

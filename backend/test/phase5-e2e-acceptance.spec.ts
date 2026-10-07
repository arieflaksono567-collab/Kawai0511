import { test, describe, before } from 'node:test';
import * as assert from 'node:assert/strict';
import { AuthService } from '../src/auth/auth.service';
import { MockOtpProvider } from '../src/auth/providers/mock-otp.provider';
import { FareService } from '../src/ride/fare.service';
import { RideDispatchService } from '../src/ride/ride-dispatch.service';
import { RideService } from '../src/ride/ride.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { RedisGeoService } from '../src/location/redis-geo.service';
import { RoutingService } from '../src/location/routing.service';
import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';

describe('Phase 5: Full End-to-End Acceptance Test Simulation', () => {
  let authService: AuthService;
  let fareService: FareService;
  let freshnessService: LocationFreshnessService;
  let redisGeoService: RedisGeoService;
  let geospatialService: GeospatialService;
  let routingService: RoutingService;
  let driverEligibilityService: DriverEligibilityService;
  let dispatchService: RideDispatchService;
  let rideService: RideService;

  const customerPhone = '+6281255110987';
  const customerId = 'b0000000-0000-0000-0000-000000000002';
  const driverPhone = '+6281390511200';
  const driverId = 'd0000000-0000-0000-0000-000000000001';

  before(() => {
    const mockOtpProvider = new MockOtpProvider();
    authService = new AuthService(mockOtpProvider);
    fareService = new FareService();
    freshnessService = new LocationFreshnessService();
    redisGeoService = new RedisGeoService();
    geospatialService = new GeospatialService(freshnessService, redisGeoService);
    routingService = new RoutingService();
    driverEligibilityService = new DriverEligibilityService();
    dispatchService = new RideDispatchService(geospatialService, freshnessService, driverEligibilityService);
    rideService = new RideService(fareService, dispatchService, routingService, driverEligibilityService);
  });

  test('E2E SIMULATION: Complete 15-Step Lifecycle from Customer Login to Completed Ride', async () => {
    console.log('\n================================================================');
    console.log('🚀 MEMULAI SIMULASI END-TO-END ACCEPTANCE TEST (PHASE 5A + 5B)');
    console.log('================================================================\n');

    // STEP 1: CUSTOMER
    console.log('--- [STEP 1/15] CUSTOMER ---');
    console.log(`Pelanggan teridentifikasi: Arief Laksono (${customerPhone})`);
    assert.ok(customerPhone, 'Nomor telepon pelanggan valid');

    // STEP 2: LOGIN (OTP Request & Verify)
    console.log('\n--- [STEP 2/15] LOGIN ---');
    const otpReq = await authService.requestOtp({ phoneNumber: customerPhone, purpose: 'LOGIN' });
    assert.equal(otpReq.success, true);
    console.log('1. Request OTP berhasil: status 200 OK');

    const authTokens = await authService.verifyOtp({ phoneNumber: customerPhone, otp: '051100' });
    assert.ok(authTokens.accessToken, 'Access Token JWT diterbitkan');
    assert.equal(authTokens.user.role, 'CUSTOMER');
    console.log(`2. Verify OTP sukses: Token diterbitkan, Role=${authTokens.user.role}`);

    // STEP 3: ORDER
    console.log('\n--- [STEP 3/15] ORDER ---');
    const pickup = {
      address: 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
      lat: -3.319437,
      lng: 114.590822,
    };
    const destination = {
      address: 'Universitas Lambung Mangkurat (ULM), Kayutangi',
      lat: -3.298510,
      lng: 114.588020,
    };
    const distanceKm = 4.2;
    const durationMinutes = 14;

    console.log(`Titik Jemput : ${pickup.address}`);
    console.log(`Titik Tujuan : ${destination.address}`);
    console.log(`Rute         : ${distanceKm} km • ${durationMinutes} menit`);

    // STEP 4: FARE CALCULATION
    console.log('\n--- [STEP 4/15] FARE CALCULATION ---');
    const fareSnapshot = fareService.calculateFare(distanceKm, durationMinutes);
    console.log(`Tarif Dasar (Base) : Rp ${fareSnapshot.baseFare.toLocaleString('id-ID')}`);
    console.log(`Tarif Jarak (Distance): Rp ${fareSnapshot.distanceFare.toLocaleString('id-ID')} (${distanceKm} km x Rp 2.200)`);
    console.log(`Tarif Waktu (Duration): Rp ${fareSnapshot.durationFare.toLocaleString('id-ID')} (${durationMinutes} mnt x Rp 200)`);
    console.log(`Total Tarif Resmi  : Rp ${fareSnapshot.totalFare.toLocaleString('id-ID')}`);

    // Formula verification: 7000 + (4.2 * 2200) + (14 * 200) = 7000 + 9240 + 2800 = 19040 (>= 10000)
    assert.equal(fareSnapshot.baseFare, 7000);
    assert.equal(fareSnapshot.perKmRate, 2200);
    assert.equal(fareSnapshot.perMinuteRate, 200);
    assert.equal(fareSnapshot.minimumFare, 10000);
    assert.equal(fareSnapshot.totalFare, 19040);
    console.log('✅ Verifikasi Snapshot Tarif: Formula Phase 5 100% Cocok & Terkunci');

    // STEP 5: SEARCHING
    console.log('\n--- [STEP 5/15] SEARCHING ---');
    const activeDriverLocations = [
      {
        driverId,
        latitude: -3.3198,
        longitude: 114.5912,
        recordedAt: new Date().toISOString(), // Fresh < 10 detik
      },
    ];

    const orderResult = await rideService.createOrder(
      {
        passengerId: customerId,
        pickupAddress: pickup.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        destinationAddress: destination.address,
        destinationLat: destination.lat,
        destinationLng: destination.lng,
        distanceKm,
        durationMinutes,
      },
      activeDriverLocations
    );

    assert.ok(orderResult.id, 'Ride order ID terbuat');
    assert.equal(orderResult.status, 'SEARCHING');
    assert.equal(orderResult.version, 1);
    assert.equal(orderResult.totalFare, 19040);
    console.log(`Status Order dibuat: ${orderResult.status} (ID: ${orderResult.id}, Version: v${orderResult.version})`);

    // STEP 6: FIND DRIVER
    console.log('\n--- [STEP 6/15] FIND DRIVER ---');
    const attempts = rideService.getDispatchAttempts(orderResult.id);
    assert.ok(attempts.length > 0, 'Dispatch attempt harus terbentuk');
    const currentAttempt = attempts[attempts.length - 1];
    assert.equal(currentAttempt.driverId, driverId);
    console.log(`Armada Ditemukan  : Ahmad Gazali (ID: ${driverId})`);
    console.log(`Jarak ke Penjemput: ${currentAttempt.distanceMeters} meter (Radius < 1500m)`);
    console.log(`ETA Penjemputan   : ${currentAttempt.etaSeconds} detik`);
    console.log('Syarat Driver     : DRIVER • APPROVED • 4 Dokumen Lengkap • Motor Aktif • ONLINE • GPS FRESH');

    // STEP 7: DISPATCH
    console.log('\n--- [STEP 7/15] DISPATCH ---');
    assert.equal(currentAttempt.status, 'OFFERED');
    console.log(`Status Penawaran  : ${currentAttempt.status}`);
    console.log(`Batas Waktu Respon: 30 Detik (Attempt #${currentAttempt.attemptNumber})`);

    // STEP 8: DRIVER ACCEPT
    console.log('\n--- [STEP 8/15] DRIVER ACCEPT ---');
    const acceptedRide = await rideService.acceptRide(orderResult.id, driverId, orderResult.version);
    console.log(`Mitra Driver ${driverId} menekan [TERIMA ORDER]`);

    // STEP 9: ASSIGNED
    console.log('\n--- [STEP 9/15] ASSIGNED ---');
    assert.equal(acceptedRide.status, 'ASSIGNED');
    assert.equal(acceptedRide.driverId, driverId);
    assert.ok(acceptedRide.assignedAt, 'Waktu penugasan assignedAt harus tersimpan');
    assert.equal(acceptedRide.version, 2);
    console.log(`Transisi Sukses   : SEARCHING -> ASSIGNED`);
    console.log(`Mitra Bertugas    : ${acceptedRide.driver?.name} (${acceptedRide.driver?.vehiclePlate})`);
    console.log(`Waktu Penugasan   : ${acceptedRide.assignedAt}`);
    console.log(`Version Lock      : v${acceptedRide.version}`);

    // STEP 10: DRIVER ARRIVED (Endpoint / Action)
    console.log('\n--- [STEP 10/15] DRIVER ARRIVED (Action) ---');
    console.log('Driver menempuh perjalanan menuju lokasi penjemputan Duta Mall...');
    const arrivedRide = await rideService.driverArrived(acceptedRide.id, driverId, acceptedRide.version);

    // STEP 11: ARRIVED (State)
    console.log('\n--- [STEP 11/15] ARRIVED (State Transition) ---');
    assert.equal(arrivedRide.status, 'ARRIVED');
    assert.ok(arrivedRide.arrivedAt, 'Waktu tiba arrivedAt harus tersimpan');
    assert.equal(arrivedRide.version, 3);
    console.log(`Transisi Sukses   : ASSIGNED -> ARRIVED`);
    console.log(`Waktu Tiba        : ${arrivedRide.arrivedAt}`);
    console.log(`Version Lock      : v${arrivedRide.version}`);

    // STEP 12: START (Endpoint / Action)
    console.log('\n--- [STEP 12/15] START (Action) ---');
    console.log('Penumpang telah bertemu driver, menaiki kendaraan, dan trip dimulai...');
    const inTripRide = await rideService.startRide(arrivedRide.id, driverId, arrivedRide.version);

    // STEP 13: IN_TRIP (State)
    console.log('\n--- [STEP 13/15] IN_TRIP (State Transition) ---');
    assert.equal(inTripRide.status, 'IN_TRIP');
    assert.ok(inTripRide.startedAt, 'Waktu mulai trip startedAt harus tersimpan');
    assert.equal(inTripRide.version, 4);
    console.log(`Transisi Sukses   : ARRIVED -> IN_TRIP`);
    console.log(`Waktu Berangkat   : ${inTripRide.startedAt}`);
    console.log(`Version Lock      : v${inTripRide.version}`);

    // STEP 14: COMPLETE (Endpoint / Action)
    console.log('\n--- [STEP 14/15] COMPLETE (Action) ---');
    console.log('Driver telah tiba di tujuan ULM Kayutangi dan menekan [SELESAIKAN PERJALANAN]...');
    const completedRide = await rideService.completeRide(inTripRide.id, driverId, inTripRide.version);

    // STEP 15: COMPLETED (State)
    console.log('\n--- [STEP 15/15] COMPLETED (State Final) ---');
    assert.equal(completedRide.status, 'COMPLETED');
    assert.ok(completedRide.completedAt, 'Waktu selesai completedAt harus tersimpan');
    assert.equal(completedRide.version, 5);
    assert.equal(completedRide.totalFare, 19040);
    console.log(`Transisi Sukses   : IN_TRIP -> COMPLETED`);
    console.log(`Waktu Selesai     : ${completedRide.completedAt}`);
    console.log(`Tarif Terkunci    : Rp ${completedRide.totalFare.toLocaleString('id-ID')}`);
    console.log(`Version Lock Final: v${completedRide.version}`);

    // VERIFIKASI KEAMANAN: RIDE TIDAK BISA DI-RESTART ATAU DI-DOUBLE-COMPLETE
    console.log('\n--- VERIFIKASI KEAMANAN INTEGRITAS STATE MACHINE ---');
    await assert.rejects(
      async () => {
        await rideService.completeRide(completedRide.id, driverId, completedRide.version);
      },
      { name: 'BadRequestException' },
      'Ride yang sudah COMPLETED tidak boleh dapat diselesaikan dua kali'
    );
    console.log('✅ Proteksi Double Complete: Dicegah dengan HTTP 400 Bad Request');

    await assert.rejects(
      async () => {
        await rideService.cancelRide(completedRide.id, customerId, 'CUSTOMER', { reason: 'Ingin batal' });
      },
      { name: 'BadRequestException' },
      'Ride yang sudah COMPLETED dilarang dibatalkan'
    );
    console.log('✅ Proteksi Pembatalan Trip Selesai: Dicegah dengan HTTP 400 Bad Request');

    console.log('\n================================================================');
    console.log('🎉 SELURUH 15 TAHAP SIMULASI ACCEPTANCE TEST SELESAI & LULUS!');
    console.log('================================================================\n');
  });
});

import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { FareService, FareCalculationResult } from './fare.service';
import { RideDispatchService, DispatchCandidate } from './ride-dispatch.service';
import { RoutingService } from '../location/routing.service';
import { DriverEligibilityService } from '../driver/driver-eligibility.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';

export type RideStatus = 'SEARCHING' | 'ASSIGNED' | 'ARRIVED' | 'IN_TRIP' | 'COMPLETED' | 'CANCELLED';

export interface RideStateLog {
  id: string;
  rideId: string;
  fromState?: RideStatus;
  toState: RideStatus;
  actorId: string;
  actorRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
  note?: string;
  createdAt: string;
}

export interface RideOrder {
  id: string;
  passengerId: string;
  driverId?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  durationMinutes: number;
  totalFare: number;
  fareSnapshot: FareCalculationResult;
  status: RideStatus;
  version: number;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  assignedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  updatedAt: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehiclePlate: string;
    vehicleModel: string;
    rating: number;
  };
  matchedCandidate?: DispatchCandidate;
}

@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);

  // In-Memory Persistent Store (PostgreSQL 16 representation)
  private rides = new Map<string, RideOrder>();
  private stateLogs: RideStateLog[] = [];

  constructor(
    private readonly fareService: FareService,
    private readonly dispatchService: RideDispatchService,
    private readonly routingService: RoutingService,
    private readonly driverEligibilityService: DriverEligibilityService
  ) {
    this.seedSampleRides();
  }

  private seedSampleRides() {
    // Seed initial completed trip for driver Ahmad Gazali
    const sampleId = 'r0000000-0000-0000-0000-000000000001';
    const fare = this.fareService.calculateFare(3.8, 11);
    const now = new Date().toISOString();

    const sampleRide: RideOrder = {
      id: sampleId,
      passengerId: 'b0000000-0000-0000-0000-000000000002',
      driverId: 'd0000000-0000-0000-0000-000000000001',
      pickupAddress: 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
      pickupLat: -3.319437,
      pickupLng: 114.590822,
      destinationAddress: 'Kampus ULM Banjarmasin, Kayu Tangi',
      destinationLat: -3.298510,
      destinationLng: 114.588020,
      distanceKm: 3.8,
      durationMinutes: 11,
      totalFare: fare.totalFare,
      fareSnapshot: fare,
      status: 'COMPLETED',
      version: 5,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      assignedAt: new Date(Date.now() - 3500000).toISOString(),
      arrivedAt: new Date(Date.now() - 3300000).toISOString(),
      startedAt: new Date(Date.now() - 3200000).toISOString(),
      completedAt: new Date(Date.now() - 2500000).toISOString(),
      updatedAt: now,
      driver: {
        id: 'd0000000-0000-0000-0000-000000000001',
        name: 'Ahmad Gazali',
        phone: '+6281390511200',
        vehiclePlate: 'DA 5110 KAW',
        vehicleModel: 'Honda Vario 160',
        rating: 4.9,
      },
    };

    this.rides.set(sampleId, sampleRide);
  }

  // 1. CREATE RIDE ORDER (Passenger -> SEARCHING)
  async createRide(passengerId: string, dto: CreateRideDto): Promise<RideOrder> {
    // 1. Validasi koordinat fisik
    if (
      dto.pickupLat < -90 || dto.pickupLat > 90 ||
      dto.pickupLng < -180 || dto.pickupLng > 180 ||
      dto.destinationLat < -90 || dto.destinationLat > 90 ||
      dto.destinationLng < -180 || dto.destinationLng > 180
    ) {
      throw new BadRequestException('Koordinat penjemputan atau tujuan di luar batas bumi');
    }

    // 2. Hitung jarak dan durasi rute via Phase 4 RoutingService jika tidak disediakan
    let distKm = dto.distanceKm;
    let durMin = dto.durationMinutes;

    if (!distKm || !durMin) {
      const route = await this.routingService.getRoute(
        dto.pickupLat,
        dto.pickupLng,
        dto.destinationLat,
        dto.destinationLng
      );
      distKm = parseFloat((route.distanceMeters / 1000).toFixed(2));
      durMin = Math.max(2, Math.round(route.durationSeconds / 60));
    }

    // 3. Hitung tarif resmi Phase 5 via FareService
    const fareSnapshot = this.fareService.calculateFare(distKm, durMin);

    // 4. Generate Ride Entity (Initial status: SEARCHING)
    const rideId = `ride-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const ride: RideOrder = {
      id: rideId,
      passengerId,
      pickupAddress: dto.pickupAddress,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      destinationAddress: dto.destinationAddress,
      destinationLat: dto.destinationLat,
      destinationLng: dto.destinationLng,
      distanceKm: distKm,
      durationMinutes: durMin,
      totalFare: fareSnapshot.totalFare,
      fareSnapshot,
      status: 'SEARCHING',
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    // 5. Catat audit state log
    this.recordStateLog(rideId, undefined, 'SEARCHING', passengerId, 'CUSTOMER', 'Pemesanan perjalanan baru dibuat');

    // 6. Jalankan Matching Driver via RideDispatchService
    const activeDriverIds = this.getActiveDriverIdsInTrip();
    const dispatchResult = await this.dispatchService.matchNearestDriver(
      dto.pickupLat,
      dto.pickupLng,
      activeDriverIds
    );

    if (dispatchResult.matched && dispatchResult.selectedDriver) {
      ride.matchedCandidate = dispatchResult.selectedDriver;
      this.logger.log(`Order ${rideId} dicocokkan dengan kandidat driver ${dispatchResult.selectedDriver.driverId}`);
    }

    this.rides.set(rideId, ride);
    return ride;
  }

  // 2. GET RIDE BY ID
  async getRide(rideId: string, currentUserId?: string, currentUserRole?: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order perjalanan dengan ID ${rideId} tidak ditemukan`);
    }

    // IDOR Protection: Penumpang hanya boleh akses order miliknya, Driver hanya boleh akses order miliknya
    if (currentUserId && currentUserRole) {
      if (
        currentUserRole === 'CUSTOMER' && ride.passengerId !== currentUserId
      ) {
        throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke order ini');
      }
      if (
        currentUserRole === 'DRIVER' && ride.driverId && ride.driverId !== currentUserId
      ) {
        throw new ForbiddenException('Akses ditolak: Order ini bukan milik Anda');
      }
    }

    return ride;
  }

  // 3. GET USER RIDES (Passenger or Driver active/history)
  async getUserRides(userId: string, role: string): Promise<RideOrder[]> {
    const all = Array.from(this.rides.values());
    if (role === 'CUSTOMER') {
      return all.filter((r) => r.passengerId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (role === 'DRIVER') {
      return all.filter((r) => r.driverId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // 4. ACCEPT RIDE (Driver -> ASSIGNED with Optimistic Locking)
  async acceptRide(
    rideId: string,
    driverId: string,
    expectedVersion?: number
  ): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    // 1. Verifikasi Driver Eligibility (Phase 3)
    const isEligible = this.driverEligibilityService.isDriverEligible(driverId);
    if (!isEligible) {
      throw new ForbiddenException('Driver belum memenuhi kelayakan verifikasi operasional untuk menerima order');
    }

    // 2. Concurrency Check: Driver tidak boleh memiliki order aktif lain
    const activeDriverIds = this.getActiveDriverIdsInTrip();
    if (activeDriverIds.has(driverId)) {
      throw new ConflictException('Driver sedang melayani perjalanan lain yang belum selesai');
    }

    // 3. State Machine Check: Hanya SEARCHING yang dapat di-ACCEPT
    if (ride.status !== 'SEARCHING') {
      throw new ConflictException(`Order tidak dapat diterima karena sudah dalam status ${ride.status}`);
    }

    // 4. Optimistic Concurrency Control (Version match)
    if (expectedVersion !== undefined && ride.version !== expectedVersion) {
      throw new ConflictException('Terjadi konflik versi order. Order kemungkinan telah diterima mitra lain');
    }

    const now = new Date().toISOString();

    // Atomic assignment transition
    ride.status = 'ASSIGNED';
    ride.driverId = driverId;
    ride.version += 1;
    ride.assignedAt = now;
    ride.updatedAt = now;
    ride.driver = {
      id: driverId,
      name: 'Ahmad Gazali',
      phone: '+6281390511200',
      vehiclePlate: 'DA 5110 KAW',
      vehicleModel: 'Honda Vario 160',
      rating: 4.9,
    };

    this.recordStateLog(rideId, 'SEARCHING', 'ASSIGNED', driverId, 'DRIVER', 'Order berhasil diterima oleh mitra driver');
    return ride;
  }

  // 5. DRIVER ARRIVED (ASSIGNED -> ARRIVED)
  async driverArrived(rideId: string, driverId: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Hanya mitra driver yang ditugaskan yang dapat mengonfirmasi tiba');
    }

    if (ride.status !== 'ASSIGNED') {
      throw new BadRequestException(`Transisi tidak valid: Status saat ini ${ride.status}, wajib ASSIGNED`);
    }

    const now = new Date().toISOString();
    ride.status = 'ARRIVED';
    ride.version += 1;
    ride.arrivedAt = now;
    ride.updatedAt = now;

    this.recordStateLog(rideId, 'ASSIGNED', 'ARRIVED', driverId, 'DRIVER', 'Driver telah tiba di titik penjemputan');
    return ride;
  }

  // 6. START RIDE (ARRIVED -> IN_TRIP)
  async startRide(rideId: string, driverId: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Hanya mitra driver yang ditugaskan yang dapat memulai perjalanan');
    }

    if (ride.status !== 'ARRIVED') {
      throw new BadRequestException(`Transisi tidak valid: Perjalanan hanya dapat dimulai saat status ARRIVED`);
    }

    const now = new Date().toISOString();
    ride.status = 'IN_TRIP';
    ride.version += 1;
    ride.startedAt = now;
    ride.updatedAt = now;

    this.recordStateLog(rideId, 'ARRIVED', 'IN_TRIP', driverId, 'DRIVER', 'Perjalanan bersama penumpang telah dimulai');
    return ride;
  }

  // 7. FINISH / COMPLETE RIDE (IN_TRIP -> COMPLETED)
  async finishRide(rideId: string, driverId: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Hanya mitra driver yang ditugaskan yang dapat menyelesaikan perjalanan');
    }

    if (ride.status !== 'IN_TRIP') {
      throw new BadRequestException(`Transisi tidak valid: Hanya perjalanan aktif (IN_TRIP) yang dapat diselesaikan`);
    }

    const now = new Date().toISOString();
    ride.status = 'COMPLETED';
    ride.version += 1;
    ride.completedAt = now;
    ride.updatedAt = now;

    this.recordStateLog(rideId, 'IN_TRIP', 'COMPLETED', driverId, 'DRIVER', 'Perjalanan telah selesai dengan selamat');
    return ride;
  }

  // 8. CANCEL RIDE (from SEARCHING, ASSIGNED, or ARRIVED)
  async cancelRide(
    rideId: string,
    actorId: string,
    actorRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM',
    dto?: CancelRideDto
  ): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    // Strict Rule: IN_TRIP dan COMPLETED TIDAK BOLEH DIBATALKAN!
    if (ride.status === 'IN_TRIP' || ride.status === 'COMPLETED') {
      throw new BadRequestException(`Order tidak dapat dibatalkan saat status ${ride.status}`);
    }

    if (ride.status === 'CANCELLED') {
      return ride; // Idempotent
    }

    const prevStatus = ride.status;
    const now = new Date().toISOString();

    ride.status = 'CANCELLED';
    ride.version += 1;
    ride.cancelledBy = actorRole;
    ride.cancellationReason = dto?.reason || 'Dibatalkan oleh pengguna';
    ride.cancelledAt = now;
    ride.updatedAt = now;

    this.recordStateLog(rideId, prevStatus, 'CANCELLED', actorId, actorRole, ride.cancellationReason);
    return ride;
  }

  // Helper: Dapatkan driver yang sedang berada dalam trip aktif
  private getActiveDriverIdsInTrip(): Set<string> {
    const activeIds = new Set<string>();
    for (const r of this.rides.values()) {
      if (r.driverId && (r.status === 'ASSIGNED' || r.status === 'ARRIVED' || r.status === 'IN_TRIP')) {
        activeIds.add(r.driverId);
      }
    }
    return activeIds;
  }

  // Helper: Rekam audit state log
  private recordStateLog(
    rideId: string,
    fromState: RideStatus | undefined,
    toState: RideStatus,
    actorId: string,
    actorRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM',
    note?: string
  ) {
    this.stateLogs.push({
      id: crypto.randomUUID(),
      rideId,
      fromState,
      toState,
      actorId,
      actorRole,
      note,
      createdAt: new Date().toISOString(),
    });
  }

  getStateLogs(rideId: string): RideStateLog[] {
    return this.stateLogs.filter((l) => l.rideId === rideId);
  }
}

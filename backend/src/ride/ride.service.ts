import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EstimateFareDto } from './dto/estimate-fare.dto';
import { CreateRideDto } from './dto/create-ride.dto';

export type RideStatus = 'SEARCHING' | 'ASSIGNED' | 'ARRIVED' | 'IN_TRIP' | 'COMPLETED' | 'CANCELLED';

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
  driverShare: number;
  platformFee: number;
  status: RideStatus;
  createdAt: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehiclePlate: string;
    vehicleModel: string;
    rating: number;
  };
}

@Injectable()
export class RideService {
  // Pricing Constants (KAWAI 0511 Banjarmasin Standard)
  private readonly BASE_FARE = 7000;
  private readonly PER_KM = 2200;
  private readonly PER_MINUTE = 200;
  private readonly MINIMUM_FARE = 10000;
  private readonly COMMISSION_RATE = 0.15; // 15% Platform
  private readonly DRIVER_SHARE_RATE = 0.85; // 85% Driver

  private activeRides = new Map<string, RideOrder>();

  // 1. Calculate Fare according to Blueprint formula
  calculateFare(dto: EstimateFareDto) {
    const rawFare = this.BASE_FARE + dto.distanceKm * this.PER_KM + dto.durationMinutes * this.PER_MINUTE;
    const baseWithMin = Math.max(rawFare, this.MINIMUM_FARE);
    const surge = dto.surgeMultiplier || 1.0;
    const totalFare = Math.round(baseWithMin * surge);
    const driverShare = Math.round(totalFare * this.DRIVER_SHARE_RATE);
    const platformFee = totalFare - driverShare;

    return {
      baseFare: this.BASE_FARE,
      distanceKm: dto.distanceKm,
      perKmRate: this.PER_KM,
      durationMinutes: dto.durationMinutes,
      perMinuteRate: this.PER_MINUTE,
      minimumFare: this.MINIMUM_FARE,
      surgeMultiplier: surge,
      totalFare,
      driverShare,
      platformFee,
    };
  }

  // 2. Create Ride Order (State: SEARCHING)
  async createRide(dto: CreateRideDto): Promise<RideOrder> {
    const fareDetails = this.calculateFare({
      distanceKm: dto.distanceKm,
      durationMinutes: dto.durationMinutes,
    });

    const rideId = `ride-${Date.now().toString().slice(-6)}`;
    const ride: RideOrder = {
      id: rideId,
      passengerId: dto.passengerId || 'usr-pass-001',
      pickupAddress: dto.pickupAddress,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      destinationAddress: dto.destinationAddress,
      destinationLat: dto.destinationLat,
      destinationLng: dto.destinationLng,
      distanceKm: dto.distanceKm,
      durationMinutes: dto.durationMinutes,
      totalFare: fareDetails.totalFare,
      driverShare: fareDetails.driverShare,
      platformFee: fareDetails.platformFee,
      status: 'SEARCHING',
      createdAt: new Date().toISOString(),
    };

    this.activeRides.set(rideId, ride);
    return ride;
  }

  // 3. Driver accepts ride (SEARCHING -> ASSIGNED)
  async acceptRide(rideId: string, driverId: string = 'drv-001'): Promise<RideOrder> {
    const ride = this.getRideOrThrow(rideId);
    if (ride.status !== 'SEARCHING') {
      throw new BadRequestException(`Transisi tidak valid: Tidak dapat menerima order dalam status ${ride.status}`);
    }

    ride.status = 'ASSIGNED';
    ride.driverId = driverId;
    ride.driver = {
      id: driverId,
      name: 'Ahmad Gazali',
      phone: '081390511200',
      vehiclePlate: 'DA 4511 KW',
      vehicleModel: 'Honda Vario 150',
      rating: 4.9,
    };

    return ride;
  }

  // 4. Driver arrives at pickup (ASSIGNED -> ARRIVED)
  async driverArrived(rideId: string): Promise<RideOrder> {
    const ride = this.getRideOrThrow(rideId);
    if (ride.status !== 'ASSIGNED') {
      throw new BadRequestException(`Transisi tidak valid: Driver hanya dapat tiba jika order dalam status ASSIGNED`);
    }

    ride.status = 'ARRIVED';
    return ride;
  }

  // 5. Ride starts (ARRIVED -> IN_TRIP)
  async startRide(rideId: string): Promise<RideOrder> {
    const ride = this.getRideOrThrow(rideId);
    if (ride.status !== 'ARRIVED') {
      throw new BadRequestException(`Transisi tidak valid: Perjalanan hanya dapat dimulai setelah driver tiba`);
    }

    ride.status = 'IN_TRIP';
    return ride;
  }

  // 6. Ride completes (IN_TRIP -> COMPLETED)
  async finishRide(rideId: string): Promise<RideOrder> {
    const ride = this.getRideOrThrow(rideId);
    if (ride.status !== 'IN_TRIP') {
      throw new BadRequestException(`Transisi tidak valid: Hanya perjalanan aktif (IN_TRIP) yang dapat diselesaikan`);
    }

    ride.status = 'COMPLETED';
    return ride;
  }

  // 7. Cancel Ride (from SEARCHING or ASSIGNED)
  async cancelRide(rideId: string, reason?: string): Promise<RideOrder> {
    const ride = this.getRideOrThrow(rideId);
    if (ride.status === 'IN_TRIP' || ride.status === 'COMPLETED') {
      throw new BadRequestException(`Order yang sedang berjalan atau sudah selesai tidak dapat dibatalkan`);
    }

    ride.status = 'CANCELLED';
    return ride;
  }

  getRide(rideId: string): RideOrder | undefined {
    return this.activeRides.get(rideId);
  }

  private getRideOrThrow(rideId: string): RideOrder {
    const ride = this.activeRides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ride dengan ID ${rideId} tidak ditemukan`);
    }
    return ride;
  }
}

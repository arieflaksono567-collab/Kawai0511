import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TripHistoryDetail, TripHistoryFilter } from './trip-history.types';
import { RideService } from './ride.service';
import { RatingRepository } from '../rating/rating.repository';
import { DriverEarningsLedgerRepository } from '../payment/driver-earnings-ledger.repository';

@Injectable()
export class TripHistoryRepository {
  constructor(
    private readonly rideService: RideService,
    private readonly ratingRepository?: RatingRepository,
    private readonly earningsRepository?: DriverEarningsLedgerRepository
  ) {}

  /**
   * Query composite trip history with strict authorization scoping
   */
  async getTripHistory(filter: TripHistoryFilter): Promise<{
    items: TripHistoryDetail[];
    total: number;
    limit: number;
    offset: number;
  }> {
    // 1. Ambil order perjalanan dari RideService (menggunakan index role & status)
    const rides = await this.rideService.getUserRides(
      filter.role === 'DRIVER' && filter.driverId ? filter.driverId : filter.userId,
      filter.role
    );

    let filtered = [...rides];

    // 2. Filter berdasarkan status jika ditentukan
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }

    // 3. Filter berdasarkan rentang tanggal jika ditentukan
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() >= start);
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() <= end);
    }

    // Sort Descending by createdAt
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 4. Paginate
    const offset = filter.offset || 0;
    const limit = filter.limit !== undefined ? filter.limit : 20;
    const paged = filtered.slice(offset, offset + limit);

    // 5. Join dengan Rating & Earnings Ledger
    const items: TripHistoryDetail[] = [];
    for (const r of paged) {
      let ratingDetail;
      if (this.ratingRepository) {
        const ratings = await this.ratingRepository.findByRideId(r.id);
        ratingDetail = ratings.length > 0 ? ratings[0] : undefined;
      }

      let earningsDetail;
      if (this.earningsRepository && filter.role !== 'CUSTOMER') {
        const earnings = await this.earningsRepository.findByRideId(r.id);
        earningsDetail = earnings || undefined;
      }

      items.push({
        rideId: r.id,
        passengerId: r.passengerId,
        driverId: r.driverId,
        pickupAddress: r.pickupAddress,
        pickupLat: r.pickupLat,
        pickupLng: r.pickupLng,
        destinationAddress: r.destinationAddress,
        destinationLat: r.destinationLat,
        destinationLng: r.destinationLng,
        distanceKm: r.distanceKm,
        durationMinutes: r.durationMinutes,
        totalFare: r.totalFare,
        status: r.status,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        cancelledAt: r.cancelledAt,
        cancellationReason: r.cancellationReason,
        rating: ratingDetail,
        earnings: earningsDetail,
      });
    }

    return {
      items,
      total: filtered.length,
      limit,
      offset,
    };
  }

  /**
   * Get single trip detail by ID with authorization verification
   */
  async getTripDetailById(
    rideId: string,
    currentUser: { id: string; role: 'CUSTOMER' | 'DRIVER' | 'ADMIN'; driverId?: string }
  ): Promise<TripHistoryDetail> {
    const ride = await this.rideService.getRide(
      rideId,
      currentUser.role === 'DRIVER' && currentUser.driverId ? currentUser.driverId : currentUser.id,
      currentUser.role
    );

    if (!ride) {
      throw new NotFoundException(`Riwayat perjalanan ${rideId} tidak ditemukan`);
    }

    // Enforce authorization
    if (currentUser.role === 'CUSTOMER' && ride.passengerId !== currentUser.id) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke perjalanan ini');
    }

    if (
      currentUser.role === 'DRIVER' &&
      ride.driverId !== currentUser.id &&
      ride.driverId !== currentUser.driverId
    ) {
      throw new ForbiddenException('Akses ditolak: Riwayat perjalanan ini bukan milik armada Anda');
    }

    let ratingDetail;
    if (this.ratingRepository) {
      const ratings = await this.ratingRepository.findByRideId(ride.id);
      ratingDetail = ratings.length > 0 ? ratings[0] : undefined;
    }

    let earningsDetail;
    if (this.earningsRepository && currentUser.role !== 'CUSTOMER') {
      const earnings = await this.earningsRepository.findByRideId(ride.id);
      earningsDetail = earnings || undefined;
    }

    return {
      rideId: ride.id,
      passengerId: ride.passengerId,
      driverId: ride.driverId,
      pickupAddress: ride.pickupAddress,
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
      destinationAddress: ride.destinationAddress,
      destinationLat: ride.destinationLat,
      destinationLng: ride.destinationLng,
      distanceKm: ride.distanceKm,
      durationMinutes: ride.durationMinutes,
      totalFare: ride.totalFare,
      status: ride.status,
      createdAt: ride.createdAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      cancellationReason: ride.cancellationReason,
      rating: ratingDetail,
      earnings: earningsDetail,
    };
  }
}

import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  RideRatingEntity,
  CreateRatingInput,
  RatingQueryFilter,
  DriverRatingSummary,
} from './rating.types';

@Injectable()
export class RatingRepository {
  // Primary Store (UUID -> RideRatingEntity)
  private ratings = new Map<string, RideRatingEntity>();

  // Unique Index Constraint (rideId:reviewerId -> ratingId)
  private uniqueReviewerIndex = new Map<string, string>();

  // Query Secondary Indexes
  private ratingsByRide = new Map<string, Set<string>>(); // rideId -> Set<ratingId>
  private ratingsByReviewer = new Map<string, Set<string>>(); // reviewerId -> Set<ratingId>
  private ratingsByReviewedUser = new Map<string, Set<string>>(); // reviewedUserId -> Set<ratingId>
  private ratingsByDriver = new Map<string, Set<string>>(); // driverId -> Set<ratingId>

  /**
   * Insert rating with strict constraint enforcement
   */
  async create(input: CreateRatingInput): Promise<RideRatingEntity> {
    // 1. Validasi Score Range (1.0 s/d 5.0)
    if (typeof input.score !== 'number' || isNaN(input.score)) {
      throw new BadRequestException('Skor penilaian wajib berupa angka yang valid');
    }

    if (input.score < 1.0 || input.score > 5.0) {
      throw new BadRequestException(
        `Skor penilaian harus berada di antara 1.0 dan 5.0 (diterima: ${input.score})`
      );
    }

    // 2. Validasi Reviewer != Reviewed User (Tidak bisa mereview diri sendiri)
    if (input.reviewerId === input.reviewedUserId) {
      throw new BadRequestException('Pengguna tidak dapat memberikan penilaian kepada diri sendiri');
    }

    // 3. Unique Constraint: Cegah rating ganda per ride per reviewer
    const uniqueKey = `${input.rideId}:${input.reviewerId}`;
    if (this.uniqueReviewerIndex.has(uniqueKey)) {
      throw new ConflictException(
        'Penilaian sudah pernah diberikan untuk perjalanan ini. Rating ganda tidak diizinkan.'
      );
    }

    // 4. Validasi Tip Amount (Nilai moneter non-negatif)
    const tipAmount = input.tipAmount !== undefined ? Math.round(input.tipAmount) : 0;
    if (tipAmount < 0) {
      throw new BadRequestException('Nominal tip tidak boleh bernilai negatif');
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const record: RideRatingEntity = {
      id,
      rideId: input.rideId,
      reviewerId: input.reviewerId,
      reviewedUserId: input.reviewedUserId,
      driverId: input.driverId,
      score: Math.round(input.score * 10) / 10,
      comment: input.comment?.trim() || undefined,
      tags: input.tags || [],
      tipAmount,
      createdAt: now,
      updatedAt: now,
    };

    // Commit ke Store
    this.ratings.set(id, record);
    this.uniqueReviewerIndex.set(uniqueKey, id);

    // Update Indexes
    this.addToIndex(this.ratingsByRide, record.rideId, id);
    this.addToIndex(this.ratingsByReviewer, record.reviewerId, id);
    this.addToIndex(this.ratingsByReviewedUser, record.reviewedUserId, id);
    if (record.driverId) {
      this.addToIndex(this.ratingsByDriver, record.driverId, id);
    }

    return record;
  }

  /**
   * Find by ID with authorization scoping
   */
  async findById(
    id: string,
    currentUser?: { id: string; role: string; driverId?: string }
  ): Promise<RideRatingEntity | null> {
    const rating = this.ratings.get(id) || null;
    if (!rating) return null;

    if (currentUser) {
      this.enforceAuthorization(rating, currentUser);
    }

    return rating;
  }

  /**
   * Find by Ride ID
   */
  async findByRideId(rideId: string): Promise<RideRatingEntity[]> {
    const ids = this.ratingsByRide.get(rideId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.ratings.get(id)!)
      .filter(Boolean);
  }

  /**
   * Find by Reviewer (Passenger) with authorization scoping
   */
  async findByReviewerId(
    reviewerId: string,
    currentUser?: { id: string; role: string }
  ): Promise<RideRatingEntity[]> {
    if (currentUser && currentUser.role !== 'ADMIN' && currentUser.id !== reviewerId) {
      throw new ForbiddenException('Akses ditolak: Anda hanya dapat melihat penilaian milik Anda sendiri');
    }

    const ids = this.ratingsByReviewer.get(reviewerId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.ratings.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Find by Driver ID with authorization scoping
   */
  async findByDriverId(
    driverId: string,
    currentUser?: { id: string; role: string; driverId?: string }
  ): Promise<RideRatingEntity[]> {
    if (
      currentUser &&
      currentUser.role !== 'ADMIN' &&
      currentUser.driverId !== driverId &&
      currentUser.id !== driverId
    ) {
      throw new ForbiddenException('Akses ditolak: Anda hanya dapat melihat ulasan pengemudi milik Anda');
    }

    const ids = this.ratingsByDriver.get(driverId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.ratings.get(id)!)
      .filter(Boolean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Calculate aggregated driver rating summary
   */
  async getDriverSummary(driverId: string): Promise<DriverRatingSummary> {
    const ratings = await this.findByDriverId(driverId);
    const breakdown: { 1: number; 2: number; 3: number; 4: number; 5: number } = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    if (ratings.length === 0) {
      return {
        driverId,
        ratingAverage: 5.0,
        ratingCount: 0,
        breakdown,
      };
    }

    let sum = 0;
    for (const r of ratings) {
      sum += r.score;
      const roundedStar = Math.min(5, Math.max(1, Math.round(r.score))) as 1 | 2 | 3 | 4 | 5;
      breakdown[roundedStar]++;
    }

    const ratingAverage = Math.round((sum / ratings.length) * 100) / 100;
    return {
      driverId,
      ratingAverage,
      ratingCount: ratings.length,
      breakdown,
    };
  }

  /**
   * Check if ride has already been rated by reviewer
   */
  async hasRated(rideId: string, reviewerId: string): Promise<boolean> {
    return this.uniqueReviewerIndex.has(`${rideId}:${reviewerId}`);
  }

  /**
   * Count total ratings
   */
  count(): number {
    return this.ratings.size;
  }

  /**
   * Reset store (for testing isolation)
   */
  clear() {
    this.ratings.clear();
    this.uniqueReviewerIndex.clear();
    this.ratingsByRide.clear();
    this.ratingsByReviewer.clear();
    this.ratingsByReviewedUser.clear();
    this.ratingsByDriver.clear();
  }

  // Private helpers
  private addToIndex(indexMap: Map<string, Set<string>>, key: string, id: string) {
    let set = indexMap.get(key);
    if (!set) {
      set = new Set<string>();
      indexMap.set(key, set);
    }
    set.add(id);
  }

  private enforceAuthorization(
    rating: RideRatingEntity,
    user: { id: string; role: string; driverId?: string }
  ) {
    if (user.role === 'ADMIN') return;

    const isReviewer = rating.reviewerId === user.id;
    const isReviewed = rating.reviewedUserId === user.id;
    const isAssignedDriver = user.driverId && rating.driverId === user.driverId;

    if (!isReviewer && !isReviewed && !isAssignedDriver) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki wewenang untuk melihat data ulasan ini');
    }
  }
}

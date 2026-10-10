/**
 * KAWAI 0511 - Phase 7.1 Database Foundation: Rating Types
 * Target: PostgreSQL 16 `ride_ratings` schema definition
 */

export interface RideRatingEntity {
  id: string;
  rideId: string;
  reviewerId: string;
  reviewedUserId: string;
  driverId?: string;
  score: number; // 1.0 - 5.0
  comment?: string;
  tags?: string[];
  tipAmount: number; // Numeric IDR currency
  createdAt: string; // ISO 8601 TIMESTAMPTZ
  updatedAt: string; // ISO 8601 TIMESTAMPTZ
}

export interface CreateRatingInput {
  rideId: string;
  reviewerId: string;
  reviewedUserId: string;
  driverId?: string;
  score: number;
  comment?: string;
  tags?: string[];
  tipAmount?: number;
}

export interface RatingQueryFilter {
  rideId?: string;
  reviewerId?: string;
  reviewedUserId?: string;
  driverId?: string;
  minScore?: number;
  maxScore?: number;
  limit?: number;
  offset?: number;
}

export interface DriverRatingSummary {
  driverId: string;
  ratingAverage: number;
  ratingCount: number;
  breakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

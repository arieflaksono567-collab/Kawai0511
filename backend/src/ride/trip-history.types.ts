/**
 * KAWAI 0511 - Phase 7.1 Database Foundation: Trip History Types
 * Target: PostgreSQL 16 `view_trip_history_details` definition & query filters
 */

import { RideRatingEntity } from '../rating/rating.types';
import { DriverEarningsLedgerRecord } from '../payment/driver-earnings-ledger.types';
import { PaymentRecord } from '../payment/payment.types';

export interface TripHistoryDetail {
  rideId: string;
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
  status: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;

  // Joined Rating Data
  rating?: RideRatingEntity;

  // Joined Payment Data
  payment?: {
    id: string;
    method: 'CASH' | 'DIGITAL';
    status: string;
    amount: number;
    isSettled?: boolean;
    paidAt?: string;
  };

  // Joined Earnings Data (Khusus Driver & Admin)
  earnings?: DriverEarningsLedgerRecord;
}

export interface TripHistoryFilter {
  userId: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  driverId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

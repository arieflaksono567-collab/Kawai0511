/**
 * KAWAI 0511 - Phase 7.4 Trip History Engine & Composite Views
 * Target: Multi-role passenger and driver trip history with strict data isolation
 */

import { RideRatingEntity } from '../rating/rating.types';
import { DriverEarningsLedgerRecord } from '../payment/driver-earnings-ledger.types';

export interface SafePassengerSummary {
  id: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
}

export interface SafeDriverSummary {
  id: string;
  name: string;
  phone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  rating?: number;
  avatarUrl?: string;
}

export interface TripLocationDto {
  address: string;
  lat: number;
  lng: number;
}

export interface TripPaymentSummary {
  id?: string;
  method: 'CASH' | 'DIGITAL' | string;
  status: string;
  amount: number;
  isSettled?: boolean;
  paidAt?: string;
}

export interface TripFareSummary {
  totalFare: number;
  baseFare?: number;
  distanceFare?: number;
  durationFare?: number;
}

export interface TripRatingSummary {
  id?: string;
  score: number;
  comment?: string;
  createdAt?: string;
}

export interface TripEarningsSummary {
  id?: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  status: string;
  settledAt?: string;
}

export interface TripHistoryDetail {
  rideId: string;
  passengerId: string;
  driverId?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
  cancellationReason?: string;

  // Location structure
  pickup: TripLocationDto;
  destination: TripLocationDto;

  // Backward compatibility fields
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;

  distanceKm: number;
  durationMinutes: number;
  totalFare: number;
  fare: TripFareSummary;

  status: string;
  rideStatus: string;

  // Safe user summaries (NEVER exposing passwords, tokens, OTPs, or secrets)
  passenger?: SafePassengerSummary;
  driver?: SafeDriverSummary;

  // Joined Rating Data
  rating?: RideRatingEntity | TripRatingSummary;

  // Joined Payment Data
  payment?: TripPaymentSummary;

  // Joined Earnings Data (Khusus Driver & Admin; strictly undefined for CUSTOMER)
  earnings?: DriverEarningsLedgerRecord | TripEarningsSummary;
}

export interface TripHistoryFilter {
  userId: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  driverId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'createdAt' | 'completedAt' | 'totalFare' | 'distanceKm' | string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface TripHistoryPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface TripHistoryResponseDto {
  items: TripHistoryDetail[];
  total: number;
  limit: number;
  offset: number;
  page: number;
  totalPages: number;
  pagination: TripHistoryPagination;
}

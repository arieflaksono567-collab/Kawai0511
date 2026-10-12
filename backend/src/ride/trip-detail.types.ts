/**
 * KAWAI 0511 - Phase 7.5 Trip Detail Types & DTOs
 * Comprehensive single trip detail contract with strict authorization,
 * IDOR prevention, and explicit nullable/unavailable states (no fake data).
 */

import { RideRatingEntity } from '../rating/rating.types';
import { DriverEarningsLedgerRecord } from '../payment/driver-earnings-ledger.types';
import { SafePassengerSummary, SafeDriverSummary } from './trip-history.types';

export interface TripLocationDetail {
  address: string;
  lat: number;
  lng: number;
}

export interface TripRouteDetail {
  distanceKm: number | null;
  durationMinutes: number | null;
  geometry?: string | Array<[number, number]> | null;
  available: boolean;
}

export interface TripFareDetail {
  totalFare: number;
  baseFare: number | null;
  distanceFare: number | null;
  durationFare: number | null;
  perKmRate: number | null;
  perMinuteRate: number | null;
  minimumFare: number | null;
}

export interface TripPaymentDetail {
  id: string | null;
  method: 'CASH' | 'DIGITAL' | string;
  status: string;
  amount: number;
  isSettled: boolean | null;
  paidAt: string | null;
}

export interface TripRatingDetail {
  id: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface TripTimestamps {
  createdAt: string;
  assignedAt: string | null;
  arrivedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  updatedAt: string | null;
}

export interface TripDetailResponseDto {
  // Core Ride Identifiers
  id: string;
  rideId: string;
  status: string;
  rideStatus: string;
  passengerId: string;
  driverId: string | null;
  cancellationReason: string | null;

  // Locations
  pickup: TripLocationDetail;
  destination: TripLocationDetail;

  // Route & Distance (explicit null if unavailable, NEVER fake)
  distanceKm: number | null;
  durationMinutes: number | null;
  route: TripRouteDetail | null;

  // Fare Details
  fare: TripFareDetail | null;
  totalFare: number;

  // Payment Details (explicit null if unpaid/unavailable)
  payment: TripPaymentDetail | null;

  // Rating Details (explicit null if unrated)
  rating: TripRatingDetail | null;

  // Lifecycle Timestamps
  timestamps: TripTimestamps;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;

  // Safe Party Summaries (sanitized, zero secret leakage)
  passenger: SafePassengerSummary | null;
  driver: SafeDriverSummary | null;

  // Driver Earnings (strictly omitted/undefined for passenger; visible for driver & admin)
  earnings?: DriverEarningsLedgerRecord | null;

  // Backward compatibility fields
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
}

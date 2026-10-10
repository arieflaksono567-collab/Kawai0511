/**
 * KAWAI 0511 - Phase 7.1 Database Foundation: Driver Earnings Ledger Types
 * Target: PostgreSQL 16 `driver_earnings_ledger` schema definition
 */

export type EarningsStatus = 'PENDING' | 'SETTLED' | 'CANCELLED' | 'REFUNDED';

export interface DriverEarningsLedgerRecord {
  id: string;
  driverId: string;
  rideId: string;
  paymentId?: string;
  grossAmount: number; // Numeric IDR currency (no floating point artifacts)
  platformFee: number; // Numeric IDR platform commission
  netAmount: number;   // Numeric IDR driver share
  tipAmount: number;   // Numeric IDR optional tip
  currency: 'IDR';
  status: EarningsStatus;
  ledgerTransactionId?: string;
  periodDate: string;  // YYYY-MM-DD
  createdAt: string;   // ISO 8601 TIMESTAMPTZ
  settledAt?: string;  // ISO 8601 TIMESTAMPTZ
  updatedAt: string;   // ISO 8601 TIMESTAMPTZ
}

export interface CreateDriverEarningsInput {
  driverId: string;
  rideId: string;
  paymentId?: string;
  grossAmount: number;
  platformFee: number;
  netAmount: number;
  tipAmount?: number;
  currency?: 'IDR';
  status?: EarningsStatus;
  ledgerTransactionId?: string;
  periodDate?: string;
  createdAt?: string;
  settledAt?: string;
}

export interface DriverEarningsQueryFilter {
  driverId: string;
  status?: EarningsStatus;
  startDate?: string;
  endDate?: string;
  period?: 'today' | 'week' | 'month' | 'all-time' | 'hari ini' | 'minggu ini' | 'bulan ini' | string;
  limit?: number;
  offset?: number;
}

export interface DriverEarningsDashboardResponse {
  driverId: string;
  period: string;
  totalTrips: number;
  totalGross: number;
  totalFee: number;
  totalNet: number;
  totalTips: number;
  currency: 'IDR';
  authoritativeSource: 'LEDGER';
  ledgerAccountId: string;
  ledgerBalance: number;
  items: DriverEarningsLedgerRecord[];
}

export interface DriverEarningsPeriodMetrics {
  totalTrips: number;
  totalGross: number;
  totalFee: number;
  totalNet: number;
  totalTips: number;
}

export interface DriverEarningsMultiPeriodSummary {
  driverId: string;
  today: DriverEarningsPeriodMetrics;
  thisWeek: DriverEarningsPeriodMetrics;
  thisMonth: DriverEarningsPeriodMetrics;
  allTime: DriverEarningsPeriodMetrics & { ledgerBalance: number };
  currency: 'IDR';
  authoritativeSource: 'LEDGER';
}

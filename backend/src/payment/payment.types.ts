/**
 * KAWAI 0511 - Phase 6A Payment & Double-Entry Ledger Types
 */

export type PaymentMethod = 'CASH' | 'DIGITAL';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUNDED';

export type LedgerAccountType =
  | 'DRIVER_PAYABLE'
  | 'PLATFORM_REVENUE'
  | 'PAYMENT_CLEARING'
  | 'CASH_RECEIVABLE'
  | 'REFUND_PAYABLE';

export interface PaymentRecord {
  id: string;
  rideId: string;
  payerId: string;
  payeeDriverId: string;
  amount: number; // Integer Rupiah
  currency: 'IDR';
  method: PaymentMethod;
  status: PaymentStatus;
  provider: string;
  providerPaymentId?: string;
  idempotencyKey: string;
  actionUrl?: string;
  paidAt?: string;
  failedAt?: string;
  cancelledAt?: string;
  refundedAt?: string;
  refundId?: string;
  createdAt: string;
  updatedAt: string;
  // Phase 6C Settlement extensions
  isSettled?: boolean;
  settledAt?: string;
  ledgerTransactionId?: string;
  driverShareAmount?: number;
  platformFeeAmount?: number;
}

export interface SettlementRecord {
  id: string;
  paymentId: string;
  rideId: string;
  driverId: string;
  grossFare: number;
  driverAmount: number;
  platformAmount: number;
  driverSharePercent: number;
  platformSharePercent: number;
  ledgerTransactionId: string;
  method: PaymentMethod;
  provider: string;
  settledAt: string;
  createdAt: string;
}

export interface SettlementResult {
  settlementId: string;
  paymentId: string;
  rideId: string;
  driverId: string;
  grossFare: number;
  driverAmount: number;
  platformAmount: number;
  driverSharePercent: number;
  platformSharePercent: number;
  ledgerTransactionId: string;
  settledAt: string;
}

export interface DriverEarningsSummary {
  driverId: string;
  totalCompletedRides: number;
  grossFare: number;
  driverEarnings: number;
  platformFee: number;
  period: string;
  currency: 'IDR';
  ledgerAccountId: string;
  ledgerBalance: number;
  authoritativeSource: 'LEDGER';
  lastSettledAt?: string;
}

export interface LedgerAccount {
  id: string;
  code: string;
  name: string;
  type: LedgerAccountType;
  ownerId?: string;
  currency: 'IDR';
  isActive: boolean;
  createdAt: string;
}

export interface LedgerTransaction {
  id: string;
  referenceType: string; // e.g. 'PAYMENT_RIDE'
  referenceId: string;   // e.g. payment.id
  description: string;
  createdAt: string;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  debit: number;  // >= 0
  credit: number; // >= 0
  createdAt: string;
}

export interface LedgerEntryInput {
  accountId: string;
  debit: number;
  credit: number;
}

export interface PaymentSplitConfig {
  driverSharePercent: number;    // default: 85.00
  platformSharePercent: number;  // default: 15.00
  isActive: boolean;
  updatedAt: string;
}

export interface CreatePaymentDto {
  rideId: string;
  payerId: string;
  payeeDriverId: string;
  amount: number;
  currency?: 'IDR';
  method: PaymentMethod;
  provider?: string;
  idempotencyKey: string;
}

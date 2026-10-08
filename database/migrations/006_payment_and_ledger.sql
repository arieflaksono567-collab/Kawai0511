-- KAWAI 0511 - Database Migration: Phase 6A Payment & Double-Entry Ledger
-- Target: PostgreSQL 16 + PostGIS
-- Specification: Provider-Independent Payment & Double-Entry Balanced Ledger Engine

-- Enable UUID extension if not yet available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. CONFIGURATION: DRIVER / PLATFORM SPLIT
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_split_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 85.00,
    platform_share_percent NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_split_sum CHECK (driver_share_percent + platform_share_percent = 100.00),
    CONSTRAINT check_driver_share_range CHECK (driver_share_percent >= 0 AND driver_share_percent <= 100),
    CONSTRAINT check_platform_share_range CHECK (platform_share_percent >= 0 AND platform_share_percent <= 100)
);

-- Seed default 85% Driver / 15% Platform split configuration
INSERT INTO payment_split_configs (driver_share_percent, platform_share_percent, is_active)
VALUES (85.00, 15.00, TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 2. PAYMENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL UNIQUE,
    payer_id UUID NOT NULL,
    payee_driver_id UUID NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0), -- Integer in Rupiah (IDR)
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    method VARCHAR(16) NOT NULL CHECK (method IN ('CASH', 'DIGITAL')),
    status VARCHAR(16) NOT NULL CHECK (status IN ('PENDING', 'AUTHORIZED', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED')),
    provider VARCHAR(64) NOT NULL,
    provider_payment_id VARCHAR(128),
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    paid_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_ride_id ON payments(ride_id);
CREATE INDEX IF NOT EXISTS idx_payments_payer ON payments(payer_id);
CREATE INDEX IF NOT EXISTS idx_payments_payee ON payments(payee_driver_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_idempotency_key ON payments(idempotency_key);

-- ============================================================================
-- 3. LEDGER ACCOUNTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL CHECK (type IN ('DRIVER_PAYABLE', 'PLATFORM_REVENUE', 'PAYMENT_CLEARING', 'CASH_RECEIVABLE', 'REFUND_PAYABLE')),
    owner_id UUID, -- NULL for system accounts, User/Driver ID for individual accounts
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ledger_accounts_type ON ledger_accounts(type);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_owner ON ledger_accounts(owner_id);
CREATE INDEX IF NOT EXISTS idx_ledger_accounts_code ON ledger_accounts(code);

-- Seed System Default Ledger Accounts
INSERT INTO ledger_accounts (id, code, name, type, owner_id, currency, is_active)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'PLATFORM_REVENUE_IDR', 'Platform Revenue (Pendapatan Komisi 15%)', 'PLATFORM_REVENUE', NULL, 'IDR', TRUE),
    ('a0000000-0000-0000-0000-000000000002', 'PAYMENT_CLEARING_IDR', 'Payment Clearing (Kliring Provider Digital)', 'PAYMENT_CLEARING', NULL, 'IDR', TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'CASH_RECEIVABLE_IDR', 'Cash Receivable (Penerimaan Tunai Driver)', 'CASH_RECEIVABLE', NULL, 'IDR', TRUE),
    ('a0000000-0000-0000-0000-000000000004', 'REFUND_PAYABLE_IDR', 'Refund Payable (Kewajiban Pengembalian Dana)', 'REFUND_PAYABLE', NULL, 'IDR', TRUE)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 4. LEDGER TRANSACTIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference_type VARCHAR(64) NOT NULL, -- e.g. 'PAYMENT_RIDE', 'PAYOUT', 'REFUND'
    reference_id UUID NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ledger_transaction_reference UNIQUE (reference_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_ledger_transactions_ref ON ledger_transactions(reference_type, reference_id);

-- ============================================================================
-- 5. LEDGER ENTRIES TABLE (DOUBLE-ENTRY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ledger_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
    debit INTEGER NOT NULL DEFAULT 0 CHECK (debit >= 0),
    credit INTEGER NOT NULL DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_entry_has_amount CHECK (debit > 0 OR credit > 0),
    CONSTRAINT check_entry_not_both CHECK (NOT (debit > 0 AND credit > 0))
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);

-- ============================================================================
-- 6. DOUBLE-ENTRY INTEGRITY CHECK FUNCTION
-- Enforces: SUM(debit) = SUM(credit) for every transaction
-- ============================================================================
CREATE OR REPLACE FUNCTION verify_ledger_transaction_balanced(tx_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    total_debit BIGINT;
    total_credit BIGINT;
BEGIN
    SELECT COALESCE(SUM(debit), 0), COALESCE(SUM(credit), 0)
    INTO total_debit, total_credit
    FROM ledger_entries
    WHERE transaction_id = tx_id;

    IF total_debit <> total_credit THEN
        RAISE EXCEPTION 'Unbalanced ledger transaction: sum(debit)=% does not equal sum(credit)=%', total_debit, total_credit;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

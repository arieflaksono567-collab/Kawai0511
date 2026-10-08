-- KAWAI 0511 - Database Migration: Phase 6C Settlement & Driver Earnings
-- Target: PostgreSQL 16 + PostGIS
-- Specification: Atomic 8-step settlement, ledger-authoritative driver earnings view

-- 1. Extend payments table with Phase 6C settlement columns
ALTER TABLE payments ADD COLUMN IF NOT EXISTS is_settled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS settled_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS ledger_transaction_id UUID REFERENCES ledger_transactions(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS driver_share_amount INTEGER;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS platform_fee_amount INTEGER;

CREATE INDEX IF NOT EXISTS idx_payments_settled ON payments(is_settled);
CREATE INDEX IF NOT EXISTS idx_payments_ledger_tx ON payments(ledger_transaction_id);

-- 2. Settlements Audit Log Table
CREATE TABLE IF NOT EXISTS payment_settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL UNIQUE REFERENCES payments(id) ON DELETE RESTRICT,
    ride_id UUID NOT NULL REFERENCES ride_orders(id) ON DELETE RESTRICT,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    gross_fare INTEGER NOT NULL CHECK (gross_fare > 0),
    driver_amount INTEGER NOT NULL CHECK (driver_amount >= 0),
    platform_amount INTEGER NOT NULL CHECK (platform_amount >= 0),
    driver_share_percent NUMERIC(5, 2) NOT NULL,
    platform_share_percent NUMERIC(5, 2) NOT NULL,
    ledger_transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_settlement_sum CHECK (driver_amount + platform_amount = gross_fare)
);

CREATE INDEX IF NOT EXISTS idx_settlements_driver ON payment_settlements(driver_id);
CREATE INDEX IF NOT EXISTS idx_settlements_ride ON payment_settlements(ride_id);
CREATE INDEX IF NOT EXISTS idx_settlements_tx ON payment_settlements(ledger_transaction_id);

-- 3. Authoritative Read-Only Driver Earnings View (Directly derived from Double-Entry Ledger)
CREATE OR REPLACE VIEW view_driver_earnings_authoritative_ledger AS
SELECT 
    la.owner_id AS driver_id,
    la.id AS ledger_account_id,
    la.code AS account_code,
    -- DRIVER_PAYABLE (Liability): Balance = credit - debit
    COALESCE(SUM(le.credit), 0) - COALESCE(SUM(le.debit), 0) AS driver_earnings,
    COALESCE(COUNT(DISTINCT CASE WHEN lt.reference_type = 'PAYMENT_RIDE' AND le.credit > 0 THEN lt.id END), 0) AS total_completed_rides,
    COALESCE(SUM(le.credit), 0) AS total_lifetime_credit,
    COALESCE(SUM(le.debit), 0) AS total_lifetime_debit
FROM ledger_accounts la
LEFT JOIN ledger_entries le ON le.account_id = la.id
LEFT JOIN ledger_transactions lt ON lt.id = le.transaction_id
WHERE la.type = 'DRIVER_PAYABLE' AND la.owner_id IS NOT NULL
GROUP BY la.owner_id, la.id, la.code;

-- KAWAI 0511 - Database Migration: Phase 6 Payment & Wallet
-- Target: PostgreSQL 16 + PostGIS

-- 1. Wallets Table
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- 2. Wallet Transactions Table (Double-Entry Ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(32) NOT NULL, -- 'TOPUP', 'PAYMENT', 'EARNING', 'COMMISSION', 'WITHDRAW'
    amount BIGINT NOT NULL,
    reference_id VARCHAR(64),
    description TEXT NOT NULL,
    balance_after BIGINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet ON wallet_transactions(wallet_id);

-- 3. Driver Payouts Table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL CHECK (amount >= 20000), -- Minimal penarikan Rp 20.000
    bank_name VARCHAR(64) NOT NULL, -- 'BANK KALSEL', 'BCA', 'MANDIRI', 'BRI'
    account_number VARCHAR(64) NOT NULL,
    account_name VARCHAR(128) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED', -- 'PENDING', 'PROCESSED', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payouts_driver ON payouts(driver_id);

-- 4. Seed Initial Wallets for Demo Users
-- Passenger (Arief Laksono): Saldo Rp 100.000
INSERT INTO wallets (id, user_id, balance, currency)
VALUES ('w0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 100000, 'IDR')
ON CONFLICT (user_id) DO NOTHING;

-- Driver (Ahmad Gazali): Saldo Rp 168.000
INSERT INTO wallets (id, user_id, balance, currency)
VALUES ('w0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 168000, 'IDR')
ON CONFLICT (user_id) DO NOTHING;

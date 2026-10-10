-- KAWAI 0511 - Database Migration: Phase 7.1 Database Foundation
-- Target: PostgreSQL 16 + PostGIS
-- Modules: Rating, Earnings Ledger, and Trip History

-- Enable standard UUID & Cryptographic extensions if not yet present
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. RATING SYSTEM TABLE (ride_ratings)
-- ============================================================================
-- Menyimpan ulasan dan penilaian bintang (1-5) dari penumpang ke driver (atau sebaliknya)
-- Memiliki relasi ke: Ride, Reviewer User, Reviewed User, Score, Comment, CreatedAt.
-- Dilengkapi UNIQUE constraint untuk mencegah rating ganda pada perjalanan yang sama.
CREATE TABLE IF NOT EXISTS ride_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,

    -- Nilai Skor Rating: 1.0 sampai 5.0
    score NUMERIC(2, 1) NOT NULL,

    -- Ulasan Tekstual Opsional & Tag Kategori Feedback
    comment TEXT,
    tags VARCHAR(64)[] DEFAULT '{}',

    -- Opsional Tip Pengemudi (Nilai Rupiah Bulat / Integer Numeric)
    tip_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tip_amount >= 0),

    -- Timestamps Terstandarisasi
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Referential & Integrity Constraints
    CONSTRAINT check_rating_score_range CHECK (score >= 1.0 AND score <= 5.0),
    CONSTRAINT check_distinct_reviewer CHECK (reviewer_id <> reviewed_user_id),
    -- Mencegah rating ganda untuk 1 ride oleh reviewer yang sama
    CONSTRAINT uq_ride_reviewer UNIQUE (ride_id, reviewer_id)
);

-- Indeks performa query Rating & Feedback
CREATE INDEX IF NOT EXISTS idx_ratings_ride ON ride_ratings(ride_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewer ON ride_ratings(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_ratings_reviewed_user ON ride_ratings(reviewed_user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver ON ride_ratings(driver_id);
CREATE INDEX IF NOT EXISTS idx_ratings_created_at ON ride_ratings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ratings_score ON ride_ratings(score);

-- ============================================================================
-- 2. DRIVER EARNINGS LEDGER TABLE (driver_earnings_ledger)
-- ============================================================================
-- Mencatat rincian perolehan pendapatan mitra pengemudi per perjalanan
-- Terhubung ke Driver, Ride, Gross amount, Platform fee, Net amount, Currency, Status, CreatedAt.
-- Menggunakan tipe NUMERIC(12, 2) untuk seluruh nilai moneter (mencegah floating-point inaccuracy).
CREATE TABLE IF NOT EXISTS driver_earnings_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE RESTRICT,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,

    -- Nilai Finansial Numerik Presisi
    gross_amount NUMERIC(12, 2) NOT NULL CHECK (gross_amount >= 0),
    platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (platform_fee >= 0),
    net_amount NUMERIC(12, 2) NOT NULL CHECK (net_amount >= 0),
    tip_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tip_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'IDR',

    -- Status Pencatatan Pendapatan
    status VARCHAR(32) NOT NULL DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED', 'CANCELLED', 'REFUNDED')),

    -- Relasi opsional ke entri buku besar akuntansi berpasangan (Double-Entry Ledger)
    ledger_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE SET NULL,

    -- Kolom penanggalan untuk partisi & agregasi periode cepat (hari/minggu/bulan)
    period_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Timestamps Terstandarisasi
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Integritas Matematika Finansial: net_amount + platform_fee = gross_amount
    CONSTRAINT check_earnings_math_balance CHECK (net_amount + platform_fee = gross_amount),
    -- Mencegah duplikasi entri pencatatan pendapatan per perjalanan untuk satu mitra driver
    CONSTRAINT uq_driver_ride_earning UNIQUE (driver_id, ride_id)
);

-- Indeks performa query Earnings & Agregasi
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_date ON driver_earnings_ledger(driver_id, period_date);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_ride ON driver_earnings_ledger(ride_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_status ON driver_earnings_ledger(status);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_created_at ON driver_earnings_ledger(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_created ON driver_earnings_ledger(driver_id, created_at DESC);

-- ============================================================================
-- 3. TRIP HISTORY OPTIMIZATION INDEXES & VIEW
-- ============================================================================
-- Optimasi indeks majemuk pada tabel rides untuk mempercepat filter riwayat perjalanan
CREATE INDEX IF NOT EXISTS idx_rides_passenger_status_created ON rides(passenger_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_driver_status_created ON rides(driver_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rides_completed_at_desc ON rides(completed_at DESC) WHERE status = 'COMPLETED';

-- View terpadu untuk query riwayat perjalanan lengkap (Trip History with Rating & Settlement)
CREATE OR REPLACE VIEW view_trip_history_details AS
SELECT 
    r.id AS ride_id,
    r.passenger_id,
    r.driver_id,
    r.pickup_address,
    r.pickup_lat,
    r.pickup_lng,
    r.destination_address,
    r.destination_lat,
    r.destination_lng,
    r.distance_km,
    r.duration_minutes,
    r.total_fare,
    r.status AS ride_status,
    r.created_at AS order_created_at,
    r.completed_at AS order_completed_at,
    r.cancelled_at AS order_cancelled_at,
    r.cancellation_reason,

    -- Informasi Ulasan / Rating
    rr.id AS rating_id,
    rr.score AS rating_score,
    rr.comment AS rating_comment,
    rr.tags AS rating_tags,
    rr.tip_amount AS rating_tip_amount,
    rr.created_at AS rating_created_at,

    -- Informasi Pembayaran
    p.id AS payment_id,
    p.method AS payment_method,
    p.status AS payment_status,
    p.is_settled AS payment_is_settled,

    -- Informasi Pendapatan Driver
    del.id AS earnings_ledger_id,
    del.gross_amount AS earnings_gross,
    del.platform_fee AS earnings_platform_fee,
    del.net_amount AS earnings_net,
    del.status AS earnings_status

FROM rides r
LEFT JOIN ride_ratings rr ON rr.ride_id = r.id
LEFT JOIN payments p ON p.ride_id = r.id
LEFT JOIN driver_earnings_ledger del ON del.ride_id = r.id;

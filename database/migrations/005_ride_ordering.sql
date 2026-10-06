-- KAWAI 0511 - Database Migration: Phase 5 Ride Ordering & Dispatch
-- Target: PostgreSQL 16 + PostGIS

-- 1. Rides Table
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),

    -- Lokasi Penjemputan & Tujuan (Banjarmasin)
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,

    -- Metrik Rute Spasial (dari Phase 4 RoutingService)
    distance_km NUMERIC(6, 2) NOT NULL,
    duration_minutes INT NOT NULL,

    -- Snapshot Tarif Phase 5 (Configurable parameters frozen at order creation)
    base_fare INT NOT NULL DEFAULT 7000,
    per_km_rate INT NOT NULL DEFAULT 2200,
    per_minute_rate INT NOT NULL DEFAULT 200,
    minimum_fare INT NOT NULL DEFAULT 10000,
    total_fare INT NOT NULL,
    fare_snapshot JSONB NOT NULL,

    -- Status Lifecycle & State Machine
    status VARCHAR(32) NOT NULL DEFAULT 'SEARCHING',
    -- Values: 'SEARCHING', 'ASSIGNED', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'

    -- Optimistic Concurrency Control (Version lock)
    version INT NOT NULL DEFAULT 1,

    -- Pembatalan Order
    cancelled_by VARCHAR(32), -- 'PASSENGER', 'DRIVER', 'SYSTEM'
    cancellation_reason TEXT,

    -- Timestamps Lifecycle
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMPTZ,
    arrived_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_created_at ON rides(created_at DESC);

-- 2. Audit Trail Transisi Status Order (Strict State Machine Log)
CREATE TABLE IF NOT EXISTS ride_state_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    from_state VARCHAR(32),
    to_state VARCHAR(32) NOT NULL,
    actor_id UUID,
    actor_role VARCHAR(32) NOT NULL, -- 'CUSTOMER', 'DRIVER', 'SYSTEM'
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ride_state_logs_ride ON ride_state_logs(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_state_logs_created ON ride_state_logs(created_at DESC);

-- 3. Log Penawaran & Percobaan Dispatch (Driver Dispatch Attempts)
CREATE TABLE IF NOT EXISTS ride_dispatch_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id),
    status VARCHAR(32) NOT NULL DEFAULT 'OFFERED', -- 'OFFERED', 'ACCEPTED', 'REJECTED', 'TIMEOUT'
    offered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_ride ON ride_dispatch_attempts(ride_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_attempts_driver ON ride_dispatch_attempts(driver_id);

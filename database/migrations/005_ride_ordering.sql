-- KAWAI 0511 - Database Migration: Phase 5 Ride Ordering
-- Target: PostgreSQL 16 + PostGIS

-- 1. Rides Table
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    pickup_address TEXT NOT NULL,
    pickup_lat DOUBLE PRECISION NOT NULL,
    pickup_lng DOUBLE PRECISION NOT NULL,
    destination_address TEXT NOT NULL,
    destination_lat DOUBLE PRECISION NOT NULL,
    destination_lng DOUBLE PRECISION NOT NULL,
    distance_km NUMERIC(5, 2) NOT NULL,
    duration_minutes INT NOT NULL,
    base_fare INT NOT NULL DEFAULT 8000,
    per_km_fare INT NOT NULL DEFAULT 2500,
    surge_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    total_fare INT NOT NULL,
    driver_share INT NOT NULL, -- 85% bagi hasil mitra
    platform_fee INT NOT NULL, -- 15% komisi platform
    status VARCHAR(32) NOT NULL DEFAULT 'SEARCHING',
    -- State: 'SEARCHING', 'ASSIGNED', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_passenger ON rides(passenger_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver ON rides(driver_id);

-- 2. Ride State Logs (Strict State Machine Audit Trail)
CREATE TABLE IF NOT EXISTS ride_state_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
    from_state VARCHAR(32),
    to_state VARCHAR(32) NOT NULL,
    triggered_by VARCHAR(32) NOT NULL, -- 'PASSENGER', 'DRIVER', 'SYSTEM'
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ride_state_logs_ride ON ride_state_logs(ride_id);

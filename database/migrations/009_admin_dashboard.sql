-- KAWAI 0511 - Database Migration: Phase 9 Admin & Monitoring Dashboard
-- Target: PostgreSQL 16 + PostGIS

-- 1. Tariff Configurations Table
CREATE TABLE IF NOT EXISTS tariff_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_type VARCHAR(32) NOT NULL UNIQUE, -- 'RIDE', 'FOOD', 'DELIVERY'
    base_fare INT NOT NULL,
    per_km_rate INT NOT NULL,
    per_minute_rate INT NOT NULL,
    minimum_fare INT NOT NULL,
    platform_commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
    surge_multiplier NUMERIC(3, 2) NOT NULL DEFAULT 1.00,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Tariffs (KAWAI 0511 Standard)
INSERT INTO tariff_configurations (id, service_type, base_fare, per_km_rate, per_minute_rate, minimum_fare, platform_commission_percent, surge_multiplier)
VALUES
    ('t0000000-0000-0000-0000-000000000001', 'RIDE', 7000, 2200, 200, 10000, 15.00, 1.00),
    ('t0000000-0000-0000-0000-000000000002', 'FOOD', 8000, 2000, 0, 10000, 15.00, 1.00),
    ('t0000000-0000-0000-0000-000000000003', 'DELIVERY', 9000, 2500, 0, 12000, 15.00, 1.00)
ON CONFLICT (service_type) DO UPDATE SET
    base_fare = EXCLUDED.base_fare,
    per_km_rate = EXCLUDED.per_km_rate;

-- 2. SOS Emergency Incidents Table
CREATE TABLE IF NOT EXISTS sos_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    user_name VARCHAR(128) NOT NULL,
    user_phone VARCHAR(32) NOT NULL,
    role VARCHAR(16) NOT NULL, -- 'PASSENGER', 'DRIVER'
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'TRIGGERED', -- 'TRIGGERED', 'DISPATCHED', 'RESOLVED'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);

-- Seed Sample Active SOS Incident
INSERT INTO sos_alerts (id, user_id, user_name, user_phone, role, latitude, longitude, address, status, notes)
VALUES
    ('s0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'Arief Laksono', '081255110987', 'PASSENGER', -3.3228, 114.5935, 'Dekat Menara Pandang Siring, Jl. Piere Tendean', 'TRIGGERED', 'Tombol SOS ditekan penumpang selama perjalanan aktif')
ON CONFLICT (id) DO NOTHING;

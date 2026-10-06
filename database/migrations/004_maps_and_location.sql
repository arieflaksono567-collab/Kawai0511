-- KAWAI 0511 - Database Migration: Phase 4 Maps & Location System
-- Target: PostgreSQL 16 + PostGIS

-- 1. Ensure PostGIS Extension is Active
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Driver Locations Table (High-Frequency History + Spatial Point)
CREATE TABLE IF NOT EXISTS driver_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    accuracy_meters DOUBLE PRECISION,
    altitude_meters DOUBLE PRECISION,
    speed_mps DOUBLE PRECISION,
    heading_degrees DOUBLE PRECISION,
    battery_level SMALLINT,
    network_type VARCHAR(32),
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Spatial & Lookup Indexes
CREATE INDEX IF NOT EXISTS idx_driver_locations_geo ON driver_locations USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver ON driver_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_locations_recorded ON driver_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_recorded ON driver_locations(driver_id, recorded_at DESC);

-- Trigger to automatically update GEOGRAPHY point from latitude and longitude
CREATE OR REPLACE FUNCTION update_driver_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_driver_locations_geom ON driver_locations;
CREATE TRIGGER trg_driver_locations_geom
BEFORE INSERT OR UPDATE OF latitude, longitude ON driver_locations
FOR EACH ROW EXECUTE FUNCTION update_driver_location_geom();

-- 3. Banjarmasin Landmarks & Popular Places Table
CREATE TABLE IF NOT EXISTS landmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    category VARCHAR(32) NOT NULL, -- HOSPITAL, CAMPUS, MALL, MARKET, TERMINAL, AIRPORT, PORT, HOTEL, TOURIST, GOVERNMENT, RELIGIOUS, OTHER
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    address TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landmarks_geo ON landmarks USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_landmarks_category ON landmarks(category);

-- 4. Seed Verified Banjarmasin Reference Landmarks
INSERT INTO landmarks (id, name, category, latitude, longitude, location, address, is_active) VALUES
    ('l0000000-0000-0000-0000-000000000001', 'Duta Mall Banjarmasin', 'MALL', -3.319437, 114.590822, ST_SetSRID(ST_MakePoint(114.590822, -3.319437), 4326)::geography, 'Jl. A. Yani Km 2, Melayu, Banjarmasin Tengah', true),
    ('l0000000-0000-0000-0000-000000000002', 'Menara Pandang Siring Martapura', 'TOURIST', -3.322841, 114.593510, ST_SetSRID(ST_MakePoint(114.593510, -3.322841), 4326)::geography, 'Jl. Piere Tendean, Sungai Baru, Banjarmasin Tengah', true),
    ('l0000000-0000-0000-0000-000000000003', 'RSUD Ulin Banjarmasin', 'HOSPITAL', -3.326510, 114.596200, ST_SetSRID(ST_MakePoint(114.596200, -3.326510), 4326)::geography, 'Jl. Jen. A. Yani No.43, Sungai Baru, Banjarmasin Tengah', true),
    ('l0000000-0000-0000-0000-000000000004', 'Universitas Lambung Mangkurat (ULM)', 'CAMPUS', -3.298510, 114.588020, ST_SetSRID(ST_MakePoint(114.588020, -3.298510), 4326)::geography, 'Jl. Brigjend H. Hasan Basry, Kayu Tangi, Banjarmasin Utara', true),
    ('l0000000-0000-0000-0000-000000000005', 'Pelabuhan Trisakti Banjarmasin', 'PORT', -3.332010, 114.565020, ST_SetSRID(ST_MakePoint(114.565020, -3.332010), 4326)::geography, 'Jl. Barito Hilir, Telaga Biru, Banjarmasin Barat', true),
    ('l0000000-0000-0000-0000-000000000006', 'Masjid Raya Sabilal Muhtadin', 'RELIGIOUS', -3.318200, 114.592100, ST_SetSRID(ST_MakePoint(114.592100, -3.318200), 4326)::geography, 'Jl. Jenderal Sudirman No.1, Antasan Besar, Banjarmasin Tengah', true),
    ('l0000000-0000-0000-0000-000000000007', 'Terminal Km 6 Banjarmasin', 'TERMINAL', -3.339500, 114.622000, ST_SetSRID(ST_MakePoint(114.622000, -3.339500), 4326)::geography, 'Jl. Pramuka, Pemurus Luar, Banjarmasin Timur', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Seed Initial Driver Location for Seeded Driver Ahmad Gazali
INSERT INTO driver_locations (driver_id, latitude, longitude, location, accuracy_meters, altitude_meters, speed_mps, heading_degrees, battery_level, network_type, recorded_at)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    -3.319437,
    114.590822,
    ST_SetSRID(ST_MakePoint(114.590822, -3.319437), 4326)::geography,
    5.0,
    12.0,
    4.5,
    180.0,
    88,
    '4G',
    CURRENT_TIMESTAMP
);

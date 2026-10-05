-- KAWAI 0511 - Database Migration: Phase 4 Maps & Location
-- Target: PostgreSQL 16 + PostGIS

-- 1. Ensure PostGIS is active
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Master Table: Landmark & Popular Places in Banjarmasin Area (0511)
CREATE TABLE IF NOT EXISTS landmarks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    address TEXT NOT NULL,
    geom GEOMETRY(Point, 4326) NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'PUBLIC', -- 'MALL', 'HOSPITAL', 'CAMPUS', 'TRANSIT'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_landmarks_geom ON landmarks USING GIST (geom);

-- 3. Seed Reference Landmark Locations in Banjarmasin
INSERT INTO landmarks (name, address, geom, category) VALUES
    ('Duta Mall Banjarmasin', 'Jl. A. Yani Km 2, Melayu, Banjarmasin Tengah', ST_SetSRID(ST_MakePoint(114.5908, -3.3194), 4326), 'MALL'),
    ('Menara Pandang Siring', 'Jl. Piere Tendean, Sungai Baru, Banjarmasin Tengah', ST_SetSRID(ST_MakePoint(114.5935, -3.3228), 4326), 'TOURISM'),
    ('RSUD Ulin Banjarmasin', 'Jl. Jen. A. Yani No.43, Sungai Baru', ST_SetSRID(ST_MakePoint(114.5962, -3.3265), 4326), 'HOSPITAL'),
    ('Universitas Lambung Mangkurat (ULM)', 'Jl. Brigjend H. Hasan Basry, Kayu Tangi, Banjarmasin Utara', ST_SetSRID(ST_MakePoint(114.5880, -3.2985), 4326), 'CAMPUS'),
    ('Pelabuhan Trisakti Banjarmasin', 'Jl. Barito Hilir, Telaga Biru, Banjarmasin Barat', ST_SetSRID(ST_MakePoint(114.5650, -3.3320), 4326), 'TRANSIT'),
    ('Pasar Terapung Lok Baintan', 'Sungai Martapura, Sungai Pinang', ST_SetSRID(ST_MakePoint(114.6520, -3.3080), 4326), 'TOURISM')
ON CONFLICT DO NOTHING;

-- 4. Geospatial Helper Function: Find nearby drivers within radius (meter)
CREATE OR REPLACE FUNCTION get_nearby_landmarks(p_lng DOUBLE PRECISION, p_lat DOUBLE PRECISION, p_radius_meter DOUBLE PRECISION)
RETURNS TABLE (
    id UUID,
    name VARCHAR,
    address TEXT,
    distance_meter DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        l.address,
        ST_Distance(l.geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography) AS distance_meter
    FROM landmarks l
    WHERE ST_DWithin(l.geom::geography, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, p_radius_meter)
    ORDER BY distance_meter ASC;
END;
$$ LANGUAGE plpgsql;

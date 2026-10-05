-- KAWAI 0511 - Database Migration: Phase 3 Driver System
-- Target: PostgreSQL 16 + PostGIS

-- 1. Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PENDING, UNDER_REVIEW, APPROVED, REJECTED, SUSPENDED
    operational_status VARCHAR(32) NOT NULL DEFAULT 'OFFLINE',  -- OFFLINE, ONLINE, SUSPENDED
    display_name VARCHAR(128) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(16),
    address TEXT,
    city VARCHAR(64) DEFAULT 'Banjarmasin',
    province VARCHAR(64) DEFAULT 'Kalimantan Selatan',
    emergency_contact_name VARCHAR(128),
    emergency_contact_phone VARCHAR(32),
    rating_average NUMERIC(3, 2) DEFAULT 5.00,
    rating_count INT DEFAULT 0,
    completed_trip_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejected_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    suspended_at TIMESTAMP WITH TIME ZONE,
    suspension_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_verification ON drivers(verification_status);
CREATE INDEX IF NOT EXISTS idx_drivers_operational ON drivers(operational_status);

-- 2. Driver Documents Table (KYC: KTP, SIM_C, STNK, SKCK)
CREATE TABLE IF NOT EXISTS driver_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    document_type VARCHAR(32) NOT NULL, -- 'KTP', 'SIM_C', 'STNK', 'SKCK'
    document_number VARCHAR(64) NOT NULL,
    document_name VARCHAR(128) NOT NULL,
    file_url TEXT NOT NULL,
    file_hash VARCHAR(128),
    issued_at DATE,
    expires_at DATE,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'
    rejection_reason TEXT,
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_docs_type ON driver_documents(driver_id, document_type);

-- 3. Vehicles Table
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    vehicle_type VARCHAR(32) NOT NULL DEFAULT 'MOTORCYCLE', -- 'MOTORCYCLE'
    brand VARCHAR(64) NOT NULL,
    model VARCHAR(64) NOT NULL,
    production_year INT NOT NULL,
    color VARCHAR(32) NOT NULL,
    license_plate VARCHAR(32) NOT NULL,
    registration_number VARCHAR(64), -- STNK number
    is_active BOOLEAN NOT NULL DEFAULT true,
    verification_status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES users(id),
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_vehicles_driver ON vehicles(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(license_plate);

-- 4. Audit Logs Table (Admin Actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    entity_type VARCHAR(32) NOT NULL,
    entity_id UUID NOT NULL,
    old_value JSONB,
    new_value JSONB,
    reason TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- 5. Seed Initial Driver Ahmad Gazali (Seed verified for dev/test)
INSERT INTO drivers (id, user_id, verification_status, operational_status, display_name, address, city, province, emergency_contact_name, emergency_contact_phone)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000003',
    'APPROVED',
    'OFFLINE',
    'Ahmad Gazali',
    'Jl. Banua Anyar No. 45',
    'Banjarmasin',
    'Kalimantan Selatan',
    'Siti Rahmah',
    '+6281299887766'
) ON CONFLICT (user_id) DO UPDATE SET
    verification_status = EXCLUDED.verification_status,
    operational_status = EXCLUDED.operational_status;

INSERT INTO vehicles (id, driver_id, vehicle_type, brand, model, production_year, color, license_plate, registration_number, is_active, verification_status)
VALUES (
    'v0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'MOTORCYCLE',
    'Honda',
    'Vario 160',
    2023,
    'Hitam Matte',
    'DA 5110 KAW',
    'STNK-6371-2023-0511',
    true,
    'APPROVED'
) ON CONFLICT (id) DO NOTHING;

-- Seed Approved Documents for Ahmad Gazali
INSERT INTO driver_documents (id, driver_id, document_type, document_number, document_name, file_url, verification_status)
VALUES
    ('doc-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'KTP', '6371012304900001', 'KTP Ahmad Gazali', '/storage/kyc/ktp-01.jpg', 'APPROVED'),
    ('doc-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'SIM_C', '900412345678', 'SIM C Ahmad Gazali', '/storage/kyc/sim-01.jpg', 'APPROVED'),
    ('doc-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000001', 'STNK', 'STNK-6371-2023-0511', 'STNK DA 5110 KAW', '/storage/kyc/stnk-01.jpg', 'APPROVED'),
    ('doc-0000-0000-0000-000000000004', 'd0000000-0000-0000-0000-000000000001', 'SKCK', 'SKCK-POLRESTA-BJM-2026', 'SKCK Polresta Banjarmasin', '/storage/kyc/skck-01.jpg', 'APPROVED')
ON CONFLICT (id) DO NOTHING;

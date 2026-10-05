-- KAWAI 0511 - Database Migration: Phase 2 Authentication & User System
-- Target: PostgreSQL 16 + PostGIS

-- 1. Roles Definition
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(32) PRIMARY KEY, -- 'CUSTOMER', 'DRIVER', 'ADMIN'
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO roles (id, description) VALUES
    ('CUSTOMER', 'Pelanggan/Penumpang Kawai 0511'),
    ('DRIVER', 'Mitra Pengemudi Kawai 0511'),
    ('ADMIN', 'Administrator Sistem Kawai 0511')
ON CONFLICT (id) DO NOTHING;

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    role VARCHAR(32) NOT NULL REFERENCES roles(id) DEFAULT 'CUSTOMER',
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    password_hash VARCHAR(255), -- Argon2id hash jika password authentication digunakan
    avatar_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. OTP Codes Table (Separate from users)
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    purpose VARCHAR(32) NOT NULL DEFAULT 'LOGIN', -- 'LOGIN', 'REGISTER'
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_number ON otp_codes(phone_number);
CREATE INDEX IF NOT EXISTS idx_otp_expires_at ON otp_codes(expires_at);

-- 4. Refresh Tokens Table (Rotation & Revocation)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked_at);

-- 5. Seed default Admin and Demo Users (+62 Normalized Phone)
INSERT INTO users (id, role, phone_number, full_name, email, password_hash, is_active, is_verified)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'ADMIN', '+628110511001', 'Administrator Kawai', 'admin@kawai0511.id', '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$dGVzdGhhc2g', true, true),
    ('b0000000-0000-0000-0000-000000000002', 'CUSTOMER', '+6281255110987', 'Arief Laksono', 'arief@example.com', NULL, true, true),
    ('c0000000-0000-0000-0000-000000000003', 'DRIVER', '+6281390511200', 'Ahmad Gazali', 'gazali.driver@example.com', NULL, true, true)
ON CONFLICT (phone_number) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

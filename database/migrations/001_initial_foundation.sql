-- KAWAI 0511 - Database Migration: Phase 1 Foundation
-- Target: PostgreSQL 16 + PostGIS

-- 1. Enable PostGIS Extension for Geospatial Operations
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Basic System Health Table
CREATE TABLE IF NOT EXISTS system_health_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service VARCHAR(64) NOT NULL DEFAULT 'kawai0511',
    status VARCHAR(32) NOT NULL DEFAULT 'ok',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Seed initial record for health audit
INSERT INTO system_health_logs (service, status)
VALUES ('kawai0511', 'ok');

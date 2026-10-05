-- KAWAI 0511 - Database Migration: Phase 7 Food & Delivery System
-- Target: PostgreSQL 16 + PostGIS

-- 1. Merchants Table (Mitra Usaha Kuliner KAWAI FOOD Banjarmasin)
CREATE TABLE IF NOT EXISTS merchants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(128) NOT NULL,
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    rating NUMERIC(3, 2) NOT NULL DEFAULT 4.9,
    category VARCHAR(64) NOT NULL DEFAULT 'KULINER BANJAR',
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_merchants_open ON merchants(is_open);

-- 2. Menu Items Table
CREATE TABLE IF NOT EXISTS menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    description TEXT,
    price INT NOT NULL,
    category VARCHAR(32) NOT NULL DEFAULT 'MAKANAN',
    is_available BOOLEAN NOT NULL DEFAULT true,
    image_url VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_menu_items_merchant ON menu_items(merchant_id);

-- 3. Food Orders Table
CREATE TABLE IF NOT EXISTS food_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id UUID NOT NULL REFERENCES users(id),
    merchant_id UUID NOT NULL REFERENCES merchants(id),
    driver_id UUID REFERENCES drivers(id),
    items JSONB NOT NULL,
    subtotal INT NOT NULL,
    delivery_fee INT NOT NULL,
    platform_fee INT NOT NULL DEFAULT 2000,
    total_price INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ORDER_PLACED',
    -- State: 'ORDER_PLACED', 'MERCHANT_ACCEPTED', 'COOKING', 'READY_FOR_PICKUP', 'DRIVER_ASSIGNED', 'DRIVER_PICKED_UP', 'ON_DELIVERY', 'DELIVERED', 'CANCELLED'
    delivery_address TEXT NOT NULL,
    delivery_lat DOUBLE PRECISION NOT NULL,
    delivery_lng DOUBLE PRECISION NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_food_orders_status ON food_orders(status);

-- 4. Package Deliveries Table (KAWAI SEND)
CREATE TABLE IF NOT EXISTS package_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id),
    driver_id UUID REFERENCES drivers(id),
    sender_name VARCHAR(128) NOT NULL,
    sender_phone VARCHAR(32) NOT NULL,
    sender_address TEXT NOT NULL,
    receiver_name VARCHAR(128) NOT NULL,
    receiver_phone VARCHAR(32) NOT NULL,
    receiver_address TEXT NOT NULL,
    item_type VARCHAR(32) NOT NULL, -- 'DOKUMEN', 'PAKET', 'MAKANAN', 'ELEKTRONIK'
    weight_kg NUMERIC(4, 2) NOT NULL DEFAULT 1.0,
    distance_km NUMERIC(5, 2) NOT NULL,
    total_fare INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'SEARCHING',
    -- State: 'SEARCHING', 'ASSIGNED', 'PICKED_UP', 'DELIVERED', 'CANCELLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Seed Authentic Banjarmasin Merchants and Menus
INSERT INTO merchants (id, name, address, latitude, longitude, rating, category, is_open)
VALUES
    ('m0000000-0000-0000-0000-000000000001', 'Soto Banjar Bang Amat', 'Jl. Banua Anyar No.56, Banjarmasin Timur', -3.3050, 114.6150, 4.95, 'KULINER BANJAR', true),
    ('m0000000-0000-0000-0000-000000000002', 'Ketupat Kandangan H. Muis', 'Jl. Bumi Mas Raya No.12, Pemurus Baru', -3.3380, 114.6020, 4.88, 'KULINER BANJAR', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (merchant_id, name, description, price, category, is_available)
VALUES
    ('m0000000-0000-0000-0000-000000000001', 'Soto Banjar Spesial Telur Bebek', 'Soto ayam kampung khas Banjar kuah rempah susu dengan perkedel singkong & telur bebek', 28000, 'MAKANAN', true),
    ('m0000000-0000-0000-0000-000000000001', 'Sate Ayam Bumbu Banjar (10 Tusuk)', 'Sate ayam empuk dengan olesan saus manis pedas khas sungai Martapura', 25000, 'MAKANAN', true),
    ('m0000000-0000-0000-0000-000000000001', 'Es Kelapa Muda Jeruk Purut', 'Kelapa muda segar alami disajikan dengan perasan jeruk khas Banjar', 12000, 'MINUMAN', true),
    ('m0000000-0000-0000-0000-000000000002', 'Ketupat Kandangan Ikan Haruan Asap', 'Ketupat beras lokal dengan kuah santan santap dan ikan gabus asap bakar', 26000, 'MAKANAN', true)
ON CONFLICT DO NOTHING;

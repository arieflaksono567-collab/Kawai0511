-- KAWAI 0511 - Database Migration: Phase 8 Realtime & Chat
-- Target: PostgreSQL 16 + PostGIS

-- 1. In-App Chat Messages Table (Customer <-> Driver)
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id VARCHAR(64) NOT NULL,
    order_type VARCHAR(32) NOT NULL, -- 'RIDE', 'FOOD', 'DELIVERY'
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_role VARCHAR(16) NOT NULL, -- 'CUSTOMER', 'DRIVER'
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_order ON chat_messages(order_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at);

-- 2. In-App Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,
    body TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'ORDER_STATE', -- 'ORDER_STATE', 'CHAT', 'PAYMENT', 'PROMO'
    reference_id VARCHAR(64),
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 3. Seed initial chat messages for demo order
INSERT INTO chat_messages (id, order_id, order_type, sender_id, sender_role, receiver_id, message, is_read)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'KFD-0511-01', 'FOOD', 'b0000000-0000-0000-0000-000000000002', 'CUSTOMER', 'c0000000-0000-0000-0000-000000000003', 'Halo mang Ahmad, tolong sambal soto Banjarnya dipisah ya.', true),
    ('c0000000-0000-0000-0000-000000000002', 'KFD-0511-01', 'FOOD', 'c0000000-0000-0000-0000-000000000003', 'DRIVER', 'b0000000-0000-0000-0000-000000000002', 'Siap kak, sudah saya sampaikan ke pihak resto Bang Amat.', true)
ON CONFLICT (id) DO NOTHING;

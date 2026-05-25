-- ============================================================================
-- MIGRACIÓN 008: Crear tabla notifications
-- Descripción: Historial de notificaciones enviadas
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('payment_reminder', 'payment_overdue', 'payment_confirmed', 'late_fee_applied', 'announcement', 'event', 'violation', 'reservation', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
    channel TEXT NOT NULL CHECK(channel IN ('email', 'sms', 'push', 'in_app', 'whatsapp')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'read', 'archived')),
    sent_at INTEGER,
    read_at INTEGER,
    archived_at INTEGER,
    metadata TEXT, -- JSON con información adicional
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para optimización de consultas
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- Made with Bob

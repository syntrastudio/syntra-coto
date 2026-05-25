-- ============================================================================
-- MIGRACIÓN 005: Crear tabla payments
-- Descripción: Registro de pagos realizados
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    monthly_fee_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'transfer', 'card', 'check', 'stripe', 'mercadopago')),
    payment_reference TEXT,
    payment_date INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    gateway_transaction_id TEXT,
    gateway_response TEXT,
    notes TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (monthly_fee_id) REFERENCES monthly_fees(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_payments_fee ON payments(monthly_fee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_property ON payments(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_status ON payments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_date ON payments(payment_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_method ON payments(payment_method) WHERE deleted_at IS NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_payments_timestamp 
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    UPDATE payments SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

-- ============================================================================
-- MIGRACIÓN 004: Crear tabla monthly_fees
-- Descripción: Cuotas mensuales generadas automáticamente
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_fees (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    discount_percentage REAL DEFAULT 0,
    discount_applied_date INTEGER,
    total_amount REAL NOT NULL,
    due_date INTEGER NOT NULL,
    payment_period TEXT NOT NULL, -- Formato: YYYY-MM
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled', 'partially_paid')),
    paid_amount REAL DEFAULT 0,
    balance REAL NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Índices para optimización de consultas
CREATE INDEX idx_monthly_fees_property ON monthly_fees(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_monthly_fees_status ON monthly_fees(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_monthly_fees_period ON monthly_fees(payment_period) WHERE deleted_at IS NULL;
CREATE INDEX idx_monthly_fees_due_date ON monthly_fees(due_date) WHERE deleted_at IS NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_monthly_fees_timestamp 
AFTER UPDATE ON monthly_fees
FOR EACH ROW
BEGIN
    UPDATE monthly_fees SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

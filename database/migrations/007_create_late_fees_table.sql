-- ============================================================================
-- MIGRACIÓN 007: Crear tabla late_fees
-- Descripción: Recargos por mora (15% mensual sobre saldo vencido)
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS late_fees (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    monthly_fee_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    base_amount REAL NOT NULL,
    surcharge_percentage REAL NOT NULL DEFAULT 15.0,
    surcharge_amount REAL NOT NULL,
    months_overdue INTEGER NOT NULL,
    applied_date INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'waived', 'cancelled')),
    waived_reason TEXT,
    waived_by TEXT,
    waived_date INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (monthly_fee_id) REFERENCES monthly_fees(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (waived_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_late_fees_monthly_fee ON late_fees(monthly_fee_id);
CREATE INDEX idx_late_fees_property ON late_fees(property_id);
CREATE INDEX idx_late_fees_status ON late_fees(status);
CREATE INDEX idx_late_fees_applied_date ON late_fees(applied_date);

-- Made with Bob

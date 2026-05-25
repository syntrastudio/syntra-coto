-- ============================================================================
-- MIGRACIÓN 006: Crear tabla payment_receipts
-- Descripción: Comprobantes de pago generados
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS payment_receipts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    payment_id TEXT NOT NULL,
    receipt_number TEXT UNIQUE NOT NULL,
    receipt_url TEXT,
    pdf_generated INTEGER DEFAULT 0,
    issued_date INTEGER NOT NULL,
    issued_by TEXT,
    metadata TEXT, -- JSON con información adicional
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_receipts_payment ON payment_receipts(payment_id);
CREATE INDEX idx_receipts_number ON payment_receipts(receipt_number);
CREATE INDEX idx_receipts_date ON payment_receipts(issued_date);

-- Made with Bob

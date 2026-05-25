-- ============================================================================
-- MIGRACIÓN 011: Crear tabla terrace_reservations
-- Descripción: Reservaciones de terraza ($500 cuota, $300 devolución)
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS terrace_reservations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    reservation_date INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('birthday', 'anniversary', 'baby_shower', 'wedding', 'graduation', 'family_gathering', 'corporate', 'other')),
    event_description TEXT,
    expected_guests INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed', 'in_progress')),
    deposit_amount REAL DEFAULT 500.00,
    deposit_paid INTEGER DEFAULT 0,
    deposit_paid_date INTEGER,
    deposit_payment_method TEXT,
    deposit_returned INTEGER DEFAULT 0,
    deposit_return_amount REAL DEFAULT 300.00,
    deposit_return_date INTEGER,
    damage_deduction REAL DEFAULT 0,
    damage_description TEXT,
    special_requirements TEXT,
    setup_requirements TEXT,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    cancelled_at INTEGER,
    confirmed_by TEXT,
    confirmed_at INTEGER,
    completed_at INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_reservations_property ON terrace_reservations(property_id);
CREATE INDEX idx_reservations_resident ON terrace_reservations(resident_id);
CREATE INDEX idx_reservations_date ON terrace_reservations(reservation_date);
CREATE INDEX idx_reservations_status ON terrace_reservations(status);
CREATE INDEX idx_reservations_event_type ON terrace_reservations(event_type);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_terrace_reservations_timestamp 
AFTER UPDATE ON terrace_reservations
FOR EACH ROW
BEGIN
    UPDATE terrace_reservations SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

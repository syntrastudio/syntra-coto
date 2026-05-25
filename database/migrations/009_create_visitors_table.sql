-- ============================================================================
-- MIGRACIÓN 009: Crear tabla visitors
-- Descripción: Registro de visitantes del fraccionamiento
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    name TEXT NOT NULL,
    identification_type TEXT CHECK(identification_type IN ('INE', 'passport', 'license', 'other')),
    identification_number TEXT,
    phone TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    vehicle_plate TEXT,
    visit_type TEXT DEFAULT 'social' CHECK(visit_type IN ('social', 'service', 'delivery', 'contractor', 'family', 'other')),
    entry_time INTEGER NOT NULL,
    exit_time INTEGER,
    authorized_by TEXT,
    security_guard_entry TEXT,
    security_guard_exit TEXT,
    notes TEXT,
    photo_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_visitors_property ON visitors(property_id);
CREATE INDEX idx_visitors_entry ON visitors(entry_time);
CREATE INDEX idx_visitors_exit ON visitors(exit_time);
CREATE INDEX idx_visitors_type ON visitors(visit_type);
CREATE INDEX idx_visitors_plate ON visitors(vehicle_plate);

-- Made with Bob

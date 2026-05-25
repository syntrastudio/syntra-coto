-- ============================================================================
-- MIGRACIÓN 010: Crear tabla vehicles
-- Descripción: Censo vehicular obligatorio del fraccionamiento
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    resident_id TEXT,
    make TEXT NOT NULL,
    model TEXT,
    color TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    year INTEGER,
    vehicle_type TEXT DEFAULT 'car' CHECK(vehicle_type IN ('car', 'motorcycle', 'truck', 'van', 'suv', 'bicycle', 'other')),
    access_control_number TEXT,
    sticker_number TEXT,
    insurance_company TEXT,
    insurance_policy TEXT,
    insurance_expiry INTEGER,
    is_active INTEGER DEFAULT 1,
    photo_url TEXT,
    registration_document_url TEXT,
    registered_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_vehicles_property ON vehicles(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_resident ON vehicles(resident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_plate ON vehicles(license_plate) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_active ON vehicles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type) WHERE deleted_at IS NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_vehicles_timestamp 
AFTER UPDATE ON vehicles
FOR EACH ROW
BEGIN
    UPDATE vehicles SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

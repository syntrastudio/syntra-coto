-- ============================================================================
-- MIGRACIÓN 002: Crear tabla properties
-- Descripción: 130 casas del fraccionamiento
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    house_number TEXT UNIQUE NOT NULL,
    street TEXT NOT NULL,
    block TEXT,
    owner_id TEXT,
    status TEXT NOT NULL DEFAULT 'occupied' CHECK(status IN ('occupied', 'vacant', 'rented')),
    property_type TEXT DEFAULT 'house' CHECK(property_type IN ('house', 'apartment')),
    bedrooms INTEGER,
    bathrooms INTEGER,
    parking_spaces INTEGER DEFAULT 1,
    lot_area REAL,
    construction_area REAL,
    delinquency_status TEXT NOT NULL DEFAULT 'al_corriente' CHECK(delinquency_status IN ('al_corriente', 'moroso_1mes', 'moroso_2mes', 'suspendido')),
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_properties_house_number ON properties(house_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_owner ON properties(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_delinquency ON properties(delinquency_status) WHERE deleted_at IS NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_properties_timestamp 
AFTER UPDATE ON properties
FOR EACH ROW
BEGIN
    UPDATE properties SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

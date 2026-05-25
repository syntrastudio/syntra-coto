-- ============================================================================
-- MIGRACIÓN 003: Crear tabla residents
-- Descripción: Información detallada de residentes
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS residents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    relationship TEXT NOT NULL CHECK(relationship IN ('owner', 'tenant', 'family', 'guest')),
    start_date INTEGER NOT NULL,
    end_date INTEGER,
    is_primary INTEGER DEFAULT 0,
    identification_type TEXT CHECK(identification_type IN ('INE', 'passport', 'license', 'other')),
    identification_number TEXT,
    identification_document_url TEXT,
    phone TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    emergency_contact_relationship TEXT,
    occupation TEXT,
    workplace TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Índices para optimización de consultas
CREATE INDEX idx_residents_user ON residents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_property ON residents(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_relationship ON residents(relationship) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_primary ON residents(is_primary) WHERE deleted_at IS NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_residents_timestamp 
AFTER UPDATE ON residents
FOR EACH ROW
BEGIN
    UPDATE residents SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

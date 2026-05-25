-- ============================================================================
-- MIGRACIÓN 018: Actualizar tabla residents para CRUD completo
-- Descripción: Reestructurar tabla residents como entidad independiente
-- Fecha: 2026-05-25
-- ============================================================================

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS resident_properties;
DROP TABLE IF EXISTS residents;

-- Crear nueva tabla residents con estructura actualizada
CREATE TABLE IF NOT EXISTS residents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    type TEXT NOT NULL CHECK(type IN ('propietario', 'inquilino')),
    start_date INTEGER NOT NULL, -- Unix timestamp
    status TEXT NOT NULL DEFAULT 'activo' CHECK(status IN ('activo', 'inactivo')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER
);

-- Índices para optimización de consultas
CREATE INDEX idx_residents_email ON residents(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_type ON residents(type) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_status ON residents(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_full_name ON residents(full_name) WHERE deleted_at IS NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_residents_timestamp 
AFTER UPDATE ON residents
FOR EACH ROW
BEGIN
    UPDATE residents SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Crear tabla de relación entre residentes y propiedades
CREATE TABLE IF NOT EXISTS resident_properties (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    resident_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('propietario', 'residente_actual')),
    start_date INTEGER NOT NULL,
    end_date INTEGER,
    is_active INTEGER DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE(resident_id, property_id, role)
);

-- Índices para la tabla de relación
CREATE INDEX idx_resident_properties_resident ON resident_properties(resident_id);
CREATE INDEX idx_resident_properties_property ON resident_properties(property_id);
CREATE INDEX idx_resident_properties_active ON resident_properties(is_active);

-- Trigger para actualizar updated_at en resident_properties
CREATE TRIGGER IF NOT EXISTS update_resident_properties_timestamp 
AFTER UPDATE ON resident_properties
FOR EACH ROW
BEGIN
    UPDATE resident_properties SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Insertar algunos residentes de ejemplo para testing
INSERT INTO residents (full_name, phone, email, type, start_date, status) VALUES
('Juan Pérez García', '3312345678', 'juan.perez@example.com', 'propietario', unixepoch('2024-01-15'), 'activo'),
('María López Hernández', '3398765432', 'maria.lopez@example.com', 'inquilino', unixepoch('2024-03-01'), 'activo'),
('Carlos Ramírez Torres', '3387654321', 'carlos.ramirez@example.com', 'propietario', unixepoch('2023-11-20'), 'activo'),
('Ana Martínez Silva', '3376543210', 'ana.martinez@example.com', 'inquilino', unixepoch('2024-02-10'), 'activo'),
('Roberto González Díaz', '3365432109', 'roberto.gonzalez@example.com', 'propietario', unixepoch('2024-04-05'), 'inactivo');

-- Made with Bob
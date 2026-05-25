-- ============================================================================
-- MIGRACIÓN 019: Actualizar tabla vehicles
-- Descripción: Actualizar estructura de vehicles según nuevos requisitos
--              - Cambiar 'make' a 'brand'
--              - Hacer 'model' y 'year' obligatorios
--              - Cambiar 'is_active' a 'status' con valores 'activo'/'inactivo'
--              - Agregar constraint para máximo 4 vehículos activos por propiedad
-- Fecha: 2026-05-25
-- ============================================================================

-- Paso 1: Crear tabla temporal con la nueva estructura
CREATE TABLE IF NOT EXISTS vehicles_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL CHECK(year >= 1900 AND year <= 2027),
    license_plate TEXT UNIQUE NOT NULL,
    color TEXT NOT NULL,
    status TEXT DEFAULT 'activo' CHECK(status IN ('activo', 'inactivo')),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Paso 2: Migrar datos existentes
INSERT INTO vehicles_new (
    id, 
    property_id, 
    brand, 
    model, 
    year, 
    license_plate, 
    color, 
    status,
    created_at,
    updated_at
)
SELECT 
    id,
    property_id,
    COALESCE(make, 'Sin marca') as brand,
    COALESCE(model, 'Sin modelo') as model,
    COALESCE(year, 2020) as year,
    license_plate,
    color,
    CASE WHEN is_active = 1 THEN 'activo' ELSE 'inactivo' END as status,
    created_at,
    updated_at
FROM vehicles
WHERE deleted_at IS NULL;

-- Paso 3: Eliminar tabla antigua
DROP TABLE IF EXISTS vehicles;

-- Paso 4: Renombrar tabla nueva
ALTER TABLE vehicles_new RENAME TO vehicles;

-- Paso 5: Crear índices optimizados
CREATE INDEX idx_vehicles_property ON vehicles(property_id);
CREATE INDEX idx_vehicles_plate ON vehicles(license_plate);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_property_status ON vehicles(property_id, status);

-- Paso 6: Crear trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_vehicles_timestamp 
AFTER UPDATE ON vehicles
FOR EACH ROW
BEGIN
    UPDATE vehicles SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Paso 7: Crear trigger para validar máximo 4 vehículos activos por propiedad
CREATE TRIGGER IF NOT EXISTS check_max_vehicles_per_property
BEFORE INSERT ON vehicles
FOR EACH ROW
WHEN NEW.status = 'activo'
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM vehicles WHERE property_id = NEW.property_id AND status = 'activo') >= 4
        THEN RAISE(ABORT, 'La propiedad ya tiene el máximo de 4 vehículos activos')
    END;
END;

-- Paso 8: Crear trigger para validar al actualizar estado a activo
CREATE TRIGGER IF NOT EXISTS check_max_vehicles_per_property_update
BEFORE UPDATE ON vehicles
FOR EACH ROW
WHEN NEW.status = 'activo' AND OLD.status != 'activo'
BEGIN
    SELECT CASE
        WHEN (SELECT COUNT(*) FROM vehicles WHERE property_id = NEW.property_id AND status = 'activo' AND id != NEW.id) >= 4
        THEN RAISE(ABORT, 'La propiedad ya tiene el máximo de 4 vehículos activos')
    END;
END;

-- Made with Bob
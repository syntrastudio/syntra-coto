-- ============================================================================
-- MIGRACIÓN 014: Crear tablas assemblies y assembly_attendees
-- Descripción: Asambleas, convocatorias y asistencia
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS assemblies (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    assembly_type TEXT NOT NULL CHECK(assembly_type IN ('ordinary', 'extraordinary', 'informative', 'emergency')),
    scheduled_date INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER,
    location TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'postponed')),
    quorum_required INTEGER DEFAULT 50, -- Porcentaje
    quorum_achieved INTEGER,
    total_attendees INTEGER DEFAULT 0,
    agenda TEXT, -- JSON array de items
    minutes TEXT,
    minutes_document_url TEXT,
    resolutions TEXT, -- JSON array de resoluciones
    voting_results TEXT, -- JSON con resultados de votaciones
    convocation_sent_at INTEGER,
    convocation_method TEXT, -- email, sms, physical, etc.
    created_by TEXT NOT NULL,
    cancelled_reason TEXT,
    postponed_to INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_assemblies_type ON assemblies(assembly_type);
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_assemblies_date ON assemblies(scheduled_date);
CREATE INDEX idx_assemblies_created_by ON assemblies(created_by);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_assemblies_timestamp 
AFTER UPDATE ON assemblies
FOR EACH ROW
BEGIN
    UPDATE assemblies SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Tabla de asistencia a asambleas
CREATE TABLE IF NOT EXISTS assembly_attendees (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    assembly_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    resident_id TEXT,
    attended INTEGER DEFAULT 0,
    represented_by TEXT,
    check_in_time INTEGER,
    check_out_time INTEGER,
    voting_rights INTEGER DEFAULT 1,
    proxy_document_url TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (assembly_id) REFERENCES assemblies(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_assembly_attendees_assembly ON assembly_attendees(assembly_id);
CREATE INDEX idx_assembly_attendees_property ON assembly_attendees(property_id);
CREATE INDEX idx_assembly_attendees_attended ON assembly_attendees(attended);

-- Made with Bob

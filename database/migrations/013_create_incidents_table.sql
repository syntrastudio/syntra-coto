-- ============================================================================
-- MIGRACIÓN 013: Crear tabla incidents
-- Descripción: Reportes de incidencias y problemas
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT,
    reported_by TEXT NOT NULL,
    incident_type TEXT NOT NULL CHECK(incident_type IN ('maintenance', 'security', 'noise', 'parking', 'common_area', 'utilities', 'vandalism', 'theft', 'other')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    location TEXT,
    severity TEXT DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported', 'acknowledged', 'in_progress', 'resolved', 'closed', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
    assigned_to TEXT,
    assigned_at INTEGER,
    resolved_at INTEGER,
    closed_at INTEGER,
    resolution_notes TEXT,
    estimated_cost REAL,
    actual_cost REAL,
    photos TEXT, -- JSON array de URLs
    attachments TEXT, -- JSON array de URLs
    reported_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (reported_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_incidents_property ON incidents(property_id);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_incidents_timestamp 
AFTER UPDATE ON incidents
FOR EACH ROW
BEGIN
    UPDATE incidents SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

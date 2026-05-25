-- ============================================================================
-- MIGRACIÓN 012: Crear tabla documents
-- Descripción: Gestión documental del fraccionamiento
-- Fecha: 2026-05-23
-- ============================================================================

CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    title TEXT NOT NULL,
    description TEXT,
    document_type TEXT NOT NULL CHECK(document_type IN ('regulation', 'minutes', 'notice', 'contract', 'invoice', 'receipt', 'report', 'policy', 'other')),
    category TEXT,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    file_type TEXT,
    is_public INTEGER DEFAULT 0,
    property_id TEXT,
    uploaded_by TEXT NOT NULL,
    version INTEGER DEFAULT 1,
    parent_document_id TEXT,
    tags TEXT, -- JSON array de tags
    metadata TEXT, -- JSON con información adicional
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (parent_document_id) REFERENCES documents(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_category ON documents(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_property ON documents(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_public ON documents(is_public) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_created ON documents(created_at) WHERE deleted_at IS NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER IF NOT EXISTS update_documents_timestamp 
AFTER UPDATE ON documents
FOR EACH ROW
BEGIN
    UPDATE documents SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Made with Bob

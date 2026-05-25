-- ============================================================================
-- MIGRACIÓN 020: Actualizar tabla users para sistema de roles completo
-- Descripción: Agregar rol supervisor, campos created_by y last_login
-- Fecha: 2026-05-25
-- ============================================================================

-- Primero, necesitamos recrear la tabla con el nuevo constraint
-- SQLite no permite modificar constraints directamente

-- 1. Crear tabla temporal con la nueva estructura
CREATE TABLE users_new (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'supervisor', 'resident')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
    email_verified INTEGER DEFAULT 0,
    phone_verified INTEGER DEFAULT 0,
    profile_image_url TEXT,
    created_by TEXT,
    last_login_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 2. Copiar datos existentes
INSERT INTO users_new (
    id, email, password_hash, full_name, phone, role, status,
    email_verified, phone_verified, profile_image_url,
    last_login_at, created_at, updated_at, deleted_at
)
SELECT 
    id, email, password_hash, full_name, phone, role, status,
    email_verified, phone_verified, profile_image_url,
    last_login_at, created_at, updated_at, deleted_at
FROM users;

-- 3. Eliminar tabla antigua
DROP TABLE users;

-- 4. Renombrar tabla nueva
ALTER TABLE users_new RENAME TO users;

-- 5. Recrear índices
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_by ON users(created_by) WHERE deleted_at IS NULL;

-- 6. Recrear trigger para actualizar updated_at
CREATE TRIGGER update_users_timestamp 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ============================================================================
-- NOTAS
-- ============================================================================
-- 1. Se agregó el rol 'supervisor' al constraint CHECK
-- 2. Se agregó el campo 'created_by' para rastrear quién creó cada usuario
-- 3. El campo 'last_login_at' ya existía pero ahora se usa activamente
-- 4. Los datos existentes se preservan durante la migración
-- ============================================================================

-- Made with Bob
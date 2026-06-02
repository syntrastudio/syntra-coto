-- ============================================================================
-- MIGRACIÓN 021: Crear tabla board_members (Mesa Directiva)
-- Descripción: Miembros de la mesa directiva con cargo y vigencia. Son los
--              usuarios que pueden aprobar cambios sensibles (p. ej. la cuenta
--              de Mercado Pago) mediante firma múltiple.
-- Fecha: 2026-06-01
-- ============================================================================

CREATE TABLE IF NOT EXISTS board_members (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    position TEXT NOT NULL DEFAULT 'vocal'
        CHECK(position IN ('presidente','tesorero','secretario','vocal','suplente')),
    -- Si cuenta o no para la firma múltiple de cambios de cuenta de pago.
    -- Los suplentes pueden marcarse en 0 para no bloquear la unanimidad.
    can_approve_gateway INTEGER NOT NULL DEFAULT 1,
    term_start INTEGER,
    term_end INTEGER,
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Un usuario sólo puede tener un registro activo en la mesa a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS idx_board_members_user_active
    ON board_members(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_board_members_active ON board_members(is_active);

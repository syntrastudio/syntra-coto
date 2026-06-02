-- ============================================================================
-- MIGRACIÓN 022: Bóveda de credenciales de pasarela + firma múltiple
-- Descripción: Almacena la configuración ACTIVA de Mercado Pago (con el access
--              token CIFRADO en reposo) y el flujo de propuestas/aprobaciones
--              para cambiar la cuenta. Cambiar la cuenta requiere la aprobación
--              de TODOS los miembros activos de la mesa (firma múltiple).
-- Fecha: 2026-06-01
-- ============================================================================

-- Configuración ACTIVA (una fila activa por proveedor).
CREATE TABLE IF NOT EXISTS payment_gateway_config (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    provider TEXT NOT NULL DEFAULT 'mercadopago',
    mode TEXT NOT NULL DEFAULT 'test' CHECK(mode IN ('test','live')),
    -- Access token cifrado (AES-GCM). NUNCA se guarda ni se devuelve en claro.
    encrypted_access_token TEXT NOT NULL,
    public_key TEXT,
    encrypted_webhook_secret TEXT,
    -- Identidad de la cuenta receptora (de /users/me). collector_id se usa como
    -- candado: cada pago entrante debe pertenecer a esta cuenta.
    collector_id TEXT,
    account_nickname TEXT,
    account_email TEXT,
    account_country TEXT,
    token_preview TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','inactive')),
    activated_from_proposal_id TEXT,
    activated_by TEXT,
    activated_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_gateway_config_active ON payment_gateway_config(provider, status);

-- PROPUESTAS de cambio de credenciales (requieren firma múltiple).
CREATE TABLE IF NOT EXISTS gateway_config_proposals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    provider TEXT NOT NULL DEFAULT 'mercadopago',
    mode TEXT NOT NULL DEFAULT 'test' CHECK(mode IN ('test','live')),
    encrypted_access_token TEXT NOT NULL,
    public_key TEXT,
    encrypted_webhook_secret TEXT,
    collector_id TEXT,
    account_nickname TEXT,
    account_email TEXT,
    account_country TEXT,
    token_preview TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK(status IN ('pending','approved','rejected','expired','activated','superseded','cancelled')),
    proposed_by TEXT NOT NULL,
    proposer_note TEXT,
    -- Cuántas firmas se necesitaban al momento de proponer (foto del momento).
    required_approvals INTEGER NOT NULL DEFAULT 0,
    expires_at INTEGER,
    decided_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (proposed_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_gateway_proposals_status ON gateway_config_proposals(status);

-- APROBACIONES / RECHAZOS por cada miembro de la mesa.
CREATE TABLE IF NOT EXISTS gateway_config_approvals (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    proposal_id TEXT NOT NULL,
    board_member_user_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK(decision IN ('approve','reject')),
    comment TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    UNIQUE(proposal_id, board_member_user_id),
    FOREIGN KEY (proposal_id) REFERENCES gateway_config_proposals(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_gateway_approvals_proposal ON gateway_config_approvals(proposal_id);

-- Configuración de pagos en línea (montos/recargos).
INSERT OR IGNORE INTO system_settings (key, value, data_type, description, category, is_public, is_editable) VALUES
('mp_enabled', 'false', 'boolean', 'Pagos en línea con Mercado Pago habilitados', 'payments', 1, 1),
('mp_card_surcharge_pct', '3.5', 'number', 'Recargo % que absorbe el residente al pagar con tarjeta (cubre la comisión de Mercado Pago)', 'payments', 1, 1),
('mp_transfer_surcharge_pct', '0', 'number', 'Recargo % al pagar por transferencia SPEI', 'payments', 1, 1);

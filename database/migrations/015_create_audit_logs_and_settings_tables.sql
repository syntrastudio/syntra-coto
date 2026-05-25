-- ============================================================================
-- MIGRACIÓN 015: Crear tablas audit_logs y system_settings
-- Descripción: Logs de auditoría y configuración del sistema
-- Fecha: 2026-05-23
-- ============================================================================

-- Tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    old_values TEXT, -- JSON
    new_values TEXT, -- JSON
    ip_address TEXT,
    user_agent TEXT,
    session_id TEXT,
    request_method TEXT,
    request_path TEXT,
    status_code INTEGER,
    error_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Índices para optimización de consultas
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Tabla de configuración del sistema
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    data_type TEXT DEFAULT 'string' CHECK(data_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT,
    category TEXT,
    is_public INTEGER DEFAULT 0,
    is_editable INTEGER DEFAULT 1,
    validation_rules TEXT, -- JSON con reglas de validación
    updated_by TEXT,
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Índices para optimización de consultas
CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_public ON system_settings(is_public);

-- Configuraciones iniciales del sistema
INSERT OR IGNORE INTO system_settings (key, value, data_type, description, category, is_public) VALUES
('maintenance_fee_amount', '0', 'number', 'Monto de cuota de mantenimiento mensual', 'fees', 0),
('early_payment_discount', '10', 'number', 'Porcentaje de descuento por pago anticipado (días 1-16)', 'fees', 0),
('late_payment_surcharge', '15', 'number', 'Porcentaje de recargo mensual por mora', 'fees', 0),
('early_payment_cutoff_day', '16', 'number', 'Día límite para descuento por pago anticipado', 'fees', 0),
('terrace_reservation_fee', '500', 'number', 'Cuota de reservación de terraza', 'amenities', 1),
('terrace_deposit_return', '300', 'number', 'Monto de devolución de depósito de terraza', 'amenities', 1),
('notification_days', '[5, 10, 15, 20]', 'json', 'Días de retraso para enviar notificaciones', 'notifications', 0),
('max_vehicles_per_property', '3', 'number', 'Máximo de vehículos por propiedad', 'vehicles', 1),
('system_name', 'Paseo Coto Tonalá', 'string', 'Nombre del fraccionamiento', 'general', 1),
('total_properties', '130', 'number', 'Total de propiedades en el fraccionamiento', 'general', 1),
('contact_email', 'admin@paseocototonala.com', 'string', 'Email de contacto', 'general', 1),
('contact_phone', '', 'string', 'Teléfono de contacto', 'general', 1),
('address', 'Tonalá, Jalisco, México', 'string', 'Dirección del fraccionamiento', 'general', 1);

-- Made with Bob

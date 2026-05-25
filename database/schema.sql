-- ============================================================================
-- ESQUEMA DE BASE DE DATOS - SISTEMA DE ADMINISTRACIÓN PASEO COTO TONALÁ
-- ============================================================================
-- Base de datos: SQLite (Cloudflare D1)
-- Versión: 1.0.0
-- Fecha: 2026-05-23
-- Descripción: Esquema completo para gestión de fraccionamiento con 130 casas
-- ============================================================================

-- ============================================================================
-- TABLA: users
-- Descripción: Usuarios del sistema (residentes, administradores)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    role TEXT NOT NULL CHECK(role IN ('super_admin', 'admin', 'resident')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'suspended')),
    email_verified INTEGER DEFAULT 0,
    phone_verified INTEGER DEFAULT 0,
    profile_image_url TEXT,
    last_login_at INTEGER,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_role ON users(role) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: properties
-- Descripción: 130 casas del fraccionamiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS properties (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    house_number TEXT UNIQUE NOT NULL,
    street TEXT NOT NULL,
    block TEXT,
    owner_id TEXT,
    status TEXT NOT NULL DEFAULT 'occupied' CHECK(status IN ('occupied', 'vacant', 'rented')),
    property_type TEXT DEFAULT 'house' CHECK(property_type IN ('house', 'apartment')),
    bedrooms INTEGER,
    bathrooms INTEGER,
    parking_spaces INTEGER DEFAULT 1,
    lot_area REAL,
    construction_area REAL,
    delinquency_status TEXT NOT NULL DEFAULT 'al_corriente' CHECK(delinquency_status IN ('al_corriente', 'moroso_1mes', 'moroso_2mes', 'suspendido')),
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_properties_house_number ON properties(house_number) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_owner ON properties(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_status ON properties(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_properties_delinquency ON properties(delinquency_status) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: residents
-- Descripción: Información detallada de residentes
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

CREATE INDEX idx_residents_user ON residents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_property ON residents(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_relationship ON residents(relationship) WHERE deleted_at IS NULL;
CREATE INDEX idx_residents_primary ON residents(is_primary) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: monthly_fees
-- Descripción: Cuotas mensuales generadas automáticamente
-- ============================================================================
CREATE TABLE IF NOT EXISTS monthly_fees (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    discount_percentage REAL DEFAULT 0,
    discount_applied_date INTEGER,
    total_amount REAL NOT NULL,
    due_date INTEGER NOT NULL,
    payment_period TEXT NOT NULL, -- Formato: YYYY-MM
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'overdue', 'cancelled', 'partially_paid')),
    paid_amount REAL DEFAULT 0,
    balance REAL NOT NULL,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

CREATE INDEX idx_monthly_fees_property ON monthly_fees(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_monthly_fees_status ON monthly_fees(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_monthly_fees_period ON monthly_fees(payment_period) WHERE deleted_at IS NULL;
CREATE INDEX idx_monthly_fees_due_date ON monthly_fees(due_date) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: payments
-- Descripción: Registro de pagos realizados
-- ============================================================================
CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    monthly_fee_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'transfer', 'card', 'check', 'stripe', 'mercadopago')),
    payment_reference TEXT,
    payment_date INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    gateway_transaction_id TEXT,
    gateway_response TEXT,
    notes TEXT,
    created_by TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (monthly_fee_id) REFERENCES monthly_fees(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_payments_fee ON payments(monthly_fee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_property ON payments(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_status ON payments(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_date ON payments(payment_date) WHERE deleted_at IS NULL;
CREATE INDEX idx_payments_method ON payments(payment_method) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: payment_receipts
-- Descripción: Comprobantes de pago generados
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_receipts (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    payment_id TEXT NOT NULL,
    receipt_number TEXT UNIQUE NOT NULL,
    receipt_url TEXT,
    pdf_generated INTEGER DEFAULT 0,
    issued_date INTEGER NOT NULL,
    issued_by TEXT,
    metadata TEXT, -- JSON con información adicional
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_receipts_payment ON payment_receipts(payment_id);
CREATE INDEX idx_receipts_number ON payment_receipts(receipt_number);
CREATE INDEX idx_receipts_date ON payment_receipts(issued_date);

-- ============================================================================
-- TABLA: late_fees
-- Descripción: Recargos por mora (15% mensual sobre saldo vencido)
-- ============================================================================
CREATE TABLE IF NOT EXISTS late_fees (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    monthly_fee_id TEXT NOT NULL,
    property_id TEXT NOT NULL,
    base_amount REAL NOT NULL,
    surcharge_percentage REAL NOT NULL DEFAULT 15.0,
    surcharge_amount REAL NOT NULL,
    months_overdue INTEGER NOT NULL,
    applied_date INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'waived', 'cancelled')),
    waived_reason TEXT,
    waived_by TEXT,
    waived_date INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (monthly_fee_id) REFERENCES monthly_fees(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (waived_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_late_fees_monthly_fee ON late_fees(monthly_fee_id);
CREATE INDEX idx_late_fees_property ON late_fees(property_id);
CREATE INDEX idx_late_fees_status ON late_fees(status);
CREATE INDEX idx_late_fees_applied_date ON late_fees(applied_date);

-- ============================================================================
-- TABLA: notifications
-- Descripción: Historial de notificaciones enviadas
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('payment_reminder', 'payment_overdue', 'payment_confirmed', 'late_fee_applied', 'announcement', 'event', 'violation', 'reservation', 'system')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    priority TEXT DEFAULT 'normal' CHECK(priority IN ('low', 'normal', 'high', 'urgent')),
    channel TEXT NOT NULL CHECK(channel IN ('email', 'sms', 'push', 'in_app', 'whatsapp')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'sent', 'failed', 'read', 'archived')),
    sent_at INTEGER,
    read_at INTEGER,
    archived_at INTEGER,
    metadata TEXT, -- JSON con información adicional
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_channel ON notifications(channel);
CREATE INDEX idx_notifications_created ON notifications(created_at);

-- ============================================================================
-- TABLA: visitors
-- Descripción: Registro de visitantes del fraccionamiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    name TEXT NOT NULL,
    identification_type TEXT CHECK(identification_type IN ('INE', 'passport', 'license', 'other')),
    identification_number TEXT,
    phone TEXT,
    vehicle_make TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    vehicle_plate TEXT,
    visit_type TEXT DEFAULT 'social' CHECK(visit_type IN ('social', 'service', 'delivery', 'contractor', 'family', 'other')),
    entry_time INTEGER NOT NULL,
    exit_time INTEGER,
    authorized_by TEXT,
    security_guard_entry TEXT,
    security_guard_exit TEXT,
    notes TEXT,
    photo_url TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (authorized_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_visitors_property ON visitors(property_id);
CREATE INDEX idx_visitors_entry ON visitors(entry_time);
CREATE INDEX idx_visitors_exit ON visitors(exit_time);
CREATE INDEX idx_visitors_type ON visitors(visit_type);
CREATE INDEX idx_visitors_plate ON visitors(vehicle_plate);

-- ============================================================================
-- TABLA: vehicles
-- Descripción: Censo vehicular obligatorio del fraccionamiento
-- ============================================================================
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    resident_id TEXT,
    make TEXT NOT NULL,
    model TEXT,
    color TEXT NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    year INTEGER,
    vehicle_type TEXT DEFAULT 'car' CHECK(vehicle_type IN ('car', 'motorcycle', 'truck', 'van', 'suv', 'bicycle', 'other')),
    access_control_number TEXT,
    sticker_number TEXT,
    insurance_company TEXT,
    insurance_policy TEXT,
    insurance_expiry INTEGER,
    is_active INTEGER DEFAULT 1,
    photo_url TEXT,
    registration_document_url TEXT,
    registered_at INTEGER NOT NULL DEFAULT (unixepoch()),
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    deleted_at INTEGER,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE SET NULL
);

CREATE INDEX idx_vehicles_property ON vehicles(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_resident ON vehicles(resident_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_plate ON vehicles(license_plate) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_active ON vehicles(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_vehicles_type ON vehicles(vehicle_type) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: terrace_reservations
-- Descripción: Reservaciones de terraza ($500 cuota, $300 devolución)
-- ============================================================================
CREATE TABLE IF NOT EXISTS terrace_reservations (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    property_id TEXT NOT NULL,
    resident_id TEXT NOT NULL,
    reservation_date INTEGER NOT NULL,
    start_time INTEGER NOT NULL,
    end_time INTEGER NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN ('birthday', 'anniversary', 'baby_shower', 'wedding', 'graduation', 'family_gathering', 'corporate', 'other')),
    event_description TEXT,
    expected_guests INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'cancelled', 'completed', 'in_progress')),
    deposit_amount REAL DEFAULT 500.00,
    deposit_paid INTEGER DEFAULT 0,
    deposit_paid_date INTEGER,
    deposit_payment_method TEXT,
    deposit_returned INTEGER DEFAULT 0,
    deposit_return_amount REAL DEFAULT 300.00,
    deposit_return_date INTEGER,
    damage_deduction REAL DEFAULT 0,
    damage_description TEXT,
    special_requirements TEXT,
    setup_requirements TEXT,
    cancellation_reason TEXT,
    cancelled_by TEXT,
    cancelled_at INTEGER,
    confirmed_by TEXT,
    confirmed_at INTEGER,
    completed_at INTEGER,
    notes TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch()),
    updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (resident_id) REFERENCES residents(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_reservations_property ON terrace_reservations(property_id);
CREATE INDEX idx_reservations_resident ON terrace_reservations(resident_id);
CREATE INDEX idx_reservations_date ON terrace_reservations(reservation_date);
CREATE INDEX idx_reservations_status ON terrace_reservations(status);
CREATE INDEX idx_reservations_event_type ON terrace_reservations(event_type);

-- ============================================================================
-- TABLA: documents
-- Descripción: Gestión documental del fraccionamiento
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

CREATE INDEX idx_documents_type ON documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_category ON documents(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_property ON documents(property_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_by ON documents(uploaded_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_public ON documents(is_public) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_created ON documents(created_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- TABLA: incidents
-- Descripción: Reportes de incidencias y problemas
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

CREATE INDEX idx_incidents_property ON incidents(property_id);
CREATE INDEX idx_incidents_reported_by ON incidents(reported_by);
CREATE INDEX idx_incidents_type ON incidents(incident_type);
CREATE INDEX idx_incidents_status ON incidents(status);
CREATE INDEX idx_incidents_severity ON incidents(severity);
CREATE INDEX idx_incidents_assigned ON incidents(assigned_to);
CREATE INDEX idx_incidents_reported_at ON incidents(reported_at);

-- ============================================================================
-- TABLA: assemblies
-- Descripción: Asambleas y convocatorias
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

CREATE INDEX idx_assemblies_type ON assemblies(assembly_type);
CREATE INDEX idx_assemblies_status ON assemblies(status);
CREATE INDEX idx_assemblies_date ON assemblies(scheduled_date);
CREATE INDEX idx_assemblies_created_by ON assemblies(created_by);

-- ============================================================================
-- TABLA: assembly_attendees
-- Descripción: Asistencia a asambleas
-- ============================================================================
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

CREATE INDEX idx_assembly_attendees_assembly ON assembly_attendees(assembly_id);
CREATE INDEX idx_assembly_attendees_property ON assembly_attendees(property_id);
CREATE INDEX idx_assembly_attendees_attended ON assembly_attendees(attended);

-- ============================================================================
-- TABLA: audit_logs
-- Descripción: Logs de auditoría del sistema
-- ============================================================================
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

CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- ============================================================================
-- TABLA: system_settings
-- Descripción: Configuración del sistema
-- ============================================================================
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

CREATE INDEX idx_settings_category ON system_settings(category);
CREATE INDEX idx_settings_public ON system_settings(is_public);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar updated_at en users
CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en properties
CREATE TRIGGER IF NOT EXISTS update_properties_timestamp 
AFTER UPDATE ON properties
FOR EACH ROW
BEGIN
    UPDATE properties SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en residents
CREATE TRIGGER IF NOT EXISTS update_residents_timestamp 
AFTER UPDATE ON residents
FOR EACH ROW
BEGIN
    UPDATE residents SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en monthly_fees
CREATE TRIGGER IF NOT EXISTS update_monthly_fees_timestamp 
AFTER UPDATE ON monthly_fees
FOR EACH ROW
BEGIN
    UPDATE monthly_fees SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en payments
CREATE TRIGGER IF NOT EXISTS update_payments_timestamp 
AFTER UPDATE ON payments
FOR EACH ROW
BEGIN
    UPDATE payments SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en vehicles
CREATE TRIGGER IF NOT EXISTS update_vehicles_timestamp 
AFTER UPDATE ON vehicles
FOR EACH ROW
BEGIN
    UPDATE vehicles SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en terrace_reservations
CREATE TRIGGER IF NOT EXISTS update_terrace_reservations_timestamp 
AFTER UPDATE ON terrace_reservations
FOR EACH ROW
BEGIN
    UPDATE terrace_reservations SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en documents
CREATE TRIGGER IF NOT EXISTS update_documents_timestamp 
AFTER UPDATE ON documents
FOR EACH ROW
BEGIN
    UPDATE documents SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en incidents
CREATE TRIGGER IF NOT EXISTS update_incidents_timestamp 
AFTER UPDATE ON incidents
FOR EACH ROW
BEGIN
    UPDATE incidents SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Trigger para actualizar updated_at en assemblies
CREATE TRIGGER IF NOT EXISTS update_assemblies_timestamp 
AFTER UPDATE ON assemblies
FOR EACH ROW
BEGIN
    UPDATE assemblies SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- ============================================================================
-- CONFIGURACIONES INICIALES
-- ============================================================================

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

-- ============================================================================
-- FIN DEL ESQUEMA
-- ============================================================================

-- Made with Bob

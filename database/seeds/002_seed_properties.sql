-- ============================================================================
-- SEED 002: 130 Propiedades del fraccionamiento con nuevos campos
-- Descripción: Propiedades con house_number, street y status
-- Fecha: 2026-05-25
-- ============================================================================

-- Insertar usuario admin si no existe
INSERT OR IGNORE INTO users (id, email, password_hash, full_name, phone, role, status, email_verified, created_at, updated_at) 
VALUES ('admin001', 'admin@paseocototonala.com', '$2a$10$example.hash.replace.in.production', 'Administrador Principal', '3312345678', 'super_admin', 'active', 1, unixepoch(), unixepoch());

-- Insertar las 130 propiedades
-- Paseo del Coto (1-30)
INSERT INTO properties (id, house_number, street, status, created_at, updated_at) VALUES
(lower(hex(randomblob(16))), '1', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '2', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '3', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '4', 'Paseo del Coto', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '5', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '6', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '7', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '8', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '9', 'Paseo del Coto', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '10', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '11', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '12', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '13', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '14', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '15', 'Paseo del Coto', 'en_renta', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '16', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '17', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '18', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '19', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '20', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '21', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '22', 'Paseo del Coto', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '23', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '24', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '25', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '26', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '27', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '28', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '29', 'Paseo del Coto', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '30', 'Paseo del Coto', 'en_venta', unixepoch(), unixepoch());

-- Calle Tonalá (31-60)
INSERT INTO properties (id, house_number, street, status, created_at, updated_at) VALUES
(lower(hex(randomblob(16))), '31', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '32', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '33', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '34', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '35', 'Calle Tonalá', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '36', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '37', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '38', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '39', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '40', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '41', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '42', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '43', 'Calle Tonalá', 'en_renta', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '44', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '45', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '46', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '47', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '48', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '49', 'Calle Tonalá', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '50', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '51', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '52', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '53', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '54', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '55', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '56', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '57', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '58', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '59', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '60', 'Calle Tonalá', 'ocupada', unixepoch(), unixepoch());

-- Avenida Principal (61-90)
INSERT INTO properties (id, house_number, street, status, created_at, updated_at) VALUES
(lower(hex(randomblob(16))), '61', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '62', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '63', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '64', 'Avenida Principal', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '65', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '66', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '67', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '68', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '69', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '70', 'Avenida Principal', 'en_renta', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '71', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '72', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '73', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '74', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '75', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '76', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '77', 'Avenida Principal', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '78', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '79', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '80', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '81', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '82', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '83', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '84', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '85', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '86', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '87', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '88', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '89', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '90', 'Avenida Principal', 'ocupada', unixepoch(), unixepoch());

-- Privada del Bosque (91-120)
INSERT INTO properties (id, house_number, street, status, created_at, updated_at) VALUES
(lower(hex(randomblob(16))), '91', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '92', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '93', 'Privada del Bosque', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '94', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '95', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '96', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '97', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '98', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '99', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '100', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '101', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '102', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '103', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '104', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '105', 'Privada del Bosque', 'en_venta', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '106', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '107', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '108', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '109', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '110', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '111', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '112', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '113', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '114', 'Privada del Bosque', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '115', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '116', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '117', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '118', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '119', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '120', 'Privada del Bosque', 'ocupada', unixepoch(), unixepoch());

-- Circuito Residencial (121-130)
INSERT INTO properties (id, house_number, street, status, created_at, updated_at) VALUES
(lower(hex(randomblob(16))), '121', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '122', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '123', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '124', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '125', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '126', 'Circuito Residencial', 'desocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '127', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '128', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '129', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch()),
(lower(hex(randomblob(16))), '130', 'Circuito Residencial', 'ocupada', unixepoch(), unixepoch());

-- Made with Bob

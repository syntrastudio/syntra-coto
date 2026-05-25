-- ============================================================================
-- SEED 001: Datos iniciales para desarrollo
-- Descripción: Usuario super admin y 130 propiedades del fraccionamiento
-- Fecha: 2026-05-23
-- ============================================================================

-- ============================================================================
-- USUARIO SUPER ADMIN INICIAL
-- ============================================================================
-- Password: Admin123! (debe ser hasheado en producción)
-- Este es un hash de ejemplo - DEBE SER REEMPLAZADO en producción
INSERT INTO users (id, email, password_hash, full_name, phone, role, status, email_verified, created_at, updated_at) VALUES
('admin001', 'admin@paseocototonala.com', '$2a$10$example.hash.replace.in.production', 'Administrador Principal', '3312345678', 'super_admin', 'active', 1, unixepoch(), unixepoch());

-- ============================================================================
-- 130 PROPIEDADES DEL FRACCIONAMIENTO
-- ============================================================================
-- Distribución: Calles principales con numeración consecutiva

-- Calle Paseo del Coto (Casas 1-30)
INSERT INTO properties (house_number, street, block, status, property_type, bedrooms, bathrooms, parking_spaces) VALUES
('1', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('2', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('3', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('4', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('5', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('6', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('7', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('8', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('9', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('10', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('11', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('12', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('13', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('14', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('15', 'Paseo del Coto', 'A', 'occupied', 'house', 3, 2, 2),
('16', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('17', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('18', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('19', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('20', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('21', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('22', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('23', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('24', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('25', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('26', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('27', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('28', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('29', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2),
('30', 'Paseo del Coto', 'B', 'occupied', 'house', 3, 2, 2);

-- Calle Tonalá (Casas 31-60)
INSERT INTO properties (house_number, street, block, status, property_type, bedrooms, bathrooms, parking_spaces) VALUES
('31', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('32', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('33', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('34', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('35', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('36', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('37', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('38', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('39', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('40', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('41', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('42', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('43', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('44', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('45', 'Calle Tonalá', 'C', 'occupied', 'house', 3, 2, 2),
('46', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('47', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('48', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('49', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('50', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('51', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('52', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('53', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('54', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('55', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('56', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('57', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('58', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('59', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2),
('60', 'Calle Tonalá', 'D', 'occupied', 'house', 3, 2, 2);

-- Avenida Principal (Casas 61-90)
INSERT INTO properties (house_number, street, block, status, property_type, bedrooms, bathrooms, parking_spaces) VALUES
('61', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('62', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('63', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('64', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('65', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('66', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('67', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('68', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('69', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('70', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('71', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('72', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('73', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('74', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('75', 'Avenida Principal', 'E', 'occupied', 'house', 3, 2, 2),
('76', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('77', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('78', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('79', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('80', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('81', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('82', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('83', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('84', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('85', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('86', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('87', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('88', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('89', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2),
('90', 'Avenida Principal', 'F', 'occupied', 'house', 3, 2, 2);

-- Calle Las Flores (Casas 91-110)
INSERT INTO properties (house_number, street, block, status, property_type, bedrooms, bathrooms, parking_spaces) VALUES
('91', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('92', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('93', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('94', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('95', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('96', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('97', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('98', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('99', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('100', 'Calle Las Flores', 'G', 'occupied', 'house', 3, 2, 2),
('101', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('102', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('103', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('104', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('105', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('106', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('107', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('108', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('109', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2),
('110', 'Calle Las Flores', 'H', 'occupied', 'house', 3, 2, 2);

-- Privada del Bosque (Casas 111-130)
INSERT INTO properties (house_number, street, block, status, property_type, bedrooms, bathrooms, parking_spaces) VALUES
('111', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('112', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('113', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('114', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('115', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('116', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('117', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('118', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('119', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('120', 'Privada del Bosque', 'I', 'occupied', 'house', 3, 2, 2),
('121', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('122', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('123', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('124', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('125', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('126', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('127', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('128', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('129', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2),
('130', 'Privada del Bosque', 'J', 'occupied', 'house', 3, 2, 2);

-- ============================================================================
-- DATOS DE EJEMPLO PARA DESARROLLO (OPCIONAL)
-- ============================================================================

-- Usuario residente de ejemplo
-- Password: Resident123!
INSERT INTO users (email, password_hash, full_name, phone, role, status, email_verified) VALUES
('residente@ejemplo.com', '$2a$10$example.hash.replace.in.production', 'Juan Pérez García', '3398765432', 'resident', 'active', 1);

-- Asignar residente a una propiedad
INSERT INTO residents (user_id, property_id, relationship, start_date, is_primary, phone, emergency_contact_name, emergency_contact_phone)
SELECT 
    u.id,
    p.id,
    'owner',
    unixepoch(),
    1,
    '3398765432',
    'María Pérez',
    '3387654321'
FROM users u, properties p
WHERE u.email = 'residente@ejemplo.com' AND p.house_number = '1'
LIMIT 1;

-- Actualizar owner_id de la propiedad
UPDATE properties 
SET owner_id = (SELECT id FROM users WHERE email = 'residente@ejemplo.com')
WHERE house_number = '1';

-- ============================================================================
-- NOTAS IMPORTANTES
-- ============================================================================
-- 1. Los hashes de contraseña son ejemplos y DEBEN ser reemplazados en producción
-- 2. Las 130 propiedades están distribuidas en 5 calles diferentes
-- 3. Todas las propiedades tienen configuración estándar: 3 recámaras, 2 baños, 2 estacionamientos
-- 4. El usuario super admin debe cambiar su contraseña en el primer login
-- 5. Los datos de ejemplo son opcionales y pueden ser eliminados en producción
-- ============================================================================

-- Made with Bob

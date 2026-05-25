-- Migration: Update existing properties with new fields
-- Description: Add house_number, street, and status to existing 130 properties

-- Update properties 1-30 (Paseo del Coto)
UPDATE properties SET house_number = '1', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 0);
UPDATE properties SET house_number = '2', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 1);
UPDATE properties SET house_number = '3', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 2);
UPDATE properties SET house_number = '4', street = 'Paseo del Coto', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 3);
UPDATE properties SET house_number = '5', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 4);
UPDATE properties SET house_number = '6', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 5);
UPDATE properties SET house_number = '7', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 6);
UPDATE properties SET house_number = '8', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 7);
UPDATE properties SET house_number = '9', street = 'Paseo del Coto', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 8);
UPDATE properties SET house_number = '10', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 9);
UPDATE properties SET house_number = '11', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 10);
UPDATE properties SET house_number = '12', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 11);
UPDATE properties SET house_number = '13', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 12);
UPDATE properties SET house_number = '14', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 13);
UPDATE properties SET house_number = '15', street = 'Paseo del Coto', status = 'en_renta' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 14);
UPDATE properties SET house_number = '16', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 15);
UPDATE properties SET house_number = '17', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 16);
UPDATE properties SET house_number = '18', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 17);
UPDATE properties SET house_number = '19', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 18);
UPDATE properties SET house_number = '20', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 19);
UPDATE properties SET house_number = '21', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 20);
UPDATE properties SET house_number = '22', street = 'Paseo del Coto', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 21);
UPDATE properties SET house_number = '23', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 22);
UPDATE properties SET house_number = '24', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 23);
UPDATE properties SET house_number = '25', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 24);
UPDATE properties SET house_number = '26', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 25);
UPDATE properties SET house_number = '27', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 26);
UPDATE properties SET house_number = '28', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 27);
UPDATE properties SET house_number = '29', street = 'Paseo del Coto', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 28);
UPDATE properties SET house_number = '30', street = 'Paseo del Coto', status = 'en_venta' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 29);

-- Update properties 31-60 (Calle Tonalá)
UPDATE properties SET house_number = '31', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 30);
UPDATE properties SET house_number = '32', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 31);
UPDATE properties SET house_number = '33', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 32);
UPDATE properties SET house_number = '34', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 33);
UPDATE properties SET house_number = '35', street = 'Calle Tonalá', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 34);
UPDATE properties SET house_number = '36', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 35);
UPDATE properties SET house_number = '37', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 36);
UPDATE properties SET house_number = '38', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 37);
UPDATE properties SET house_number = '39', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 38);
UPDATE properties SET house_number = '40', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 39);
UPDATE properties SET house_number = '41', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 40);
UPDATE properties SET house_number = '42', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 41);
UPDATE properties SET house_number = '43', street = 'Calle Tonalá', status = 'en_renta' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 42);
UPDATE properties SET house_number = '44', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 43);
UPDATE properties SET house_number = '45', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 44);
UPDATE properties SET house_number = '46', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 45);
UPDATE properties SET house_number = '47', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 46);
UPDATE properties SET house_number = '48', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 47);
UPDATE properties SET house_number = '49', street = 'Calle Tonalá', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 48);
UPDATE properties SET house_number = '50', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 49);
UPDATE properties SET house_number = '51', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 50);
UPDATE properties SET house_number = '52', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 51);
UPDATE properties SET house_number = '53', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 52);
UPDATE properties SET house_number = '54', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 53);
UPDATE properties SET house_number = '55', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 54);
UPDATE properties SET house_number = '56', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 55);
UPDATE properties SET house_number = '57', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 56);
UPDATE properties SET house_number = '58', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 57);
UPDATE properties SET house_number = '59', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 58);
UPDATE properties SET house_number = '60', street = 'Calle Tonalá', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 59);

-- Update properties 61-90 (Avenida Principal)
UPDATE properties SET house_number = '61', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 60);
UPDATE properties SET house_number = '62', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 61);
UPDATE properties SET house_number = '63', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 62);
UPDATE properties SET house_number = '64', street = 'Avenida Principal', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 63);
UPDATE properties SET house_number = '65', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 64);
UPDATE properties SET house_number = '66', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 65);
UPDATE properties SET house_number = '67', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 66);
UPDATE properties SET house_number = '68', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 67);
UPDATE properties SET house_number = '69', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 68);
UPDATE properties SET house_number = '70', street = 'Avenida Principal', status = 'en_renta' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 69);
UPDATE properties SET house_number = '71', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 70);
UPDATE properties SET house_number = '72', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 71);
UPDATE properties SET house_number = '73', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 72);
UPDATE properties SET house_number = '74', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 73);
UPDATE properties SET house_number = '75', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 74);
UPDATE properties SET house_number = '76', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 75);
UPDATE properties SET house_number = '77', street = 'Avenida Principal', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 76);
UPDATE properties SET house_number = '78', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 77);
UPDATE properties SET house_number = '79', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 78);
UPDATE properties SET house_number = '80', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 79);
UPDATE properties SET house_number = '81', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 80);
UPDATE properties SET house_number = '82', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 81);
UPDATE properties SET house_number = '83', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 82);
UPDATE properties SET house_number = '84', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 83);
UPDATE properties SET house_number = '85', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 84);
UPDATE properties SET house_number = '86', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 85);
UPDATE properties SET house_number = '87', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 86);
UPDATE properties SET house_number = '88', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 87);
UPDATE properties SET house_number = '89', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 88);
UPDATE properties SET house_number = '90', street = 'Avenida Principal', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 89);

-- Update properties 91-120 (Privada del Bosque)
UPDATE properties SET house_number = '91', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 90);
UPDATE properties SET house_number = '92', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 91);
UPDATE properties SET house_number = '93', street = 'Privada del Bosque', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 92);
UPDATE properties SET house_number = '94', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 93);
UPDATE properties SET house_number = '95', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 94);
UPDATE properties SET house_number = '96', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 95);
UPDATE properties SET house_number = '97', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 96);
UPDATE properties SET house_number = '98', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 97);
UPDATE properties SET house_number = '99', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 98);
UPDATE properties SET house_number = '100', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 99);
UPDATE properties SET house_number = '101', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 100);
UPDATE properties SET house_number = '102', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 101);
UPDATE properties SET house_number = '103', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 102);
UPDATE properties SET house_number = '104', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 103);
UPDATE properties SET house_number = '105', street = 'Privada del Bosque', status = 'en_venta' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 104);
UPDATE properties SET house_number = '106', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 105);
UPDATE properties SET house_number = '107', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 106);
UPDATE properties SET house_number = '108', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 107);
UPDATE properties SET house_number = '109', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 108);
UPDATE properties SET house_number = '110', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 109);
UPDATE properties SET house_number = '111', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 110);
UPDATE properties SET house_number = '112', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 111);
UPDATE properties SET house_number = '113', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 112);
UPDATE properties SET house_number = '114', street = 'Privada del Bosque', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 113);
UPDATE properties SET house_number = '115', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 114);
UPDATE properties SET house_number = '116', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 115);
UPDATE properties SET house_number = '117', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 116);
UPDATE properties SET house_number = '118', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 117);
UPDATE properties SET house_number = '119', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 118);
UPDATE properties SET house_number = '120', street = 'Privada del Bosque', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 119);

-- Update properties 121-130 (Circuito Residencial)
UPDATE properties SET house_number = '121', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 120);
UPDATE properties SET house_number = '122', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 121);
UPDATE properties SET house_number = '123', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 122);
UPDATE properties SET house_number = '124', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 123);
UPDATE properties SET house_number = '125', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 124);
UPDATE properties SET house_number = '126', street = 'Circuito Residencial', status = 'desocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 125);
UPDATE properties SET house_number = '127', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 126);
UPDATE properties SET house_number = '128', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 127);
UPDATE properties SET house_number = '129', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 128);
UPDATE properties SET house_number = '130', street = 'Circuito Residencial', status = 'ocupada' WHERE id = (SELECT id FROM properties ORDER BY created_at LIMIT 1 OFFSET 129);

-- Made with Bob

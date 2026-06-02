-- ============================================================================
-- MIGRACIÓN 023: Parámetros de comisión de tarjeta (gross-up de Mercado Pago)
-- Descripción: Decisión de la mesa — las transferencias y el efectivo se
--              registran MANUALMENTE (sin pasar por MP, sin comisión). Solo la
--              TARJETA pasa por MP, y la comisión la absorbe el residente con un
--              cálculo "gross-up" para que el fraccionamiento reciba el monto
--              completo.
--
--   cargo = (cuota + fixed×(1+iva)) / (1 − commission×(1+iva))
--
-- Fecha: 2026-06-01
-- ============================================================================

INSERT OR IGNORE INTO system_settings (key, value, data_type, description, category, is_public, is_editable) VALUES
('mp_card_commission_pct', '3.19', 'number', 'Comisión % de Mercado Pago por pago con tarjeta (sin IVA)', 'payments', 1, 1),
('mp_card_fixed_fee', '4', 'number', 'Tarifa fija (MXN) de Mercado Pago por transacción con tarjeta', 'payments', 1, 1),
('mp_card_iva_pct', '16', 'number', 'IVA % que MP aplica sobre su comisión', 'payments', 1, 1);

-- La transferencia ya NO pasa por MP (se registra manual). Dejamos el valor en 0
-- para que ninguna lógica vieja le sume recargo por error.
UPDATE system_settings SET value = '0', description = 'OBSOLETO: las transferencias se registran manualmente, no por MP' WHERE key = 'mp_transfer_surcharge_pct';

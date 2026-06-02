-- ============================================================================
-- MIGRACIÓN 024: Forzar cambio de contraseña en primer ingreso
-- Descripción: bandera que obliga al usuario a establecer su propia contraseña
--              cuando entra con una temporal (alta o reset de admin). Los
--              usuarios existentes quedan en 0 (no se les molesta).
-- Fecha: 2026-06-01
-- ============================================================================

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;

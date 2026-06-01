/**
 * Endpoints públicos (sin login) + gestión admin de solicitudes de acceso.
 *
 * Sirve para que un vecino interesado deje sus datos desde una página pública
 * (/solicitar-acceso) y la mesa lo dé de alta después.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, successWithMessage, serverError, error as errorResp } from '../utils/response';
import { createResident } from '../services/residents.service';
import type { Env } from '../types';

const pub = new Hono<{ Bindings: Env }>();

// --- PÚBLICO: dejar solicitud de acceso ---
const requestSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().max(40).optional(),
  house_label: z.string().max(120).optional(),
  message: z.string().max(1000).optional(),
});

pub.post('/access-request', zValidator('json', requestSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const email = data.email.toLowerCase().trim();

    // Anti-spam simple: no aceptar el mismo correo dos veces en 24h
    const dayAgo = Math.floor(Date.now() / 1000) - 86400;
    const dup = await c.env.DB
      .prepare('SELECT 1 FROM access_requests WHERE email = ? AND created_at >= ? LIMIT 1')
      .bind(email, dayAgo)
      .first();
    if (dup) {
      return successWithMessage(c, { duplicate: true }, 'Ya recibimos tu solicitud. La mesa te contactará pronto.');
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB
      .prepare(
        `INSERT INTO access_requests (id, full_name, email, phone, house_label, message, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)`
      )
      .bind(id, data.full_name.trim(), email, data.phone || null, data.house_label || null, data.message || null, now)
      .run();

    return successWithMessage(c, { id }, '¡Gracias! La mesa directiva revisará tu solicitud y te dará acceso.');
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// --- ADMIN: ver y gestionar solicitudes ---
// Incluye detección de duplicados: si el correo o teléfono ya pertenece a un vecino.
pub.get('/access-requests', authMiddleware, requireRole('admin', 'super_admin'), async (c) => {
  try {
    const rows = await c.env.DB
      .prepare(
        `SELECT ar.*,
          (SELECT r.full_name FROM residents r WHERE r.email = ar.email AND r.deleted_at IS NULL LIMIT 1) AS dup_email_name,
          (SELECT r.full_name FROM residents r WHERE ar.phone IS NOT NULL AND ar.phone != '' AND REPLACE(REPLACE(r.phone,' ',''),'-','') = REPLACE(REPLACE(ar.phone,' ',''),'-','') AND r.deleted_at IS NULL LIMIT 1) AS dup_phone_name
        FROM access_requests ar
        ORDER BY (ar.status = 'pendiente') DESC, ar.created_at DESC LIMIT 200`
      )
      .all<any>();
    return success(c, rows.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const statusSchema = z.object({ status: z.enum(['pendiente', 'en_revision', 'contactado', 'descartado', 'dado_de_alta']) });
pub.post('/access-requests/:id/status', authMiddleware, requireRole('admin', 'super_admin'), zValidator('json', statusSchema), async (c) => {
  try {
    const { status } = c.req.valid('json');
    await c.env.DB.prepare('UPDATE access_requests SET status = ? WHERE id = ?').bind(status, c.req.param('id')).run();
    return successWithMessage(c, { ok: true }, 'Solicitud actualizada');
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Aprobar un interesado → crear el vecino (con sus datos ya cargados).
// Bloquea por correo duplicado (mismo vecino) y advierte por teléfono/nombre
// o propiedad ya ocupada; solo procede si el admin confirma con override.
const approveSchema = z.object({
  full_name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  phone: z.string().min(7).max(40),
  type: z.enum(['propietario', 'inquilino']),
  property_id: z.string().optional(),
  override: z.boolean().optional(),
});

pub.post('/access-requests/:id/approve', authMiddleware, requireRole('admin', 'super_admin'), zValidator('json', approveSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const email = data.email.toLowerCase().trim();
    const phoneDigits = data.phone.replace(/\D/g, '');

    const reqRow = await c.env.DB.prepare('SELECT id FROM access_requests WHERE id = ?').bind(id).first();
    if (!reqRow) return errorResp(c, 'Solicitud no encontrada', 404);

    // Bloqueo duro: correo ya registrado = mismo vecino
    const emailDup = await c.env.DB
      .prepare('SELECT id, full_name FROM residents WHERE email = ? AND deleted_at IS NULL')
      .bind(email)
      .first<{ id: string; full_name: string }>();
    if (emailDup) {
      return c.json({
        success: false, code: 'EMAIL_DUP',
        error: `El correo ya pertenece a ${emailDup.full_name}. Es el mismo vecino; no se puede duplicar.`,
      }, 409);
    }

    // Advertencias suaves (requieren override)
    const warnings: string[] = [];
    const phoneDup = await c.env.DB
      .prepare("SELECT full_name FROM residents WHERE deleted_at IS NULL AND REPLACE(REPLACE(phone,' ',''),'-','') = ? LIMIT 1")
      .bind(phoneDigits)
      .first<{ full_name: string }>();
    if (phoneDup) warnings.push(`El teléfono ya lo tiene registrado ${phoneDup.full_name}.`);

    const nameDup = await c.env.DB
      .prepare('SELECT full_name FROM residents WHERE deleted_at IS NULL AND LOWER(full_name) = LOWER(?) LIMIT 1')
      .bind(data.full_name.trim())
      .first<{ full_name: string }>();
    if (nameDup) warnings.push(`Ya existe un vecino con el mismo nombre (${nameDup.full_name}).`);

    let property: any = null;
    if (data.property_id) {
      property = await c.env.DB
        .prepare('SELECT id, house_number, street, owner_id, current_resident_id FROM properties WHERE id = ? AND deleted_at IS NULL')
        .bind(data.property_id)
        .first<any>();
      if (!property) return errorResp(c, 'La casa seleccionada no existe', 400);
      if (data.type === 'propietario' && property.owner_id) warnings.push('Esa casa ya tiene un propietario registrado.');
      if (data.type === 'inquilino' && property.current_resident_id) warnings.push('Esa casa ya tiene un residente actual registrado.');
    }

    if (warnings.length > 0 && !data.override) {
      return c.json({ success: false, code: 'NEEDS_OVERRIDE', warnings }, 409);
    }

    // Crear el vecino
    const now = Math.floor(Date.now() / 1000);
    const resident = await createResident(c.env.DB, {
      full_name: data.full_name.trim(),
      phone: phoneDigits.length >= 10 ? phoneDigits.slice(-10) : phoneDigits,
      email,
      type: data.type,
      start_date: now,
      status: 'activo',
    });

    // Vincular a la casa (si se eligió)
    if (property) {
      const col = data.type === 'propietario' ? 'owner_id' : 'current_resident_id';
      await c.env.DB.prepare(`UPDATE properties SET ${col} = ?, updated_at = ? WHERE id = ?`).bind(resident.id, now, property.id).run();
    }

    // Marcar la solicitud como dada de alta
    await c.env.DB.prepare("UPDATE access_requests SET status = 'dado_de_alta' WHERE id = ?").bind(id).run();

    return successWithMessage(c, { resident_id: resident.id }, 'Vecino dado de alta');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default pub;

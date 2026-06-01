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
pub.get('/access-requests', authMiddleware, requireRole('admin', 'super_admin'), async (c) => {
  try {
    const rows = await c.env.DB
      .prepare('SELECT * FROM access_requests ORDER BY (status = \'pendiente\') DESC, created_at DESC LIMIT 200')
      .all<any>();
    return success(c, rows.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const statusSchema = z.object({ status: z.enum(['pendiente', 'contactado', 'descartado']) });
pub.post('/access-requests/:id/status', authMiddleware, requireRole('admin', 'super_admin'), zValidator('json', statusSchema), async (c) => {
  try {
    const { status } = c.req.valid('json');
    await c.env.DB.prepare('UPDATE access_requests SET status = ? WHERE id = ?').bind(status, c.req.param('id')).run();
    return successWithMessage(c, { ok: true }, 'Solicitud actualizada');
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default pub;

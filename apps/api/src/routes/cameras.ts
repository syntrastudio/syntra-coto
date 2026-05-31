/**
 * Módulo de cámaras de videovigilancia. Por ahora solo CRUD (inventario).
 * Streaming/snapshots requieren acceso al NVR (Cloudflare Tunnel — futuro).
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, created, notFound, serverError } from '../utils/response';
import type { Env } from '../types';

const cameras = new Hono<{ Bindings: Env }>();
cameras.use('/*', authMiddleware);

const upsertSchema = z.object({
  name: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  brand: z.enum(['Dahua', 'Hikvision', 'UniFi', 'Reolink', 'Otros']).optional(),
  model: z.string().max(100).optional().nullable(),
  serial_number: z.string().max(100).optional().nullable(),
  channel: z.number().int().min(1).optional().nullable(),
  ip_address: z.string().max(100).optional().nullable(),
  status: z.enum(['activa', 'inactiva', 'mantenimiento', 'offline']).optional(),
  notes: z.string().max(1000).optional().nullable(),
});

// Listar (admin/super_admin/supervisor)
cameras.get('/', requireRole('admin', 'super_admin', 'supervisor'), async (c) => {
  try {
    const status = c.req.query('status');
    let sql = 'SELECT * FROM cameras WHERE deleted_at IS NULL';
    const bindings: any[] = [];
    if (status) {
      sql += ' AND status = ?';
      bindings.push(status);
    }
    sql += ' ORDER BY location, name';
    const rows = await c.env.DB.prepare(sql).bind(...bindings).all<any>();
    return success(c, rows.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

cameras.get('/:id', requireRole('admin', 'super_admin', 'supervisor'), async (c) => {
  try {
    const row = await c.env.DB
      .prepare('SELECT * FROM cameras WHERE id = ? AND deleted_at IS NULL')
      .bind(c.req.param('id'))
      .first<any>();
    if (!row) return notFound(c, 'Cámara');
    return success(c, row);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

cameras.post('/', requireRole('admin', 'super_admin'), zValidator('json', upsertSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB
      .prepare(
        `INSERT INTO cameras (id, name, location, brand, model, serial_number, channel, ip_address, status, notes, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        data.name,
        data.location,
        data.brand || 'Dahua',
        data.model || null,
        data.serial_number || null,
        data.channel || null,
        data.ip_address || null,
        data.status || 'activa',
        data.notes || null,
        now,
        now
      )
      .run();
    const created_row = await c.env.DB.prepare('SELECT * FROM cameras WHERE id = ?').bind(id).first();
    return created(c, created_row);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

cameras.patch('/:id', requireRole('admin', 'super_admin'), zValidator('json', upsertSchema.partial()), async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare('SELECT id FROM cameras WHERE id = ? AND deleted_at IS NULL').bind(id).first();
    if (!existing) return notFound(c, 'Cámara');

    const data = c.req.valid('json');
    const updates: string[] = [];
    const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        updates.push(`${k} = ?`);
        values.push(v);
      }
    }
    if (updates.length === 0) {
      const row = await c.env.DB.prepare('SELECT * FROM cameras WHERE id = ?').bind(id).first();
      return success(c, row);
    }
    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000));
    values.push(id);

    await c.env.DB.prepare(`UPDATE cameras SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
    const updated = await c.env.DB.prepare('SELECT * FROM cameras WHERE id = ?').bind(id).first();
    return success(c, updated);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

cameras.delete('/:id', requireRole('super_admin'), async (c) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB
      .prepare('UPDATE cameras SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .bind(now, now, c.req.param('id'))
      .run();
    return success(c, { deleted: true });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Eventos / alarmas — endpoint placeholder para webhook del NVR
cameras.post('/events', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const cameraId = (body as any).camera_id || null;
    if (!cameraId) return c.json({ success: false, error: 'camera_id requerido' }, 400);
    await c.env.DB
      .prepare(
        `INSERT INTO camera_events (camera_id, event_type, description, payload)
         VALUES (?, ?, ?, ?)`
      )
      .bind(
        cameraId,
        (body as any).event_type || 'unknown',
        (body as any).description || null,
        JSON.stringify(body)
      )
      .run();
    return success(c, { recorded: true });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

cameras.get('/:id/events', requireRole('admin', 'super_admin', 'supervisor'), async (c) => {
  try {
    const events = await c.env.DB
      .prepare('SELECT * FROM camera_events WHERE camera_id = ? ORDER BY created_at DESC LIMIT 100')
      .bind(c.req.param('id'))
      .all<any>();
    return success(c, events.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default cameras;

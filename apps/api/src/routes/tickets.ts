/**
 * Sistema de tickets. Los residentes reportan problemas, la mesa los gestiona.
 *
 * Reglas:
 *  - Residente: solo ve y crea sus propios tickets, agrega comentarios.
 *  - Admin/super_admin: ve todo, asigna, cambia estado, cierra.
 *  - Comentarios `is_internal=1` son visibles solo para admins.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, created, notFound, serverError, forbidden, error as errorResp } from '../utils/response';
import type { Env } from '../types';

const tickets = new Hono<{ Bindings: Env }>();
tickets.use('/*', authMiddleware);

const CATEGORIES = ['mantenimiento', 'seguridad', 'jardineria', 'ruido', 'vehiculos', 'administrativo', 'otros'] as const;
const PRIORITIES = ['baja', 'normal', 'alta', 'urgente'] as const;
const STATUSES = ['abierto', 'en_proceso', 'resuelto', 'cerrado', 'cancelado'] as const;

const createSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(5).max(5000),
  category: z.enum(CATEGORIES).optional().default('otros'),
  priority: z.enum(PRIORITIES).optional().default('normal'),
  property_id: z.string().optional(),
});

const updateSchema = z.object({
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(CATEGORIES).optional(),
  assigned_to: z.string().nullable().optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(5).max(5000).optional(),
});

const commentSchema = z.object({
  body: z.string().min(1).max(5000),
  is_internal: z.boolean().optional(),
});

async function generateTicketFolio(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = Math.floor(new Date(year, 0, 1).getTime() / 1000);
  const yearEnd = Math.floor(new Date(year + 1, 0, 1).getTime() / 1000);
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM tickets WHERE created_at >= ? AND created_at < ?')
      .bind(yearStart, yearEnd)
      .first<{ n: number }>();
    const next = Number(row?.n || 0) + 1 + attempt;
    const folio = `TK-${year}-${String(next).padStart(4, '0')}`;
    const exists = await db.prepare('SELECT 1 FROM tickets WHERE folio = ?').bind(folio).first();
    if (!exists) return folio;
  }
  return `TK-${year}-${Date.now().toString().slice(-6)}`;
}

// Helper: ¿el ticket es accesible por el user?
async function canAccessTicket(db: D1Database, ticketId: string, user: any): Promise<{ ok: boolean; ticket?: any }> {
  const t = await db.prepare('SELECT * FROM tickets WHERE id = ?').bind(ticketId).first<any>();
  if (!t) return { ok: false };
  const isAdmin = user.role === 'admin' || user.role === 'super_admin';
  const isReporter = t.reporter_user_id === user.id;
  return { ok: isAdmin || isReporter, ticket: t };
}

// GET /api/tickets
tickets.get('/', async (c) => {
  try {
    const user = c.get('user')!;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const status = c.req.query('status');
    const category = c.req.query('category');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const page = parseInt(c.req.query('page') || '1');
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const bindings: any[] = [];

    if (!isAdmin) {
      conditions.push('t.reporter_user_id = ?');
      bindings.push(user.id);
    }
    if (status) {
      conditions.push('t.status = ?');
      bindings.push(status);
    }
    if (category) {
      conditions.push('t.category = ?');
      bindings.push(category);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await c.env.DB
      .prepare(`SELECT COUNT(*) AS n FROM tickets t ${where}`)
      .bind(...bindings)
      .first<{ n: number }>();
    const total = Number(countRow?.n || 0);

    const rows = await c.env.DB
      .prepare(
        `SELECT t.*,
                u_reporter.full_name AS reporter_name,
                u_assigned.full_name AS assigned_name,
                pr.house_number AS property_house_number,
                pr.street AS property_street,
                (SELECT COUNT(*) FROM ticket_comments WHERE ticket_id = t.id) AS comments_count
         FROM tickets t
         LEFT JOIN users u_reporter ON u_reporter.id = t.reporter_user_id
         LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
         LEFT JOIN properties pr ON pr.id = t.property_id
         ${where}
         ORDER BY
           CASE t.status WHEN 'abierto' THEN 0 WHEN 'en_proceso' THEN 1 WHEN 'resuelto' THEN 2 ELSE 3 END,
           CASE t.priority WHEN 'urgente' THEN 0 WHEN 'alta' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,
           t.created_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings, limit, offset)
      .all<any>();

    return success(c, {
      data: rows.results || [],
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// GET /api/tickets/:id
tickets.get('/:id', async (c) => {
  try {
    const user = c.get('user')!;
    const access = await canAccessTicket(c.env.DB, c.req.param('id'), user);
    if (!access.ticket) return notFound(c, 'Ticket');
    if (!access.ok) return forbidden(c, 'No tienes acceso a este ticket');

    const ticket = await c.env.DB
      .prepare(
        `SELECT t.*,
                u_reporter.full_name AS reporter_name,
                u_reporter.email AS reporter_email,
                u_assigned.full_name AS assigned_name,
                pr.house_number AS property_house_number,
                pr.street AS property_street
         FROM tickets t
         LEFT JOIN users u_reporter ON u_reporter.id = t.reporter_user_id
         LEFT JOIN users u_assigned ON u_assigned.id = t.assigned_to
         LEFT JOIN properties pr ON pr.id = t.property_id
         WHERE t.id = ?`
      )
      .bind(c.req.param('id'))
      .first<any>();

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const commentsQuery = isAdmin
      ? `SELECT c.*, u.full_name AS user_name, u.role AS user_role
         FROM ticket_comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.ticket_id = ?
         ORDER BY c.created_at ASC`
      : `SELECT c.*, u.full_name AS user_name, u.role AS user_role
         FROM ticket_comments c
         LEFT JOIN users u ON u.id = c.user_id
         WHERE c.ticket_id = ? AND c.is_internal = 0
         ORDER BY c.created_at ASC`;
    const comments = await c.env.DB.prepare(commentsQuery).bind(c.req.param('id')).all<any>();

    return success(c, { ...ticket, comments: comments.results || [] });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// POST /api/tickets
tickets.post('/', zValidator('json', createSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const now = Math.floor(Date.now() / 1000);
    const id = crypto.randomUUID();
    const folio = await generateTicketFolio(c.env.DB);

    // Si no se especifica property_id y el user es residente con vínculo a propiedad, autodetectar
    let propertyId = data.property_id || null;
    if (!propertyId) {
      const link = await c.env.DB
        .prepare(
          `SELECT rp.property_id FROM users u
           JOIN resident_properties rp ON rp.resident_id = u.resident_id AND rp.is_active = 1
           WHERE u.id = ?
           LIMIT 1`
        )
        .bind(user.id)
        .first<{ property_id: string }>();
      if (link) propertyId = link.property_id;
    }

    await c.env.DB
      .prepare(
        `INSERT INTO tickets (id, folio, title, description, category, priority, status, property_id, reporter_user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'abierto', ?, ?, ?, ?)`
      )
      .bind(id, folio, data.title, data.description, data.category, data.priority, propertyId, user.id, now, now)
      .run();

    const ticket = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(id).first<any>();
    return created(c, ticket, `Ticket ${folio} creado`);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// PATCH /api/tickets/:id — solo admin (excepto cancelar el propio)
tickets.patch('/:id', zValidator('json', updateSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const access = await canAccessTicket(c.env.DB, c.req.param('id'), user);
    if (!access.ticket) return notFound(c, 'Ticket');
    if (!access.ok) return forbidden(c, 'No tienes acceso');

    const data = c.req.valid('json');
    // Residente solo puede cancelar su propio ticket
    if (!isAdmin) {
      const onlyCanceling = Object.keys(data).every((k) => k === 'status') && data.status === 'cancelado';
      if (!onlyCanceling) return forbidden(c, 'Solo administradores pueden modificar tickets');
    }

    const updates: string[] = [];
    const values: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) {
        updates.push(`${k} = ?`);
        values.push(v);
      }
    }
    if (updates.length === 0) return success(c, access.ticket);

    const now = Math.floor(Date.now() / 1000);
    updates.push('updated_at = ?');
    values.push(now);
    if (data.status === 'cerrado' || data.status === 'cancelado' || data.status === 'resuelto') {
      updates.push('closed_at = ?');
      values.push(now);
    }
    values.push(c.req.param('id'));

    await c.env.DB
      .prepare(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    const updated = await c.env.DB.prepare('SELECT * FROM tickets WHERE id = ?').bind(c.req.param('id')).first<any>();
    return success(c, updated);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// POST /api/tickets/:id/comments
tickets.post('/:id/comments', zValidator('json', commentSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    const access = await canAccessTicket(c.env.DB, c.req.param('id'), user);
    if (!access.ticket) return notFound(c, 'Ticket');
    if (!access.ok) return forbidden(c, 'No tienes acceso');

    const data = c.req.valid('json');
    if (data.is_internal && !isAdmin) {
      return errorResp(c, 'Solo administradores pueden marcar comentarios como internos', 403);
    }

    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB
      .prepare('INSERT INTO ticket_comments (id, ticket_id, user_id, body, is_internal, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, c.req.param('id'), user.id, data.body, data.is_internal ? 1 : 0, now)
      .run();
    await c.env.DB
      .prepare('UPDATE tickets SET updated_at = ? WHERE id = ?')
      .bind(now, c.req.param('id'))
      .run();

    return created(c, { id });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// DELETE /api/tickets/:id — solo super_admin
tickets.delete('/:id', requireRole('super_admin'), async (c) => {
  try {
    await c.env.DB.prepare('DELETE FROM tickets WHERE id = ?').bind(c.req.param('id')).run();
    return success(c, { deleted: true });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default tickets;

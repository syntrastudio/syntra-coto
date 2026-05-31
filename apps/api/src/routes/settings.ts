import { Hono } from 'hono';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, serverError, notFound, validationError, forbidden } from '../utils/response';
import type { Env } from '../types';

const settings = new Hono<{ Bindings: Env }>();

settings.use('/*', authMiddleware);

// Historial de correos enviados (todos los administradores pueden ver)
settings.get('/notifications-log', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const type = c.req.query('type');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const page = parseInt(c.req.query('page') || '1');
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const bindings: any[] = [];
    if (type) {
      conditions.push('n.type = ?');
      bindings.push(type);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRow = await c.env.DB
      .prepare(`SELECT COUNT(*) AS n FROM notification_log n ${where}`)
      .bind(...bindings)
      .first<{ n: number }>();
    const total = Number(countRow?.n || 0);

    const rows = await c.env.DB
      .prepare(
        `SELECT
           n.id, n.type, n.target_email, n.fee_id, n.payment_id, n.property_id,
           n.resident_id, n.days_offset, n.sent_at, n.status, n.reason,
           p.folio AS payment_folio,
           pr.house_number AS property_house_number,
           pr.street AS property_street,
           f.payment_period AS fee_period
         FROM notification_log n
         LEFT JOIN payments p ON p.id = n.payment_id
         LEFT JOIN properties pr ON pr.id = n.property_id
         LEFT JOIN monthly_fees f ON f.id = n.fee_id
         ${where}
         ORDER BY n.sent_at DESC
         LIMIT ? OFFSET ?`
      )
      .bind(...bindings, limit, offset)
      .all<any>();

    return success(c, {
      data: rows.results || [],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

settings.get('/', async (c) => {
  try {
    const user = c.get('user')!;
    const category = c.req.query('category');

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';

    let sql = 'SELECT * FROM system_settings';
    const conditions: string[] = [];
    const bindings: any[] = [];

    if (!isAdmin) {
      conditions.push('is_public = 1');
    }
    if (category) {
      conditions.push('category = ?');
      bindings.push(category);
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY category, key';

    const result = await c.env.DB.prepare(sql).bind(...bindings).all<any>();
    const parsed = (result.results || []).map((row) => ({
      ...row,
      value: parseValue(row.value, row.data_type),
      is_public: !!row.is_public,
      is_editable: !!row.is_editable,
    }));

    return success(c, parsed);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

settings.get('/:key', async (c) => {
  try {
    const user = c.get('user')!;
    const key = c.req.param('key');
    const row = await c.env.DB
      .prepare('SELECT * FROM system_settings WHERE key = ?')
      .bind(key)
      .first<any>();

    if (!row) return notFound(c, 'Configuración');

    const isAdmin = user.role === 'admin' || user.role === 'super_admin';
    if (!isAdmin && !row.is_public) return forbidden(c);

    return success(c, {
      ...row,
      value: parseValue(row.value, row.data_type),
      is_public: !!row.is_public,
      is_editable: !!row.is_editable,
    });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const updateSchema = z.object({
  value: z.union([z.string(), z.number(), z.boolean(), z.record(z.any()), z.array(z.any())]),
});

settings.put('/:key', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const user = c.get('user')!;
    const key = c.req.param('key');
    const body = await c.req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        c,
        parsed.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }))
      );
    }

    const row = await c.env.DB
      .prepare('SELECT * FROM system_settings WHERE key = ?')
      .bind(key)
      .first<any>();

    if (!row) return notFound(c, 'Configuración');
    if (!row.is_editable) return forbidden(c, 'Esta configuración no es editable');
    // Settings de categoría "general" (sistema) son solo para super_admin
    if (row.category === 'general' && user.role !== 'super_admin') {
      return forbidden(c, 'Solo super_admin puede modificar configuración del sistema');
    }

    const serialized = serializeValue(parsed.data.value, row.data_type);
    const now = Math.floor(Date.now() / 1000);

    await c.env.DB
      .prepare('UPDATE system_settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = ?')
      .bind(serialized, user.id, now, key)
      .run();

    const updated = await c.env.DB
      .prepare('SELECT * FROM system_settings WHERE key = ?')
      .bind(key)
      .first<any>();

    return success(c, {
      ...updated,
      value: parseValue(updated.value, updated.data_type),
      is_public: !!updated.is_public,
      is_editable: !!updated.is_editable,
    });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

function parseValue(raw: string, type: string): any {
  if (raw === null || raw === undefined) return null;
  switch (type) {
    case 'number':
      return Number(raw);
    case 'boolean':
      return raw === 'true' || raw === '1';
    case 'json':
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    default:
      return raw;
  }
}

function serializeValue(value: any, type: string): string {
  switch (type) {
    case 'number':
      return String(Number(value));
    case 'boolean':
      return value ? 'true' : 'false';
    case 'json':
      return JSON.stringify(value);
    default:
      return String(value);
  }
}

export default settings;

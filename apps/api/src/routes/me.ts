/**
 * Endpoints /api/me/* — datos del usuario autenticado (vista de residente).
 *
 * Todos estos endpoints resuelven el `resident_id` a partir del JWT,
 * y luego las propiedades, cuotas, pagos y vehículos asociados.
 */

import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware';
import { success, notFound, serverError, forbidden } from '../utils/response';
import { hashPassword, verifyPassword } from '../utils/hash';
import type { Env } from '../types';

const me = new Hono<{ Bindings: Env }>();
me.use('/*', authMiddleware);

async function getMyResidentId(c: any): Promise<string | null> {
  const userCtx = c.get('user');
  const row = await c.env.DB
    .prepare('SELECT resident_id FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userCtx.id)
    .first<{ resident_id: string | null }>();
  return row?.resident_id ?? null;
}

async function getMyPropertyIds(db: any, residentId: string): Promise<string[]> {
  const rows = await db
    .prepare('SELECT property_id FROM resident_properties WHERE resident_id = ? AND is_active = 1')
    .bind(residentId)
    .all<{ property_id: string }>();
  const ids = new Set<string>((rows.results || []).map((r: { property_id: string }) => r.property_id));
  // Incluir propiedades donde es propietario, copropietario o residente actual
  // (el copropietario no se sincroniza en resident_properties)
  const direct = await db
    .prepare('SELECT id FROM properties WHERE deleted_at IS NULL AND (owner_id = ? OR co_owner_id = ? OR current_resident_id = ?)')
    .bind(residentId, residentId, residentId)
    .all<{ id: string }>();
  for (const r of (direct.results || [])) ids.add(r.id);
  return Array.from(ids);
}

me.get('/profile', async (c) => {
  try {
    const userCtx = c.get('user')!;
    const row = await c.env.DB
      .prepare(
        `SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, u.resident_id,
                r.type as resident_type
         FROM users u
         LEFT JOIN residents r ON u.resident_id = r.id
         WHERE u.id = ? AND u.deleted_at IS NULL`
      )
      .bind(userCtx.id)
      .first<any>();
    if (!row) return notFound(c, 'Usuario');
    return success(c, row);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

me.put('/profile', async (c) => {
  try {
    const userCtx = c.get('user')!;
    const body = await c.req.json<{ phone?: string; full_name?: string }>();
    const updates: string[] = [];
    const values: any[] = [];
    if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone || null); }
    if (body.full_name !== undefined) { updates.push('full_name = ?'); values.push(body.full_name); }
    if (updates.length === 0) return success(c, { updated: false });
    updates.push('updated_at = ?');
    values.push(Math.floor(Date.now() / 1000), userCtx.id);
    await c.env.DB
      .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();
    return success(c, { updated: true });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

me.put('/password', async (c) => {
  try {
    const userCtx = c.get('user')!;
    const body = await c.req.json<{ current_password: string; new_password: string }>();
    if (!body.current_password || !body.new_password) {
      return c.json({ success: false, error: 'Faltan campos' }, 400);
    }
    if (body.new_password.length < 8) {
      return c.json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' }, 400);
    }
    const user = await c.env.DB
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(userCtx.id)
      .first<{ password_hash: string }>();
    if (!user) return notFound(c, 'Usuario');
    const ok = await verifyPassword(body.current_password, user.password_hash);
    if (!ok) return c.json({ success: false, error: 'Contraseña actual incorrecta' }, 400);
    const newHash = await hashPassword(body.new_password);
    await c.env.DB
      .prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
      .bind(newHash, Math.floor(Date.now() / 1000), userCtx.id)
      .run();
    return success(c, { updated: true });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Establecer contraseña obligatoria (primer ingreso / tras reset de admin).
// Solo válido si el usuario trae la bandera must_change_password activa; así esto
// NO sirve para saltarse la verificación de contraseña actual del cambio normal.
me.post('/set-password', async (c) => {
  try {
    const userCtx = c.get('user')!;
    const body = await c.req.json<{ new_password: string }>().catch(() => ({} as any));
    const pwd = String(body.new_password || '');
    if (pwd.length < 8 || !/[A-Z]/.test(pwd) || !/[0-9]/.test(pwd)) {
      return c.json(
        { success: false, error: 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un número' },
        400
      );
    }
    const user = await c.env.DB
      .prepare('SELECT must_change_password FROM users WHERE id = ? AND deleted_at IS NULL')
      .bind(userCtx.id)
      .first<{ must_change_password: number }>();
    if (!user) return notFound(c, 'Usuario');
    if (!user.must_change_password) {
      return c.json(
        { success: false, error: 'Tu contraseña ya está establecida. Cámbiala desde tu perfil.' },
        400
      );
    }
    const newHash = await hashPassword(pwd);
    await c.env.DB
      .prepare('UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = ? WHERE id = ?')
      .bind(newHash, Math.floor(Date.now() / 1000), userCtx.id)
      .run();
    return success(c, { updated: true });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

me.get('/account', async (c) => {
  try {
    const residentId = await getMyResidentId(c);
    if (!residentId) return forbidden(c, 'Tu usuario no está vinculado a un residente');
    const propIds = await getMyPropertyIds(c.env.DB, residentId);
    if (propIds.length === 0) return success(c, { properties: [], total_pending: 0, total_credit: 0 });

    const placeholders = propIds.map(() => '?').join(',');

    const properties = await c.env.DB
      .prepare(
        `SELECT id, house_number, street, status, credit_balance, delinquency_status, months_overdue
         FROM properties WHERE id IN (${placeholders}) AND deleted_at IS NULL`
      )
      .bind(...propIds)
      .all<any>();

    const pendingFees = await c.env.DB
      .prepare(
        `SELECT f.*, p.house_number, p.street
         FROM monthly_fees f
         JOIN properties p ON f.property_id = p.id
         WHERE f.property_id IN (${placeholders})
           AND f.deleted_at IS NULL
           AND f.status IN ('pending', 'partially_paid', 'overdue')
         ORDER BY f.due_date ASC`
      )
      .bind(...propIds)
      .all<any>();

    const totalPending = (pendingFees.results || []).reduce((s: number, f: any) => s + Number(f.balance), 0);
    const totalCredit = (properties.results || []).reduce((s: number, p: any) => s + Number(p.credit_balance || 0), 0);

    return success(c, {
      properties: properties.results || [],
      pending_fees: pendingFees.results || [],
      total_pending: totalPending,
      total_credit: totalCredit,
      net_balance: totalPending - totalCredit,
    });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

me.get('/payments', async (c) => {
  try {
    const residentId = await getMyResidentId(c);
    if (!residentId) return forbidden(c, 'Tu usuario no está vinculado a un residente');
    const propIds = await getMyPropertyIds(c.env.DB, residentId);
    if (propIds.length === 0) return success(c, []);

    const placeholders = propIds.map(() => '?').join(',');
    const result = await c.env.DB
      .prepare(
        `SELECT p.*, pr.house_number, pr.street
         FROM payments p
         JOIN properties pr ON p.property_id = pr.id
         WHERE p.property_id IN (${placeholders}) AND p.deleted_at IS NULL
         ORDER BY p.payment_date DESC, p.created_at DESC
         LIMIT 200`
      )
      .bind(...propIds)
      .all<any>();
    return success(c, result.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

me.get('/vehicles', async (c) => {
  try {
    const residentId = await getMyResidentId(c);
    if (!residentId) return forbidden(c, 'Tu usuario no está vinculado a un residente');
    const propIds = await getMyPropertyIds(c.env.DB, residentId);
    if (propIds.length === 0) return success(c, []);

    const placeholders = propIds.map(() => '?').join(',');
    const result = await c.env.DB
      .prepare(
        `SELECT v.*, pr.house_number, pr.street
         FROM vehicles v
         JOIN properties pr ON v.property_id = pr.id
         WHERE v.property_id IN (${placeholders})
         ORDER BY pr.house_number, v.brand`
      )
      .bind(...propIds)
      .all<any>();
    return success(c, result.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default me;

/**
 * Rutas del módulo de terraza (apartado de área común).
 *
 * Residentes: crean solicitudes para SU casa, ven las suyas, pueden cancelar.
 * Admin/super_admin: ven todas, aprueban, rechazan, registran pago y devolución.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, successWithMessage, created, notFound, serverError, error as errorResp } from '../utils/response';
import {
  listReservations,
  getReservationById,
  getTakenDates,
  createReservation,
  approveReservation,
  rejectReservation,
  markPaid,
  markReturned,
  cancelReservation,
} from '../services/terrace.service';
import type { Env } from '../types';

const terrace = new Hono<{ Bindings: Env }>();
terrace.use('/*', authMiddleware);

const isAdmin = (role?: string) => role === 'admin' || role === 'super_admin' || role === 'supervisor';
const isManager = (role?: string) => role === 'admin' || role === 'super_admin';

// Busca la propiedad del residente logueado
async function residentProperty(db: D1Database, userId: string): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT p.id FROM users u
       JOIN properties p ON (p.current_resident_id = u.resident_id OR p.owner_id = u.resident_id OR p.co_owner_id = u.resident_id)
       WHERE u.id = ? AND p.deleted_at IS NULL AND u.resident_id IS NOT NULL
       LIMIT 1`
    )
    .bind(userId)
    .first<{ id: string }>();
  return row?.id || null;
}

// Info pública (montos configurados) para mostrar el costo al residente
terrace.get('/info', async (c) => {
  try {
    const rows = await c.env.DB
      .prepare("SELECT key, value FROM system_settings WHERE key IN ('terrace_reservation_fee','terrace_deposit_amount','terrace_deposit_return')")
      .all<{ key: string; value: string }>();
    const map: Record<string, number> = {};
    for (const r of rows.results || []) map[r.key] = Number(r.value || 0);
    return success(c, {
      reservation_fee: map['terrace_reservation_fee'] || 0,
      deposit_amount: map['terrace_deposit_amount'] || 0,
      deposit_return: map['terrace_deposit_return'] || 0,
    });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Fechas ocupadas (para el calendario)
terrace.get('/taken-dates', async (c) => {
  try {
    return success(c, await getTakenDates(c.env.DB));
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Listar reservaciones
terrace.get('/', async (c) => {
  try {
    const user = c.get('user')!;
    const status = c.req.query('status');
    if (isAdmin(user.role)) {
      return success(c, await listReservations(c.env.DB, { status, property_id: c.req.query('property_id') }));
    }
    // Residente: solo las que él creó
    return success(c, await listReservations(c.env.DB, { status, requested_by_user_id: user.id }));
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

terrace.get('/:id', async (c) => {
  try {
    const user = c.get('user')!;
    const r = await getReservationById(c.env.DB, c.req.param('id'));
    if (!r) return notFound(c, 'Reservación');
    if (!isAdmin(user.role) && r.requested_by_user_id !== user.id) {
      return errorResp(c, 'No tienes acceso a esta reservación', 403);
    }
    return success(c, r);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Crear solicitud
const createSchema = z.object({
  property_id: z.string().optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha inválida (YYYY-MM-DD)'),
  event_type: z.string().max(120).optional(),
  guests_estimate: z.number().int().min(1).max(1000).optional(),
  resident_notes: z.string().max(1000).optional(),
});

terrace.post('/', zValidator('json', createSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');

    let propertyId = data.property_id;
    if (!isManager(user.role)) {
      // Residente/supervisor: forzar su propia propiedad
      const own = await residentProperty(c.env.DB, user.id);
      if (!own) return errorResp(c, 'No encontramos una casa asociada a tu cuenta. Avisa a la administración.', 400);
      propertyId = own;
    }
    if (!propertyId) return errorResp(c, 'Falta la propiedad', 400);

    // No permitir fechas pasadas
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (data.event_date < todayStr) return errorResp(c, 'No puedes apartar una fecha que ya pasó.', 400);

    const r = await createReservation(
      c.env.DB,
      { ...data, property_id: propertyId, requested_by_user_id: user.id },
      c.env as any
    );
    return created(c, r, 'Solicitud de terraza enviada');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Cancelar (residente dueño o admin)
terrace.post('/:id/cancel', async (c) => {
  try {
    const user = c.get('user')!;
    const r = await getReservationById(c.env.DB, c.req.param('id'));
    if (!r) return notFound(c, 'Reservación');
    if (!isManager(user.role) && r.requested_by_user_id !== user.id) {
      return errorResp(c, 'No puedes cancelar esta reservación', 403);
    }
    return success(c, await cancelReservation(c.env.DB, c.req.param('id'), user.id));
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// --- Acciones de administrador ---

const approveSchema = z.object({
  reservation_fee: z.number().min(0).optional(),
  deposit_amount: z.number().min(0).optional(),
  payment_instructions: z.string().max(1000).optional(),
  admin_notes: z.string().max(1000).optional(),
});
terrace.post('/:id/approve', requireRole('admin', 'super_admin'), zValidator('json', approveSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const r = await approveReservation(c.env.DB, c.req.param('id'), { ...c.req.valid('json'), reviewed_by_user_id: user.id }, c.env as any);
    return successWithMessage(c, r, 'Reservación aprobada');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const rejectSchema = z.object({ reason: z.string().max(1000).optional() });
terrace.post('/:id/reject', requireRole('admin', 'super_admin'), zValidator('json', rejectSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const r = await rejectReservation(c.env.DB, c.req.param('id'), { ...c.req.valid('json'), reviewed_by_user_id: user.id }, c.env as any);
    return successWithMessage(c, r, 'Reservación rechazada');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const paySchema = z.object({
  payment_method: z.enum(['cash', 'transfer', 'card', 'check', 'mercadopago']),
  payment_reference: z.string().max(200).optional(),
  received_by_user_id: z.string().optional(),
});
terrace.post('/:id/mark-paid', requireRole('admin', 'super_admin'), zValidator('json', paySchema), async (c) => {
  try {
    const r = await markPaid(c.env.DB, c.req.param('id'), c.req.valid('json'), c.env as any);
    return successWithMessage(c, r, 'Pago registrado; reservación confirmada');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const returnSchema = z.object({
  returned_amount: z.number().min(0),
  method: z.string().max(120).optional(),
  admin_notes: z.string().max(1000).optional(),
});
terrace.post('/:id/return-deposit', requireRole('admin', 'super_admin'), zValidator('json', returnSchema), async (c) => {
  try {
    const r = await markReturned(c.env.DB, c.req.param('id'), c.req.valid('json'), c.env as any);
    return successWithMessage(c, r, 'Depósito devuelto; reservación completada');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default terrace;

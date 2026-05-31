/**
 * Endpoints /api/mesa/* — gestión de caja por miembro de la mesa directiva.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, serverError, notFound, error as errorResp } from '../utils/response';
import {
  listMesaBalances,
  listMovements,
  getBalance,
  transferBetweenMembers,
  depositToBank,
  adjustBalance,
} from '../services/cash.service';
import type { Env } from '../types';

const mesa = new Hono<{ Bindings: Env }>();

mesa.use('/*', authMiddleware);

// GET /api/mesa/balances — lista todos los miembros con su balance
mesa.get('/balances', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const balances = await listMesaBalances(c.env.DB);
    return success(c, balances);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// GET /api/mesa/balance/:userId — balance + historial de un miembro
mesa.get('/balance/:userId', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const userId = c.req.param('userId');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const page = parseInt(c.req.query('page') || '1');
    const offset = (page - 1) * limit;

    const user = await c.env.DB
      .prepare("SELECT id, full_name, email, role FROM users WHERE id = ? AND deleted_at IS NULL AND role IN ('super_admin','admin')")
      .bind(userId)
      .first<any>();
    if (!user) return notFound(c, 'Miembro');

    const balance = await getBalance(c.env.DB, userId);
    const movements = await listMovements(c.env.DB, userId, limit, offset);
    return success(c, { user, balance, movements });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// POST /api/mesa/deposit — depósito al banco (sale del sistema)
mesa.post(
  '/deposit',
  requireRole('admin', 'super_admin'),
  zValidator(
    'json',
    z.object({
      user_id: z.string().min(1),
      amount: z.number().positive(),
      notes: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const current = c.get('user')!;
      // Admin solo puede depositar su propio dinero; super_admin puede depositar de cualquiera
      if (current.role !== 'super_admin' && body.user_id !== current.id) {
        return errorResp(c, 'Solo puedes registrar tus propios depósitos', 403);
      }
      await depositToBank(c.env.DB, { ...body, created_by: current.id });
      const newBalance = await getBalance(c.env.DB, body.user_id);
      return success(c, { balance: newBalance });
    } catch (e) {
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

// POST /api/mesa/transfer — transferencia entre miembros (uno entrega, otro recibe)
mesa.post(
  '/transfer',
  requireRole('admin', 'super_admin'),
  zValidator(
    'json',
    z.object({
      from_user_id: z.string().min(1),
      to_user_id: z.string().min(1),
      amount: z.number().positive(),
      notes: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const current = c.get('user')!;
      // Quien registra debe ser uno de los dos involucrados, o super_admin
      if (
        current.role !== 'super_admin' &&
        body.from_user_id !== current.id &&
        body.to_user_id !== current.id
      ) {
        return errorResp(c, 'Solo puedes registrar transferencias en las que participas', 403);
      }
      await transferBetweenMembers(c.env.DB, { ...body, created_by: current.id });
      return success(c, { ok: true });
    } catch (e) {
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

// POST /api/mesa/adjustment — ajuste manual (solo super_admin)
mesa.post(
  '/adjustment',
  requireRole('super_admin'),
  zValidator(
    'json',
    z.object({
      user_id: z.string().min(1),
      amount: z.number().refine((v) => v !== 0, 'No puede ser cero'),
      notes: z.string().min(5),
    })
  ),
  async (c) => {
    try {
      const body = c.req.valid('json');
      const current = c.get('user')!;
      await adjustBalance(c.env.DB, { ...body, created_by: current.id });
      return success(c, { ok: true });
    } catch (e) {
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

export default mesa;

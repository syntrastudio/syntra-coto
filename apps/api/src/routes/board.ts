/**
 * Rutas /api/board/* — gestión de la Mesa Directiva.
 *
 * admin/super_admin pueden gestionar; cualquier usuario autenticado puede leer
 * la composición de la mesa (es información pública del fraccionamiento).
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, created, notFound, serverError, deleted, error as errorResp } from '../utils/response';
import {
  listBoardMembers,
  getBoardMember,
  listEligibleUsers,
  addBoardMember,
  updateBoardMember,
  removeBoardMember,
} from '../services/board.service';
import type { Env } from '../types';

const board = new Hono<{ Bindings: Env }>();
board.use('/*', authMiddleware);

const positionEnum = z.enum(['presidente', 'tesorero', 'secretario', 'vocal', 'suplente']);

// Listar la mesa (cualquiera autenticado)
board.get('/', async (c) => {
  try {
    return success(c, await listBoardMembers(c.env.DB));
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Usuarios elegibles para agregar (admin)
board.get('/eligible-users', requireRole('admin', 'super_admin'), async (c) => {
  try {
    return success(c, await listEligibleUsers(c.env.DB));
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

board.get('/:id', async (c) => {
  try {
    const m = await getBoardMember(c.env.DB, c.req.param('id'));
    if (!m) return notFound(c, 'Miembro');
    return success(c, m);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const createSchema = z.object({
  user_id: z.string().min(1),
  position: positionEnum,
  can_approve_gateway: z.boolean().optional(),
  term_start: z.number().int().nullable().optional(),
  term_end: z.number().int().nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

board.post('/', requireRole('admin', 'super_admin'), zValidator('json', createSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const m = await addBoardMember(c.env.DB, { ...data, created_by: user.id });
    return created(c, m, 'Miembro agregado a la mesa');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const updateSchema = z.object({
  position: positionEnum.optional(),
  can_approve_gateway: z.boolean().optional(),
  term_start: z.number().int().nullable().optional(),
  term_end: z.number().int().nullable().optional(),
  is_active: z.boolean().optional(),
  notes: z.string().max(500).nullable().optional(),
});

board.put('/:id', requireRole('admin', 'super_admin'), zValidator('json', updateSchema), async (c) => {
  try {
    const m = await updateBoardMember(c.env.DB, c.req.param('id'), c.req.valid('json'));
    return success(c, m);
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

board.delete('/:id', requireRole('admin', 'super_admin'), async (c) => {
  try {
    await removeBoardMember(c.env.DB, c.req.param('id'));
    return deleted(c, 'Miembro removido de la mesa');
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default board;

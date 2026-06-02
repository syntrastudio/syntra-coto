/**
 * Rutas /api/gateway/* — configuración de la pasarela de pago (Mercado Pago)
 * con firma múltiple de la mesa directiva.
 *
 *   GET  /status                 estado (cuenta activa enmascarada + propuesta pendiente)
 *   GET  /proposals              historial de propuestas (admin)
 *   POST /propose                proponer nueva cuenta (admin/super_admin)
 *   POST /proposals/:id/decide   aprobar/rechazar (solo miembros de la mesa)
 *   POST /proposals/:id/cancel   cancelar propuesta pendiente (proponente o admin)
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, serverError, forbidden, error as errorResp } from '../utils/response';
import { isActiveApprover } from '../services/board.service';
import {
  getStatus,
  listProposals,
  proposeChange,
  decideProposal,
  cancelProposal,
} from '../services/gateway.service';
import type { Env } from '../types';

const gateway = new Hono<{ Bindings: Env }>();
gateway.use('/*', authMiddleware);

const isAdmin = (role?: string) => role === 'admin' || role === 'super_admin';

// Estado — admin o miembro de la mesa (sin secretos).
gateway.get('/status', async (c) => {
  try {
    const user = c.get('user')!;
    if (!isAdmin(user.role)) {
      const member = await isActiveApprover(c.env.DB, user.id);
      if (!member) return forbidden(c, 'No tienes acceso a la configuración de pagos.');
    }
    return success(c, await getStatus(c.env.DB, c.env));
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

gateway.get('/proposals', requireRole('admin', 'super_admin'), async (c) => {
  try {
    return success(c, await listProposals(c.env.DB));
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const proposeSchema = z.object({
  access_token: z.string().min(10, 'Access token inválido'),
  public_key: z.string().max(200).optional(),
  webhook_secret: z.string().max(200).optional(),
  proposer_note: z.string().max(500).optional(),
});

gateway.post('/propose', requireRole('admin', 'super_admin'), zValidator('json', proposeSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const data = c.req.valid('json');
    const status = await proposeChange(c.env.DB, c.env, { ...data, proposed_by: user.id });
    return success(c, status, 201);
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

const decideSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  comment: z.string().max(500).optional(),
});

gateway.post('/proposals/:id/decide', zValidator('json', decideSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const { decision, comment } = c.req.valid('json');
    const status = await decideProposal(c.env.DB, c.env, c.req.param('id'), user.id, decision, comment);
    return success(c, status);
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

gateway.post('/proposals/:id/cancel', async (c) => {
  try {
    const user = c.get('user')!;
    const status = await cancelProposal(c.env.DB, c.env, c.req.param('id'), user.id, isAdmin(user.role));
    return success(c, status);
  } catch (e: any) {
    if (e?.statusCode) return errorResp(c, e.message, e.statusCode);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default gateway;

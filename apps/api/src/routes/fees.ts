/**
 * Rutas de cuotas mensuales
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { monthlyFeeListQuerySchema, generateFeesSchema, idParamSchema } from '../utils/validation';
import { success, created, notFound, paginated, calculatePagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { listMonthlyFees, getMonthlyFeeById, generateMonthlyFees, getPropertyFees } from '../services/fees.service';

const fees = new Hono();

fees.get('/', authMiddleware, zValidator('query', monthlyFeeListQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.env.DB as D1Database;
  const { fees: data, total } = await listMonthlyFees(db, query);
  const pagination = calculatePagination(query.page || 1, query.limit || 20, total);
  return paginated(c, data, pagination);
});

fees.get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;
  const fee = await getMonthlyFeeById(db, id);
  if (!fee) return notFound(c, 'Cuota');
  return success(c, fee);
});

fees.post('/generate', authMiddleware, requireAdmin(), zValidator('json', generateFeesSchema), async (c) => {
  const data = c.req.valid('json');
  const db = c.env.DB as D1Database;
  const result = await generateMonthlyFees(db, data.payment_period, data.base_amount, data.discount_percentage, data.discount_days);
  return created(c, result, `Cuotas generadas: ${result.generated}, omitidas: ${result.skipped}`);
});

fees.get('/property/:propertyId', authMiddleware, async (c) => {
  const propertyId = c.req.param('propertyId');
  const db = c.env.DB as D1Database;
  const propertyFees = await getPropertyFees(db, propertyId);
  return success(c, propertyFees);
});

export default fees;

// Made with Bob

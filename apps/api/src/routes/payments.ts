/**
 * Rutas de pagos
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { paymentListQuerySchema, paymentCreateSchema, annualPaymentSchema, idParamSchema } from '../utils/validation';
import { success, created, notFound, paginated, calculatePagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { listPayments, getPaymentById, createPayment, getPropertyPayments, payAnnual } from '../services/payments.service';

const payments = new Hono();

payments.get('/', authMiddleware, zValidator('query', paymentListQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.env.DB as D1Database;
  const { payments: data, total } = await listPayments(db, query);
  const pagination = calculatePagination(query.page || 1, query.limit || 20, total);
  return paginated(c, data, pagination);
});

payments.get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;
  const payment = await getPaymentById(db, id);
  if (!payment) return notFound(c, 'Pago');
  return success(c, payment);
});

payments.post('/', authMiddleware, requireAdmin(), zValidator('json', paymentCreateSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const payment = await createPayment(db, { ...data, created_by: user?.id }, c.env);
  return created(c, payment, 'Pago registrado exitosamente');
});

payments.post('/annual', authMiddleware, requireAdmin(), zValidator('json', annualPaymentSchema), async (c) => {
  const data = c.req.valid('json');
  const user = c.get('user');
  const db = c.env.DB as D1Database;
  const result = await payAnnual(db, { ...data, created_by: user?.id }, c.env);
  return created(c, result, `Pago anual registrado (${result.fees_paid} cuotas liquidadas, bonificación ${result.bonus_months} meses)`);
});

payments.get('/property/:propertyId', authMiddleware, async (c) => {
  const propertyId = c.req.param('propertyId');
  const db = c.env.DB as D1Database;
  const propertyPayments = await getPropertyPayments(db, propertyId);
  return success(c, propertyPayments);
});

export default payments;

// Made with Bob

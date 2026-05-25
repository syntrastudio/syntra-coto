/**
 * Rutas de residentes
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { residentListQuerySchema, residentCreateSchema, residentUpdateSchema, idParamSchema } from '../utils/validation';
import { success, created, updated, deleted, notFound, paginated, calculatePagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { listResidents, getResidentById, createResident, updateResident, deleteResident } from '../services/residents.service';

const residents = new Hono();

residents.get('/', authMiddleware, zValidator('query', residentListQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.env.DB as D1Database;
  const { residents: data, total } = await listResidents(db, query);
  const pagination = calculatePagination(query.page || 1, query.limit || 20, total);
  return paginated(c, data, pagination);
});

residents.get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;
  const resident = await getResidentById(db, id);
  if (!resident) return notFound(c, 'Residente');
  return success(c, resident);
});

residents.post('/', authMiddleware, requireAdmin(), zValidator('json', residentCreateSchema), async (c) => {
  const data = c.req.valid('json');
  console.log('🟢 Route - POST /api/residents - Datos validados:', JSON.stringify(data));
  const db = c.env.DB as D1Database;
  const resident = await createResident(db, data);
  console.log('✅ Route - Residente creado, enviando respuesta');
  return created(c, resident, 'Residente creado exitosamente');
});

residents.put('/:id', authMiddleware, requireAdmin(), zValidator('param', idParamSchema), zValidator('json', residentUpdateSchema), async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = c.env.DB as D1Database;
  const resident = await updateResident(db, id, data);
  return updated(c, resident, 'Residente actualizado exitosamente');
});

residents.delete('/:id', authMiddleware, requireAdmin(), zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;
  await deleteResident(db, id);
  return deleted(c, 'Residente eliminado exitosamente');
});

export default residents;

// Made with Bob

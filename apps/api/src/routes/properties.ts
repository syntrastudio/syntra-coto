/**
 * Rutas de propiedades
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { propertyListQuerySchema, propertyCreateSchema, propertyUpdateSchema, idParamSchema } from '../utils/validation';
import { success, created, updated, notFound, paginated, calculatePagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { listProperties, getPropertyById, createProperty, updateProperty, getPropertyResidents } from '../services/properties.service';

const properties = new Hono();

/**
 * GET /api/properties
 * Lista todas las propiedades con paginación y filtros
 */
properties.get('/', authMiddleware, zValidator('query', propertyListQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.env.DB as D1Database;

  const { properties: data, total } = await listProperties(db, query);
  const pagination = calculatePagination(query.page || 1, query.limit || 20, total);

  return paginated(c, data, pagination);
});

/**
 * GET /api/properties/:id
 * Obtiene una propiedad específica
 */
properties.get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;

  const property = await getPropertyById(db, id);

  if (!property) {
    return notFound(c, 'Propiedad');
  }

  return success(c, property);
});

/**
 * POST /api/properties
 * Crea una nueva propiedad (solo admins)
 */
properties.post('/', authMiddleware, requireAdmin(), zValidator('json', propertyCreateSchema), async (c) => {
  const data = c.req.valid('json');
  console.log('🟢 Route - POST /api/properties - Datos validados:', JSON.stringify(data));
  const db = c.env.DB as D1Database;

  const property = await createProperty(db, data);

  console.log('✅ Route - Propiedad creada, enviando respuesta');
  return created(c, property, 'Propiedad creada exitosamente');
});

/**
 * PUT /api/properties/:id
 * Actualiza una propiedad (solo admins)
 */
properties.put('/:id', authMiddleware, requireAdmin(), zValidator('param', idParamSchema), zValidator('json', propertyUpdateSchema), async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = c.env.DB as D1Database;

  const property = await updateProperty(db, id, data);

  return updated(c, property, 'Propiedad actualizada exitosamente');
});

/**
 * GET /api/properties/:id/residents
 * Obtiene los residentes de una propiedad
 */
properties.get('/:id/residents', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;

  const residents = await getPropertyResidents(db, id);

  return success(c, residents);
});

export default properties;

// Made with Bob

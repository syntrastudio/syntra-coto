/**
 * Rutas de vehículos
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { vehicleListQuerySchema, vehicleCreateSchema, vehicleUpdateSchema, idParamSchema } from '../utils/validation';
import { success, created, updated, deleted, notFound, paginated, calculatePagination } from '../utils/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import { 
  listVehicles, 
  getVehicleById, 
  getVehiclesByProperty,
  createVehicle, 
  updateVehicle, 
  deleteVehicle,
  countActiveVehiclesByProperty
} from '../services/vehicles.service';

const vehicles = new Hono();

// Listar todos los vehículos con filtros
vehicles.get('/', authMiddleware, zValidator('query', vehicleListQuerySchema), async (c) => {
  const query = c.req.valid('query');
  const db = c.env.DB as D1Database;
  const { vehicles: data, total } = await listVehicles(db, query);
  const pagination = calculatePagination(query.page || 1, query.limit || 20, total);
  return paginated(c, data, pagination);
});

// ----------------------------------------------------------------------------
// Catálogo de marcas/modelos (API pública NHTSA, gratis, sin key) con caché en KV
// ----------------------------------------------------------------------------
async function cachedFetch(c: any, cacheKey: string, url: string, ttlSeconds: number): Promise<any[]> {
  try {
    const cached = await c.env.CACHE?.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}
  const resp = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!resp.ok) return [];
  const data = await resp.json<any>();
  const results = data?.Results || [];
  try {
    await c.env.CACHE?.put(cacheKey, JSON.stringify(results), { expirationTtl: ttlSeconds });
  } catch {}
  return results;
}

// GET /api/vehicles/makes?type=car|motorcycle  → lista de marcas ordenada
vehicles.get('/makes', authMiddleware, async (c) => {
  const type = c.req.query('type') === 'motorcycle' ? 'motorcycle' : 'car';
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetMakesForVehicleType/${type}?format=json`;
  const results = await cachedFetch(c, `nhtsa:makes:${type}`, url, 60 * 60 * 24 * 30);
  const makes = Array.from(new Set(results.map((r: any) => String(r.MakeName || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  return success(c, makes);
});

// GET /api/vehicles/models/:make  → modelos de una marca
vehicles.get('/models/:make', authMiddleware, async (c) => {
  const make = decodeURIComponent(c.req.param('make') || '').trim();
  if (!make) return success(c, []);
  const url = `https://vpic.nhtsa.dot.gov/api/vehicles/GetModelsForMake/${encodeURIComponent(make)}?format=json`;
  const results = await cachedFetch(c, `nhtsa:models:${make.toLowerCase()}`, url, 60 * 60 * 24 * 30);
  const models = Array.from(new Set(results.map((r: any) => String(r.Model_Name || '').trim()).filter(Boolean)))
    .sort((a, b) => a.localeCompare(b));
  return success(c, models);
});

// Obtener vehículos de una propiedad específica
vehicles.get('/property/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;
  const vehiclesList = await getVehiclesByProperty(db, id);
  const activeCount = await countActiveVehiclesByProperty(db, id);
  return success(c, {
    vehicles: vehiclesList,
    active_count: activeCount,
    max_vehicles: 4,
    can_add_more: activeCount < 4
  });
});

// Obtener un vehículo por ID
vehicles.get('/:id', authMiddleware, zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;
  const vehicle = await getVehicleById(db, id);
  if (!vehicle) return notFound(c, 'Vehículo');
  return success(c, vehicle);
});

// Crear un nuevo vehículo
vehicles.post('/', authMiddleware, requireAdmin(), zValidator('json', vehicleCreateSchema), async (c) => {
  const data = c.req.valid('json');
  const db = c.env.DB as D1Database;
  const vehicle = await createVehicle(db, data);
  return created(c, vehicle, 'Vehículo registrado exitosamente');
});

// Actualizar un vehículo
vehicles.put('/:id', authMiddleware, requireAdmin(), zValidator('param', idParamSchema), zValidator('json', vehicleUpdateSchema), async (c) => {
  const { id } = c.req.valid('param');
  const data = c.req.valid('json');
  const db = c.env.DB as D1Database;
  const vehicle = await updateVehicle(db, id, data);
  return updated(c, vehicle, 'Vehículo actualizado exitosamente');
});

// Eliminar un vehículo
vehicles.delete('/:id', authMiddleware, requireAdmin(), zValidator('param', idParamSchema), async (c) => {
  const { id } = c.req.valid('param');
  const db = c.env.DB as D1Database;
  await deleteVehicle(db, id);
  return deleted(c, 'Vehículo eliminado exitosamente');
});

export default vehicles;

// Made with Bob
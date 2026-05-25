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
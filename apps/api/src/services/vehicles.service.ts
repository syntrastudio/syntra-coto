/**
 * Servicio de vehículos
 */

import { throwNotFound, throwApiError } from '../middleware/error.middleware';
import { calculateOffset } from '../utils/response';
import type { Vehicle, VehicleWithProperty, VehicleCreateInput, VehicleUpdateInput, PaginationParams } from '../types';

/**
 * Lista vehículos con paginación y filtros
 */
export async function listVehicles(
  db: D1Database,
  params: PaginationParams & {
    property_id?: string;
    status?: 'activo' | 'inactivo';
    search?: string;
  }
): Promise<{ vehicles: VehicleWithProperty[]; total: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = calculateOffset(page, limit);

  let whereConditions = ['1=1'];
  const bindings: any[] = [];

  if (params.property_id) {
    whereConditions.push('v.property_id = ?');
    bindings.push(params.property_id);
  }

  if (params.status) {
    whereConditions.push('v.status = ?');
    bindings.push(params.status);
  }

  if (params.search) {
    whereConditions.push('(v.license_plate LIKE ? OR v.brand LIKE ? OR v.model LIKE ?)');
    const searchTerm = `%${params.search}%`;
    bindings.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM vehicles v WHERE ${whereClause}`)
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const sortBy = params.sort_by || 'created_at';
  const sortOrder = params.sort_order || 'desc';

  const vehicles = await db
    .prepare(
      `SELECT 
        v.*,
        p.id as property_id,
        p.house_number,
        p.street
      FROM vehicles v
      LEFT JOIN properties p ON v.property_id = p.id AND p.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY v.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`
    )
    .bind(...bindings, limit, offset)
    .all<any>();

  const vehiclesWithProperty: VehicleWithProperty[] = (vehicles.results || []).map((row) => ({
    id: row.id,
    property_id: row.property_id,
    vehicle_type: row.vehicle_type,
    brand: row.brand,
    model: row.model,
    year: row.year,
    license_plate: row.license_plate,
    color: row.color,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    property: row.house_number ? {
      id: row.property_id,
      house_number: row.house_number,
      street: row.street
    } : undefined
  }));

  return { vehicles: vehiclesWithProperty, total };
}

/**
 * Obtiene vehículos de una propiedad específica
 */
export async function getVehiclesByProperty(db: D1Database, propertyId: string): Promise<Vehicle[]> {
  const vehicles = await db
    .prepare('SELECT * FROM vehicles WHERE property_id = ? ORDER BY created_at DESC')
    .bind(propertyId)
    .all<Vehicle>();

  return vehicles.results || [];
}

/**
 * Obtiene un vehículo por ID
 */
export async function getVehicleById(db: D1Database, vehicleId: string): Promise<VehicleWithProperty | null> {
  const vehicle = await db
    .prepare(
      `SELECT 
        v.*,
        p.id as property_id,
        p.house_number,
        p.street
      FROM vehicles v
      LEFT JOIN properties p ON v.property_id = p.id AND p.deleted_at IS NULL
      WHERE v.id = ?`
    )
    .bind(vehicleId)
    .first<any>();

  if (!vehicle) return null;

  return {
    id: vehicle.id,
    property_id: vehicle.property_id,
    vehicle_type: vehicle.vehicle_type,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    license_plate: vehicle.license_plate,
    color: vehicle.color,
    status: vehicle.status,
    created_at: vehicle.created_at,
    updated_at: vehicle.updated_at,
    property: vehicle.house_number ? {
      id: vehicle.property_id,
      house_number: vehicle.house_number,
      street: vehicle.street
    } : undefined
  };
}

/**
 * Crea un nuevo vehículo
 */
export async function createVehicle(db: D1Database, data: VehicleCreateInput): Promise<Vehicle> {
  // Verificar que la propiedad exista
  const property = await db
    .prepare('SELECT id FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(data.property_id)
    .first();

  if (!property) {
    throwNotFound('Propiedad');
  }

  // Validar año
  const currentYear = new Date().getFullYear();
  if (data.year < 1900 || data.year > currentYear + 1) {
    throwApiError(`El año debe estar entre 1900 y ${currentYear + 1}`, 400);
  }

  // Normalizar placas a mayúsculas
  const normalizedPlate = data.license_plate.toUpperCase().trim();

  // Verificar que las placas no estén en uso
  const existingVehicle = await db
    .prepare('SELECT id FROM vehicles WHERE license_plate = ?')
    .bind(normalizedPlate)
    .first();

  if (existingVehicle) {
    throwApiError('Las placas ya están registradas en otro vehículo', 400);
  }

  // Verificar límite de 4 vehículos activos por propiedad
  const activeVehiclesCount = await db
    .prepare('SELECT COUNT(*) as count FROM vehicles WHERE property_id = ? AND status = ?')
    .bind(data.property_id, 'activo')
    .first<{ count: number }>();

  if (activeVehiclesCount && activeVehiclesCount.count >= 4) {
    throwApiError('La propiedad ya tiene el máximo de 4 vehículos activos', 400);
  }

  const vehicleId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO vehicles (
        id, property_id, vehicle_type, brand, model, year, license_plate, color, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      vehicleId,
      data.property_id,
      data.vehicle_type || 'automovil',
      data.brand,
      data.model,
      data.year,
      normalizedPlate,
      data.color,
      data.status || 'activo',
      now,
      now
    )
    .run();

  const vehicle = await db
    .prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first<Vehicle>();

  if (!vehicle) throwApiError('Error al crear vehículo', 500);

  return vehicle;
}

/**
 * Actualiza un vehículo
 */
export async function updateVehicle(db: D1Database, vehicleId: string, data: VehicleUpdateInput): Promise<Vehicle> {
  const vehicle = await db
    .prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first<Vehicle>();

  if (!vehicle) throwNotFound('Vehículo');

  // Si se actualiza el año, validar
  if (data.year !== undefined) {
    const currentYear = new Date().getFullYear();
    if (data.year < 1900 || data.year > currentYear + 1) {
      throwApiError(`El año debe estar entre 1900 y ${currentYear + 1}`, 400);
    }
  }

  // Si se actualizan las placas, verificar que no estén en uso
  if (data.license_plate) {
    const normalizedPlate = data.license_plate.toUpperCase().trim();
    
    if (normalizedPlate !== vehicle.license_plate) {
      const existingVehicle = await db
        .prepare('SELECT id FROM vehicles WHERE license_plate = ? AND id != ?')
        .bind(normalizedPlate, vehicleId)
        .first();

      if (existingVehicle) {
        throwApiError('Las placas ya están registradas en otro vehículo', 400);
      }
      
      data.license_plate = normalizedPlate;
    }
  }

  // Si se cambia el estado a activo, verificar límite de 4 vehículos
  if (data.status === 'activo' && vehicle.status !== 'activo') {
    const activeVehiclesCount = await db
      .prepare('SELECT COUNT(*) as count FROM vehicles WHERE property_id = ? AND status = ? AND id != ?')
      .bind(vehicle.property_id, 'activo', vehicleId)
      .first<{ count: number }>();

    if (activeVehiclesCount && activeVehiclesCount.count >= 4) {
      throwApiError('La propiedad ya tiene el máximo de 4 vehículos activos', 400);
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const updates: string[] = [];
  const values: any[] = [];

  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined) {
      updates.push(`${key} = ?`);
      values.push(value);
    }
  });

  updates.push('updated_at = ?');
  values.push(now, vehicleId);

  await db
    .prepare(`UPDATE vehicles SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await db
    .prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first<Vehicle>();

  if (!updated) throwApiError('Error al actualizar vehículo', 500);

  return updated;
}

/**
 * Elimina un vehículo
 */
export async function deleteVehicle(db: D1Database, vehicleId: string): Promise<void> {
  const vehicle = await db
    .prepare('SELECT * FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .first();

  if (!vehicle) throwNotFound('Vehículo');

  await db
    .prepare('DELETE FROM vehicles WHERE id = ?')
    .bind(vehicleId)
    .run();
}

/**
 * Cuenta vehículos activos de una propiedad
 */
export async function countActiveVehiclesByProperty(db: D1Database, propertyId: string): Promise<number> {
  const result = await db
    .prepare('SELECT COUNT(*) as count FROM vehicles WHERE property_id = ? AND status = ?')
    .bind(propertyId, 'activo')
    .first<{ count: number }>();

  return result?.count || 0;
}

// Made with Bob
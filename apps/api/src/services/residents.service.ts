/**
 * Servicio de residentes
 */

import { throwNotFound, throwApiError } from '../middleware/error.middleware';
import { calculateOffset } from '../utils/response';
import { validateEmail, validatePhone } from '../utils/validation';
import type { Resident, ResidentWithDetails, ResidentCreateInput, ResidentUpdateInput, PaginationParams } from '../types';

/**
 * Lista residentes con paginación y filtros
 */
export async function listResidents(
  db: D1Database,
  params: PaginationParams & {
    type?: 'propietario' | 'inquilino';
    status?: 'activo' | 'inactivo';
    search?: string;
  }
): Promise<{ residents: ResidentWithDetails[]; total: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = calculateOffset(page, limit);

  let whereConditions = ['r.deleted_at IS NULL'];
  const bindings: any[] = [];

  if (params.type) {
    whereConditions.push('r.type = ?');
    bindings.push(params.type);
  }

  if (params.status) {
    whereConditions.push('r.status = ?');
    bindings.push(params.status);
  }

  if (params.search) {
    whereConditions.push('(r.full_name LIKE ? OR r.email LIKE ? OR r.phone LIKE ?)');
    const searchTerm = `%${params.search}%`;
    bindings.push(searchTerm, searchTerm, searchTerm);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM residents r WHERE ${whereClause}`)
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const sortBy = params.sort_by || 'created_at';
  const sortOrder = params.sort_order || 'desc';

  const residents = await db
    .prepare(
      `SELECT r.*
      FROM residents r
      WHERE ${whereClause}
      ORDER BY r.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`
    )
    .bind(...bindings, limit, offset)
    .all<Resident>();

  // Obtener propiedades asociadas para cada residente
  const residentsWithProperties: ResidentWithDetails[] = [];
  
  for (const resident of residents.results || []) {
    const properties = await db
      .prepare(
        `SELECT 
          p.id, p.house_number, p.street,
          rp.role, rp.start_date, rp.end_date
        FROM resident_properties rp
        JOIN properties p ON rp.property_id = p.id AND p.deleted_at IS NULL
        WHERE rp.resident_id = ? AND rp.is_active = 1
        ORDER BY rp.start_date DESC`
      )
      .bind(resident.id)
      .all<any>();

    residentsWithProperties.push({
      ...resident,
      properties: properties.results || []
    });
  }

  return { residents: residentsWithProperties, total };
}

/**
 * Obtiene un residente por ID
 */
export async function getResidentById(db: D1Database, residentId: string): Promise<ResidentWithDetails | null> {
  const resident = await db
    .prepare('SELECT * FROM residents WHERE id = ? AND deleted_at IS NULL')
    .bind(residentId)
    .first<Resident>();

  if (!resident) return null;

  // Obtener propiedades asociadas
  const properties = await db
    .prepare(
      `SELECT 
        p.id, p.house_number, p.street,
        rp.role, rp.start_date, rp.end_date
      FROM resident_properties rp
      JOIN properties p ON rp.property_id = p.id AND p.deleted_at IS NULL
      WHERE rp.resident_id = ? AND rp.is_active = 1
      ORDER BY rp.start_date DESC`
    )
    .bind(residentId)
    .all<any>();

  return {
    ...resident,
    properties: properties.results || []
  };
}

/**
 * Crea un nuevo residente
 */
export async function createResident(db: D1Database, data: ResidentCreateInput): Promise<Resident> {
  console.log('🔵 Service - Datos recibidos para crear residente:', JSON.stringify(data));
  
  // Validar email
  if (!validateEmail(data.email)) {
    throwApiError('Email inválido', 400);
  }

  // Validar teléfono (formato mexicano: 10 dígitos)
  if (!validatePhone(data.phone)) {
    throwApiError('Teléfono inválido. Debe tener 10 dígitos', 400);
  }

  // Verificar que el email no esté en uso
  const existingResident = await db
    .prepare('SELECT id FROM residents WHERE email = ? AND deleted_at IS NULL')
    .bind(data.email)
    .first();

  if (existingResident) {
    throwApiError('El email ya está registrado', 400);
  }

  // Validar que start_date no sea futuro
  const now = Math.floor(Date.now() / 1000);
  console.log('🔵 Service - Validando fecha:', { start_date: data.start_date, now, isFuture: data.start_date > now });
  
  if (data.start_date > now) {
    throwApiError('La fecha de inicio no puede ser futura', 400);
  }

  const residentId = crypto.randomUUID();
  console.log('🔵 Service - Insertando en BD con ID:', residentId);

  await db
    .prepare(
      `INSERT INTO residents (
        id, full_name, phone, email, type, start_date, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      residentId,
      data.full_name,
      data.phone,
      data.email,
      data.type,
      data.start_date,
      data.status || 'activo',
      now,
      now
    )
    .run();

  console.log('✅ Service - Residente insertado, recuperando datos...');

  const resident = await db
    .prepare('SELECT * FROM residents WHERE id = ?')
    .bind(residentId)
    .first<Resident>();

  if (!resident) throwApiError('Error al crear residente', 500);

  console.log('✅ Service - Residente creado exitosamente:', resident.id);
  return resident;
}

/**
 * Actualiza un residente
 */
export async function updateResident(db: D1Database, residentId: string, data: ResidentUpdateInput): Promise<Resident> {
  const resident = await db
    .prepare('SELECT * FROM residents WHERE id = ? AND deleted_at IS NULL')
    .bind(residentId)
    .first<Resident>();

  if (!resident) throwNotFound('Residente');

  // Si se actualiza el email, verificar que no esté en uso
  if (data.email && data.email !== resident.email) {
    if (!validateEmail(data.email)) {
      throwApiError('Email inválido', 400);
    }

    const existingResident = await db
      .prepare('SELECT id FROM residents WHERE email = ? AND id != ? AND deleted_at IS NULL')
      .bind(data.email, residentId)
      .first();

    if (existingResident) {
      throwApiError('El email ya está registrado', 400);
    }
  }

  // Si se actualiza el teléfono, validar formato
  if (data.phone && !validatePhone(data.phone)) {
    throwApiError('Teléfono inválido. Debe tener 10 dígitos', 400);
  }

  // Si se actualiza start_date, validar que no sea futuro
  if (data.start_date) {
    const now = Math.floor(Date.now() / 1000);
    if (data.start_date > now) {
      throwApiError('La fecha de inicio no puede ser futura', 400);
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
  values.push(now, residentId);

  await db
    .prepare(`UPDATE residents SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updated = await db
    .prepare('SELECT * FROM residents WHERE id = ?')
    .bind(residentId)
    .first<Resident>();

  if (!updated) throwApiError('Error al actualizar residente', 500);

  return updated;
}

/**
 * Elimina un residente (soft delete)
 */
export async function deleteResident(db: D1Database, residentId: string): Promise<void> {
  const resident = await db
    .prepare('SELECT * FROM residents WHERE id = ? AND deleted_at IS NULL')
    .bind(residentId)
    .first();

  if (!resident) throwNotFound('Residente');

  // Verificar que no tenga propiedades activas asociadas
  const activeProperties = await db
    .prepare('SELECT COUNT(*) as count FROM resident_properties WHERE resident_id = ? AND is_active = 1')
    .bind(residentId)
    .first<{ count: number }>();

  if (activeProperties && activeProperties.count > 0) {
    throwApiError('No se puede eliminar el residente porque tiene propiedades activas asociadas', 400);
  }

  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE residents SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, residentId)
    .run();
}

/**
 * Asocia un residente a una propiedad
 */
export async function associateResidentToProperty(
  db: D1Database,
  residentId: string,
  propertyId: string,
  role: 'propietario' | 'residente_actual',
  startDate: number
): Promise<void> {
  // Verificar que el residente exista
  const resident = await db
    .prepare('SELECT id FROM residents WHERE id = ? AND deleted_at IS NULL')
    .bind(residentId)
    .first();

  if (!resident) throwNotFound('Residente');

  // Verificar que la propiedad exista
  const property = await db
    .prepare('SELECT id FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(propertyId)
    .first();

  if (!property) throwNotFound('Propiedad');

  // Verificar que no exista ya la asociación
  const existing = await db
    .prepare('SELECT id FROM resident_properties WHERE resident_id = ? AND property_id = ? AND role = ?')
    .bind(residentId, propertyId, role)
    .first();

  if (existing) {
    throwApiError('La asociación ya existe', 400);
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO resident_properties (
        id, resident_id, property_id, role, start_date, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 1, ?, ?)`
    )
    .bind(id, residentId, propertyId, role, startDate, now, now)
    .run();
}

/**
 * Desasocia un residente de una propiedad
 */
export async function disassociateResidentFromProperty(
  db: D1Database,
  residentId: string,
  propertyId: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `UPDATE resident_properties 
      SET is_active = 0, end_date = ?, updated_at = ? 
      WHERE resident_id = ? AND property_id = ? AND is_active = 1`
    )
    .bind(now, now, residentId, propertyId)
    .run();
}

// Made with Bob

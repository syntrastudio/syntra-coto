/**
 * Servicio de propiedades
 */

import { throwNotFound, throwApiError } from '../middleware/error.middleware';
import { calculateOffset } from '../utils/response';
import type {
  Property,
  PropertyWithRelations,
  PropertyCreateInput,
  PropertyUpdateInput,
  PaginationParams,
} from '../types';

/**
 * Lista todas las propiedades con paginación y filtros
 */
export async function listProperties(
  db: D1Database,
  params: PaginationParams & {
    status?: string;
    search?: string;
  }
): Promise<{ properties: PropertyWithRelations[]; total: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = calculateOffset(page, limit);

  // Construir query con filtros
  let whereConditions = ['p.deleted_at IS NULL'];
  const bindings: any[] = [];

  if (params.status) {
    whereConditions.push('p.status = ?');
    bindings.push(params.status);
  }

  if (params.search) {
    whereConditions.push('(p.house_number LIKE ? OR p.street LIKE ?)');
    const searchTerm = `%${params.search}%`;
    bindings.push(searchTerm, searchTerm);
  }

  const whereClause = whereConditions.join(' AND ');

  // Obtener total
  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM properties p WHERE ${whereClause}`)
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  // Obtener propiedades con información de owner y current_resident
  const sortBy = params.sort_by || 'house_number';
  const sortOrder = params.sort_order || 'asc';

  const properties = await db
    .prepare(
      `SELECT
        p.*,
        r_owner.id as owner_resident_id,
        r_owner.full_name as owner_full_name,
        r_owner.email as owner_email,
        r_owner.phone as owner_phone,
        r_current.id as current_resident_resident_id,
        r_current.full_name as current_resident_full_name,
        r_current.email as current_resident_email,
        r_current.phone as current_resident_phone,
        r_coowner.id as co_owner_resident_id,
        r_coowner.full_name as co_owner_full_name,
        r_coowner.email as co_owner_email,
        r_coowner.phone as co_owner_phone,
        COALESCE((SELECT SUM(balance) FROM monthly_fees mf
                  WHERE mf.property_id = p.id AND mf.deleted_at IS NULL
                    AND mf.status IN ('pending','partially_paid','overdue')), 0) AS total_owed,
        (SELECT COUNT(*) FROM monthly_fees mf
         WHERE mf.property_id = p.id AND mf.deleted_at IS NULL
           AND mf.status IN ('pending','partially_paid','overdue')) AS pending_fees_count
      FROM properties p
      LEFT JOIN residents r_owner ON p.owner_id = r_owner.id AND r_owner.deleted_at IS NULL
      LEFT JOIN residents r_current ON p.current_resident_id = r_current.id AND r_current.deleted_at IS NULL
      LEFT JOIN residents r_coowner ON p.co_owner_id = r_coowner.id AND r_coowner.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?`
    )
    .bind(...bindings, limit, offset)
    .all<any>();

  // Transformar resultados
  const transformedProperties: PropertyWithRelations[] = (properties.results || []).map((row) => ({
    id: row.id,
    house_number: row.house_number,
    street: row.street,
    status: row.status,
    owner_id: row.owner_id,
    co_owner_id: row.co_owner_id,
    current_resident_id: row.current_resident_id,
    gate_control_1: row.gate_control_1,
    gate_control_2: row.gate_control_2,
    gate_control_3: row.gate_control_3,
    credit_balance: row.credit_balance ?? 0,
    delinquency_status: row.delinquency_status ?? 'al_corriente',
    total_owed: Number(row.total_owed ?? 0),
    pending_fees_count: Number(row.pending_fees_count ?? 0),
    months_overdue: row.months_overdue ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    owner: row.owner_resident_id
      ? {
          id: row.owner_resident_id,
          full_name: row.owner_full_name,
          email: row.owner_email,
          phone: row.owner_phone,
        }
      : undefined,
    current_resident: row.current_resident_resident_id
      ? {
          id: row.current_resident_resident_id,
          full_name: row.current_resident_full_name,
          email: row.current_resident_email,
          phone: row.current_resident_phone,
        }
      : undefined,
    co_owner: row.co_owner_resident_id
      ? {
          id: row.co_owner_resident_id,
          full_name: row.co_owner_full_name,
          email: row.co_owner_email,
          phone: row.co_owner_phone,
        }
      : undefined,
  }));

  return { properties: transformedProperties, total };
}

/**
 * Obtiene una propiedad por ID
 */
export async function getPropertyById(
  db: D1Database,
  propertyId: string
): Promise<PropertyWithRelations | null> {
  const result = await db
    .prepare(
      `SELECT 
        p.*,
        r_owner.id as owner_resident_id,
        r_owner.full_name as owner_full_name,
        r_owner.email as owner_email,
        r_owner.phone as owner_phone,
        r_current.id as current_resident_resident_id,
        r_current.full_name as current_resident_full_name,
        r_current.email as current_resident_email,
        r_current.phone as current_resident_phone,
        r_coowner.id as co_owner_resident_id,
        r_coowner.full_name as co_owner_full_name,
        r_coowner.email as co_owner_email,
        r_coowner.phone as co_owner_phone
      FROM properties p
      LEFT JOIN residents r_owner ON p.owner_id = r_owner.id AND r_owner.deleted_at IS NULL
      LEFT JOIN residents r_current ON p.current_resident_id = r_current.id AND r_current.deleted_at IS NULL
      LEFT JOIN residents r_coowner ON p.co_owner_id = r_coowner.id AND r_coowner.deleted_at IS NULL
      WHERE p.id = ? AND p.deleted_at IS NULL`
    )
    .bind(propertyId)
    .first<any>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    house_number: result.house_number,
    street: result.street,
    status: result.status,
    owner_id: result.owner_id,
    co_owner_id: result.co_owner_id,
    current_resident_id: result.current_resident_id,
    gate_control_1: result.gate_control_1,
    gate_control_2: result.gate_control_2,
    gate_control_3: result.gate_control_3,
    credit_balance: result.credit_balance ?? 0,
    delinquency_status: result.delinquency_status ?? 'al_corriente',
    months_overdue: result.months_overdue ?? 0,
    created_at: result.created_at,
    updated_at: result.updated_at,
    deleted_at: result.deleted_at,
    owner: result.owner_resident_id
      ? {
          id: result.owner_resident_id,
          full_name: result.owner_full_name,
          email: result.owner_email,
          phone: result.owner_phone,
        }
      : undefined,
    current_resident: result.current_resident_resident_id
      ? {
          id: result.current_resident_resident_id,
          full_name: result.current_resident_full_name,
          email: result.current_resident_email,
          phone: result.current_resident_phone,
        }
      : undefined,
    co_owner: result.co_owner_resident_id
      ? {
          id: result.co_owner_resident_id,
          full_name: result.co_owner_full_name,
          email: result.co_owner_email,
          phone: result.co_owner_phone,
        }
      : undefined,
  };
}

/**
 * Crea una nueva propiedad
 */
export async function createProperty(
  db: D1Database,
  data: PropertyCreateInput
): Promise<Property> {
  console.log('🔵 Service - Datos recibidos para crear propiedad:', JSON.stringify(data));
  
  // Verificar que el número de casa no exista
  const existing = await db
    .prepare('SELECT id FROM properties WHERE house_number = ? AND deleted_at IS NULL')
    .bind(data.house_number)
    .first<{ id: string }>();

  if (existing) {
    throwApiError('El número de casa ya existe', 409, 'HOUSE_NUMBER_EXISTS');
  }

  // Si se proporciona owner_id, verificar que exista
  if (data.owner_id) {
    const owner = await db
      .prepare('SELECT id FROM residents WHERE id = ? AND deleted_at IS NULL')
      .bind(data.owner_id)
      .first<{ id: string }>();

    if (!owner) {
      throwNotFound('Residente propietario');
    }
  }

  // Si se proporciona current_resident_id, verificar que exista
  if (data.current_resident_id) {
    const resident = await db
      .prepare('SELECT id FROM residents WHERE id = ? AND deleted_at IS NULL')
      .bind(data.current_resident_id)
      .first<{ id: string }>();

    if (!resident) {
      throwNotFound('Residente actual');
    }
  }

  // Si se proporciona co_owner_id, verificar que exista
  if (data.co_owner_id) {
    const co = await db
      .prepare('SELECT id FROM residents WHERE id = ? AND deleted_at IS NULL')
      .bind(data.co_owner_id)
      .first<{ id: string }>();
    if (!co) throwNotFound('Copropietario');
  }

  const propertyId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  
  console.log('🔵 Service - Insertando propiedad en BD con ID:', propertyId);

  await db
    .prepare(
      `INSERT INTO properties (
        id, house_number, street, status, owner_id, co_owner_id, current_resident_id,
        gate_control_1, gate_control_2, gate_control_3, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      propertyId,
      data.house_number,
      data.street,
      data.status || 'desocupada',
      data.owner_id || null,
      data.co_owner_id || null,
      data.current_resident_id || null,
      data.gate_control_1 || null,
      data.gate_control_2 || null,
      data.gate_control_3 || null,
      now,
      now
    )
    .run();

  // Sincronizar resident_properties
  if (data.owner_id) await syncResidentProperty(db, propertyId, 'propietario', data.owner_id);
  if (data.current_resident_id) await syncResidentProperty(db, propertyId, 'residente_actual', data.current_resident_id);

  // Saldo inicial (deuda heredada o crédito previo)
  const initialBalance = Number((data as any).initial_balance || 0);
  if (initialBalance > 0) {
    // Deuda inicial: crear una "cuota de apertura" para que aparezca en estado de cuenta
    const feeId = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO monthly_fees (
          id, property_id, amount, discount_amount, discount_percentage,
          total_amount, due_date, payment_period, status, balance,
          paid_amount, notes, created_at, updated_at
        ) VALUES (?, ?, ?, 0, 0, ?, ?, 'apertura', 'overdue', ?, 0, ?, ?, ?)`
      )
      .bind(
        feeId, propertyId, initialBalance, initialBalance, now,
        initialBalance, 'Saldo inicial al alta de propiedad', now, now
      )
      .run();
  } else if (initialBalance < 0) {
    // Crédito previo: agregar al credit_balance
    await db
      .prepare('UPDATE properties SET credit_balance = credit_balance + ? WHERE id = ?')
      .bind(Math.abs(initialBalance), propertyId)
      .run();
  }

  console.log('✅ Service - Propiedad insertada, recuperando datos...');

  const property = await db
    .prepare('SELECT * FROM properties WHERE id = ?')
    .bind(propertyId)
    .first<Property>();

  if (!property) {
    throwApiError('Error al crear propiedad', 500);
  }

  console.log('✅ Service - Propiedad creada exitosamente:', property.id);
  return property;
}

/**
 * Sincroniza la tabla `resident_properties` con los campos `owner_id` y
 * `current_resident_id` de una propiedad. Marca las relaciones previas como
 * inactivas (cierra `end_date`) y crea las nuevas activas.
 */
async function syncResidentProperty(
  db: D1Database,
  propertyId: string,
  role: 'propietario' | 'residente_actual',
  newResidentId: string | null | undefined
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);

  // Cerrar relación anterior si existe
  await db
    .prepare(
      `UPDATE resident_properties
       SET is_active = 0, end_date = ?, updated_at = ?
       WHERE property_id = ? AND role = ? AND is_active = 1`
    )
    .bind(now, now, propertyId, role)
    .run();

  if (!newResidentId) return;

  // Si ya existe (resident, property, role) reactivar; si no, insertar
  const existing = await db
    .prepare(
      `SELECT id FROM resident_properties
       WHERE resident_id = ? AND property_id = ? AND role = ?`
    )
    .bind(newResidentId, propertyId, role)
    .first<{ id: string }>();

  if (existing) {
    await db
      .prepare(
        `UPDATE resident_properties
         SET is_active = 1, end_date = NULL, start_date = ?, updated_at = ?
         WHERE id = ?`
      )
      .bind(now, now, existing.id)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO resident_properties (resident_id, property_id, role, start_date, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 1, ?, ?)`
      )
      .bind(newResidentId, propertyId, role, now, now, now)
      .run();
  }
}

/**
 * Actualiza una propiedad
 */
export async function updateProperty(
  db: D1Database,
  propertyId: string,
  data: PropertyUpdateInput
): Promise<Property> {
  const property = await db
    .prepare('SELECT * FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(propertyId)
    .first<Property>();

  if (!property) {
    throwNotFound('Propiedad');
  }

  // Si se actualiza el número de casa, verificar que no exista
  if (data.house_number && data.house_number !== property.house_number) {
    const existing = await db
      .prepare('SELECT id FROM properties WHERE house_number = ? AND id != ? AND deleted_at IS NULL')
      .bind(data.house_number, propertyId)
      .first<{ id: string }>();

    if (existing) {
      throwApiError('El número de casa ya existe', 409, 'HOUSE_NUMBER_EXISTS');
    }
  }

  // Si se actualiza el propietario, verificar que exista
  if (data.owner_id) {
    const owner = await db
      .prepare('SELECT id FROM residents WHERE id = ? AND deleted_at IS NULL')
      .bind(data.owner_id)
      .first<{ id: string }>();

    if (!owner) {
      throwNotFound('Residente propietario');
    }
  }

  // Si se actualiza el residente actual, verificar que exista
  if (data.current_resident_id) {
    const resident = await db
      .prepare('SELECT id FROM residents WHERE id = ? AND deleted_at IS NULL')
      .bind(data.current_resident_id)
      .first<{ id: string }>();

    if (!resident) {
      throwNotFound('Residente actual');
    }
  }

  // Si se actualiza el copropietario, verificar que exista
  if (data.co_owner_id) {
    const co = await db
      .prepare('SELECT id FROM residents WHERE id = ? AND deleted_at IS NULL')
      .bind(data.co_owner_id)
      .first<{ id: string }>();
    if (!co) throwNotFound('Copropietario');
  }

  const now = Math.floor(Date.now() / 1000);
  const updates: string[] = [];
  const values: any[] = [];

  if (data.house_number !== undefined) {
    updates.push('house_number = ?');
    values.push(data.house_number);
  }

  if (data.street !== undefined) {
    updates.push('street = ?');
    values.push(data.street);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }

  if (data.owner_id !== undefined) {
    updates.push('owner_id = ?');
    values.push(data.owner_id);
  }

  if (data.co_owner_id !== undefined) {
    updates.push('co_owner_id = ?');
    values.push(data.co_owner_id);
  }

  if (data.current_resident_id !== undefined) {
    updates.push('current_resident_id = ?');
    values.push(data.current_resident_id);
  }

  if (data.gate_control_1 !== undefined) {
    updates.push('gate_control_1 = ?');
    values.push(data.gate_control_1);
  }

  if (data.gate_control_2 !== undefined) {
    updates.push('gate_control_2 = ?');
    values.push(data.gate_control_2);
  }

  if (data.gate_control_3 !== undefined) {
    updates.push('gate_control_3 = ?');
    values.push(data.gate_control_3);
  }

  updates.push('updated_at = ?');
  values.push(now);
  values.push(propertyId);

  await db
    .prepare(`UPDATE properties SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  // Mantener resident_properties sincronizada
  if (data.owner_id !== undefined) {
    await syncResidentProperty(db, propertyId, 'propietario', data.owner_id);
  }
  if (data.current_resident_id !== undefined) {
    await syncResidentProperty(db, propertyId, 'residente_actual', data.current_resident_id);
  }

  const updatedProperty = await db
    .prepare('SELECT * FROM properties WHERE id = ?')
    .bind(propertyId)
    .first<Property>();

  if (!updatedProperty) {
    throwApiError('Error al actualizar propiedad', 500);
  }

  return updatedProperty;
}

/**
 * Elimina una propiedad (soft delete)
 */
export async function deleteProperty(db: D1Database, propertyId: string): Promise<void> {
  const property = await db
    .prepare('SELECT * FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(propertyId)
    .first<Property>();

  if (!property) {
    throwNotFound('Propiedad');
  }

  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare('UPDATE properties SET deleted_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, propertyId)
    .run();
}

/**
 * Obtiene los residentes de una propiedad
 */
export async function getPropertyResidents(
  db: D1Database,
  propertyId: string
): Promise<any[]> {
  const property = await db
    .prepare('SELECT id FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(propertyId)
    .first<{ id: string }>();

  if (!property) {
    throwNotFound('Propiedad');
  }

  const residents = await db
    .prepare(
      `SELECT
        r.*,
        rp.role as property_role,
        rp.start_date as property_start_date,
        rp.end_date as property_end_date,
        rp.is_active as property_is_active
      FROM residents r
      JOIN resident_properties rp ON rp.resident_id = r.id AND rp.is_active = 1
      WHERE rp.property_id = ? AND r.deleted_at IS NULL
      ORDER BY rp.role ASC, r.created_at ASC`
    )
    .bind(propertyId)
    .all();

  return residents.results || [];
}

// Made with Bob

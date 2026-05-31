/**
 * Servicio de cuotas mensuales
 */

import { throwNotFound, throwApiError } from '../middleware/error.middleware';
import { calculateOffset } from '../utils/response';
import type { MonthlyFee, MonthlyFeeWithProperty, MonthlyFeeCreateInput, PaginationParams } from '../types';

/**
 * Lista cuotas mensuales con paginación y filtros
 */
export async function listMonthlyFees(
  db: D1Database,
  params: PaginationParams & {
    property_id?: string;
    status?: string;
    payment_period?: string;
    from_date?: number;
    to_date?: number;
  }
): Promise<{ fees: MonthlyFeeWithProperty[]; total: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = calculateOffset(page, limit);

  let whereConditions = ['f.deleted_at IS NULL'];
  const bindings: any[] = [];

  if (params.property_id) {
    whereConditions.push('f.property_id = ?');
    bindings.push(params.property_id);
  }

  if (params.status) {
    whereConditions.push('f.status = ?');
    bindings.push(params.status);
  }

  if (params.payment_period) {
    whereConditions.push('f.payment_period = ?');
    bindings.push(params.payment_period);
  }

  if (params.from_date) {
    whereConditions.push('f.due_date >= ?');
    bindings.push(params.from_date);
  }

  if (params.to_date) {
    whereConditions.push('f.due_date <= ?');
    bindings.push(params.to_date);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM monthly_fees f WHERE ${whereClause}`)
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const fees = await db
    .prepare(
      `SELECT 
        f.*,
        p.house_number, p.street
      FROM monthly_fees f
      JOIN properties p ON f.property_id = p.id AND p.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY f.due_date DESC, f.created_at DESC
      LIMIT ? OFFSET ?`
    )
    .bind(...bindings, limit, offset)
    .all<any>();

  const transformedFees: MonthlyFeeWithProperty[] = (fees.results || []).map((row) => ({
    ...row,
    property: { id: row.property_id, house_number: row.house_number, street: row.street },
  }));

  return { fees: transformedFees, total };
}

/**
 * Obtiene una cuota por ID
 */
export async function getMonthlyFeeById(db: D1Database, feeId: string): Promise<MonthlyFeeWithProperty | null> {
  const result = await db
    .prepare(
      `SELECT 
        f.*,
        p.house_number, p.street
      FROM monthly_fees f
      JOIN properties p ON f.property_id = p.id AND p.deleted_at IS NULL
      WHERE f.id = ? AND f.deleted_at IS NULL`
    )
    .bind(feeId)
    .first<any>();

  if (!result) return null;

  return {
    ...result,
    property: { id: result.property_id, house_number: result.house_number, street: result.street },
  };
}

/**
 * Genera cuotas mensuales para todas las propiedades
 */
export async function generateMonthlyFees(
  db: D1Database,
  paymentPeriod: string,
  baseAmount: number,
  _unusedDiscountPct: number = 0,
  _unusedDiscountDays: number = 0
): Promise<{ generated: number; skipped: number; auto_paid_with_credit: number; errors: string[] }> {
  const properties = await db
    .prepare(
      'SELECT id, house_number, credit_balance FROM properties WHERE deleted_at IS NULL AND status != ?'
    )
    .bind('desocupada')
    .all<{ id: string; house_number: string; credit_balance: number }>();

  if (!properties.results || properties.results.length === 0) {
    return { generated: 0, skipped: 0, auto_paid_with_credit: 0, errors: ['No hay propiedades activas'] };
  }

  const existingFees = await db
    .prepare('SELECT property_id FROM monthly_fees WHERE payment_period = ? AND deleted_at IS NULL')
    .bind(paymentPeriod)
    .all<{ property_id: string }>();
  const existingPropertyIds = new Set((existingFees.results || []).map((f) => f.property_id));

  let generated = 0;
  let skipped = 0;
  let autoPaid = 0;
  const errors: string[] = [];

  const [year, month] = paymentPeriod.split('-').map(Number);
  if (!year || !month) {
    return { generated: 0, skipped: 0, auto_paid_with_credit: 0, errors: ['Formato de período inválido'] };
  }
  const dueDate = Math.floor(new Date(year, month, 0).getTime() / 1000);
  const now = Math.floor(Date.now() / 1000);

  for (const property of properties.results) {
    if (existingPropertyIds.has(property.id)) {
      skipped++;
      continue;
    }

    try {
      const feeId = crypto.randomUUID();
      const totalAmount = baseAmount;

      await db
        .prepare(
          `INSERT INTO monthly_fees (
            id, property_id, amount, discount_amount, discount_percentage,
            total_amount, due_date, payment_period, status, balance,
            paid_amount, created_at, updated_at
          ) VALUES (?, ?, ?, 0, 0, ?, ?, ?, 'pending', ?, 0, ?, ?)`
        )
        .bind(feeId, property.id, baseAmount, totalAmount, dueDate, paymentPeriod, totalAmount, now, now)
        .run();
      generated++;

      // Si la propiedad tiene saldo a favor, aplicarlo automáticamente
      const credit = Number(property.credit_balance || 0);
      if (credit > 0) {
        const applied = Math.min(credit, totalAmount);
        const newBalance = totalAmount - applied;
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

        await db
          .prepare(
            `UPDATE monthly_fees
             SET paid_amount = ?, balance = ?, status = ?,
                 notes = COALESCE(notes || ' | ', '') || ?, updated_at = ?
             WHERE id = ?`
          )
          .bind(
            applied, newBalance, newStatus,
            `Aplicado $${applied.toFixed(2)} de saldo a favor`,
            now, feeId
          )
          .run();

        await db
          .prepare('UPDATE properties SET credit_balance = credit_balance - ?, updated_at = ? WHERE id = ?')
          .bind(applied, now, property.id)
          .run();

        if (newStatus === 'paid') autoPaid++;
      }
    } catch (error) {
      errors.push(`Error en propiedad ${property.house_number}: ${error}`);
    }
  }

  return { generated, skipped, auto_paid_with_credit: autoPaid, errors };
}

/**
 * Obtiene cuotas de una propiedad específica
 */
export async function getPropertyFees(db: D1Database, propertyId: string): Promise<MonthlyFee[]> {
  const property = await db.prepare('SELECT id FROM properties WHERE id = ? AND deleted_at IS NULL').bind(propertyId).first();
  if (!property) throwNotFound('Propiedad');

  const fees = await db
    .prepare(
      `SELECT * FROM monthly_fees 
       WHERE property_id = ? AND deleted_at IS NULL 
       ORDER BY due_date DESC`
    )
    .bind(propertyId)
    .all<MonthlyFee>();

  return fees.results || [];
}

/**
 * Actualiza el estado de una cuota después de un pago
 */
export async function updateFeeAfterPayment(
  db: D1Database,
  feeId: string,
  paymentAmount: number
): Promise<MonthlyFee> {
  const fee = await db.prepare('SELECT * FROM monthly_fees WHERE id = ? AND deleted_at IS NULL').bind(feeId).first<MonthlyFee>();
  if (!fee) throwNotFound('Cuota');

  const newPaidAmount = fee.paid_amount + paymentAmount;
  const newBalance = fee.total_amount - newPaidAmount;
  const newStatus = newBalance <= 0 ? 'paid' : newBalance < fee.total_amount ? 'partially_paid' : fee.status;

  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `UPDATE monthly_fees 
       SET paid_amount = ?, balance = ?, status = ?, updated_at = ? 
       WHERE id = ?`
    )
    .bind(newPaidAmount, newBalance, newStatus, now, feeId)
    .run();

  const updated = await db.prepare('SELECT * FROM monthly_fees WHERE id = ?').bind(feeId).first<MonthlyFee>();
  if (!updated) throwApiError('Error al actualizar cuota', 500);

  return updated;
}

// Made with Bob

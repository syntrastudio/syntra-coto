/**
 * Servicio de pagos
 */

import { throwNotFound, throwApiError } from '../middleware/error.middleware';
import { calculateOffset } from '../utils/response';
import { updateFeeAfterPayment } from './fees.service';
import type { Payment, PaymentWithDetails, PaymentCreateInput, PaginationParams } from '../types';

/**
 * Lista pagos con paginación y filtros
 */
export async function listPayments(
  db: D1Database,
  params: PaginationParams & {
    property_id?: string;
    monthly_fee_id?: string;
    status?: string;
    payment_method?: string;
    from_date?: number;
    to_date?: number;
  }
): Promise<{ payments: PaymentWithDetails[]; total: number }> {
  const page = params.page || 1;
  const limit = params.limit || 20;
  const offset = calculateOffset(page, limit);

  let whereConditions = ['p.deleted_at IS NULL'];
  const bindings: any[] = [];

  if (params.property_id) {
    whereConditions.push('p.property_id = ?');
    bindings.push(params.property_id);
  }

  if (params.monthly_fee_id) {
    whereConditions.push('p.monthly_fee_id = ?');
    bindings.push(params.monthly_fee_id);
  }

  if (params.status) {
    whereConditions.push('p.status = ?');
    bindings.push(params.status);
  }

  if (params.payment_method) {
    whereConditions.push('p.payment_method = ?');
    bindings.push(params.payment_method);
  }

  if (params.from_date) {
    whereConditions.push('p.payment_date >= ?');
    bindings.push(params.from_date);
  }

  if (params.to_date) {
    whereConditions.push('p.payment_date <= ?');
    bindings.push(params.to_date);
  }

  const whereClause = whereConditions.join(' AND ');

  const countResult = await db
    .prepare(`SELECT COUNT(*) as total FROM payments p WHERE ${whereClause}`)
    .bind(...bindings)
    .first<{ total: number }>();

  const total = countResult?.total || 0;

  const payments = await db
    .prepare(
      `SELECT 
        p.*,
        pr.house_number, pr.street,
        f.payment_period, f.amount as fee_amount,
        u.full_name as created_by_name
      FROM payments p
      JOIN properties pr ON p.property_id = pr.id AND pr.deleted_at IS NULL
      JOIN monthly_fees f ON p.monthly_fee_id = f.id AND f.deleted_at IS NULL
      LEFT JOIN users u ON p.created_by = u.id AND u.deleted_at IS NULL
      WHERE ${whereClause}
      ORDER BY p.payment_date DESC, p.created_at DESC
      LIMIT ? OFFSET ?`
    )
    .bind(...bindings, limit, offset)
    .all<any>();

  const transformedPayments: PaymentWithDetails[] = (payments.results || []).map((row) => ({
    ...row,
    property: { id: row.property_id, house_number: row.house_number, street: row.street },
    monthly_fee: { id: row.monthly_fee_id, payment_period: row.payment_period, amount: row.fee_amount },
    created_by_user: row.created_by ? { id: row.created_by, full_name: row.created_by_name } : null,
  }));

  return { payments: transformedPayments, total };
}

/**
 * Obtiene un pago por ID
 */
export async function getPaymentById(db: D1Database, paymentId: string): Promise<PaymentWithDetails | null> {
  const result = await db
    .prepare(
      `SELECT 
        p.*,
        pr.house_number, pr.street,
        f.payment_period, f.amount as fee_amount,
        u.full_name as created_by_name
      FROM payments p
      JOIN properties pr ON p.property_id = pr.id AND pr.deleted_at IS NULL
      JOIN monthly_fees f ON p.monthly_fee_id = f.id AND f.deleted_at IS NULL
      LEFT JOIN users u ON p.created_by = u.id AND u.deleted_at IS NULL
      WHERE p.id = ? AND p.deleted_at IS NULL`
    )
    .bind(paymentId)
    .first<any>();

  if (!result) return null;

  return {
    ...result,
    property: { id: result.property_id, house_number: result.house_number, street: result.street },
    monthly_fee: { id: result.monthly_fee_id, payment_period: result.payment_period, amount: result.fee_amount },
    created_by_user: result.created_by ? { id: result.created_by, full_name: result.created_by_name } : null,
  };
}

/**
 * Crea un nuevo pago
 */
export async function createPayment(
  db: D1Database,
  data: PaymentCreateInput & { created_by?: string }
): Promise<Payment> {
  // Verificar que la cuota exista
  const fee = await db
    .prepare('SELECT * FROM monthly_fees WHERE id = ? AND deleted_at IS NULL')
    .bind(data.monthly_fee_id)
    .first<any>();

  if (!fee) throwNotFound('Cuota mensual');

  // Verificar que el monto no exceda el balance
  if (data.amount > fee.balance) {
    throwApiError('El monto del pago excede el balance de la cuota', 400, 'AMOUNT_EXCEEDS_BALANCE');
  }

  const paymentId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  // Crear el pago
  await db
    .prepare(
      `INSERT INTO payments (
        id, monthly_fee_id, property_id, amount, payment_method,
        payment_reference, payment_date, status, notes, created_by,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      paymentId,
      data.monthly_fee_id,
      fee.property_id,
      data.amount,
      data.payment_method,
      data.payment_reference || null,
      data.payment_date,
      'completed',
      data.notes || null,
      data.created_by || null,
      now,
      now
    )
    .run();

  // Actualizar la cuota
  await updateFeeAfterPayment(db, data.monthly_fee_id, data.amount);

  const payment = await db
    .prepare('SELECT * FROM payments WHERE id = ?')
    .bind(paymentId)
    .first<Payment>();

  if (!payment) throwApiError('Error al crear pago', 500);

  return payment;
}

/**
 * Obtiene pagos de una propiedad específica
 */
export async function getPropertyPayments(db: D1Database, propertyId: string): Promise<Payment[]> {
  const property = await db
    .prepare('SELECT id FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(propertyId)
    .first();

  if (!property) throwNotFound('Propiedad');

  const payments = await db
    .prepare(
      `SELECT * FROM payments 
       WHERE property_id = ? AND deleted_at IS NULL 
       ORDER BY payment_date DESC`
    )
    .bind(propertyId)
    .all<Payment>();

  return payments.results || [];
}

/**
 * Actualiza el estado de un pago
 */
export async function updatePaymentStatus(
  db: D1Database,
  paymentId: string,
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled',
  notes?: string
): Promise<Payment> {
  const payment = await db
    .prepare('SELECT * FROM payments WHERE id = ? AND deleted_at IS NULL')
    .bind(paymentId)
    .first<Payment>();

  if (!payment) throwNotFound('Pago');

  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `UPDATE payments 
       SET status = ?, notes = ?, updated_at = ? 
       WHERE id = ?`
    )
    .bind(status, notes || payment.notes, now, paymentId)
    .run();

  const updated = await db
    .prepare('SELECT * FROM payments WHERE id = ?')
    .bind(paymentId)
    .first<Payment>();

  if (!updated) throwApiError('Error al actualizar pago', 500);

  return updated;
}

// Made with Bob

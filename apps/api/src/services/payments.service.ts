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
      LEFT JOIN monthly_fees f ON p.monthly_fee_id = f.id AND f.deleted_at IS NULL
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
    monthly_fee: row.monthly_fee_id
      ? { id: row.monthly_fee_id, payment_period: row.payment_period, amount: row.fee_amount }
      : null,
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
      LEFT JOIN monthly_fees f ON p.monthly_fee_id = f.id AND f.deleted_at IS NULL
      LEFT JOIN users u ON p.created_by = u.id AND u.deleted_at IS NULL
      WHERE p.id = ? AND p.deleted_at IS NULL`
    )
    .bind(paymentId)
    .first<any>();

  if (!result) return null;

  return {
    ...result,
    property: { id: result.property_id, house_number: result.house_number, street: result.street },
    monthly_fee: result.monthly_fee_id
      ? { id: result.monthly_fee_id, payment_period: result.payment_period, amount: result.fee_amount }
      : null,
    created_by_user: result.created_by ? { id: result.created_by, full_name: result.created_by_name } : null,
  };
}

import { recordCashMovement } from './cash.service';
import { sendPaymentReceipt } from './notifications.service';

/**
 * Genera un folio único PT-YYYY-NNNN basado en el año actual. NNNN es el
 * conteo de pagos del año + 1 zero-padded a 4 dígitos. Reintenta hasta 3 veces
 * si hay colisión por race condition.
 */
async function generatePaymentFolio(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = Math.floor(new Date(year, 0, 1).getTime() / 1000);
  const yearEnd = Math.floor(new Date(year + 1, 0, 1).getTime() / 1000);

  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM payments
         WHERE folio IS NOT NULL AND created_at >= ? AND created_at < ?`
      )
      .bind(yearStart, yearEnd)
      .first<{ n: number }>();
    const next = Number(row?.n || 0) + 1 + attempt;
    const folio = `PT-${year}-${String(next).padStart(4, '0')}`;
    const exists = await db.prepare('SELECT 1 FROM payments WHERE folio = ?').bind(folio).first();
    if (!exists) return folio;
  }
  // Fallback: sufijo con timestamp si las colisiones persisten
  return `PT-${year}-${Date.now().toString().slice(-6)}`;
}

/**
 * Crea un pago.
 *
 * - Si `monthly_fee_id` viene en `data`: se aplica directo a esa cuota.
 * - Si NO viene: se aplica FIFO sobre las cuotas pendientes/parciales/vencidas
 *   de la propiedad (más antiguas primero). El sobrante se acumula en
 *   `properties.credit_balance` como saldo a favor.
 *
 * Devuelve el pago "encabezado" (un solo registro). Las asignaciones individuales
 * por cuota se reflejan en `monthly_fees.paid_amount/balance/status`.
 */
export async function createPayment(
  db: D1Database,
  data: PaymentCreateInput & { property_id?: string; received_by_user_id?: string; created_by?: string },
  env?: { RESEND_API_KEY?: string; EMAIL_FROM?: string; APP_URL?: string }
): Promise<Payment> {
  const now = Math.floor(Date.now() / 1000);
  const paymentId = crypto.randomUUID();
  // Por default, el receptor del dinero es quien registra el pago (admin actual)
  const receivedBy = data.received_by_user_id || data.created_by || null;

  // ============================================================
  // CASO A: pago dirigido a una cuota específica
  // ============================================================
  if (data.monthly_fee_id) {
    const fee = await db
      .prepare('SELECT * FROM monthly_fees WHERE id = ? AND deleted_at IS NULL')
      .bind(data.monthly_fee_id)
      .first<any>();
    if (!fee) throwNotFound('Cuota mensual');

    let remaining = data.amount;
    const applied = Math.min(remaining, fee.balance);
    remaining -= applied;

    const folio = await generatePaymentFolio(db);
    await db
      .prepare(
        `INSERT INTO payments (
          id, monthly_fee_id, property_id, amount, payment_method,
          payment_reference, payment_date, status, notes, folio,
          received_by_user_id, created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        paymentId, data.monthly_fee_id, fee.property_id, data.amount,
        data.payment_method, data.payment_reference || null, data.payment_date,
        'completed', data.notes || null, folio, receivedBy,
        data.created_by || null, now, now
      )
      .run();

    if (applied > 0) await updateFeeAfterPayment(db, data.monthly_fee_id, applied);

    if (remaining > 0) {
      await addCredit(db, fee.property_id, remaining);
    }

    // Acreditar al balance del receptor
    if (receivedBy) {
      await recordCashMovement(db, {
        user_id: receivedBy,
        type: 'receipt',
        amount: data.amount,
        payment_id: paymentId,
        notes: `Pago ${folio}`,
        created_by: data.created_by || null,
      });
    }

    const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>();
    if (!payment) throwApiError('Error al crear pago', 500);

    // Recibo automático al residente
    if (env) {
      try {
        await sendPaymentReceipt(db, env, {
          payment_id: paymentId,
          folio,
          amount: data.amount,
          payment_method: data.payment_method,
          payment_date: data.payment_date,
          property_id: fee.property_id,
          notes: data.notes,
        });
      } catch (e) {
        console.error('[receipt] failed:', e);
      }
    }

    return payment;
  }

  // ============================================================
  // CASO B: pago sobre la propiedad (FIFO + saldo a favor)
  // ============================================================
  if (!data.property_id) {
    throwApiError('Debe especificar monthly_fee_id o property_id', 400, 'MISSING_TARGET');
  }

  const property = await db
    .prepare('SELECT id, credit_balance FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(data.property_id)
    .first<{ id: string; credit_balance: number }>();
  if (!property) throwNotFound('Propiedad');

  const pendingFees = await db
    .prepare(
      `SELECT id, balance FROM monthly_fees
       WHERE property_id = ? AND deleted_at IS NULL
         AND status IN ('pending', 'partially_paid', 'overdue')
       ORDER BY due_date ASC, created_at ASC`
    )
    .bind(data.property_id)
    .all<{ id: string; balance: number }>();

  const folio = await generatePaymentFolio(db);
  await db
    .prepare(
      `INSERT INTO payments (
        id, monthly_fee_id, property_id, amount, payment_method,
        payment_reference, payment_date, status, notes, folio,
        received_by_user_id, created_by, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      paymentId, data.property_id, data.amount, data.payment_method,
      data.payment_reference || null, data.payment_date, 'completed',
      data.notes || null, folio, receivedBy, data.created_by || null, now, now
    )
    .run();

  let remaining = data.amount;
  for (const fee of pendingFees.results || []) {
    if (remaining <= 0) break;
    const applied = Math.min(remaining, fee.balance);
    if (applied > 0) {
      await updateFeeAfterPayment(db, fee.id, applied);
      remaining -= applied;
    }
  }

  if (remaining > 0) {
    await addCredit(db, data.property_id, remaining);
  }

  // Acreditar al balance del receptor
  if (receivedBy) {
    await recordCashMovement(db, {
      user_id: receivedBy,
      type: 'receipt',
      amount: data.amount,
      payment_id: paymentId,
      notes: `Pago ${folio}`,
      created_by: data.created_by || null,
    });
  }

  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>();
  if (!payment) throwApiError('Error al crear pago', 500);

  // Recibo automático al residente
  if (env) {
    try {
      await sendPaymentReceipt(db, env, {
        payment_id: paymentId,
        folio,
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        property_id: data.property_id!,
        notes: data.notes,
      });
    } catch (e) {
      console.error('[receipt] failed:', e);
    }
  }

  return payment;
}

/**
 * Suma `amount` al credit_balance de la propiedad (atómico).
 */
async function addCredit(db: D1Database, propertyId: string, amount: number): Promise<void> {
  await db
    .prepare('UPDATE properties SET credit_balance = credit_balance + ?, updated_at = ? WHERE id = ?')
    .bind(amount, Math.floor(Date.now() / 1000), propertyId)
    .run();
}

/**
 * Procesa el pago anual con descuento por meses bonificados.
 *
 * Lee de system_settings:
 *   - maintenance_fee_amount: cuota mensual base
 *   - annual_prepayment_discount_months: meses bonificados (ej 2)
 *
 * Crea las 12 cuotas del año (si no existen) y un Payment encabezado
 * con monto = (12 - bonus) * cuota. Marca las 12 como pagadas
 * (paid_amount = total_amount, balance = 0).
 */
export async function payAnnual(
  db: D1Database,
  args: {
    property_id: string;
    year: number;
    payment_method: string;
    payment_date: number;
    payment_reference?: string;
    notes?: string;
    received_by_user_id?: string;
    created_by?: string;
  },
  env?: { RESEND_API_KEY?: string; EMAIL_FROM?: string; APP_URL?: string }
): Promise<{ payment: Payment; charged: number; bonus_months: number; fees_paid: number }> {
  const receivedBy = args.received_by_user_id || args.created_by || null;
  const property = await db
    .prepare('SELECT id FROM properties WHERE id = ? AND deleted_at IS NULL')
    .bind(args.property_id)
    .first<{ id: string }>();
  if (!property) throwNotFound('Propiedad');

  const feeRow = await db
    .prepare("SELECT value FROM system_settings WHERE key = 'maintenance_fee_amount'")
    .first<{ value: string }>();
  const bonusRow = await db
    .prepare("SELECT value FROM system_settings WHERE key = 'annual_prepayment_discount_months'")
    .first<{ value: string }>();

  const feeAmount = Number(feeRow?.value || 0);
  const bonusMonths = Number(bonusRow?.value || 0);

  if (feeAmount <= 0) {
    throwApiError('Configura primero la cuota de mantenimiento (maintenance_fee_amount)', 400, 'MISSING_FEE_AMOUNT');
  }

  const now = Math.floor(Date.now() / 1000);

  // Crear o reutilizar las 12 cuotas del año
  const feeIds: string[] = [];
  for (let m = 1; m <= 12; m++) {
    const period = `${args.year}-${String(m).padStart(2, '0')}`;
    const existing = await db
      .prepare('SELECT id FROM monthly_fees WHERE property_id = ? AND payment_period = ? AND deleted_at IS NULL')
      .bind(args.property_id, period)
      .first<{ id: string }>();

    if (existing) {
      feeIds.push(existing.id);
      continue;
    }

    const newId = crypto.randomUUID();
    const dueDate = Math.floor(new Date(args.year, m, 0).getTime() / 1000);
    await db
      .prepare(
        `INSERT INTO monthly_fees (
          id, property_id, amount, discount_amount, discount_percentage,
          total_amount, due_date, payment_period, status, balance,
          paid_amount, created_at, updated_at
        ) VALUES (?, ?, ?, 0, 0, ?, ?, ?, 'pending', ?, 0, ?, ?)`
      )
      .bind(newId, args.property_id, feeAmount, feeAmount, dueDate, period, feeAmount, now, now)
      .run();
    feeIds.push(newId);
  }

  // Crear el Payment encabezado con el monto efectivamente cobrado
  const monthsCharged = 12 - bonusMonths;
  const charged = monthsCharged * feeAmount;
  const paymentId = crypto.randomUUID();

  const folio = await generatePaymentFolio(db);
  await db
    .prepare(
      `INSERT INTO payments (
        id, monthly_fee_id, property_id, amount, payment_method,
        payment_reference, payment_date, status, notes, folio,
        received_by_user_id, created_by, created_at, updated_at
      ) VALUES (?, NULL, ?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      paymentId, args.property_id, charged, args.payment_method,
      args.payment_reference || null, args.payment_date,
      args.notes || `Pago anual ${args.year} (bonificación ${bonusMonths} meses)`,
      folio, receivedBy, args.created_by || null, now, now
    )
    .run();

  // Marcar las 12 cuotas como pagadas en su totalidad (bonificación incluida)
  for (const feeId of feeIds) {
    await db
      .prepare(
        `UPDATE monthly_fees
         SET paid_amount = total_amount, balance = 0, status = 'paid', updated_at = ?
         WHERE id = ?`
      )
      .bind(now, feeId)
      .run();
  }

  // Acreditar al balance del receptor
  if (receivedBy) {
    await recordCashMovement(db, {
      user_id: receivedBy,
      type: 'receipt',
      amount: charged,
      payment_id: paymentId,
      notes: `Pago anual ${args.year} (${folio})`,
      created_by: args.created_by || null,
    });
  }

  const payment = await db.prepare('SELECT * FROM payments WHERE id = ?').bind(paymentId).first<Payment>();
  if (!payment) throwApiError('Error al registrar pago anual', 500);

  // Recibo automático al residente
  if (env) {
    try {
      await sendPaymentReceipt(db, env, {
        payment_id: paymentId,
        folio,
        amount: charged,
        payment_method: args.payment_method,
        payment_date: args.payment_date,
        property_id: args.property_id,
        notes: args.notes || `Pago anual ${args.year} (bonificación ${bonusMonths} meses)`,
      });
    } catch (e) {
      console.error('[receipt annual] failed:', e);
    }
  }

  return {
    payment: payment as Payment,
    charged,
    bonus_months: bonusMonths,
    fees_paid: feeIds.length,
  };
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

/**
 * Servicio de morosidad y recargos por mora.
 *
 * Reglas (Reglamento Paseo Coto Tonalá):
 *  - Art. 16: recargo del 15% sobre el monto de la cuota mensual por cada
 *    mes vencido sin pagar.
 *  - Art. 18: con 1 mes de mora se restringen servicios (terraza, ingreso
 *    de visitas y proveedores, mudanzas).
 *  - Art. 18 BIS: con más de 2 meses de mora se suspenden todos los servicios.
 */

import type { D1Database } from '@cloudflare/workers-types';

export type DelinquencyStatus =
  | 'al_corriente'
  | 'mora_1_mes'
  | 'mora_2_meses'
  | 'suspendido';

export function statusFromMonthsOverdue(months: number): DelinquencyStatus {
  if (months <= 0) return 'al_corriente';
  if (months === 1) return 'mora_1_mes';
  if (months === 2) return 'mora_2_meses';
  return 'suspendido';
}

/**
 * Recalcula `delinquency_status` y `months_overdue` para todas las propiedades
 * activas. Una propiedad tiene mora si tiene cuotas con `due_date < now` y
 * status distinto de `paid`/`cancelled`.
 */
export async function recalculateDelinquency(
  db: D1Database
): Promise<{ scanned: number; updated: number; by_status: Record<DelinquencyStatus, number> }> {
  const now = Math.floor(Date.now() / 1000);

  const properties = await db
    .prepare(
      `SELECT id, delinquency_status, months_overdue FROM properties WHERE deleted_at IS NULL`
    )
    .all<{ id: string; delinquency_status: DelinquencyStatus; months_overdue: number }>();

  const props = properties.results || [];
  const counts: Record<DelinquencyStatus, number> = {
    al_corriente: 0,
    mora_1_mes: 0,
    mora_2_meses: 0,
    suspendido: 0,
  };

  let updated = 0;

  for (const p of props) {
    const r = await db
      .prepare(
        `SELECT COUNT(*) AS n FROM monthly_fees
         WHERE property_id = ?
           AND deleted_at IS NULL
           AND due_date < ?
           AND status NOT IN ('paid','cancelled')`
      )
      .bind(p.id, now)
      .first<{ n: number }>();

    const months = Number(r?.n || 0);
    const status = statusFromMonthsOverdue(months);
    counts[status]++;

    if (status !== p.delinquency_status || months !== p.months_overdue) {
      await db
        .prepare(
          `UPDATE properties
             SET delinquency_status = ?, months_overdue = ?, updated_at = ?
             WHERE id = ?`
        )
        .bind(status, months, now, p.id)
        .run();
      updated++;
    }
  }

  return { scanned: props.length, updated, by_status: counts };
}

/**
 * Aplica el recargo del 15% (configurable por `late_payment_surcharge`) sobre
 * cada cuota cuyo `due_date` esté vencido este mes y aún no tenga su recargo
 * registrado en `late_fees`. Idempotente por (monthly_fee_id, months_overdue).
 *
 * El recargo se calcula sobre `monthly_fees.amount` (cuota base del mes) y
 * se agrega al `balance` de la cuota para que cuente como deuda.
 */
export async function applyLateFees(
  db: D1Database
): Promise<{ applied: number; skipped_already_charged: number; total_surcharge: number }> {
  const setting = await db
    .prepare("SELECT value FROM system_settings WHERE key = 'late_payment_surcharge'")
    .first<{ value: string }>();
  const pct = Number(setting?.value || 15);
  const now = Math.floor(Date.now() / 1000);

  // Cuotas vencidas (due_date < now) no pagadas
  const overdueFees = await db
    .prepare(
      `SELECT id, property_id, amount, balance, status, due_date
         FROM monthly_fees
         WHERE deleted_at IS NULL
           AND due_date < ?
           AND status NOT IN ('paid','cancelled')`
    )
    .bind(now)
    .all<{
      id: string;
      property_id: string;
      amount: number;
      balance: number;
      status: string;
      due_date: number;
    }>();

  let applied = 0;
  let skipped = 0;
  let totalSurcharge = 0;

  for (const fee of overdueFees.results || []) {
    // Cuántos meses lleva vencida esta cuota
    const monthsOverdue = Math.max(
      1,
      Math.floor((now - fee.due_date) / (30 * 24 * 60 * 60))
    );

    // Verificar si ya tiene late_fee para este conteo de meses (idempotencia)
    const existing = await db
      .prepare(
        `SELECT id FROM late_fees
           WHERE monthly_fee_id = ? AND months_overdue = ? AND status != 'cancelled'`
      )
      .bind(fee.id, monthsOverdue)
      .first<{ id: string }>();

    if (existing) {
      skipped++;
      continue;
    }

    const surcharge = Math.round((fee.amount * pct) / 100 * 100) / 100;

    await db
      .prepare(
        `INSERT INTO late_fees (
            id, monthly_fee_id, property_id, base_amount, surcharge_percentage,
            surcharge_amount, months_overdue, applied_date, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
      .bind(
        crypto.randomUUID(), fee.id, fee.property_id, fee.amount, pct,
        surcharge, monthsOverdue, now, now, now
      )
      .run();

    // El recargo se suma al balance de la cuota (queda como deuda adicional)
    await db
      .prepare(
        `UPDATE monthly_fees
           SET balance = balance + ?,
               status = CASE WHEN status = 'pending' THEN 'overdue' ELSE status END,
               updated_at = ?
           WHERE id = ?`
      )
      .bind(surcharge, now, fee.id)
      .run();

    applied++;
    totalSurcharge += surcharge;
  }

  return { applied, skipped_already_charged: skipped, total_surcharge: totalSurcharge };
}

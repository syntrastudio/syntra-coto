/**
 * Servicio de notificaciones por correo (Tier 2 — cobranza).
 *
 * Maneja:
 *  - Recibo de pago (trigger inmediato)
 *  - Recordatorio de cuota próxima a vencer (cron)
 *  - Recordatorio de mora (cron, días 5/10/15/20)
 *  - Aviso de suspensión (cron, al pasar a 2+ meses)
 *
 * Idempotencia: tabla `notification_log` con `(fee_id, type, days_offset)`
 * para no reenviar la misma notificación si el cron corre varias veces.
 */

import type { D1Database } from '@cloudflare/workers-types';
import {
  sendEmail,
  paymentReceiptHTML,
  upcomingDueFeeHTML,
  overdueReminderHTML,
  suspensionNoticeHTML,
} from '../utils/email';

type NotifEnv = { RESEND_API_KEY?: string; EMAIL_FROM?: string; APP_URL?: string };

async function logNotification(
  db: D1Database,
  args: {
    type: string;
    target_email: string;
    fee_id?: string | null;
    payment_id?: string | null;
    property_id?: string | null;
    resident_id?: string | null;
    days_offset?: number | null;
    status: 'sent' | 'skipped' | 'failed';
    reason?: string;
  }
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO notification_log (type, target_email, fee_id, payment_id, property_id, resident_id, days_offset, status, reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        args.type,
        args.target_email,
        args.fee_id || null,
        args.payment_id || null,
        args.property_id || null,
        args.resident_id || null,
        args.days_offset ?? null,
        args.status,
        args.reason || null
      )
      .run();
  } catch (e) {
    console.error('[notifications] failed to log:', e);
  }
}

async function alreadySent(
  db: D1Database,
  type: string,
  feeId: string,
  daysOffset?: number
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM notification_log
       WHERE type = ? AND fee_id = ?
         AND (days_offset = ? OR (days_offset IS NULL AND ? IS NULL))
         AND status = 'sent'
       LIMIT 1`
    )
    .bind(type, feeId, daysOffset ?? null, daysOffset ?? null)
    .first();
  return !!row;
}

async function getContactInfo(db: D1Database): Promise<{ phone?: string; appUrl?: string }> {
  const phoneRow = await db
    .prepare("SELECT value FROM system_settings WHERE key = 'contact_phone'")
    .first<{ value: string }>();
  return { phone: phoneRow?.value || undefined };
}

/**
 * Resuelve el residente al que debe llegarle el correo de una propiedad.
 * Preferencia: current_resident_id, fallback owner_id.
 */
async function resolveRecipient(
  db: D1Database,
  propertyId: string
): Promise<{ resident_id: string; email: string; full_name: string } | null> {
  const row = await db
    .prepare(
      `SELECT r.id, r.email, r.full_name
       FROM properties p
       LEFT JOIN residents r ON r.id = COALESCE(p.current_resident_id, p.owner_id)
       WHERE p.id = ? AND p.deleted_at IS NULL AND r.id IS NOT NULL AND r.deleted_at IS NULL`
    )
    .bind(propertyId)
    .first<{ id: string; email: string; full_name: string }>();
  if (!row) return null;
  return { resident_id: row.id, email: row.email, full_name: row.full_name };
}

/**
 * Recibo de pago — disparado inmediatamente al registrar el pago.
 */
export async function sendPaymentReceipt(
  db: D1Database,
  env: NotifEnv,
  args: {
    payment_id: string;
    folio: string;
    amount: number;
    payment_method: string;
    payment_date: number;
    property_id: string;
    notes?: string;
  }
): Promise<void> {
  const recipient = await resolveRecipient(db, args.property_id);
  if (!recipient) return;

  const propertyRow = await db
    .prepare('SELECT house_number, street FROM properties WHERE id = ?')
    .bind(args.property_id)
    .first<{ house_number: string; street: string }>();
  if (!propertyRow) return;

  const contact = await getContactInfo(db);

  // Calcular saldo pendiente actual
  const pendingRow = await db
    .prepare(
      `SELECT COALESCE(SUM(balance), 0) AS total
       FROM monthly_fees
       WHERE property_id = ? AND deleted_at IS NULL
         AND status IN ('pending','partially_paid','overdue')`
    )
    .bind(args.property_id)
    .first<{ total: number }>();
  const remainingBalance = Number(pendingRow?.total || 0);

  // Periodos cubiertos por este pago (cuotas que pasaron a paid recientemente)
  const coveredFees = await db
    .prepare(
      `SELECT DISTINCT mf.payment_period
       FROM monthly_fees mf
       WHERE mf.property_id = ? AND mf.deleted_at IS NULL AND mf.status = 'paid'
         AND mf.updated_at >= ?
       ORDER BY mf.payment_period DESC
       LIMIT 12`
    )
    .bind(args.property_id, Math.floor(Date.now() / 1000) - 60)
    .all<{ payment_period: string }>();

  const result = await sendEmail(env, {
    to: recipient.email,
    subject: `Recibo de pago ${args.folio} — Paseo Coto Tonalá`,
    html: paymentReceiptHTML({
      full_name: recipient.full_name,
      folio: args.folio,
      amount: args.amount,
      payment_method: args.payment_method,
      payment_date: new Date(args.payment_date * 1000),
      property_address: `${propertyRow.street} #${propertyRow.house_number}`,
      notes: args.notes,
      fees_covered: (coveredFees.results || []).map((r) => r.payment_period),
      remaining_balance: remainingBalance > 0 ? remainingBalance : undefined,
      contact_phone: contact.phone,
    }),
  });

  await logNotification(db, {
    type: 'payment_receipt',
    target_email: recipient.email,
    payment_id: args.payment_id,
    property_id: args.property_id,
    resident_id: recipient.resident_id,
    status: result.sent ? 'sent' : result.skipped ? 'skipped' : 'failed',
    reason: result.reason,
  });
}

/**
 * Recordatorios automáticos diarios. Ejecutado por el cron.
 * Devuelve resumen del ciclo.
 */
export async function runDailyNotifications(
  db: D1Database,
  env: NotifEnv
): Promise<{
  upcoming_sent: number;
  overdue_sent: number;
  suspension_sent: number;
  skipped: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const dayInSec = 86400;
  let upcomingSent = 0;
  let overdueSent = 0;
  let suspensionSent = 0;
  let skipped = 0;

  // Leer settings de días
  const upcomingDaysRow = await db
    .prepare("SELECT value FROM system_settings WHERE key = 'upcoming_notice_days'")
    .first<{ value: string }>();
  const upcomingDays = Number(upcomingDaysRow?.value || 5);

  const overdueDaysRow = await db
    .prepare("SELECT value FROM system_settings WHERE key = 'overdue_reminder_days'")
    .first<{ value: string }>();
  let overdueDays: number[] = [5, 10, 15, 20];
  try {
    const parsed = JSON.parse(overdueDaysRow?.value || '[5,10,15,20]');
    if (Array.isArray(parsed)) overdueDays = parsed.map(Number).filter((n) => !isNaN(n));
  } catch {}

  const contact = await getContactInfo(db);

  // ============================================================
  // 1) Cuotas próximas a vencer (vencen en `upcomingDays` días)
  // ============================================================
  const upcomingThresholdLo = now + (upcomingDays - 1) * dayInSec;
  const upcomingThresholdHi = now + (upcomingDays + 1) * dayInSec;

  const upcomingFees = await db
    .prepare(
      `SELECT f.id, f.property_id, f.balance, f.due_date, f.payment_period,
              r.id AS resident_id, r.email, r.full_name,
              p.house_number, p.street
       FROM monthly_fees f
       JOIN properties p ON p.id = f.property_id AND p.deleted_at IS NULL
       LEFT JOIN residents r ON r.id = COALESCE(p.current_resident_id, p.owner_id) AND r.deleted_at IS NULL
       WHERE f.deleted_at IS NULL
         AND f.status IN ('pending','partially_paid')
         AND f.due_date BETWEEN ? AND ?
         AND r.email IS NOT NULL`
    )
    .bind(upcomingThresholdLo, upcomingThresholdHi)
    .all<any>();

  for (const fee of upcomingFees.results || []) {
    if (await alreadySent(db, 'upcoming_fee', fee.id, upcomingDays)) {
      skipped++;
      continue;
    }
    const daysRemaining = Math.max(1, Math.round((fee.due_date - now) / dayInSec));
    const result = await sendEmail(env, {
      to: fee.email,
      subject: `Cuota próxima a vencer — ${fee.payment_period}`,
      html: upcomingDueFeeHTML({
        full_name: fee.full_name,
        property_address: `${fee.street} #${fee.house_number}`,
        amount: Number(fee.balance),
        due_date: new Date(fee.due_date * 1000),
        days_remaining: daysRemaining,
        payment_url: env.APP_URL ? `${env.APP_URL}/resident` : undefined,
        contact_phone: contact.phone,
      }),
    });
    await logNotification(db, {
      type: 'upcoming_fee',
      target_email: fee.email,
      fee_id: fee.id,
      property_id: fee.property_id,
      resident_id: fee.resident_id,
      days_offset: upcomingDays,
      status: result.sent ? 'sent' : result.skipped ? 'skipped' : 'failed',
      reason: result.reason,
    });
    if (result.sent) upcomingSent++;
  }

  // ============================================================
  // 2) Recordatorios de mora (cada mes vencido genera su propio set)
  // ============================================================
  for (const offset of overdueDays) {
    const targetLo = now - (offset + 1) * dayInSec;
    const targetHi = now - (offset - 1) * dayInSec;

    // Cuotas que vencieron hace `offset` días (± 1 día de tolerancia)
    const overdueFees = await db
      .prepare(
        `SELECT f.id, f.property_id, f.due_date,
                r.id AS resident_id, r.email, r.full_name,
                p.house_number, p.street
         FROM monthly_fees f
         JOIN properties p ON p.id = f.property_id AND p.deleted_at IS NULL
         LEFT JOIN residents r ON r.id = COALESCE(p.current_resident_id, p.owner_id) AND r.deleted_at IS NULL
         WHERE f.deleted_at IS NULL
           AND f.status IN ('pending','partially_paid','overdue')
           AND f.due_date BETWEEN ? AND ?
           AND r.email IS NOT NULL`
      )
      .bind(targetLo, targetHi)
      .all<any>();

    for (const fee of overdueFees.results || []) {
      if (await alreadySent(db, 'overdue_reminder', fee.id, offset)) {
        skipped++;
        continue;
      }

      // Total de adeudo del residente en esta propiedad
      const totalsRow = await db
        .prepare(
          `SELECT COALESCE(SUM(balance), 0) AS adeudo,
                  COUNT(*) AS cuotas_vencidas
           FROM monthly_fees
           WHERE property_id = ? AND deleted_at IS NULL
             AND status IN ('pending','partially_paid','overdue')
             AND due_date < ?`
        )
        .bind(fee.property_id, now)
        .first<{ adeudo: number; cuotas_vencidas: number }>();

      const surchargeRow = await db
        .prepare(
          `SELECT COALESCE(SUM(surcharge_amount), 0) AS total
           FROM late_fees
           WHERE property_id = ? AND status != 'cancelled'`
        )
        .bind(fee.property_id)
        .first<{ total: number }>();

      const result = await sendEmail(env, {
        to: fee.email,
        subject: `Pagos vencidos · ${offset} días`,
        html: overdueReminderHTML({
          full_name: fee.full_name,
          property_address: `${fee.street} #${fee.house_number}`,
          amount_owed: Number(totalsRow?.adeudo || 0),
          days_overdue: offset,
          fees_overdue_count: Number(totalsRow?.cuotas_vencidas || 1),
          surcharge_total: Number(surchargeRow?.total || 0),
          payment_url: env.APP_URL ? `${env.APP_URL}/resident` : undefined,
          contact_phone: contact.phone,
        }),
      });

      await logNotification(db, {
        type: 'overdue_reminder',
        target_email: fee.email,
        fee_id: fee.id,
        property_id: fee.property_id,
        resident_id: fee.resident_id,
        days_offset: offset,
        status: result.sent ? 'sent' : result.skipped ? 'skipped' : 'failed',
        reason: result.reason,
      });
      if (result.sent) overdueSent++;
    }
  }

  // ============================================================
  // 3) Aviso de suspensión (propiedades que pasaron a 2+ meses)
  // ============================================================
  const suspended = await db
    .prepare(
      `SELECT p.id AS property_id, p.house_number, p.street, p.months_overdue,
              r.id AS resident_id, r.email, r.full_name
       FROM properties p
       LEFT JOIN residents r ON r.id = COALESCE(p.current_resident_id, p.owner_id) AND r.deleted_at IS NULL
       WHERE p.deleted_at IS NULL
         AND p.delinquency_status IN ('mora_2_meses','suspendido')
         AND r.email IS NOT NULL`
    )
    .all<any>();

  for (const prop of suspended.results || []) {
    // Idempotencia por propiedad (no por fee). Reusamos notification_log con fee_id=null.
    const lastSent = await db
      .prepare(
        `SELECT 1 FROM notification_log
         WHERE type = 'suspension_notice' AND property_id = ?
           AND sent_at > ? AND status = 'sent'
         LIMIT 1`
      )
      .bind(prop.property_id, now - 30 * dayInSec)
      .first();
    if (lastSent) {
      skipped++;
      continue;
    }

    const totalsRow = await db
      .prepare(
        `SELECT COALESCE(SUM(balance), 0) AS adeudo
         FROM monthly_fees
         WHERE property_id = ? AND deleted_at IS NULL
           AND status IN ('pending','partially_paid','overdue')`
      )
      .bind(prop.property_id)
      .first<{ adeudo: number }>();

      const result = await sendEmail(env, {
        to: prop.email,
        subject: 'Suspensión de servicios — Paseo Coto Tonalá',
        html: suspensionNoticeHTML({
          full_name: prop.full_name,
          property_address: `${prop.street} #${prop.house_number}`,
          amount_owed: Number(totalsRow?.adeudo || 0),
          months_overdue: Number(prop.months_overdue || 0),
          contact_phone: contact.phone,
        }),
      });

    await logNotification(db, {
      type: 'suspension_notice',
      target_email: prop.email,
      property_id: prop.property_id,
      resident_id: prop.resident_id,
      status: result.sent ? 'sent' : result.skipped ? 'skipped' : 'failed',
      reason: result.reason,
    });
    if (result.sent) suspensionSent++;
  }

  return {
    upcoming_sent: upcomingSent,
    overdue_sent: overdueSent,
    suspension_sent: suspensionSent,
    skipped,
  };
}

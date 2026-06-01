/**
 * Servicio de apartado de la terraza (área común).
 *
 * Flujo (todo manual mientras no haya pasarela de pago):
 *   solicitada → aprobada → confirmada (pago recibido) → completada (depósito devuelto)
 *               ↘ rechazada            ↘ cancelada
 *
 * Reglas:
 * - Solo casas AL CORRIENTE pueden apartar (Art. del reglamento: la mora
 *   restringe el uso de la terraza).
 * - Una fecha no puede tener dos apartados en estado aprobada/confirmada/completada.
 * - Montos (cuota de uso + depósito) se toman de system_settings pero el admin
 *   puede ajustarlos al aprobar.
 */

import { throwApiError, throwNotFound } from '../middleware/error.middleware';
import {
  sendEmail,
  terraceRequestReceivedHTML,
  terraceAdminNewRequestHTML,
  terraceApprovedHTML,
  terraceRejectedHTML,
  terraceConfirmedHTML,
  terraceDepositReturnedHTML,
} from '../utils/email';

type Env = { RESEND_API_KEY?: string; EMAIL_FROM?: string; APP_URL?: string };

const BLOCKING_STATUSES = ['aprobada', 'confirmada', 'completada'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

async function getContactPhone(db: D1Database): Promise<string | undefined> {
  return (await getSetting(db, 'contact_phone')) || undefined;
}

async function generateFolio(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const yearStart = Math.floor(new Date(year, 0, 1).getTime() / 1000);
  const yearEnd = Math.floor(new Date(year + 1, 0, 1).getTime() / 1000);
  for (let attempt = 0; attempt < 3; attempt++) {
    const row = await db
      .prepare('SELECT COUNT(*) AS n FROM terrace_reservations WHERE created_at >= ? AND created_at < ?')
      .bind(yearStart, yearEnd)
      .first<{ n: number }>();
    const next = Number(row?.n || 0) + 1 + attempt;
    const folio = `RT-${year}-${String(next).padStart(4, '0')}`;
    const exists = await db.prepare('SELECT 1 FROM terrace_reservations WHERE folio = ?').bind(folio).first();
    if (!exists) return folio;
  }
  return `RT-${year}-${Date.now().toString().slice(-6)}`;
}

async function resolveResident(db: D1Database, propertyId: string) {
  return db
    .prepare(
      `SELECT r.id AS resident_id, r.email, r.full_name,
              p.house_number, p.street, p.delinquency_status
       FROM properties p
       LEFT JOIN residents r ON r.id = COALESCE(p.current_resident_id, p.owner_id)
       WHERE p.id = ? AND p.deleted_at IS NULL`
    )
    .bind(propertyId)
    .first<any>();
}

async function getAdminEmails(db: D1Database): Promise<string[]> {
  const rows = await db
    .prepare("SELECT email FROM users WHERE role IN ('admin','super_admin') AND status = 'active' AND email IS NOT NULL AND deleted_at IS NULL")
    .all<{ email: string }>();
  return (rows.results || []).map((r) => r.email).filter(Boolean);
}

const mapRow = (row: any) => ({
  ...row,
  fee_paid: !!row.fee_paid,
  deposit_paid: !!row.deposit_paid,
  deposit_returned: !!row.deposit_returned,
  property: row.house_number ? { id: row.property_id, house_number: row.house_number, street: row.street } : undefined,
});

// ---------------------------------------------------------------------------
// Consultas
// ---------------------------------------------------------------------------

export async function listReservations(
  db: D1Database,
  opts: { status?: string; property_id?: string; requested_by_user_id?: string; from_today?: boolean }
) {
  const where: string[] = ['t.deleted_at IS NULL'];
  const binds: any[] = [];
  if (opts.status) { where.push('t.status = ?'); binds.push(opts.status); }
  if (opts.property_id) { where.push('t.property_id = ?'); binds.push(opts.property_id); }
  if (opts.requested_by_user_id) { where.push('t.requested_by_user_id = ?'); binds.push(opts.requested_by_user_id); }

  const rows = await db
    .prepare(
      `SELECT t.*, p.house_number, p.street,
              u.full_name AS requester_name,
              rb.full_name AS received_by_name
       FROM terrace_reservations t
       LEFT JOIN properties p ON p.id = t.property_id
       LEFT JOIN users u ON u.id = t.requested_by_user_id
       LEFT JOIN users rb ON rb.id = t.received_by_user_id
       WHERE ${where.join(' AND ')}
       ORDER BY t.event_date DESC, t.created_at DESC`
    )
    .bind(...binds)
    .all<any>();
  return (rows.results || []).map(mapRow);
}

export async function getReservationById(db: D1Database, id: string) {
  const row = await db
    .prepare(
      `SELECT t.*, p.house_number, p.street, u.full_name AS requester_name
       FROM terrace_reservations t
       LEFT JOIN properties p ON p.id = t.property_id
       LEFT JOIN users u ON u.id = t.requested_by_user_id
       WHERE t.id = ? AND t.deleted_at IS NULL`
    )
    .bind(id)
    .first<any>();
  return row ? mapRow(row) : null;
}

/** Fechas ya ocupadas (aprobadas/confirmadas/completadas) desde hoy. */
export async function getTakenDates(db: D1Database): Promise<string[]> {
  const rows = await db
    .prepare(
      `SELECT DISTINCT event_date FROM terrace_reservations
       WHERE deleted_at IS NULL AND status IN ('aprobada','confirmada','completada')`
    )
    .all<{ event_date: string }>();
  return (rows.results || []).map((r) => r.event_date);
}

async function dateIsTaken(db: D1Database, eventDate: string, excludeId?: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 FROM terrace_reservations
       WHERE deleted_at IS NULL AND event_date = ? AND status IN ('aprobada','confirmada','completada')
       ${excludeId ? 'AND id != ?' : ''} LIMIT 1`
    )
    .bind(...(excludeId ? [eventDate, excludeId] : [eventDate]))
    .first();
  return !!row;
}

// ---------------------------------------------------------------------------
// Acciones
// ---------------------------------------------------------------------------

export async function createReservation(
  db: D1Database,
  data: { property_id: string; event_date: string; event_type?: string; guests_estimate?: number; resident_notes?: string; requested_by_user_id?: string },
  env?: Env
) {
  const info = await resolveResident(db, data.property_id);
  if (!info) throwNotFound('Propiedad');

  // Regla del reglamento: solo casas al corriente
  if (info.delinquency_status && info.delinquency_status !== 'al_corriente') {
    throwApiError('La casa tiene adeudos. El reglamento no permite apartar la terraza con cuotas vencidas.', 400, 'NOT_CURRENT');
  }

  // No permitir fechas ya garantizadas
  if (await dateIsTaken(db, data.event_date)) {
    throwApiError('Esa fecha ya está apartada. Elige otra.', 409, 'DATE_TAKEN');
  }

  const reservationFee = Number((await getSetting(db, 'terrace_reservation_fee')) || 0);
  const depositAmount = Number((await getSetting(db, 'terrace_deposit_amount')) || 0);

  const id = crypto.randomUUID();
  const folio = await generateFolio(db);
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `INSERT INTO terrace_reservations
        (id, folio, property_id, requested_by_user_id, resident_id, event_date, event_type, guests_estimate,
         status, reservation_fee, deposit_amount, resident_notes, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'solicitada', ?, ?, ?, ?, ?)`
    )
    .bind(
      id, folio, data.property_id, data.requested_by_user_id || null, info.resident_id || null,
      data.event_date, data.event_type || null, data.guests_estimate || null,
      reservationFee, depositAmount, data.resident_notes || null, now, now
    )
    .run();

  // Emails (no rompen la operación si fallan)
  if (env) {
    const phone = await getContactPhone(db);
    const address = `${info.street || ''} ${info.house_number || ''}`.trim();
    try {
      if (info.email) {
        await sendEmail(env, {
          to: info.email,
          subject: 'Recibimos tu solicitud de terraza',
          html: terraceRequestReceivedHTML({ full_name: info.full_name || 'vecino', event_date: data.event_date, folio, contact_phone: phone }),
        });
      }
      const admins = await getAdminEmails(db);
      if (admins.length) {
        await sendEmail(env, {
          to: admins,
          subject: `Nueva solicitud de terraza — ${address}`,
          html: terraceAdminNewRequestHTML({
            property_address: address, requester_name: info.full_name || 'vecino',
            event_date: data.event_date, folio,
            app_url: env.APP_URL ? `${env.APP_URL}/dashboard/terraza` : undefined, contact_phone: phone,
          }),
        });
      }
    } catch (e) {
      console.error('[terrace] email solicitud falló:', e);
    }
  }

  return getReservationById(db, id);
}

export async function approveReservation(
  db: D1Database,
  id: string,
  data: { reservation_fee?: number; deposit_amount?: number; payment_instructions?: string; admin_notes?: string; reviewed_by_user_id?: string },
  env?: Env
) {
  const r = await getReservationById(db, id);
  if (!r) throwNotFound('Reservación');
  if (r.status !== 'solicitada') throwApiError(`No se puede aprobar una reservación en estado "${r.status}".`, 400);
  if (await dateIsTaken(db, r.event_date, id)) throwApiError('Esa fecha ya fue apartada por otra reservación.', 409, 'DATE_TAKEN');

  const fee = data.reservation_fee != null ? data.reservation_fee : r.reservation_fee;
  const deposit = data.deposit_amount != null ? data.deposit_amount : r.deposit_amount;
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(
      `UPDATE terrace_reservations
       SET status = 'aprobada', reservation_fee = ?, deposit_amount = ?, admin_notes = ?, reviewed_by_user_id = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(fee, deposit, data.admin_notes ?? r.admin_notes ?? null, data.reviewed_by_user_id || null, now, id)
    .run();

  if (env && r.resident_id) {
    const info = await db.prepare('SELECT email, full_name FROM residents WHERE id = ?').bind(r.resident_id).first<any>();
    if (info?.email) {
      const phone = await getContactPhone(db);
      try {
        await sendEmail(env, {
          to: info.email,
          subject: 'Tu apartado de terraza fue aprobado',
          html: terraceApprovedHTML({
            full_name: info.full_name || 'vecino', event_date: r.event_date, folio: r.folio,
            reservation_fee: fee, deposit_amount: deposit, payment_instructions: data.payment_instructions, contact_phone: phone,
          }),
        });
      } catch (e) { console.error('[terrace] email aprobada falló:', e); }
    }
  }
  return getReservationById(db, id);
}

export async function rejectReservation(db: D1Database, id: string, data: { reason?: string; reviewed_by_user_id?: string }, env?: Env) {
  const r = await getReservationById(db, id);
  if (!r) throwNotFound('Reservación');
  if (!['solicitada', 'aprobada'].includes(r.status)) throwApiError(`No se puede rechazar una reservación en estado "${r.status}".`, 400);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(`UPDATE terrace_reservations SET status = 'rechazada', admin_notes = ?, reviewed_by_user_id = ?, updated_at = ? WHERE id = ?`)
    .bind(data.reason ?? r.admin_notes ?? null, data.reviewed_by_user_id || null, now, id)
    .run();

  if (env && r.resident_id) {
    const info = await db.prepare('SELECT email, full_name FROM residents WHERE id = ?').bind(r.resident_id).first<any>();
    if (info?.email) {
      const phone = await getContactPhone(db);
      try {
        await sendEmail(env, {
          to: info.email,
          subject: 'Tu solicitud de terraza no fue aprobada',
          html: terraceRejectedHTML({ full_name: info.full_name || 'vecino', event_date: r.event_date, reason: data.reason, contact_phone: phone }),
        });
      } catch (e) { console.error('[terrace] email rechazada falló:', e); }
    }
  }
  return getReservationById(db, id);
}

export async function markPaid(
  db: D1Database,
  id: string,
  data: { payment_method: string; payment_reference?: string; received_by_user_id?: string },
  env?: Env
) {
  const r = await getReservationById(db, id);
  if (!r) throwNotFound('Reservación');
  if (r.status !== 'aprobada') throwApiError('Solo se puede registrar el pago de una reservación aprobada.', 400);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE terrace_reservations
       SET status = 'confirmada', fee_paid = 1, deposit_paid = 1, payment_method = ?, payment_reference = ?,
           received_by_user_id = ?, paid_at = ?, updated_at = ?
       WHERE id = ?`
    )
    .bind(data.payment_method, data.payment_reference || null, data.received_by_user_id || null, now, now, id)
    .run();

  if (env && r.resident_id) {
    const info = await db.prepare('SELECT email, full_name FROM residents WHERE id = ?').bind(r.resident_id).first<any>();
    if (info?.email) {
      const phone = await getContactPhone(db);
      try {
        await sendEmail(env, {
          to: info.email,
          subject: 'Terraza apartada — reservación confirmada',
          html: terraceConfirmedHTML({ full_name: info.full_name || 'vecino', event_date: r.event_date, folio: r.folio, deposit_amount: r.deposit_amount, contact_phone: phone }),
        });
      } catch (e) { console.error('[terrace] email confirmada falló:', e); }
    }
  }
  return getReservationById(db, id);
}

export async function markReturned(
  db: D1Database,
  id: string,
  data: { returned_amount: number; method?: string; admin_notes?: string },
  env?: Env
) {
  const r = await getReservationById(db, id);
  if (!r) throwNotFound('Reservación');
  if (r.status !== 'confirmada') throwApiError('Solo se puede devolver el depósito de una reservación confirmada.', 400);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `UPDATE terrace_reservations
       SET status = 'completada', deposit_returned = 1, deposit_returned_amount = ?, deposit_return_method = ?,
           returned_at = ?, admin_notes = COALESCE(?, admin_notes), updated_at = ?
       WHERE id = ?`
    )
    .bind(data.returned_amount, data.method || null, now, data.admin_notes || null, now, id)
    .run();

  if (env && r.resident_id) {
    const info = await db.prepare('SELECT email, full_name FROM residents WHERE id = ?').bind(r.resident_id).first<any>();
    if (info?.email) {
      const phone = await getContactPhone(db);
      try {
        await sendEmail(env, {
          to: info.email,
          subject: 'Depósito de terraza devuelto',
          html: terraceDepositReturnedHTML({ full_name: info.full_name || 'vecino', event_date: r.event_date, returned_amount: data.returned_amount, method: data.method, contact_phone: phone }),
        });
      } catch (e) { console.error('[terrace] email devolución falló:', e); }
    }
  }
  return getReservationById(db, id);
}

export async function cancelReservation(db: D1Database, id: string, byUserId?: string) {
  const r = await getReservationById(db, id);
  if (!r) throwNotFound('Reservación');
  if (['completada', 'cancelada', 'rechazada'].includes(r.status)) {
    throwApiError(`No se puede cancelar una reservación en estado "${r.status}".`, 400);
  }
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(`UPDATE terrace_reservations SET status = 'cancelada', updated_at = ? WHERE id = ?`)
    .bind(now, id)
    .run();
  return getReservationById(db, id);
}

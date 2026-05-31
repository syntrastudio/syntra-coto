/**
 * Servicio de caja por miembro de la mesa.
 *
 * Modelo: cada user con rol admin/super_admin tiene un "balance" que es la
 * suma de `cash_movements.amount`. Los movimientos pueden ser:
 *   - receipt:       +amount (cobró un pago de un residente)
 *   - transfer_in:   +amount (otro miembro le entregó dinero)
 *   - transfer_out:  -amount (entregó dinero a otro miembro)
 *   - deposit_bank:  -amount (depositó al banco o entregó a la mesa)
 *   - adjustment:    ±amount (ajuste manual)
 *
 * Auditoría: cada movimiento conserva `payment_id` (si vino de un pago),
 * `related_user_id` (si fue transferencia interna), `notes`, `created_by`.
 */

import type { D1Database } from '@cloudflare/workers-types';

export type CashMovementType = 'receipt' | 'transfer_in' | 'transfer_out' | 'deposit_bank' | 'adjustment';

interface RecordMovementArgs {
  user_id: string;
  type: CashMovementType;
  amount: number;
  payment_id?: string | null;
  related_user_id?: string | null;
  notes?: string | null;
  created_by: string | null;
}

/**
 * Registra un movimiento. `amount` debe venir con SIGNO ya aplicado:
 * positivo para entradas, negativo para salidas.
 */
export async function recordCashMovement(db: D1Database, m: RecordMovementArgs): Promise<void> {
  await db
    .prepare(
      `INSERT INTO cash_movements (user_id, type, amount, payment_id, related_user_id, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      m.user_id,
      m.type,
      m.amount,
      m.payment_id || null,
      m.related_user_id || null,
      m.notes || null,
      m.created_by
    )
    .run();
}

/**
 * Balance actual de un usuario (suma de movimientos).
 */
export async function getBalance(db: D1Database, userId: string): Promise<number> {
  const r = await db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS bal FROM cash_movements WHERE user_id = ?')
    .bind(userId)
    .first<{ bal: number }>();
  return Number(r?.bal || 0);
}

/**
 * Lista todos los miembros admin con su balance actual y conteo de movimientos.
 */
export async function listMesaBalances(db: D1Database): Promise<
  Array<{ id: string; full_name: string; email: string; role: string; balance: number; movements_count: number; last_movement_at: number | null }>
> {
  const result = await db
    .prepare(
      `SELECT
         u.id, u.full_name, u.email, u.role,
         COALESCE(SUM(m.amount), 0) AS balance,
         COUNT(m.id) AS movements_count,
         MAX(m.created_at) AS last_movement_at
       FROM users u
       LEFT JOIN cash_movements m ON m.user_id = u.id
       WHERE u.deleted_at IS NULL
         AND u.role IN ('super_admin','admin')
       GROUP BY u.id
       ORDER BY u.full_name`
    )
    .all<any>();
  return (result.results || []).map((r: any) => ({
    id: r.id,
    full_name: r.full_name,
    email: r.email,
    role: r.role,
    balance: Number(r.balance || 0),
    movements_count: Number(r.movements_count || 0),
    last_movement_at: r.last_movement_at ? Number(r.last_movement_at) : null,
  }));
}

/**
 * Historial de movimientos de un usuario (paginado).
 */
export async function listMovements(
  db: D1Database,
  userId: string,
  limit = 50,
  offset = 0
): Promise<Array<any>> {
  const result = await db
    .prepare(
      `SELECT
         m.*,
         p.folio AS payment_folio,
         p.property_id AS payment_property_id,
         pr.house_number AS property_house_number,
         pr.street AS property_street,
         u_related.full_name AS related_user_name,
         u_creator.full_name AS created_by_name
       FROM cash_movements m
       LEFT JOIN payments p ON m.payment_id = p.id
       LEFT JOIN properties pr ON p.property_id = pr.id
       LEFT JOIN users u_related ON m.related_user_id = u_related.id
       LEFT JOIN users u_creator ON m.created_by = u_creator.id
       WHERE m.user_id = ?
       ORDER BY m.created_at DESC
       LIMIT ? OFFSET ?`
    )
    .bind(userId, limit, offset)
    .all<any>();
  return result.results || [];
}

/**
 * Transferencia entre miembros: de `from` (entrega) a `to` (recibe).
 */
export async function transferBetweenMembers(
  db: D1Database,
  args: { from_user_id: string; to_user_id: string; amount: number; notes?: string; created_by: string }
): Promise<void> {
  if (args.from_user_id === args.to_user_id) throw new Error('No puedes transferir a ti mismo');
  if (args.amount <= 0) throw new Error('El monto debe ser positivo');

  await db.batch([
    db.prepare(
      `INSERT INTO cash_movements (user_id, type, amount, related_user_id, notes, created_by)
       VALUES (?, 'transfer_out', ?, ?, ?, ?)`
    ).bind(args.from_user_id, -args.amount, args.to_user_id, args.notes || null, args.created_by),
    db.prepare(
      `INSERT INTO cash_movements (user_id, type, amount, related_user_id, notes, created_by)
       VALUES (?, 'transfer_in', ?, ?, ?, ?)`
    ).bind(args.to_user_id, args.amount, args.from_user_id, args.notes || null, args.created_by),
  ]);
}

/**
 * Depósito al banco (sale del sistema, balance del miembro baja).
 */
export async function depositToBank(
  db: D1Database,
  args: { user_id: string; amount: number; notes?: string; created_by: string }
): Promise<void> {
  if (args.amount <= 0) throw new Error('El monto debe ser positivo');
  await recordCashMovement(db, {
    user_id: args.user_id,
    type: 'deposit_bank',
    amount: -args.amount,
    notes: args.notes,
    created_by: args.created_by,
  });
}

/**
 * Ajuste manual (solo super_admin debería poder hacerlo).
 */
export async function adjustBalance(
  db: D1Database,
  args: { user_id: string; amount: number; notes: string; created_by: string }
): Promise<void> {
  if (args.amount === 0) throw new Error('El monto no puede ser cero');
  if (!args.notes || args.notes.trim().length < 5) {
    throw new Error('Los ajustes requieren una nota descriptiva (mín 5 caracteres)');
  }
  await recordCashMovement(db, {
    user_id: args.user_id,
    type: 'adjustment',
    amount: args.amount,
    notes: args.notes,
    created_by: args.created_by,
  });
}

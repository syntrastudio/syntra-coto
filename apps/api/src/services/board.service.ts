/**
 * Servicio de la Mesa Directiva (board_members).
 *
 * Los miembros de la mesa son los usuarios que pueden aprobar cambios sensibles
 * mediante firma múltiple — en particular, el cambio de la cuenta de Mercado
 * Pago. Un miembro con `can_approve_gateway = 1` cuenta para la unanimidad.
 */

export type BoardPosition = 'presidente' | 'tesorero' | 'secretario' | 'vocal' | 'suplente';

export interface BoardMember {
  id: string;
  user_id: string;
  position: BoardPosition;
  can_approve_gateway: number;
  term_start: number | null;
  term_end: number | null;
  is_active: number;
  notes: string | null;
  created_by: string | null;
  created_at: number;
  updated_at: number;
  // Datos del usuario (join)
  full_name?: string;
  email?: string;
  role?: string;
  user_status?: string;
}

function apiError(message: string, statusCode = 400): Error & { statusCode: number } {
  const e = new Error(message) as Error & { statusCode: number };
  e.statusCode = statusCode;
  return e;
}

const POSITION_ORDER = `CASE b.position
  WHEN 'presidente' THEN 0
  WHEN 'tesorero' THEN 1
  WHEN 'secretario' THEN 2
  WHEN 'vocal' THEN 3
  ELSE 4 END`;

export async function listBoardMembers(db: D1Database): Promise<BoardMember[]> {
  const rows = await db
    .prepare(
      `SELECT b.*, u.full_name, u.email, u.role, u.status AS user_status
       FROM board_members b
       JOIN users u ON u.id = b.user_id AND u.deleted_at IS NULL
       WHERE b.deleted_at IS NULL
       ORDER BY ${POSITION_ORDER}, u.full_name`
    )
    .all<BoardMember>();
  return rows.results || [];
}

export async function getBoardMember(db: D1Database, id: string): Promise<BoardMember | null> {
  return db
    .prepare(
      `SELECT b.*, u.full_name, u.email, u.role, u.status AS user_status
       FROM board_members b
       JOIN users u ON u.id = b.user_id AND u.deleted_at IS NULL
       WHERE b.id = ? AND b.deleted_at IS NULL`
    )
    .bind(id)
    .first<BoardMember>();
}

/** Miembros activos que cuentan para la firma múltiple del cambio de cuenta. */
export async function listActiveApprovers(db: D1Database): Promise<BoardMember[]> {
  const rows = await db
    .prepare(
      `SELECT b.*, u.full_name, u.email, u.role, u.status AS user_status
       FROM board_members b
       JOIN users u ON u.id = b.user_id AND u.deleted_at IS NULL AND u.status = 'active'
       WHERE b.deleted_at IS NULL AND b.is_active = 1 AND b.can_approve_gateway = 1
       ORDER BY ${POSITION_ORDER}, u.full_name`
    )
    .all<BoardMember>();
  return rows.results || [];
}

/** ¿Este usuario es un aprobador activo de la mesa? */
export async function isActiveApprover(db: D1Database, userId: string): Promise<BoardMember | null> {
  return db
    .prepare(
      `SELECT b.*, u.full_name, u.email
       FROM board_members b
       JOIN users u ON u.id = b.user_id AND u.deleted_at IS NULL AND u.status = 'active'
       WHERE b.user_id = ? AND b.deleted_at IS NULL AND b.is_active = 1 AND b.can_approve_gateway = 1`
    )
    .bind(userId)
    .first<BoardMember>();
}

/** Usuarios que pueden agregarse a la mesa (con login, activos, aún no en la mesa). */
export async function listEligibleUsers(db: D1Database): Promise<
  Array<{ id: string; full_name: string; email: string; role: string }>
> {
  const rows = await db
    .prepare(
      `SELECT u.id, u.full_name, u.email, u.role
       FROM users u
       WHERE u.deleted_at IS NULL AND u.status = 'active'
         AND u.id NOT IN (
           SELECT user_id FROM board_members WHERE deleted_at IS NULL
         )
       ORDER BY u.full_name`
    )
    .all<{ id: string; full_name: string; email: string; role: string }>();
  return rows.results || [];
}

export async function addBoardMember(
  db: D1Database,
  data: {
    user_id: string;
    position: BoardPosition;
    can_approve_gateway?: boolean;
    term_start?: number | null;
    term_end?: number | null;
    notes?: string | null;
    created_by?: string | null;
  }
): Promise<BoardMember> {
  const user = await db
    .prepare("SELECT id FROM users WHERE id = ? AND deleted_at IS NULL AND status = 'active'")
    .bind(data.user_id)
    .first<{ id: string }>();
  if (!user) throw apiError('El usuario no existe o no está activo.', 404);

  const existing = await db
    .prepare('SELECT id FROM board_members WHERE user_id = ? AND deleted_at IS NULL')
    .bind(data.user_id)
    .first<{ id: string }>();
  if (existing) throw apiError('Ese usuario ya es miembro de la mesa.', 409);

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      `INSERT INTO board_members
        (id, user_id, position, can_approve_gateway, term_start, term_end, is_active, notes, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
    )
    .bind(
      id,
      data.user_id,
      data.position,
      data.can_approve_gateway === false ? 0 : 1,
      data.term_start ?? null,
      data.term_end ?? null,
      data.notes ?? null,
      data.created_by ?? null,
      now,
      now
    )
    .run();

  const created = await getBoardMember(db, id);
  if (!created) throw apiError('No se pudo crear el miembro de la mesa.', 500);
  return created;
}

export async function updateBoardMember(
  db: D1Database,
  id: string,
  data: {
    position?: BoardPosition;
    can_approve_gateway?: boolean;
    term_start?: number | null;
    term_end?: number | null;
    is_active?: boolean;
    notes?: string | null;
  }
): Promise<BoardMember> {
  const member = await getBoardMember(db, id);
  if (!member) throw apiError('Miembro no encontrado.', 404);

  const updates: string[] = [];
  const values: any[] = [];
  if (data.position !== undefined) { updates.push('position = ?'); values.push(data.position); }
  if (data.can_approve_gateway !== undefined) { updates.push('can_approve_gateway = ?'); values.push(data.can_approve_gateway ? 1 : 0); }
  if (data.term_start !== undefined) { updates.push('term_start = ?'); values.push(data.term_start); }
  if (data.term_end !== undefined) { updates.push('term_end = ?'); values.push(data.term_end); }
  if (data.is_active !== undefined) { updates.push('is_active = ?'); values.push(data.is_active ? 1 : 0); }
  if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }

  if (updates.length === 0) return member;
  updates.push('updated_at = ?');
  values.push(Math.floor(Date.now() / 1000), id);

  await db.prepare(`UPDATE board_members SET ${updates.join(', ')} WHERE id = ?`).bind(...values).run();
  const updated = await getBoardMember(db, id);
  return updated!;
}

export async function removeBoardMember(db: D1Database, id: string): Promise<void> {
  const member = await getBoardMember(db, id);
  if (!member) throw apiError('Miembro no encontrado.', 404);
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE board_members SET deleted_at = ?, is_active = 0, updated_at = ? WHERE id = ?')
    .bind(now, now, id)
    .run();
}

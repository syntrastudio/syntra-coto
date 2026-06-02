/**
 * Bóveda de credenciales de la pasarela de pago + firma múltiple de la mesa.
 *
 * Reglas de gobernanza:
 *   - Las credenciales de Mercado Pago se guardan CIFRADAS (AES-GCM) en reposo.
 *   - Cambiar la cuenta de cobro es una PROPUESTA que debe aprobar TODA la mesa
 *     (todos los miembros activos con permiso de aprobación). Un solo rechazo la
 *     bloquea.
 *   - Se requieren al menos 2 aprobadores para usar el flujo (si no, una sola
 *     persona controlaría la cuenta y la firma múltiple no tendría sentido).
 *   - Quien propone NO completa el cambio por sí solo: aunque sea miembro, deben
 *     firmar TODOS, así que siempre hace falta al menos otra persona.
 *   - Toda propuesta caduca a los 14 días y todo queda en la bitácora (audit_logs).
 */

import { encryptSecret, decryptSecret, maskToken } from '../utils/crypto-vault';
import { mpGetMe, inferMode } from '../utils/mercadopago';
import { listActiveApprovers, isActiveApprover } from './board.service';
import {
  sendEmail,
  gatewayProposalHTML,
  gatewayActivatedHTML,
  gatewayRejectedHTML,
} from '../utils/email';
import type { Env } from '../types';

const PROPOSAL_TTL_DAYS = 14;
export const MIN_APPROVERS = 2;

function apiError(message: string, statusCode = 400): Error & { statusCode: number } {
  const e = new Error(message) as Error & { statusCode: number };
  e.statusCode = statusCode;
  return e;
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000);
}

async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const r = await db.prepare('SELECT value FROM system_settings WHERE key = ?').bind(key).first<{ value: string }>();
  return r?.value ?? null;
}

async function getUserById(
  db: D1Database,
  id: string
): Promise<{ id: string; full_name: string; email: string } | null> {
  return db
    .prepare('SELECT id, full_name, email FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(id)
    .first<{ id: string; full_name: string; email: string }>();
}

async function writeAudit(
  db: D1Database,
  args: { user_id?: string | null; action: string; entity_id?: string | null; new_values?: any }
): Promise<void> {
  try {
    await db
      .prepare(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values)
         VALUES (?, ?, 'GATEWAY_CONFIG', ?, ?)`
      )
      .bind(
        args.user_id ?? null,
        args.action,
        args.entity_id ?? null,
        args.new_values ? JSON.stringify(args.new_values) : null
      )
      .run();
  } catch (e) {
    console.error('[gateway] audit failed', e);
  }
}

// ---------------------------------------------------------------------------
// Lectura de configuración
// ---------------------------------------------------------------------------

interface GatewayConfigRow {
  id: string;
  provider: string;
  mode: 'test' | 'live';
  encrypted_access_token: string;
  public_key: string | null;
  encrypted_webhook_secret: string | null;
  collector_id: string | null;
  account_nickname: string | null;
  account_email: string | null;
  account_country: string | null;
  token_preview: string | null;
  status: string;
  activated_from_proposal_id: string | null;
  activated_by: string | null;
  activated_at: number | null;
  created_at: number;
  updated_at: number;
}

async function getActiveConfigRow(db: D1Database): Promise<GatewayConfigRow | null> {
  return db
    .prepare(
      `SELECT * FROM payment_gateway_config
       WHERE provider = 'mercadopago' AND status = 'active'
       ORDER BY activated_at DESC LIMIT 1`
    )
    .first<GatewayConfigRow>();
}

/**
 * Devuelve el access token DESCIFRADO de la cuenta activa (uso interno: crear
 * preferencias, leer pagos). `null` si no hay cuenta activa.
 */
export async function getActiveCredentials(
  db: D1Database,
  masterSecret: string
): Promise<{
  access_token: string;
  webhook_secret: string | null;
  collector_id: string | null;
  mode: 'test' | 'live';
  public_key: string | null;
} | null> {
  const row = await getActiveConfigRow(db);
  if (!row) return null;
  const access_token = await decryptSecret(row.encrypted_access_token, masterSecret);
  const webhook_secret = row.encrypted_webhook_secret
    ? await decryptSecret(row.encrypted_webhook_secret, masterSecret)
    : null;
  return {
    access_token,
    webhook_secret,
    collector_id: row.collector_id,
    mode: row.mode,
    public_key: row.public_key,
  };
}

interface ProposalRow {
  id: string;
  provider: string;
  mode: 'test' | 'live';
  encrypted_access_token: string;
  public_key: string | null;
  encrypted_webhook_secret: string | null;
  collector_id: string | null;
  account_nickname: string | null;
  account_email: string | null;
  account_country: string | null;
  token_preview: string | null;
  status: string;
  proposed_by: string;
  proposer_note: string | null;
  required_approvals: number;
  expires_at: number | null;
  decided_at: number | null;
  created_at: number;
  updated_at: number;
}

async function getPendingProposalRow(db: D1Database): Promise<ProposalRow | null> {
  return db
    .prepare(
      `SELECT * FROM gateway_config_proposals
       WHERE provider = 'mercadopago' AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`
    )
    .first<ProposalRow>();
}

/** Construye la vista (sin secretos) de una propuesta, con sus firmas. */
async function buildProposalView(db: D1Database, proposal: ProposalRow) {
  const approvers = await listActiveApprovers(db);
  const approverIds = new Set(approvers.map((a) => a.user_id));

  const approvalsRes = await db
    .prepare(
      `SELECT a.board_member_user_id, a.decision, a.comment, a.created_at,
              u.full_name, u.email
       FROM gateway_config_approvals a
       LEFT JOIN users u ON u.id = a.board_member_user_id
       WHERE a.proposal_id = ?
       ORDER BY a.created_at ASC`
    )
    .bind(proposal.id)
    .all<any>();
  const approvals = approvalsRes.results || [];

  // Solo cuentan las firmas de aprobadores que SIGUEN activos en la mesa.
  const approvedIds = new Set(
    approvals.filter((a) => a.decision === 'approve' && approverIds.has(a.board_member_user_id)).map((a) => a.board_member_user_id)
  );
  const pending = approvers.filter((a) => !approvedIds.has(a.user_id));

  const proposer = await getUserById(db, proposal.proposed_by);

  return {
    id: proposal.id,
    mode: proposal.mode,
    account_nickname: proposal.account_nickname,
    account_email: proposal.account_email,
    account_country: proposal.account_country,
    collector_id: proposal.collector_id,
    token_preview: proposal.token_preview,
    has_webhook_secret: !!proposal.encrypted_webhook_secret,
    status: proposal.status,
    proposer_note: proposal.proposer_note,
    proposed_by: proposal.proposed_by,
    proposed_by_name: proposer?.full_name || 'Desconocido',
    required_approvals: approvers.length,
    approvals_count: approvedIds.size,
    expires_at: proposal.expires_at,
    created_at: proposal.created_at,
    approvals: approvals.map((a) => ({
      user_id: a.board_member_user_id,
      full_name: a.full_name,
      decision: a.decision,
      comment: a.comment,
      created_at: a.created_at,
      counts: approverIds.has(a.board_member_user_id),
    })),
    pending_approvers: pending.map((a) => ({ user_id: a.user_id, full_name: a.full_name, position: a.position })),
  };
}

/** Estado completo para el panel de configuración de pagos. */
export async function getStatus(db: D1Database, _env: Env) {
  // Expira propuestas vencidas antes de leer.
  await db
    .prepare(
      `UPDATE gateway_config_proposals SET status = 'expired', decided_at = unixepoch(), updated_at = unixepoch()
       WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < unixepoch()`
    )
    .run();

  const activeRow = await getActiveConfigRow(db);
  let active: any = null;
  if (activeRow) {
    const activatedBy = activeRow.activated_by ? await getUserById(db, activeRow.activated_by) : null;
    active = {
      mode: activeRow.mode,
      collector_id: activeRow.collector_id,
      account_nickname: activeRow.account_nickname,
      account_email: activeRow.account_email,
      account_country: activeRow.account_country,
      token_preview: activeRow.token_preview,
      has_webhook_secret: !!activeRow.encrypted_webhook_secret,
      has_public_key: !!activeRow.public_key,
      activated_at: activeRow.activated_at,
      activated_by_name: activatedBy?.full_name || null,
    };
  }

  const approvers = await listActiveApprovers(db);
  const pendingRow = await getPendingProposalRow(db);
  const pending = pendingRow ? await buildProposalView(db, pendingRow) : null;

  const enabled = (await getSetting(db, 'mp_enabled')) === 'true';
  // Solo la TARJETA pasa por MP. Transferencia/efectivo se registran manual (sin comisión).
  const cardFees = {
    commission_pct: Number((await getSetting(db, 'mp_card_commission_pct')) ?? 0),
    fixed_fee: Number((await getSetting(db, 'mp_card_fixed_fee')) ?? 0),
    iva_pct: Number((await getSetting(db, 'mp_card_iva_pct')) ?? 0),
  };

  return {
    enabled,
    min_approvers: MIN_APPROVERS,
    can_propose: approvers.length >= MIN_APPROVERS,
    approvers: approvers.map((a) => ({
      user_id: a.user_id,
      full_name: a.full_name,
      email: a.email,
      position: a.position,
    })),
    active,
    pending,
    card_fees: cardFees,
  };
}

export async function listProposals(db: D1Database, limit = 20) {
  const res = await db
    .prepare(
      `SELECT p.id, p.mode, p.account_nickname, p.account_email, p.collector_id, p.token_preview,
              p.status, p.proposed_by, p.required_approvals, p.expires_at, p.decided_at, p.created_at,
              u.full_name AS proposed_by_name
       FROM gateway_config_proposals p
       LEFT JOIN users u ON u.id = p.proposed_by
       ORDER BY p.created_at DESC
       LIMIT ?`
    )
    .bind(limit)
    .all<any>();
  return res.results || [];
}

// ---------------------------------------------------------------------------
// Mutaciones (firma múltiple)
// ---------------------------------------------------------------------------

async function notifyBoard(
  db: D1Database,
  env: Env,
  buildHtml: (recipientName: string) => string,
  subject: string,
  proposal: { proposed_by: string }
): Promise<void> {
  const approvers = await listActiveApprovers(db);
  const recipients = new Map<string, string>(); // email -> name
  for (const a of approvers) {
    if (a.email) recipients.set(a.email.toLowerCase(), a.full_name || 'Miembro de la mesa');
  }
  const proposer = await getUserById(db, proposal.proposed_by);
  if (proposer?.email && !recipients.has(proposer.email.toLowerCase())) {
    recipients.set(proposer.email.toLowerCase(), proposer.full_name || 'Miembro de la mesa');
  }
  const sends = Array.from(recipients.entries()).map(([email, name]) =>
    sendEmail(env, { to: email, subject, html: buildHtml(name) }).catch((e) => {
      console.error('[gateway] email failed', email, e);
      return { sent: false };
    })
  );
  await Promise.allSettled(sends);
}

export async function proposeChange(
  db: D1Database,
  env: Env,
  input: {
    access_token: string;
    public_key?: string | null;
    webhook_secret?: string | null;
    proposed_by: string;
    proposer_note?: string | null;
  }
) {
  const approvers = await listActiveApprovers(db);
  if (approvers.length < MIN_APPROVERS) {
    throw apiError(
      `Se necesitan al menos ${MIN_APPROVERS} miembros de la mesa (con permiso de aprobación) para poder cambiar la cuenta de cobro. Agrega miembros en "Mesa Directiva".`,
      400
    );
  }

  const accessToken = input.access_token.trim();
  if (!accessToken) throw apiError('Falta el access token de Mercado Pago.', 400);

  // Validar credenciales e identificar la cuenta receptora.
  const account = await mpGetMe(accessToken);
  if (account.site_id && account.site_id !== 'MLM') {
    throw apiError(
      `La cuenta de Mercado Pago no es de México (site: ${account.site_id}). Usa una cuenta de MP México.`,
      400
    );
  }
  const mode = inferMode(accessToken);

  const encToken = await encryptSecret(accessToken, env.JWT_SECRET);
  const encWebhook = input.webhook_secret?.trim()
    ? await encryptSecret(input.webhook_secret.trim(), env.JWT_SECRET)
    : null;
  const tokenPreview = maskToken(accessToken);

  // Reemplazar cualquier propuesta pendiente (toda edición = nueva propuesta,
  // por lo que las firmas anteriores se invalidan automáticamente).
  await db
    .prepare(
      `UPDATE gateway_config_proposals SET status = 'superseded', decided_at = unixepoch(), updated_at = unixepoch()
       WHERE status = 'pending'`
    )
    .run();

  const id = crypto.randomUUID();
  const now = nowSec();
  const expires = now + PROPOSAL_TTL_DAYS * 86400;
  const nickname = account.nickname || [account.first_name, account.last_name].filter(Boolean).join(' ') || null;

  await db
    .prepare(
      `INSERT INTO gateway_config_proposals
        (id, provider, mode, encrypted_access_token, public_key, encrypted_webhook_secret,
         collector_id, account_nickname, account_email, account_country, token_preview,
         status, proposed_by, proposer_note, required_approvals, expires_at, created_at, updated_at)
       VALUES (?, 'mercadopago', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id,
      mode,
      encToken,
      input.public_key?.trim() || null,
      encWebhook,
      account.id,
      nickname,
      account.email || null,
      account.site_id || null,
      tokenPreview,
      input.proposed_by,
      input.proposer_note?.trim() || null,
      approvers.length,
      expires,
      now,
      now
    )
    .run();

  await writeAudit(db, {
    user_id: input.proposed_by,
    action: 'PROPOSE',
    entity_id: id,
    new_values: { mode, collector_id: account.id, account_nickname: nickname, account_email: account.email },
  });

  const appUrl = env.APP_URL || env.FRONTEND_URL || 'https://coto.syntrastudio.dev';
  const approveUrl = `${appUrl}/dashboard/configuracion-pagos`;
  const contactPhone = (await getSetting(db, 'contact_phone')) || undefined;
  const proposer = await getUserById(db, input.proposed_by);

  await notifyBoard(
    db,
    env,
    (name) =>
      gatewayProposalHTML({
        member_name: name,
        proposer_name: proposer?.full_name || 'Un administrador',
        account_nickname: nickname || undefined,
        account_email: account.email || undefined,
        collector_id: account.id,
        mode,
        note: input.proposer_note?.trim() || undefined,
        approve_url: approveUrl,
        contact_phone: contactPhone,
      }),
    'Aprobación requerida: cuenta de cobro de Mercado Pago',
    { proposed_by: input.proposed_by }
  );

  return getStatus(db, env);
}

export async function decideProposal(
  db: D1Database,
  env: Env,
  proposalId: string,
  userId: string,
  decision: 'approve' | 'reject',
  comment?: string | null
) {
  const member = await isActiveApprover(db, userId);
  if (!member) throw apiError('No formas parte de la mesa con permiso para aprobar cambios de cuenta.', 403);

  const proposal = await db
    .prepare('SELECT * FROM gateway_config_proposals WHERE id = ?')
    .bind(proposalId)
    .first<ProposalRow>();
  if (!proposal) throw apiError('Propuesta no encontrada.', 404);
  if (proposal.status !== 'pending') {
    throw apiError(`Esta propuesta ya no está pendiente (estado: ${proposal.status}).`, 409);
  }
  const now = nowSec();
  if (proposal.expires_at && now > proposal.expires_at) {
    await db
      .prepare("UPDATE gateway_config_proposals SET status = 'expired', decided_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, proposalId)
      .run();
    throw apiError('La propuesta expiró. Hay que volver a proponer la cuenta.', 409);
  }

  // Registrar/actualizar la firma de este miembro.
  await db
    .prepare(
      `INSERT INTO gateway_config_approvals (id, proposal_id, board_member_user_id, decision, comment, created_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(proposal_id, board_member_user_id)
       DO UPDATE SET decision = excluded.decision, comment = excluded.comment, created_at = excluded.created_at`
    )
    .bind(crypto.randomUUID(), proposalId, userId, decision, comment?.trim() || null, now)
    .run();

  await writeAudit(db, {
    user_id: userId,
    action: decision === 'approve' ? 'APPROVE' : 'REJECT',
    entity_id: proposalId,
    new_values: { comment: comment?.trim() || null },
  });

  const contactPhone = (await getSetting(db, 'contact_phone')) || undefined;

  if (decision === 'reject') {
    await db
      .prepare("UPDATE gateway_config_proposals SET status = 'rejected', decided_at = ?, updated_at = ? WHERE id = ?")
      .bind(now, now, proposalId)
      .run();
    await notifyBoard(
      db,
      env,
      (name) =>
        gatewayRejectedHTML({
          member_name: name,
          account_nickname: proposal.account_nickname || undefined,
          rejected_by_name: member.full_name || 'Un miembro de la mesa',
          reason: comment?.trim() || undefined,
          contact_phone: contactPhone,
        }),
      'Cambio de cuenta de cobro rechazado',
      proposal
    );
    return getStatus(db, env);
  }

  // decision === 'approve': ¿ya firmaron TODOS los aprobadores activos?
  const approvers = await listActiveApprovers(db);
  const approvalsRes = await db
    .prepare("SELECT board_member_user_id FROM gateway_config_approvals WHERE proposal_id = ? AND decision = 'approve'")
    .bind(proposalId)
    .all<{ board_member_user_id: string }>();
  const approvedIds = new Set((approvalsRes.results || []).map((r) => r.board_member_user_id));
  const allApproved = approvers.length >= MIN_APPROVERS && approvers.every((a) => approvedIds.has(a.user_id));

  if (allApproved) {
    // Activar: desactivar la anterior e insertar la nueva config activa.
    const newId = crypto.randomUUID();
    await db.batch([
      db
        .prepare(
          "UPDATE payment_gateway_config SET status = 'inactive', updated_at = ? WHERE provider = 'mercadopago' AND status = 'active'"
        )
        .bind(now),
      db
        .prepare(
          `INSERT INTO payment_gateway_config
            (id, provider, mode, encrypted_access_token, public_key, encrypted_webhook_secret,
             collector_id, account_nickname, account_email, account_country, token_preview,
             status, activated_from_proposal_id, activated_by, activated_at, created_at, updated_at)
           VALUES (?, 'mercadopago', ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?)`
        )
        .bind(
          newId,
          proposal.mode,
          proposal.encrypted_access_token,
          proposal.public_key,
          proposal.encrypted_webhook_secret,
          proposal.collector_id,
          proposal.account_nickname,
          proposal.account_email,
          proposal.account_country,
          proposal.token_preview,
          proposalId,
          userId,
          now,
          now,
          now
        ),
      db
        .prepare("UPDATE gateway_config_proposals SET status = 'activated', decided_at = ?, updated_at = ? WHERE id = ?")
        .bind(now, now, proposalId),
    ]);

    await writeAudit(db, {
      user_id: userId,
      action: 'ACTIVATE',
      entity_id: newId,
      new_values: { from_proposal: proposalId, collector_id: proposal.collector_id, mode: proposal.mode },
    });

    await notifyBoard(
      db,
      env,
      (name) =>
        gatewayActivatedHTML({
          member_name: name,
          account_nickname: proposal.account_nickname || undefined,
          account_email: proposal.account_email || undefined,
          collector_id: proposal.collector_id || undefined,
          mode: proposal.mode,
          activated_by_name: member.full_name || 'Un miembro de la mesa',
          contact_phone: contactPhone,
        }),
      'Cuenta de cobro de Mercado Pago activada',
      proposal
    );
  }

  return getStatus(db, env);
}

export async function cancelProposal(db: D1Database, env: Env, proposalId: string, userId: string, isAdmin: boolean) {
  const proposal = await db
    .prepare('SELECT * FROM gateway_config_proposals WHERE id = ?')
    .bind(proposalId)
    .first<ProposalRow>();
  if (!proposal) throw apiError('Propuesta no encontrada.', 404);
  if (proposal.status !== 'pending') throw apiError(`La propuesta no está pendiente (estado: ${proposal.status}).`, 409);
  if (!isAdmin && proposal.proposed_by !== userId) {
    throw apiError('Solo quien propuso el cambio (o un administrador) puede cancelarlo.', 403);
  }
  const now = nowSec();
  await db
    .prepare("UPDATE gateway_config_proposals SET status = 'cancelled', decided_at = ?, updated_at = ? WHERE id = ?")
    .bind(now, now, proposalId)
    .run();
  await writeAudit(db, { user_id: userId, action: 'CANCEL', entity_id: proposalId });
  return getStatus(db, env);
}

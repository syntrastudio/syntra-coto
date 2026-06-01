/**
 * Boletín oficial: centro de comunicados de la mesa directiva.
 *
 * - Componer un correo y enviarlo a TODOS los vecinos con cuenta de correo,
 *   o solo a algunos seleccionados.
 * - Botón "Mejorar con IA": corrige ortografía/claridad del texto (Workers AI),
 *   reutilizando el mismo presupuesto diario del asistente.
 *
 * Nota de envío: cada destinatario recibe su propio correo (privacidad). El plan
 * gratuito de Resend permite ~100 correos/día — se reporta cuántos se enviaron.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, successWithMessage, serverError, error as errorResp } from '../utils/response';
import { sendEmail, bulletinHTML } from '../utils/email';
import type { Env } from '../types';

const bulletins = new Hono<{ Bindings: Env }>();
bulletins.use('/*', authMiddleware);
bulletins.use('/*', requireRole('admin', 'super_admin'));

async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db.prepare('SELECT value FROM system_settings WHERE key = ?').bind(key).first<{ value: string }>();
  return row?.value ?? null;
}

async function generateFolio(db: D1Database): Promise<string> {
  const year = new Date().getFullYear();
  const row = await db.prepare("SELECT COUNT(*) AS n FROM bulletins WHERE folio LIKE ?").bind(`BOL-${year}-%`).first<{ n: number }>();
  return `BOL-${year}-${String(Number(row?.n || 0) + 1).padStart(4, '0')}`;
}

// Lista de destinatarios posibles (vecinos con correo)
bulletins.get('/recipients', async (c) => {
  try {
    const rows = await c.env.DB
      .prepare(
        `SELECT r.id, r.full_name, r.email,
                p.house_number, p.street
         FROM residents r
         LEFT JOIN properties p ON (p.current_resident_id = r.id OR p.owner_id = r.id) AND p.deleted_at IS NULL
         WHERE r.deleted_at IS NULL AND r.email IS NOT NULL AND r.email != '' AND r.status = 'activo'
         GROUP BY r.id
         ORDER BY r.full_name`
      )
      .all<any>();
    return success(c, rows.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Historial de boletines
bulletins.get('/', async (c) => {
  try {
    const rows = await c.env.DB
      .prepare('SELECT * FROM bulletins ORDER BY created_at DESC LIMIT 100')
      .all<any>();
    return success(c, rows.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Mejorar redacción con IA
const improveSchema = z.object({ text: z.string().min(3).max(4000) });
bulletins.post('/improve', zValidator('json', improveSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const { text } = c.req.valid('json');

    if ((await getSetting(c.env.DB, 'ai_enabled')) === 'false') {
      return errorResp(c, 'El asistente de IA está deshabilitado.', 503);
    }
    // Límite diario compartido con el asistente
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const startOfDay = Math.floor(today.getTime() / 1000);
    const usage = await c.env.DB.prepare('SELECT COALESCE(SUM(neurons),0) AS used FROM ai_usage_log WHERE created_at >= ?').bind(startOfDay).first<{ used: number }>();
    const limit = Number((await getSetting(c.env.DB, 'ai_daily_neuron_limit')) || 9500);
    if (Number(usage?.used || 0) / limit >= 0.95) {
      return errorResp(c, 'Se alcanzó el límite diario de la IA. Inténtalo mañana.', 429);
    }

    const system = `Eres un editor de textos en español de México. Corrige ortografía, acentos, puntuación, gramática y mejora la claridad del comunicado para vecinos de un fraccionamiento. Mantén EXACTAMENTE el mismo significado y un tono cordial y formal. No inventes datos, fechas ni cifras. No agregues saludos ni firmas que no estén. Devuelve ÚNICAMENTE el texto corregido, sin comillas ni explicaciones.`;
    const resp: any = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [{ role: 'system', content: system }, { role: 'user', content: text }],
      max_tokens: 1200,
    });
    const improved = (resp?.response || '').trim() || text;

    const tIn = Math.ceil((system.length + text.length) / 4);
    const tOut = Math.ceil(improved.length / 4);
    const neurons = (tIn / 1000) * 1.0 + (tOut / 1000) * 9.0;
    try {
      await c.env.DB.prepare(
        `INSERT INTO ai_usage_log (user_id, query, answer, tokens_input, tokens_output, neurons, status)
         VALUES (?, ?, ?, ?, ?, ?, 'success')`
      ).bind(user.id, '[bulletin-improve]', improved.slice(0, 500), tIn, tOut, neurons).run();
    } catch {}

    return success(c, { improved });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// Enviar boletín
const sendSchema = z.object({
  subject: z.string().min(2).max(150),
  body: z.string().min(2).max(8000),
  audience: z.enum(['all', 'selected']),
  resident_ids: z.array(z.string()).optional(),
  signature: z.string().max(200).optional(),
});

bulletins.post('/', zValidator('json', sendSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const { subject, body, audience, resident_ids, signature } = c.req.valid('json');

    // Resolver destinatarios
    let recipients: { email: string; full_name: string }[] = [];
    if (audience === 'all') {
      const rows = await c.env.DB
        .prepare(`SELECT email, full_name FROM residents WHERE deleted_at IS NULL AND email IS NOT NULL AND email != '' AND status = 'activo'`)
        .all<any>();
      recipients = rows.results || [];
    } else {
      if (!resident_ids || resident_ids.length === 0) return errorResp(c, 'Selecciona al menos un destinatario', 400);
      const placeholders = resident_ids.map(() => '?').join(',');
      const rows = await c.env.DB
        .prepare(`SELECT email, full_name FROM residents WHERE id IN (${placeholders}) AND deleted_at IS NULL AND email IS NOT NULL AND email != ''`)
        .bind(...resident_ids)
        .all<any>();
      recipients = rows.results || [];
    }

    if (recipients.length === 0) return errorResp(c, 'No hay destinatarios con correo válido.', 400);

    const contactPhone = (await getSetting(c.env.DB, 'contact_phone')) || undefined;
    const html = bulletinHTML({ subject, body, signature, contact_phone: contactPhone });

    // Enviar en lotes pequeños (cada quien recibe su propio correo)
    let sent = 0, failed = 0;
    const chunkSize = 8;
    for (let i = 0; i < recipients.length; i += chunkSize) {
      const chunk = recipients.slice(i, i + chunkSize);
      const results = await Promise.all(
        chunk.map((r) =>
          sendEmail(c.env as any, { to: r.email, subject, html }).then((res) => (res.sent ? 'sent' : 'failed')).catch(() => 'failed')
        )
      );
      sent += results.filter((x) => x === 'sent').length;
      failed += results.filter((x) => x === 'failed').length;
    }

    // Registrar boletín
    const id = crypto.randomUUID();
    const folio = await generateFolio(c.env.DB);
    const now = Math.floor(Date.now() / 1000);
    await c.env.DB
      .prepare(
        `INSERT INTO bulletins (id, folio, subject, body, audience, recipient_count, sent_count, failed_count, sent_by_user_id, sent_by_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(id, folio, subject, body, audience, recipients.length, sent, failed, user.id, user.full_name || null, now)
      .run();

    return successWithMessage(c, { id, folio, sent, failed, total: recipients.length },
      failed > 0 ? `Boletín enviado a ${sent} de ${recipients.length} vecinos (${failed} fallaron).` : `Boletín enviado a ${sent} vecinos.`);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

export default bulletins;

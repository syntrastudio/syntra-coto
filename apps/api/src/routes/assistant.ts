/**
 * Asistente del reglamento (bot RAG simple).
 *
 * - Sirve el PDF del reglamento desde R2
 * - Endpoint de Q&A usando Cloudflare Workers AI (Llama 3.3 70b)
 * - Control de uso diario (límite configurable en settings)
 *
 * Modelo de cobro: Cloudflare AI cobra por "Neurons". Llamamos por estimación
 * a ~1.0 Neuron por 1K tokens input + ~9.0 Neurons por 1K tokens output.
 * Free tier: 10,000 Neurons/día.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { success, serverError, notFound, error as errorResp } from '../utils/response';
import type { Env } from '../types';

const assistant = new Hono<{ Bindings: Env }>();

// Cache en memoria del reglamento (por instancia del worker, se vuelve a leer en frío)
let cachedReglamento: string | null = null;

async function getReglamentoText(env: any): Promise<string> {
  if (cachedReglamento) return cachedReglamento;
  const obj = await env.STORAGE.get('reglamento.txt');
  if (!obj) throw new Error('Reglamento no encontrado en R2');
  cachedReglamento = await obj.text();
  return cachedReglamento!;
}

// Sirve el PDF público (auth requerido pero cualquier rol)
assistant.get('/reglamento.pdf', authMiddleware, async (c) => {
  const obj = await c.env.STORAGE.get('reglamento.pdf');
  if (!obj) return notFound(c, 'PDF');
  // Preservar los headers CORS que ya setea el middleware en c.res
  const origin = c.req.header('Origin');
  const headers: Record<string, string> = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline; filename="reglamento-paseo-coto-tonala.pdf"',
    'Cache-Control': 'private, max-age=3600',
  };
  if (origin) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Vary'] = 'Origin';
  }
  return new Response(obj.body, { headers });
});

// Estado del bot (habilitado, uso del día)
assistant.get('/usage', authMiddleware, async (c) => {
  try {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startOfDay = Math.floor(today.getTime() / 1000);

    const usageRow = await c.env.DB
      .prepare(
        `SELECT COALESCE(SUM(neurons), 0) AS total_neurons,
                COUNT(*) AS total_queries,
                SUM(CASE WHEN status = 'blocked_limit' THEN 1 ELSE 0 END) AS blocked_count
         FROM ai_usage_log WHERE created_at >= ?`
      )
      .bind(startOfDay)
      .first<{ total_neurons: number; total_queries: number; blocked_count: number }>();

    const limitRow = await c.env.DB
      .prepare("SELECT value FROM system_settings WHERE key = 'ai_daily_neuron_limit'")
      .first<{ value: string }>();
    const enabledRow = await c.env.DB
      .prepare("SELECT value FROM system_settings WHERE key = 'ai_enabled'")
      .first<{ value: string }>();

    const limit = Number(limitRow?.value || 9500);
    const used = Number(usageRow?.total_neurons || 0);
    const enabled = (enabledRow?.value || 'true') === 'true';
    const percentage = limit > 0 ? (used / limit) * 100 : 0;

    return success(c, {
      enabled,
      used_neurons: used,
      limit_neurons: limit,
      percentage_used: Math.round(percentage * 10) / 10,
      available: enabled && percentage < 95,
      total_queries_today: Number(usageRow?.total_queries || 0),
      blocked_today: Number(usageRow?.blocked_count || 0),
    });
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

// POST /api/assistant/ask — pregunta al bot del reglamento
const askSchema = z.object({
  question: z.string().min(3).max(500),
});

assistant.post('/ask', authMiddleware, zValidator('json', askSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const { question } = c.req.valid('json');

    // 1) Verificar si está habilitado
    const enabledRow = await c.env.DB
      .prepare("SELECT value FROM system_settings WHERE key = 'ai_enabled'")
      .first<{ value: string }>();
    if ((enabledRow?.value || 'true') !== 'true') {
      await logUsage(c.env.DB, user.id, question, null, 0, 0, 'blocked_disabled', 'Bot deshabilitado por admin');
      return errorResp(c, 'El asistente está temporalmente deshabilitado.', 503);
    }

    // 2) Verificar límite diario (corte al 95%)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startOfDay = Math.floor(today.getTime() / 1000);
    const usageRow = await c.env.DB
      .prepare('SELECT COALESCE(SUM(neurons), 0) AS used FROM ai_usage_log WHERE created_at >= ?')
      .bind(startOfDay)
      .first<{ used: number }>();
    const limitRow = await c.env.DB
      .prepare("SELECT value FROM system_settings WHERE key = 'ai_daily_neuron_limit'")
      .first<{ value: string }>();
    const limit = Number(limitRow?.value || 9500);
    const used = Number(usageRow?.used || 0);

    if (used / limit >= 0.95) {
      await logUsage(c.env.DB, user.id, question, null, 0, 0, 'blocked_limit',
        `Límite del 95% alcanzado (${used.toFixed(0)}/${limit})`);
      return errorResp(c, 'Se alcanzó el límite diario del asistente. Inténtalo mañana.', 429);
    }

    // 3) Construir prompt con el reglamento completo
    const reglamento = await getReglamentoText(c.env);
    const systemPrompt = `Eres un asistente legal experto en el "Reglamento General del Condominio Paseo Coto Tonalá".

Reglas:
- Responde SOLO basándote en el reglamento proporcionado. Si la respuesta no está ahí, dilo claramente.
- Cita siempre el número de artículo cuando puedas (ej: "según el Artículo 15...").
- Usa lenguaje claro y amigable. Evita jerga legal innecesaria.
- Sé conciso: respuestas de 2-5 párrafos máximo.
- Responde en español.

REGLAMENTO COMPLETO:
${reglamento}`;

    const userPrompt = question;

    // 4) Llamar a Workers AI
    const startTs = Date.now();
    const response: any = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 512,
    });
    const elapsedMs = Date.now() - startTs;

    const answer = response?.response || 'Sin respuesta del modelo.';

    // 5) Calcular tokens y neurons aproximados
    // Aproximación: 1 token ≈ 4 chars en español
    const tokensInput = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const tokensOutput = Math.ceil(answer.length / 4);
    // Llama 3.3 70b: ~1.0 Neuron/1K input + ~9.0 Neurons/1K output (aproximado)
    const neurons = (tokensInput / 1000) * 1.0 + (tokensOutput / 1000) * 9.0;

    await logUsage(c.env.DB, user.id, question, answer, tokensInput, tokensOutput, 'success');

    return success(c, {
      answer,
      tokens_input: tokensInput,
      tokens_output: tokensOutput,
      neurons: Math.round(neurons * 100) / 100,
      elapsed_ms: elapsedMs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    console.error('[assistant] error:', msg);
    try {
      const u = c.get('user');
      await logUsage(c.env.DB, u?.id, '?', null, 0, 0, 'error', msg);
    } catch {}
    return serverError(c, msg);
  }
});

// ============================================================================
// ASISTENTE DE USO DE LA APP ("¿cómo hago X?") — para administradores
// ============================================================================

// Manual embebido del sistema. Es el "conocimiento" del bot de ayuda.
const APP_MANUAL = `Eres el asistente de uso del sistema de administración del condominio
"Paseo Coto Tonalá" (la app web Syntra). Ayudas a los administradores y miembros de la
mesa directiva —que NO son técnicos— a usar la aplicación.

CÓMO ESTÁ ORGANIZADA LA APP (menú de la izquierda):
- Inicio: resumen con números clave, accesos rápidos y botones para correr el ciclo de cobranza.
- Casas: todas las propiedades, su dueño/inquilino y su estado de pago (al corriente / con adeudo).
- Vecinos: padrón de residentes. Aquí se dan de alta y se les puede crear una cuenta de acceso.
- Vehículos: autos registrados por casa.
- Cuotas: las cuotas de mantenimiento mensuales de cada casa.
- Pagos: registrar pagos y ver el historial. Cada pago genera un recibo por correo.
- Caja de la mesa: el efectivo que tiene cada miembro de la mesa; depósitos al banco y transferencias.
- Solicitudes: reportes/quejas que abren los vecinos (tickets).
- Reglamento: el PDF del reglamento y un bot para preguntar sobre él.
- ¿Cómo se usa?: guías paso a paso.
- Configuración: ajustes (cuota mensual, recargos, usuarios, etc.). Solo admins.

TAREAS COMUNES:
- Registrar un pago: Pagos → "Registrar pago" → elegir "A la casa" (lo más fácil) → casa, monto, método → Registrar. El sobrante queda como saldo a favor.
- Pago anual: en Pagos, modo "Pago anual": cobra 10 meses y regala 2 (según reglamento).
- Dar de alta vecino con acceso: Vecinos → "Registrar vecino" → marcar "Crear cuenta de acceso" → le llega correo con contraseña.
- Cobrar mantenimiento del mes: se hace solo el día 1; manual desde Inicio → "Cobrar mantenimiento del mes".
- Ver morosos: Casas muestra el estado de pago de cada una; o el botón "Actualizar quién debe" en Inicio.
- Entrar sin contraseña: Configuración → Mi cuenta → "Agregar este dispositivo" (huella / Face ID).
- Restablecer contraseña de alguien: Configuración → Usuarios → ícono de llave junto al usuario.

REGLAS DE COBRANZA (del reglamento):
- Cuota mensual fija configurable.
- Recargo del 15% por mes vencido.
- Mora 1 mes = restricciones; 2 meses o más = suspensión.
- Todo esto lo calcula el sistema automáticamente cada día a las 8am.

CÓMO RESPONDER:
- Responde SOLO sobre cómo usar esta app. Si te preguntan algo ajeno (clima, etc.), dilo amablemente.
- Da pasos numerados, cortos y claros. Menciona el nombre exacto del menú entre comillas.
- Lenguaje sencillo, sin tecnicismos. Español. Máximo 5 pasos o 2 párrafos.
- Si no estás seguro, sugiere ir a la sección "¿Cómo se usa?".`;

const helpSchema = z.object({
  question: z.string().min(3).max(500),
});

assistant.post('/help', authMiddleware, requireRole('admin', 'super_admin', 'supervisor'), zValidator('json', helpSchema), async (c) => {
  try {
    const user = c.get('user')!;
    const { question } = c.req.valid('json');

    // 1) ¿Habilitado?
    const enabledRow = await c.env.DB
      .prepare("SELECT value FROM system_settings WHERE key = 'ai_enabled'")
      .first<{ value: string }>();
    if ((enabledRow?.value || 'true') !== 'true') {
      await logUsage(c.env.DB, user.id, `[help] ${question}`, null, 0, 0, 'blocked_disabled', 'Bot deshabilitado');
      return errorResp(c, 'El asistente está temporalmente deshabilitado.', 503);
    }

    // 2) Límite diario (mismo presupuesto que el bot del reglamento)
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startOfDay = Math.floor(today.getTime() / 1000);
    const usageRow = await c.env.DB
      .prepare('SELECT COALESCE(SUM(neurons), 0) AS used FROM ai_usage_log WHERE created_at >= ?')
      .bind(startOfDay)
      .first<{ used: number }>();
    const limitRow = await c.env.DB
      .prepare("SELECT value FROM system_settings WHERE key = 'ai_daily_neuron_limit'")
      .first<{ value: string }>();
    const limit = Number(limitRow?.value || 9500);
    const used = Number(usageRow?.used || 0);
    if (used / limit >= 0.95) {
      await logUsage(c.env.DB, user.id, `[help] ${question}`, null, 0, 0, 'blocked_limit', `Límite alcanzado (${used.toFixed(0)}/${limit})`);
      return errorResp(c, 'Se alcanzó el límite diario del asistente. Inténtalo mañana.', 429);
    }

    // 3) Llamar a Workers AI con el manual como contexto
    const startTs = Date.now();
    const response: any = await c.env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast', {
      messages: [
        { role: 'system', content: APP_MANUAL },
        { role: 'user', content: question },
      ],
      max_tokens: 400,
    });
    const elapsedMs = Date.now() - startTs;
    const answer = response?.response || 'Sin respuesta del modelo.';

    const tokensInput = Math.ceil((APP_MANUAL.length + question.length) / 4);
    const tokensOutput = Math.ceil(answer.length / 4);
    const neurons = (tokensInput / 1000) * 1.0 + (tokensOutput / 1000) * 9.0;

    await logUsage(c.env.DB, user.id, `[help] ${question}`, answer, tokensInput, tokensOutput, 'success');

    return success(c, {
      answer,
      neurons: Math.round(neurons * 100) / 100,
      elapsed_ms: elapsedMs,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    console.error('[help] error:', msg);
    try {
      const u = c.get('user');
      await logUsage(c.env.DB, u?.id, '[help] ?', null, 0, 0, 'error', msg);
    } catch {}
    return serverError(c, msg);
  }
});

// Histórico de uso (admin)
assistant.get('/history', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const rows = await c.env.DB
      .prepare(
        `SELECT l.*, u.full_name AS user_name, u.email AS user_email
         FROM ai_usage_log l
         LEFT JOIN users u ON u.id = l.user_id
         ORDER BY l.created_at DESC
         LIMIT ?`
      )
      .bind(limit)
      .all<any>();
    return success(c, rows.results || []);
  } catch (e) {
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

async function logUsage(
  db: D1Database,
  userId: string | undefined,
  query: string,
  answer: string | null,
  tokensInput: number,
  tokensOutput: number,
  status: 'success' | 'blocked_limit' | 'blocked_disabled' | 'error',
  errorMessage?: string
): Promise<void> {
  const neurons = (tokensInput / 1000) * 1.0 + (tokensOutput / 1000) * 9.0;
  await db
    .prepare(
      `INSERT INTO ai_usage_log (user_id, query, answer, tokens_input, tokens_output, neurons, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(userId || null, query, answer, tokensInput, tokensOutput, neurons, status, errorMessage || null)
    .run();
}

export default assistant;

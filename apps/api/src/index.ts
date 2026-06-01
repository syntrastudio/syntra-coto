import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorHandler } from './middleware/error.middleware';
import { auditMiddleware } from './middleware/audit.middleware';

// Importar rutas
import auth from './routes/auth';
import properties from './routes/properties';
import residents from './routes/residents';
import fees from './routes/fees';
import payments from './routes/payments';
import vehicles from './routes/vehicles';
import users from './routes/users';
import auditLogs from './routes/audit-logs';
import dashboard from './routes/dashboard';
import settings from './routes/settings';
import me from './routes/me';
import passkeys from './routes/passkeys';
import mesa from './routes/mesa';
import tickets from './routes/tickets';
import assistant from './routes/assistant';
import cameras from './routes/cameras';
import terrace from './routes/terrace';
import bulletins from './routes/bulletins';

import { generateMonthlyFees } from './services/fees.service';
import { applyLateFees, recalculateDelinquency } from './services/delinquency.service';
import { runDailyNotifications } from './services/notifications.service';

const app = new Hono();

// Middlewares globales
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', corsMiddleware());

// Audit log para POST/PUT/PATCH/DELETE bajo /api/* (el propio middleware filtra
// por método y captura el user del contexto después de auth)
app.use('/api/*', auditMiddleware());

// Ruta de health check
app.get('/', (c) => {
  return c.json({
    message: 'Syntra Coto API - Paseo Coto Tonalá',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Health check detallado
app.get('/api/health', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: c.env.DB ? 'connected' : 'disconnected',
    environment: c.env.ENVIRONMENT || 'unknown',
  });
});

// Montar rutas de la API
app.route('/api/auth', auth);
app.route('/api/properties', properties);
app.route('/api/residents', residents);
app.route('/api/fees', fees);
app.route('/api/payments', payments);
app.route('/api/vehicles', vehicles);
app.route('/api/users', users);
app.route('/api/audit-logs', auditLogs);
app.route('/api/dashboard', dashboard);
app.route('/api/settings', settings);
app.route('/api/me', me);
app.route('/api/auth/passkey', passkeys);
app.route('/api/mesa', mesa);
app.route('/api/tickets', tickets);
app.route('/api/assistant', assistant);
app.route('/api/cameras', cameras);
app.route('/api/terrace', terrace);
app.route('/api/bulletins', bulletins);

// Manejo de rutas no encontradas
app.notFound((c) => {
  return c.json(
    {
      success: false,
      error: 'Ruta no encontrada',
      path: c.req.path,
      method: c.req.method,
    },
    404
  );
});

// Manejo global de errores
app.onError(errorHandler);

/**
 * Handler del cron diario (8am CDMX = 14 UTC).
 *
 * Día 1 de cada mes:
 *   1. Genera las cuotas del mes (lee `maintenance_fee_amount` de settings)
 *   2. Aplica recargos a cuotas vencidas (15%)
 *   3. Recalcula delinquency_status
 *   4. Manda recordatorios + recibos pendientes
 *
 * Resto de días:
 *   - Aplica recargos del mes (idempotente)
 *   - Recalcula morosidad
 *   - Manda recordatorios
 */
async function runDailyCycle(env: any): Promise<any> {
  const db = env.DB as any;
  const summary: any = { ran_at: new Date().toISOString() };

  const dayOfMonth = new Date().getUTCDate();

  // 1) Día 1: generar cuotas
  if (dayOfMonth === 1) {
    const feeRow = await db
      .prepare("SELECT value FROM system_settings WHERE key = 'maintenance_fee_amount'")
      .first();
    const baseAmount = Number(feeRow?.value || 0);
    if (baseAmount > 0) {
      const now = new Date();
      const period = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      summary.generated = await generateMonthlyFees(db, period, baseAmount);
    } else {
      summary.generated = { skipped_reason: 'maintenance_fee_amount=0' };
    }
  }

  // 2) Aplicar recargos
  summary.late_fees = await applyLateFees(db);

  // 3) Recalcular morosidad
  summary.delinquency = await recalculateDelinquency(db);

  // 4) Notificaciones (recibos próximos, recordatorios, suspensiones)
  summary.notifications = await runDailyNotifications(db, env);

  // Log del ciclo en la tabla notification_log
  try {
    await db
      .prepare(
        `INSERT INTO notification_log (type, target_email, status, reason)
         VALUES ('monthly_cycle', 'system', 'sent', ?)`
      )
      .bind(JSON.stringify(summary))
      .run();
  } catch (e) {
    console.error('[cycle] failed to log:', e);
  }

  console.log('[cron] daily cycle completed', summary);
  return summary;
}

// Endpoint manual para ejecutar el ciclo (solo super_admin) — útil para pruebas
app.post('/api/admin/run-cycle', async (c) => {
  // Solo super_admin (validación inline para no agregar dependencias)
  const { extractTokenFromHeader, verifyToken } = await import('./utils/jwt');
  const token = extractTokenFromHeader(c.req.header('Authorization'));
  if (!token) return c.json({ success: false, error: 'No autorizado' }, 401);
  try {
    const payload = await verifyToken(token, c.env.JWT_SECRET as string);
    if (payload.role !== 'super_admin') {
      return c.json({ success: false, error: 'Solo super_admin' }, 403);
    }
  } catch {
    return c.json({ success: false, error: 'Token inválido' }, 401);
  }
  const result = await runDailyCycle(c.env);
  return c.json({ success: true, data: result });
});

export default {
  fetch: app.fetch,
  async scheduled(_event: any, env: any, ctx: any) {
    ctx.waitUntil(runDailyCycle(env));
  },
};

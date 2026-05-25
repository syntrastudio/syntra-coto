import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { corsMiddleware } from './middleware/cors.middleware';
import { errorHandler } from './middleware/error.middleware';

// Importar rutas
import auth from './routes/auth';
import properties from './routes/properties';
import residents from './routes/residents';
import fees from './routes/fees';
import payments from './routes/payments';
import vehicles from './routes/vehicles';
import users from './routes/users';
import auditLogs from './routes/audit-logs';

const app = new Hono();

// Middlewares globales
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', corsMiddleware());

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

export default app;

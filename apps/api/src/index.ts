import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

// Tipos para Cloudflare Workers
type Bindings = {
  DB: D1Database;
  STORAGE?: R2Bucket;
  CACHE?: KVNamespace;
  JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middlewares globales
app.use('*', logger());
app.use('*', prettyJSON());
app.use(
  '*',
  cors({
    origin: ['http://localhost:3000', 'https://paseo-coto-tonala.com'],
    credentials: true,
  })
);

// Ruta de health check
app.get('/', (c) => {
  return c.json({
    message: 'Paseo Coto Tonalá API',
    version: '1.0.0',
    status: 'healthy',
  });
});

// Rutas de la API
app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Aquí se importarán y montarán las rutas de los módulos
// app.route('/api/auth', authRoutes);
// app.route('/api/users', userRoutes);
// app.route('/api/properties', propertyRoutes);
// etc...

// Manejo de rutas no encontradas
app.notFound((c) => {
  return c.json({ error: 'Not Found', path: c.req.path }, 404);
});

// Manejo de errores
app.onError((err, c) => {
  console.error(`Error: ${err.message}`);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

export default app;

// Made with Bob

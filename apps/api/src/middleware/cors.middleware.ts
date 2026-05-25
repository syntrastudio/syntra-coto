/**
 * Middleware de CORS personalizado
 */

import { Context, Next } from 'hono';

/**
 * Configuración de CORS para la API
 */
export function corsMiddleware() {
  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');
    
    // Lista de orígenes permitidos
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://paseo-coto-tonala.com',
      'https://www.paseo-coto-tonala.com',
      'https://coto.syntrastudio.dev',
    ];

    // Verificar si el origen está permitido
    if (origin && allowedOrigins.includes(origin)) {
      c.header('Access-Control-Allow-Origin', origin);
    }

    // Headers permitidos
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    c.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With'
    );
    c.header('Access-Control-Allow-Credentials', 'true');
    c.header('Access-Control-Max-Age', '86400'); // 24 horas

    // Manejar preflight requests
    if (c.req.method === 'OPTIONS') {
      return c.text('', 204);
    }

    await next();
  };
}

// Made with Bob

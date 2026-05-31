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
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'https://coto.syntrastudio.dev',
      'https://syntra-coto.pages.dev',
    ];

    const isAllowed =
      origin &&
      (allowedOrigins.includes(origin) ||
        /^https:\/\/[a-z0-9-]+\.syntra-coto\.pages\.dev$/.test(origin));

    if (isAllowed) {
      c.header('Access-Control-Allow-Origin', origin!);
      c.header('Vary', 'Origin');
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

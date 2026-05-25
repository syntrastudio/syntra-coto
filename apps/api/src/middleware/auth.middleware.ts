/**
 * Middleware de autenticación JWT
 */

import { Context, Next } from 'hono';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { unauthorized } from '../utils/response';
import type { Env } from '../types';

/**
 * Middleware que verifica el JWT y añade el usuario al contexto
 */
export async function authMiddleware(c: Context, next: Next) {
  try {
    // Extraer token del header Authorization
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return unauthorized(c, 'Token no proporcionado');
    }

    // Verificar token
    const jwtSecret = c.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET no configurado');
      return unauthorized(c, 'Error de configuración del servidor');
    }

    const payload = await verifyToken(token, jwtSecret);

    // Verificar que sea un access token
    if (payload.type !== 'access') {
      return unauthorized(c, 'Token inválido');
    }

    // Añadir usuario al contexto
    c.set('user', {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      full_name: payload.full_name,
    });

    await next();
  } catch (error) {
    if (error instanceof Error) {
      return unauthorized(c, error.message);
    }
    return unauthorized(c, 'Error al verificar token');
  }
}

/**
 * Middleware opcional de autenticación (no falla si no hay token)
 */
export async function optionalAuthMiddleware(c: Context, next: Next) {
  try {
    const authHeader = c.req.header('Authorization');
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const jwtSecret = c.env.JWT_SECRET;
      if (jwtSecret) {
        const payload = await verifyToken(token, jwtSecret);

        if (payload.type === 'access') {
          c.set('user', {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            full_name: payload.full_name,
          });
        }
      }
    }
  } catch (error) {
    // Ignorar errores en modo opcional
    console.log('Optional auth failed:', error);
  }

  await next();
}

// Made with Bob

/**
 * Rutas de autenticación
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { loginSchema, registerSchema, refreshTokenSchema } from '../utils/validation';
import { success, created, unauthorized } from '../utils/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { registerUser, loginUser, getUserById } from '../services/auth.service';
import { verifyToken } from '../utils/jwt';
const auth = new Hono();

/**
 * POST /api/auth/register
 * Registra un nuevo usuario residente
 */
auth.post('/register', zValidator('json', registerSchema), async (c) => {
  const data = c.req.valid('json');
  const db = c.env.DB as D1Database;

  const user = await registerUser(db, data);

  // Generar tokens
  const tokens = await loginUser(
    db,
    user.email,
    data.password,
    c.env.JWT_SECRET as string,
    (c.env.JWT_REFRESH_SECRET || c.env.JWT_SECRET) as string
  );

  return created(c, {
    user: {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      status: user.status,
    },
    access_token: tokens.accessToken,
    refresh_token: tokens.refreshToken,
    expires_in: tokens.expiresIn,
  }, 'Usuario registrado exitosamente');
});

/**
 * POST /api/auth/login
 * Inicia sesión de un usuario
 */
auth.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');
  const db = c.env.DB as D1Database;

  const result = await loginUser(
    db,
    email,
    password,
    c.env.JWT_SECRET as string,
    (c.env.JWT_REFRESH_SECRET || c.env.JWT_SECRET) as string
  );

  return success(c, {
    user: {
      id: result.user.id,
      email: result.user.email,
      full_name: result.user.full_name,
      role: result.user.role,
      status: result.user.status,
    },
    access_token: result.accessToken,
    refresh_token: result.refreshToken,
    expires_in: result.expiresIn,
  });
});

/**
 * POST /api/auth/refresh
 * Refresca el access token usando el refresh token
 */
auth.post('/refresh', zValidator('json', refreshTokenSchema), async (c) => {
  const { refresh_token } = c.req.valid('json');
  const db = c.env.DB as D1Database;

  try {
    // Verificar refresh token
    const payload = await verifyToken(
      refresh_token,
      (c.env.JWT_REFRESH_SECRET || c.env.JWT_SECRET) as string
    );

    if (payload.type !== 'refresh') {
      return unauthorized(c, 'Token inválido');
    }

    // Verificar que el usuario aún exista y esté activo
    const user = await getUserById(db, payload.sub);

    if (!user || user.status !== 'active') {
      return unauthorized(c, 'Usuario no encontrado o inactivo');
    }

    // Generar nuevos tokens
    const result = await loginUser(
      db,
      user.email,
      '', // No necesitamos la contraseña aquí
      c.env.JWT_SECRET as string,
      (c.env.JWT_REFRESH_SECRET || c.env.JWT_SECRET) as string
    );

    return success(c, {
      access_token: result.accessToken,
      refresh_token: result.refreshToken,
      expires_in: result.expiresIn,
    });
  } catch (error) {
    return unauthorized(c, 'Token inválido o expirado');
  }
});

/**
 * GET /api/auth/me
 * Obtiene la información del usuario autenticado
 */
auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  const db = c.env.DB as D1Database;

  if (!user) {
    return unauthorized(c, 'Usuario no autenticado');
  }

  const fullUser = await getUserById(db, user.id);

  if (!fullUser) {
    return unauthorized(c, 'Usuario no encontrado');
  }

  return success(c, {
    id: fullUser.id,
    email: fullUser.email,
    full_name: fullUser.full_name,
    phone: fullUser.phone,
    role: fullUser.role,
    status: fullUser.status,
    email_verified: fullUser.email_verified === 1,
    phone_verified: fullUser.phone_verified === 1,
    profile_image_url: fullUser.profile_image_url,
    last_login_at: fullUser.last_login_at,
    created_at: fullUser.created_at,
  });
});

/**
 * POST /api/auth/logout
 * Cierra la sesión del usuario (en el cliente se debe eliminar el token)
 */
auth.post('/logout', authMiddleware, async (c) => {
  // En una implementación con JWT, el logout se maneja en el cliente
  // eliminando los tokens. Aquí solo confirmamos la acción.
  return success(c, { message: 'Sesión cerrada exitosamente' });
});

export default auth;

// Made with Bob

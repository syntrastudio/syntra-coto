/**
 * Rutas de autenticación
 */

import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { loginSchema, registerSchema, refreshTokenSchema } from '../utils/validation';
import { success, created, unauthorized, error as errorResp, serverError } from '../utils/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { registerUser, loginUser, getUserById } from '../services/auth.service';
import { verifyToken } from '../utils/jwt';
import { hashPassword } from '../utils/hash';
import {
  sendEmail,
  passwordResetRequestHTML,
  passwordChangedNoticeHTML,
  generateResetToken,
} from '../utils/email';

const auth = new Hono();

const RESET_TOKEN_TTL_MIN = 60;

async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}

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
  const body = c.req.valid('json');
  const identifier = body.identifier || body.email || body.phone || '';
  const db = c.env.DB as D1Database;

  const result = await loginUser(
    db,
    identifier,
    body.password,
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
 * POST /api/auth/forgot-password
 * Body: { email }
 * Genera un token de un solo uso (TTL 60 min), guarda su hash en DB y envía
 * un correo con el link de reset. Por seguridad SIEMPRE responde 200 — no
 * filtramos si un email existe o no en el sistema.
 */
auth.post(
  '/forgot-password',
  zValidator('json', z.object({ email: z.string().email() })),
  async (c) => {
    try {
      const { email } = c.req.valid('json');
      const db = c.env.DB as D1Database;
      const user = await db
        .prepare("SELECT * FROM users WHERE email = ? AND deleted_at IS NULL AND status = 'active'")
        .bind(email.trim().toLowerCase())
        .first<{ id: string; email: string; full_name: string }>();

      if (user) {
        const { token, hash } = await generateResetToken();
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = now + RESET_TOKEN_TTL_MIN * 60;

        await db
          .prepare(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?)'
          )
          .bind(user.id, hash, expiresAt, now)
          .run();

        const appUrl = c.env.APP_URL || 'https://syntra-coto.pages.dev';
        const resetUrl = `${appUrl}/reset-password/${token}`;
        const contactRow = await db
          .prepare("SELECT value FROM system_settings WHERE key = 'contact_phone'")
          .first<{ value: string }>();

        await sendEmail(c.env, {
          to: user.email,
          subject: 'Restablece tu contraseña — Paseo Coto Tonalá',
          html: passwordResetRequestHTML({
            full_name: user.full_name,
            reset_url: resetUrl,
            expires_minutes: RESET_TOKEN_TTL_MIN,
            contact_phone: contactRow?.value || undefined,
          }),
          text: `Hola ${user.full_name},\n\nSolicitaste restablecer tu contraseña. Abre este enlace para crear una nueva (expira en ${RESET_TOKEN_TTL_MIN} minutos):\n\n${resetUrl}\n\nSi no fuiste tú, ignora este correo.`,
        });
      }

      return success(c, {
        message: 'Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.',
      });
    } catch (e) {
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

/**
 * POST /api/auth/reset-password
 * Body: { token, new_password }
 * Valida el token, actualiza el password y manda correo de confirmación.
 */
auth.post(
  '/reset-password',
  zValidator('json', z.object({ token: z.string().min(32), new_password: z.string().min(8) })),
  async (c) => {
    try {
      const { token, new_password } = c.req.valid('json');
      const db = c.env.DB as D1Database;
      const tokenHash = await sha256Hex(token);
      const now = Math.floor(Date.now() / 1000);

      const row = await db
        .prepare(
          `SELECT t.id AS token_id, t.user_id, t.expires_at, t.used_at,
                  u.email, u.full_name
           FROM password_reset_tokens t
           JOIN users u ON u.id = t.user_id AND u.deleted_at IS NULL
           WHERE t.token_hash = ?`
        )
        .bind(tokenHash)
        .first<{
          token_id: string;
          user_id: string;
          expires_at: number;
          used_at: number | null;
          email: string;
          full_name: string;
        }>();

      if (!row) return errorResp(c, 'Enlace inválido', 400, 'TOKEN_INVALID');
      if (row.used_at) return errorResp(c, 'Este enlace ya fue usado', 400, 'TOKEN_USED');
      if (row.expires_at < now) return errorResp(c, 'El enlace expiró. Solicita uno nuevo.', 400, 'TOKEN_EXPIRED');

      // Validar fortaleza básica
      if (!/[A-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
        return errorResp(c, 'La contraseña debe incluir al menos una mayúscula y un número', 400, 'WEAK_PASSWORD');
      }

      const passwordHash = await hashPassword(new_password);

      await db.batch([
        db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
          .bind(passwordHash, now, row.user_id),
        db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE id = ?')
          .bind(now, row.token_id),
        // Invalidar otros tokens activos del mismo usuario
        db.prepare('UPDATE password_reset_tokens SET used_at = ? WHERE user_id = ? AND used_at IS NULL AND id != ?')
          .bind(now, row.user_id, row.token_id),
      ]);

      // Correo de confirmación
      const contactRow = await db
        .prepare("SELECT value FROM system_settings WHERE key = 'contact_phone'")
        .first<{ value: string }>();
      await sendEmail(c.env, {
        to: row.email,
        subject: 'Contraseña actualizada — Paseo Coto Tonalá',
        html: passwordChangedNoticeHTML({
          full_name: row.full_name,
          changed_at: new Date(),
          ip_address: c.req.header('cf-connecting-ip') || undefined,
          by_admin: false,
          contact_phone: contactRow?.value || undefined,
        }),
      });

      return success(c, { message: 'Contraseña actualizada' });
    } catch (e) {
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

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

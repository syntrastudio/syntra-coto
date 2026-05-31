/**
 * Endpoints WebAuthn (passkeys).
 *
 * Configuración via env vars:
 *   - PASSKEY_RP_ID    Dominio (sin protocolo). Ej: "syntra-coto.pages.dev"
 *                      o "coto.syntrastudio.dev" cuando se migre.
 *   - PASSKEY_ORIGIN   Origin completo, ej: "https://syntra-coto.pages.dev"
 *   - PASSKEY_RP_NAME  Nombre legible mostrado al usuario por su SO.
 *                      Default: "Paseo Coto Tonalá"
 *
 * Si la passkey se registró contra rpID = A y el rpID cambia a B,
 * las credenciales quedan inválidas. WebAuthn lo exige por diseño.
 */

import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/server';
import { authMiddleware } from '../middleware/auth.middleware';
import { generateTokenPair } from '../utils/jwt';
import { success, error as errorResp, serverError, notFound, unauthorized } from '../utils/response';
import type { Env } from '../types';

const passkeys = new Hono<{ Bindings: Env }>();

const CHALLENGE_TTL_SECONDS = 5 * 60; // 5 minutos

function rpConfig(env: Env) {
  const rpID = env.PASSKEY_RP_ID || 'syntra-coto.pages.dev';
  const rpName = env.PASSKEY_RP_NAME || 'Paseo Coto Tonalá';
  const origin = env.PASSKEY_ORIGIN || `https://${rpID}`;
  return { rpID, rpName, origin };
}

async function saveChallenge(
  db: D1Database,
  challenge: string,
  type: 'registration' | 'authentication',
  userId: string | null
) {
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare(
      'INSERT INTO passkey_challenges (challenge, user_id, type, expires_at, created_at) VALUES (?, ?, ?, ?, ?)'
    )
    .bind(challenge, userId, type, now + CHALLENGE_TTL_SECONDS, now)
    .run();
}

async function consumeChallenge(
  db: D1Database,
  challenge: string,
  type: 'registration' | 'authentication'
): Promise<{ ok: boolean; userId: string | null }> {
  const now = Math.floor(Date.now() / 1000);
  const row = await db
    .prepare(
      'SELECT id, user_id, expires_at, used_at, type FROM passkey_challenges WHERE challenge = ?'
    )
    .bind(challenge)
    .first<{ id: string; user_id: string | null; expires_at: number; used_at: number | null; type: string }>();
  if (!row) return { ok: false, userId: null };
  if (row.type !== type) return { ok: false, userId: null };
  if (row.used_at) return { ok: false, userId: null };
  if (row.expires_at < now) return { ok: false, userId: null };
  await db
    .prepare('UPDATE passkey_challenges SET used_at = ? WHERE id = ?')
    .bind(now, row.id)
    .run();
  return { ok: true, userId: row.user_id };
}

// ============================================================
// REGISTRATION
// ============================================================

passkeys.post('/register/begin', authMiddleware, async (c) => {
  try {
    const user = c.get('user')!;
    const { rpID, rpName } = rpConfig(c.env);

    const existing = await c.env.DB
      .prepare('SELECT credential_id, transports FROM user_passkeys WHERE user_id = ?')
      .bind(user.id)
      .all<{ credential_id: string; transports: string | null }>();

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: new TextEncoder().encode(user.id),
      userName: user.email,
      userDisplayName: user.full_name || user.email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      excludeCredentials: (existing.results || []).map((c) => ({
        id: c.credential_id,
        transports: c.transports ? (JSON.parse(c.transports) as AuthenticatorTransport[]) : undefined,
      })),
    });

    await saveChallenge(c.env.DB, options.challenge, 'registration', user.id);
    return success(c, options);
  } catch (e) {
    console.error('passkey register/begin:', e);
    return serverError(c, e instanceof Error ? e.message : 'Error');
  }
});

passkeys.post(
  '/register/finish',
  authMiddleware,
  zValidator(
    'json',
    z.object({
      credential: z.any(),
      device_name: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const user = c.get('user')!;
      const { rpID, origin } = rpConfig(c.env);
      const body = c.req.valid('json');
      const credential = body.credential as RegistrationResponseJSON;

      // Recuperar el challenge guardado para este registration
      const expectedChallenge = credential?.response?.clientDataJSON
        ? JSON.parse(atob(credential.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'))).challenge
        : null;
      if (!expectedChallenge) return errorResp(c, 'Challenge no encontrado', 400);

      const challengeCheck = await consumeChallenge(c.env.DB, expectedChallenge, 'registration');
      if (!challengeCheck.ok || challengeCheck.userId !== user.id) {
        return errorResp(c, 'Challenge inválido o expirado', 400);
      }

      const verification = await verifyRegistrationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return errorResp(c, 'Verificación falló', 400);
      }

      // @simplewebauthn/server v11: shape nuevo bajo `credential`
      const info: any = verification.registrationInfo;
      const credentialIdStr: string = info.credential?.id || info.credentialID;
      const publicKeyBuf: Uint8Array = info.credential?.publicKey || info.credentialPublicKey;
      const counter: number = info.credential?.counter ?? info.counter ?? 0;
      const credentialBackedUp: boolean = !!info.credentialBackedUp;

      // En v11 `credential.id` ya viene como string base64url. Si es Uint8Array (v9), lo codificamos.
      const credentialIdB64 =
        typeof credentialIdStr === 'string' ? credentialIdStr : isoBase64URL(credentialIdStr as any);
      const publicKeyB64 = isoBase64URL(publicKeyBuf);

      const transports = credential.response.transports ? JSON.stringify(credential.response.transports) : null;
      const deviceName = body.device_name || guessDeviceName(c.req.header('user-agent'));
      const now = Math.floor(Date.now() / 1000);

      await c.env.DB
        .prepare(
          `INSERT INTO user_passkeys (user_id, credential_id, public_key, counter, transports, device_name, backed_up, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(user.id, credentialIdB64, publicKeyB64, counter, transports, deviceName, credentialBackedUp ? 1 : 0, now)
        .run();

      return success(c, { registered: true, device_name: deviceName });
    } catch (e) {
      console.error('passkey register/finish:', e);
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

// ============================================================
// AUTHENTICATION
// ============================================================

passkeys.post(
  '/authenticate/begin',
  zValidator('json', z.object({ email: z.string().email().optional() })),
  async (c) => {
    try {
      const { rpID } = rpConfig(c.env);
      const { email } = c.req.valid('json');

      let allowCredentials: { id: string; transports?: AuthenticatorTransport[] }[] | undefined;
      let userId: string | null = null;

      if (email) {
        const u = await c.env.DB
          .prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL')
          .bind(email.toLowerCase())
          .first<{ id: string }>();
        if (u) {
          userId = u.id;
          const creds = await c.env.DB
            .prepare('SELECT credential_id, transports FROM user_passkeys WHERE user_id = ?')
            .bind(u.id)
            .all<{ credential_id: string; transports: string | null }>();
          allowCredentials = (creds.results || []).map((cr) => ({
            id: cr.credential_id,
            transports: cr.transports ? (JSON.parse(cr.transports) as AuthenticatorTransport[]) : undefined,
          }));
        }
      }

      const options = await generateAuthenticationOptions({
        rpID,
        userVerification: 'preferred',
        allowCredentials,
      });

      await saveChallenge(c.env.DB, options.challenge, 'authentication', userId);
      return success(c, options);
    } catch (e) {
      console.error('passkey authenticate/begin:', e);
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

passkeys.post(
  '/authenticate/finish',
  zValidator('json', z.object({ credential: z.any() })),
  async (c) => {
    try {
      const { rpID, origin } = rpConfig(c.env);
      const credential = c.req.valid('json').credential as AuthenticationResponseJSON;

      const expectedChallenge = JSON.parse(
        atob(credential.response.clientDataJSON.replace(/-/g, '+').replace(/_/g, '/'))
      ).challenge;
      const challengeCheck = await consumeChallenge(c.env.DB, expectedChallenge, 'authentication');
      if (!challengeCheck.ok) return errorResp(c, 'Challenge inválido o expirado', 400);

      // Buscar la credential
      const passkey = await c.env.DB
        .prepare(
          `SELECT p.*, u.id as uid, u.email, u.full_name, u.role, u.status
           FROM user_passkeys p
           JOIN users u ON u.id = p.user_id AND u.deleted_at IS NULL
           WHERE p.credential_id = ?`
        )
        .bind(credential.id)
        .first<any>();
      if (!passkey) return errorResp(c, 'Credencial no reconocida', 400);
      if (passkey.status !== 'active') return unauthorized(c, 'Usuario inactivo');

      // v11 cambió `authenticator` por `credential` con shape distinto
      const verification = await verifyAuthenticationResponse({
        response: credential,
        expectedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        credential: {
          id: passkey.credential_id,
          publicKey: fromBase64URL(passkey.public_key),
          counter: passkey.counter,
          transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
        },
      } as any);

      if (!verification.verified) {
        return errorResp(c, 'Verificación falló', 400);
      }

      const now = Math.floor(Date.now() / 1000);
      await c.env.DB
        .prepare('UPDATE user_passkeys SET counter = ?, last_used_at = ? WHERE id = ?')
        .bind(verification.authenticationInfo.newCounter, now, passkey.id)
        .run();
      await c.env.DB
        .prepare('UPDATE users SET last_login_at = ? WHERE id = ?')
        .bind(now, passkey.uid)
        .run();

      const tokens = await generateTokenPair(
        {
          sub: passkey.uid,
          email: passkey.email,
          role: passkey.role,
          full_name: passkey.full_name,
        },
        c.env.JWT_SECRET as string,
        (c.env.JWT_REFRESH_SECRET || c.env.JWT_SECRET) as string
      );

      return success(c, {
        user: {
          id: passkey.uid,
          email: passkey.email,
          full_name: passkey.full_name,
          role: passkey.role,
          status: passkey.status,
        },
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: tokens.expiresIn,
      });
    } catch (e) {
      console.error('passkey authenticate/finish:', e);
      return serverError(c, e instanceof Error ? e.message : 'Error');
    }
  }
);

// ============================================================
// LISTING / DELETION (per-user management)
// ============================================================

passkeys.get('/', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const result = await c.env.DB
    .prepare(
      `SELECT id, device_name, transports, backed_up, created_at, last_used_at
       FROM user_passkeys WHERE user_id = ? ORDER BY created_at DESC`
    )
    .bind(user.id)
    .all<any>();
  return success(c, result.results || []);
});

passkeys.delete('/:id', authMiddleware, async (c) => {
  const user = c.get('user')!;
  const id = c.req.param('id');
  const result = await c.env.DB
    .prepare('DELETE FROM user_passkeys WHERE id = ? AND user_id = ?')
    .bind(id, user.id)
    .run();
  if (!result.success || (result.meta as any)?.changes === 0) {
    return notFound(c, 'Passkey');
  }
  return success(c, { deleted: true });
});

// ============================================================
// Helpers
// ============================================================

function isoBase64URL(buf: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...buf));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64URL(s: string): Uint8Array {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function guessDeviceName(ua: string | undefined): string {
  if (!ua) return 'Dispositivo';
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Mac/.test(ua)) return 'Mac';
  if (/Android/.test(ua)) return 'Android';
  if (/Windows/.test(ua)) return 'Windows';
  if (/Linux/.test(ua)) return 'Linux';
  return 'Dispositivo';
}

export default passkeys;

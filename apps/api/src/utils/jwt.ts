/**
 * Utilidades para manejo de JWT con jose
 */

import { SignJWT, jwtVerify } from 'jose';
import type { UserRole } from '../types';

export interface JWTPayload {
  sub: string; // user id
  email: string;
  role: UserRole;
  full_name: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}

/**
 * Genera un access token JWT
 */
export async function generateAccessToken(
  payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const token = await new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h') // 1 hora
    .sign(secretKey);

  return token;
}

/**
 * Genera un refresh token JWT
 */
export async function generateRefreshToken(
  payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const secretKey = encoder.encode(secret);

  const token = await new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 días
    .sign(secretKey);

  return token;
}

/**
 * Verifica y decodifica un JWT
 */
export async function verifyToken(
  token: string,
  secret: string
): Promise<JWTPayload> {
  try {
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(secret);

    const { payload } = await jwtVerify(token, secretKey);

    return payload as unknown as JWTPayload;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('expired')) {
        throw new Error('Token expirado');
      }
      if (error.message.includes('signature')) {
        throw new Error('Token inválido');
      }
    }
    throw new Error('Error al verificar token');
  }
}

/**
 * Extrae el token del header Authorization
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1] || null;
}

/**
 * Genera ambos tokens (access y refresh)
 */
export async function generateTokenPair(
  payload: Omit<JWTPayload, 'type' | 'iat' | 'exp'>,
  accessSecret: string,
  refreshSecret: string
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const accessToken = await generateAccessToken(payload, accessSecret);
  const refreshToken = await generateRefreshToken(payload, refreshSecret);

  return {
    accessToken,
    refreshToken,
    expiresIn: 3600, // 1 hora en segundos
  };
}

// Made with Bob

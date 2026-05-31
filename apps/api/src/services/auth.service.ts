/**
 * Servicio de autenticación
 */

import { hashPassword, verifyPassword } from '../utils/hash';
import { generateTokenPair } from '../utils/jwt';
import { throwApiError, throwNotFound, throwUnauthorized } from '../middleware/error.middleware';
import type { User, UserCreateInput } from '../types';

/**
 * Registra un nuevo usuario residente
 */
export async function registerUser(
  db: D1Database,
  data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }
): Promise<User> {
  // Verificar si el email ya existe
  const existingUser = await db
    .prepare('SELECT id FROM users WHERE email = ? AND deleted_at IS NULL')
    .bind(data.email)
    .first<{ id: string }>();

  if (existingUser) {
    throwApiError('El email ya está registrado', 409, 'EMAIL_EXISTS');
  }

  // Hashear contraseña
  const passwordHash = await hashPassword(data.password);

  // Crear usuario
  const userId = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  const userInput: UserCreateInput = {
    email: data.email,
    password_hash: passwordHash,
    full_name: data.full_name,
    phone: data.phone,
    role: 'resident',
    status: 'active',
  };

  await db
    .prepare(
      `INSERT INTO users (id, email, password_hash, full_name, phone, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      userId,
      userInput.email,
      userInput.password_hash,
      userInput.full_name,
      userInput.phone || null,
      userInput.role,
      userInput.status || 'active',
      now,
      now
    )
    .run();

  // Obtener usuario creado
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ?')
    .bind(userId)
    .first<User>();

  if (!user) {
    throwApiError('Error al crear usuario', 500);
  }

  return user;
}

/**
 * Autentica un usuario por email o teléfono y genera tokens.
 * `identifier` puede ser una dirección de correo o un teléfono de 10 dígitos
 * (con o sin formato — el matcher normaliza dígitos).
 */
export async function loginUser(
  db: D1Database,
  identifier: string,
  password: string,
  jwtSecret: string,
  jwtRefreshSecret: string
): Promise<{
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const looksLikeEmail = identifier.includes('@');
  let user: User | null = null;

  if (looksLikeEmail) {
    user = await db
      .prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL')
      .bind(identifier.trim().toLowerCase())
      .first<User>();
  } else {
    // Normalizar: solo dígitos
    const phone = identifier.replace(/\D/g, '');
    if (phone.length < 10) {
      throwUnauthorized('Credenciales inválidas');
    }
    user = await db
      .prepare('SELECT * FROM users WHERE phone = ? AND deleted_at IS NULL')
      .bind(phone)
      .first<User>();
  }

  if (!user) {
    throwUnauthorized('Credenciales inválidas');
  }

  // Verificar estado del usuario
  if (user.status !== 'active') {
    throwUnauthorized('Usuario inactivo o suspendido');
  }

  // Verificar contraseña
  const isValidPassword = await verifyPassword(password, user.password_hash);

  if (!isValidPassword) {
    throwUnauthorized('Credenciales inválidas');
  }

  // Actualizar último login
  const now = Math.floor(Date.now() / 1000);
  await db
    .prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?')
    .bind(now, now, user.id)
    .run();

  // Generar tokens
  const tokens = await generateTokenPair(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name,
    },
    jwtSecret,
    jwtRefreshSecret
  );

  return {
    user,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: tokens.expiresIn,
  };
}

/**
 * Obtiene un usuario por ID
 */
export async function getUserById(db: D1Database, userId: string): Promise<User | null> {
  const user = await db
    .prepare('SELECT * FROM users WHERE id = ? AND deleted_at IS NULL')
    .bind(userId)
    .first<User>();

  return user;
}

/**
 * Obtiene un usuario por email
 */
export async function getUserByEmail(db: D1Database, email: string): Promise<User | null> {
  const user = await db
    .prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL')
    .bind(email)
    .first<User>();

  return user;
}

/**
 * Actualiza la información de un usuario
 */
export async function updateUser(
  db: D1Database,
  userId: string,
  data: {
    full_name?: string;
    phone?: string;
    email?: string;
    status?: 'active' | 'inactive' | 'suspended';
  }
): Promise<User> {
  const user = await getUserById(db, userId);

  if (!user) {
    throwNotFound('Usuario');
  }

  // Si se actualiza el email, verificar que no exista
  if (data.email && data.email !== user.email) {
    const existingUser = await getUserByEmail(db, data.email);
    if (existingUser) {
      throwApiError('El email ya está registrado', 409, 'EMAIL_EXISTS');
    }
  }

  const now = Math.floor(Date.now() / 1000);

  const updates: string[] = [];
  const values: any[] = [];

  if (data.full_name !== undefined) {
    updates.push('full_name = ?');
    values.push(data.full_name);
  }

  if (data.phone !== undefined) {
    updates.push('phone = ?');
    values.push(data.phone);
  }

  if (data.email !== undefined) {
    updates.push('email = ?');
    values.push(data.email);
  }

  if (data.status !== undefined) {
    updates.push('status = ?');
    values.push(data.status);
  }

  updates.push('updated_at = ?');
  values.push(now);

  values.push(userId);

  await db
    .prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...values)
    .run();

  const updatedUser = await getUserById(db, userId);

  if (!updatedUser) {
    throwApiError('Error al actualizar usuario', 500);
  }

  return updatedUser;
}

/**
 * Cambia la contraseña de un usuario
 */
export async function changePassword(
  db: D1Database,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const user = await getUserById(db, userId);

  if (!user) {
    throwNotFound('Usuario');
  }

  // Verificar contraseña actual
  const isValidPassword = await verifyPassword(currentPassword, user.password_hash);

  if (!isValidPassword) {
    throwUnauthorized('Contraseña actual incorrecta');
  }

  // Hashear nueva contraseña
  const newPasswordHash = await hashPassword(newPassword);
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
    .bind(newPasswordHash, now, userId)
    .run();
}

// Made with Bob

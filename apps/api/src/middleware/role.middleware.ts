/**
 * Middleware de verificación de roles
 */

import { Context, Next } from 'hono';
import { forbidden } from '../utils/response';
import type { UserRole } from '../types';

/**
 * Middleware que verifica si el usuario tiene uno de los roles permitidos
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return forbidden(c, 'Usuario no autenticado');
    }

    if (!allowedRoles.includes(user.role)) {
      return forbidden(
        c,
        'No tienes permisos para acceder a este recurso'
      );
    }

    await next();
  };
}

/**
 * Middleware que verifica si el usuario es super_admin
 */
export function requireSuperAdmin() {
  return requireRole('super_admin');
}

/**
 * Middleware que verifica si el usuario es admin o super_admin
 */
export function requireAdmin() {
  return requireRole('super_admin', 'admin');
}

/**
 * Middleware que verifica si el usuario es residente
 */
export function requireResident() {
  return requireRole('resident');
}

/**
 * Middleware que verifica si el usuario puede acceder a un recurso específico
 * Los admins pueden acceder a todo, los residentes solo a sus propios recursos
 */
export function requireOwnershipOrAdmin(getUserIdFromResource: (c: Context) => Promise<string | null>) {
  return async (c: Context, next: Next) => {
    const user = c.get('user');

    if (!user) {
      return forbidden(c, 'Usuario no autenticado');
    }

    // Super admins y admins tienen acceso total
    if (user.role === 'super_admin' || user.role === 'admin') {
      await next();
      return;
    }

    // Para residentes, verificar que el recurso les pertenece
    const resourceUserId = await getUserIdFromResource(c);

    if (!resourceUserId || resourceUserId !== user.id) {
      return forbidden(
        c,
        'No tienes permisos para acceder a este recurso'
      );
    }

    await next();
  };
}

// Made with Bob

/**
 * Middleware de manejo de errores
 */

import { Context } from 'hono';
import { ZodError } from 'zod';
import { validationError, serverError } from '../utils/response';

/**
 * Clase de error personalizada para la API
 */
export class ApiError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Middleware global de manejo de errores
 */
export function errorHandler(err: Error, c: Context) {
  console.error('Error:', err);

  // Error de validación de Zod
  if (err instanceof ZodError) {
    const errors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return validationError(c, errors);
  }

  // Error personalizado de la API
  if (err instanceof ApiError) {
    return c.json(
      {
        success: false,
        error: err.message,
        message: err.message,
        code: err.code,
        details: err.details,
      },
      err.statusCode
    );
  }

  // Error genérico
  return serverError(c, err.message, err.stack);
}

/**
 * Helper para lanzar errores de API
 */
export function throwApiError(
  message: string,
  statusCode: number = 500,
  code?: string,
  details?: any
): never {
  throw new ApiError(message, statusCode, code, details);
}

/**
 * Helper para errores de recurso no encontrado
 */
export function throwNotFound(resource: string = 'Recurso'): never {
  throw new ApiError(`${resource} no encontrado`, 404, 'NOT_FOUND');
}

/**
 * Helper para errores de validación
 */
export function throwValidationError(message: string, details?: any): never {
  throw new ApiError(message, 400, 'VALIDATION_ERROR', details);
}

/**
 * Helper para errores de autenticación
 */
export function throwUnauthorized(message: string = 'No autorizado'): never {
  throw new ApiError(message, 401, 'UNAUTHORIZED');
}

/**
 * Helper para errores de permisos
 */
export function throwForbidden(message: string = 'Acceso denegado'): never {
  throw new ApiError(message, 403, 'FORBIDDEN');
}

/**
 * Helper para errores de conflicto
 */
export function throwConflict(message: string): never {
  throw new ApiError(message, 409, 'CONFLICT');
}

// Made with Bob

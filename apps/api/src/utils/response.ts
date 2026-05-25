/**
 * Helpers para respuestas HTTP estandarizadas
 */

import type { Context } from 'hono';
import type { ApiResponse, ApiError, PaginatedResponse, PaginationMeta } from '../types';

/**
 * Respuesta exitosa
 */
export function success<T>(c: Context, data: T, status: number = 200) {
  return c.json<ApiResponse<T>>(
    {
      success: true,
      data,
    },
    status
  );
}

/**
 * Respuesta exitosa con mensaje
 */
export function successWithMessage<T>(
  c: Context,
  data: T,
  message: string,
  status: number = 200
) {
  return c.json<ApiResponse<T>>(
    {
      success: true,
      data,
      message,
    },
    status
  );
}

/**
 * Respuesta de error
 */
export function error(
  c: Context,
  message: string,
  status: number = 400,
  code?: string,
  details?: any
) {
  return c.json<ApiError>(
    {
      success: false,
      error: message,
      message,
      code,
      details,
    },
    status
  );
}

/**
 * Error de validación
 */
export function validationError(
  c: Context,
  errors: Array<{ field: string; message: string }>
) {
  return c.json<ApiError>(
    {
      success: false,
      error: 'Errores de validación',
      message: 'Los datos proporcionados no son válidos',
      code: 'VALIDATION_ERROR',
      details: errors,
    },
    400
  );
}

/**
 * Error de autenticación
 */
export function unauthorized(c: Context, message: string = 'No autorizado') {
  return c.json<ApiError>(
    {
      success: false,
      error: message,
      message,
      code: 'UNAUTHORIZED',
    },
    401
  );
}

/**
 * Error de permisos
 */
export function forbidden(c: Context, message: string = 'Acceso denegado') {
  return c.json<ApiError>(
    {
      success: false,
      error: message,
      message,
      code: 'FORBIDDEN',
    },
    403
  );
}

/**
 * Recurso no encontrado
 */
export function notFound(c: Context, resource: string = 'Recurso') {
  return c.json<ApiError>(
    {
      success: false,
      error: `${resource} no encontrado`,
      message: `El ${resource.toLowerCase()} solicitado no existe`,
      code: 'NOT_FOUND',
    },
    404
  );
}

/**
 * Error del servidor
 */
export function serverError(
  c: Context,
  message: string = 'Error interno del servidor',
  details?: any
) {
  console.error('Server Error:', message, details);
  
  // En Cloudflare Workers, usamos c.env para acceder a variables de entorno
  const isDevelopment = c.env?.ENVIRONMENT === 'development';
  
  return c.json<ApiError>(
    {
      success: false,
      error: message,
      message: 'Ocurrió un error en el servidor',
      code: 'INTERNAL_SERVER_ERROR',
      details: isDevelopment ? details : undefined,
    },
    500
  );
}

/**
 * Respuesta paginada
 */
export function paginated<T>(
  c: Context,
  data: T[],
  pagination: PaginationMeta,
  status: number = 200
) {
  return c.json<ApiResponse<PaginatedResponse<T>>>(
    {
      success: true,
      data: {
        data,
        pagination,
      },
    },
    status
  );
}

/**
 * Calcula metadata de paginación
 */
export function calculatePagination(
  page: number,
  limit: number,
  total: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    total_pages: totalPages,
  };
}

/**
 * Calcula offset para queries SQL
 */
export function calculateOffset(page: number, limit: number): number {
  return (page - 1) * limit;
}

/**
 * Respuesta de creación exitosa
 */
export function created<T>(c: Context, data: T, message?: string) {
  return successWithMessage(c, data, message || 'Recurso creado exitosamente', 201);
}

/**
 * Respuesta de actualización exitosa
 */
export function updated<T>(c: Context, data: T, message?: string) {
  return successWithMessage(c, data, message || 'Recurso actualizado exitosamente', 200);
}

/**
 * Respuesta de eliminación exitosa
 */
export function deleted(c: Context, message?: string) {
  return successWithMessage(c, null, message || 'Recurso eliminado exitosamente', 200);
}

/**
 * Respuesta sin contenido
 */
export function noContent(c: Context) {
  return c.body(null, 204);
}

/**
 * Error de conflicto (recurso duplicado)
 */
export function conflict(c: Context, message: string = 'El recurso ya existe') {
  return c.json<ApiError>(
    {
      success: false,
      error: message,
      message,
      code: 'CONFLICT',
    },
    409
  );
}

/**
 * Error de rate limit
 */
export function tooManyRequests(
  c: Context,
  message: string = 'Demasiadas solicitudes'
) {
  return c.json<ApiError>(
    {
      success: false,
      error: message,
      message: 'Has excedido el límite de solicitudes. Intenta más tarde.',
      code: 'TOO_MANY_REQUESTS',
    },
    429
  );
}

/**
 * Error de método no permitido
 */
export function methodNotAllowed(c: Context) {
  return c.json<ApiError>(
    {
      success: false,
      error: 'Método no permitido',
      message: 'El método HTTP no está permitido para este endpoint',
      code: 'METHOD_NOT_ALLOWED',
    },
    405
  );
}

/**
 * Respuesta exitosa simple (sin Context)
 */
export function successResponse<T>(data: T) {
  return {
    success: true,
    data,
  };
}

/**
 * Respuesta de error simple (sin Context)
 */
export function errorResponse(message: string, details?: any) {
  return {
    success: false,
    error: message,
    message,
    details,
  };
}

// Made with Bob

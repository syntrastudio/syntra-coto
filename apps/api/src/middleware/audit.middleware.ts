/**
 * Middleware de Auditoría
 * Registra automáticamente todas las operaciones CREATE, UPDATE, DELETE
 */

import { Context, Next } from 'hono';

interface AuditLogEntry {
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: string | null;
  new_values: string | null;
  ip_address: string | null;
  user_agent: string | null;
  request_method: string;
  request_path: string;
  status_code: number | null;
  error_message: string | null;
}

/**
 * Middleware que registra operaciones en audit_logs
 * Se debe aplicar después del middleware de autenticación
 */
export function auditMiddleware() {
  return async (c: Context, next: Next) => {
    const method = c.req.method;
    const path = c.req.path;

    // Solo auditar operaciones de modificación (POST, PUT, PATCH, DELETE)
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      await next();
      return;
    }

    // Capturar datos antes de la operación
    const user = c.get('user');
    const startTime = Date.now();
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      // Ejecutar la operación
      await next();
      
      // Capturar código de estado de la respuesta
      statusCode = c.res.status;
    } catch (error: any) {
      statusCode = 500;
      errorMessage = error.message || 'Error desconocido';
      throw error; // Re-lanzar el error para que sea manejado por el error handler
    } finally {
      // Registrar en audit_logs solo si la operación fue exitosa (2xx o 3xx)
      if (statusCode && statusCode < 400) {
        try {
          await logAudit(c, {
            user_id: user?.id || null,
            action: getActionFromMethod(method),
            entity_type: getEntityTypeFromPath(path),
            entity_id: getEntityIdFromPath(path),
            old_values: null, // Se puede implementar captura de valores anteriores
            new_values: null, // Se puede implementar captura de valores nuevos
            ip_address: getClientIP(c),
            user_agent: c.req.header('user-agent') || null,
            request_method: method,
            request_path: path,
            status_code: statusCode,
            error_message: errorMessage
          });
        } catch (auditError) {
          // No fallar la operación si falla el audit log
          console.error('Error logging audit:', auditError);
        }
      }
    }
  };
}

/**
 * Función helper para registrar manualmente en audit logs
 * Útil para operaciones específicas que necesitan más detalle
 */
export async function logAuditManual(
  c: Context,
  action: string,
  entityType: string,
  entityId: string | null,
  oldValues?: any,
  newValues?: any
) {
  const user = c.get('user');
  
  await logAudit(c, {
    user_id: user?.id || null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    old_values: oldValues ? JSON.stringify(oldValues) : null,
    new_values: newValues ? JSON.stringify(newValues) : null,
    ip_address: getClientIP(c),
    user_agent: c.req.header('user-agent') || null,
    request_method: c.req.method,
    request_path: c.req.path,
    status_code: c.res.status,
    error_message: null
  });
}

/**
 * Registrar entrada en la tabla audit_logs
 */
async function logAudit(c: Context, entry: AuditLogEntry) {
  const db = c.env.DB;
  const now = Math.floor(Date.now() / 1000);

  await db
    .prepare(`
      INSERT INTO audit_logs (
        user_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, user_agent,
        request_method, request_path, status_code, error_message,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      entry.user_id,
      entry.action,
      entry.entity_type,
      entry.entity_id,
      entry.old_values,
      entry.new_values,
      entry.ip_address,
      entry.user_agent,
      entry.request_method,
      entry.request_path,
      entry.status_code,
      entry.error_message,
      now
    )
    .run();
}

/**
 * Obtener acción desde el método HTTP
 */
function getActionFromMethod(method: string): string {
  const actions: Record<string, string> = {
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE'
  };
  return actions[method] || 'UNKNOWN';
}

/**
 * Obtener tipo de entidad desde la ruta
 */
function getEntityTypeFromPath(path: string): string {
  // Extraer el recurso principal de la ruta
  // Ejemplo: /api/users/123 -> users
  // Ejemplo: /api/properties/456/residents -> properties
  const parts = path.split('/').filter(p => p);
  
  if (parts.length >= 2 && parts[0] === 'api' && parts[1]) {
    return parts[1].toUpperCase();
  }
  
  return 'UNKNOWN';
}

/**
 * Obtener ID de entidad desde la ruta
 */
function getEntityIdFromPath(path: string): string | null {
  // Extraer el ID de la ruta
  // Ejemplo: /api/users/123 -> 123
  // Ejemplo: /api/properties/456/residents -> 456
  const parts = path.split('/').filter(p => p);
  
  if (parts.length >= 3 && parts[0] === 'api') {
    // El ID suele estar en la posición 2 (después de /api/resource/)
    const potentialId = parts[2];
    // Verificar que no sea otra ruta (como 'change-password')
    if (potentialId && !potentialId.includes('-') && potentialId.length > 0) {
      return potentialId;
    }
  }
  
  return null;
}

/**
 * Obtener IP del cliente
 */
function getClientIP(c: Context): string | null {
  // Cloudflare Workers proporciona la IP en diferentes headers
  return (
    c.req.header('cf-connecting-ip') ||
    c.req.header('x-forwarded-for')?.split(',')[0] ||
    c.req.header('x-real-ip') ||
    null
  );
}

/**
 * Tipos de acciones para audit logs
 */
export const AuditActions = {
  // Usuarios
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',
  USER_DELETE: 'USER_DELETE',
  USER_PASSWORD_CHANGE: 'USER_PASSWORD_CHANGE',
  USER_STATUS_CHANGE: 'USER_STATUS_CHANGE',
  
  // Propiedades
  PROPERTY_CREATE: 'PROPERTY_CREATE',
  PROPERTY_UPDATE: 'PROPERTY_UPDATE',
  PROPERTY_DELETE: 'PROPERTY_DELETE',
  
  // Residentes
  RESIDENT_CREATE: 'RESIDENT_CREATE',
  RESIDENT_UPDATE: 'RESIDENT_UPDATE',
  RESIDENT_DELETE: 'RESIDENT_DELETE',
  
  // Vehículos
  VEHICLE_CREATE: 'VEHICLE_CREATE',
  VEHICLE_UPDATE: 'VEHICLE_UPDATE',
  VEHICLE_DELETE: 'VEHICLE_DELETE',
  
  // Cuotas
  FEE_CREATE: 'FEE_CREATE',
  FEE_UPDATE: 'FEE_UPDATE',
  FEE_DELETE: 'FEE_DELETE',
  FEE_GENERATE: 'FEE_GENERATE',
  
  // Pagos
  PAYMENT_CREATE: 'PAYMENT_CREATE',
  PAYMENT_UPDATE: 'PAYMENT_UPDATE',
  PAYMENT_DELETE: 'PAYMENT_DELETE',
  PAYMENT_REFUND: 'PAYMENT_REFUND',
  
  // Configuración
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
} as const;

export type AuditAction = typeof AuditActions[keyof typeof AuditActions];

// Made with Bob
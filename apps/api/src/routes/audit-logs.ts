/**
 * Audit Logs Routes
 * Endpoints para consultar logs de auditoría
 */

import { Hono } from 'hono';
import { AuditLogsService } from '../services/audit-logs.service';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { successResponse, errorResponse } from '../utils/response';

const auditLogs = new Hono();

// Aplicar autenticación a todas las rutas
auditLogs.use('/*', authMiddleware);

/**
 * GET /api/audit-logs
 * Listar logs de auditoría con filtros
 * Solo admin y super_admin pueden ver todos los logs
 * Otros usuarios solo ven sus propios logs
 */
auditLogs.get('/', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const currentUser = c.get('user')!;
    const auditLogsService = new AuditLogsService(c.env.DB);

    // Obtener parámetros de query
    const user_id = c.req.query('user_id');
    const entity_type = c.req.query('entity_type');
    const action = c.req.query('action');
    const entity_id = c.req.query('entity_id');
    const from_date = c.req.query('from_date');
    const to_date = c.req.query('to_date');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');

    // Si no es super_admin, solo puede ver sus propios logs
    const filters: any = {
      page,
      limit,
      entity_type,
      action,
      entity_id,
    };

    // Super admin puede filtrar por cualquier usuario
    // Admin solo puede ver sus propios logs a menos que sea super_admin
    if (currentUser.role === 'super_admin' && user_id) {
      filters.user_id = user_id;
    } else if (currentUser.role === 'admin') {
      filters.user_id = currentUser.id;
    }

    if (from_date) {
      filters.from_date = parseInt(from_date);
    }

    if (to_date) {
      filters.to_date = parseInt(to_date);
    }

    const result = await auditLogsService.listAuditLogs(filters);

    return c.json(successResponse(result));
  } catch (error: any) {
    console.error('Error listing audit logs:', error);
    return c.json(
      errorResponse('Error al listar logs de auditoría', error.message),
      500
    );
  }
});

/**
 * GET /api/audit-logs/stats
 * Obtener estadísticas de audit logs
 * Solo super_admin
 */
auditLogs.get('/stats', requireRole('super_admin'), async (c) => {
  try {
    const auditLogsService = new AuditLogsService(c.env.DB);

    const from_date = c.req.query('from_date');
    const to_date = c.req.query('to_date');

    const stats = await auditLogsService.getAuditStats(
      from_date ? parseInt(from_date) : undefined,
      to_date ? parseInt(to_date) : undefined
    );

    return c.json(successResponse(stats));
  } catch (error: any) {
    console.error('Error getting audit stats:', error);
    return c.json(
      errorResponse('Error al obtener estadísticas', error.message),
      500
    );
  }
});

/**
 * GET /api/audit-logs/entity/:type/:id
 * Obtener historial de una entidad específica
 * Solo admin y super_admin
 */
auditLogs.get(
  '/entity/:type/:id',
  requireRole('admin', 'super_admin'),
  async (c) => {
    try {
      const entityType = c.req.param('type');
      const entityId = c.req.param('id');
      const limit = parseInt(c.req.query('limit') || '50');

      const auditLogsService = new AuditLogsService(c.env.DB);

      const history = await auditLogsService.getEntityHistory(
        entityType,
        entityId,
        limit
      );

      return c.json(successResponse(history));
    } catch (error: any) {
      console.error('Error getting entity history:', error);
      return c.json(
        errorResponse('Error al obtener historial', error.message),
        500
      );
    }
  }
);

/**
 * GET /api/audit-logs/:id
 * Obtener detalle de un log específico
 * Solo admin y super_admin
 */
auditLogs.get('/:id', requireRole('admin', 'super_admin'), async (c) => {
  try {
    const logId = c.req.param('id');
    const auditLogsService = new AuditLogsService(c.env.DB);

    const log = await auditLogsService.getAuditLogById(logId);

    if (!log) {
      return c.json(errorResponse('Log no encontrado'), 404);
    }

    return c.json(successResponse(log));
  } catch (error: any) {
    console.error('Error getting audit log:', error);
    return c.json(
      errorResponse('Error al obtener log', error.message),
      500
    );
  }
});

export default auditLogs;

// Made with Bob

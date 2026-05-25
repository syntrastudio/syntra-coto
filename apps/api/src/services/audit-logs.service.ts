/**
 * Audit Logs Service
 * Servicio para consultar logs de auditoría
 */

interface AuditLog {
  id: string;
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
  created_at: number;
}

interface AuditLogWithUser extends AuditLog {
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: string;
  } | null;
}

interface AuditLogFilters {
  user_id?: string;
  entity_type?: string;
  action?: string;
  entity_id?: string;
  from_date?: number;
  to_date?: number;
  page?: number;
  limit?: number;
}

export class AuditLogsService {
  constructor(private db: D1Database) {}

  /**
   * Listar logs de auditoría con filtros
   */
  async listAuditLogs(filters: AuditLogFilters = {}): Promise<{
    logs: AuditLogWithUser[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100); // Máximo 100 por página
    const offset = (page - 1) * limit;

    // Construir query con joins para obtener información del usuario
    let query = `
      SELECT 
        al.*,
        u.id as user_id,
        u.full_name as user_full_name,
        u.email as user_email,
        u.role as user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    // Aplicar filtros
    if (filters.user_id) {
      query += ' AND al.user_id = ?';
      params.push(filters.user_id);
    }

    if (filters.entity_type) {
      query += ' AND al.entity_type = ?';
      params.push(filters.entity_type.toUpperCase());
    }

    if (filters.action) {
      query += ' AND al.action = ?';
      params.push(filters.action.toUpperCase());
    }

    if (filters.entity_id) {
      query += ' AND al.entity_id = ?';
      params.push(filters.entity_id);
    }

    if (filters.from_date) {
      query += ' AND al.created_at >= ?';
      params.push(filters.from_date);
    }

    if (filters.to_date) {
      query += ' AND al.created_at <= ?';
      params.push(filters.to_date);
    }

    // Contar total
    const countQuery = query.replace(
      /SELECT.*FROM/s,
      'SELECT COUNT(*) as total FROM'
    );
    const countResult = await this.db
      .prepare(countQuery)
      .bind(...params)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    // Obtener logs paginados
    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await this.db.prepare(query).bind(...params).all<any>();

    // Transformar resultados
    const logs: AuditLogWithUser[] = (result.results || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      request_method: row.request_method,
      request_path: row.request_path,
      status_code: row.status_code,
      error_message: row.error_message,
      created_at: row.created_at,
      user: row.user_full_name
        ? {
            id: row.user_id,
            full_name: row.user_full_name,
            email: row.user_email,
            role: row.user_role,
          }
        : null,
    }));

    return {
      logs,
      total,
      page,
      limit,
    };
  }

  /**
   * Obtener un log de auditoría por ID
   */
  async getAuditLogById(logId: string): Promise<AuditLogWithUser | null> {
    const result = await this.db
      .prepare(
        `
        SELECT 
          al.*,
          u.id as user_id,
          u.full_name as user_full_name,
          u.email as user_email,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.id = ?
      `
      )
      .bind(logId)
      .first<any>();

    if (!result) return null;

    return {
      id: result.id,
      user_id: result.user_id,
      action: result.action,
      entity_type: result.entity_type,
      entity_id: result.entity_id,
      old_values: result.old_values,
      new_values: result.new_values,
      ip_address: result.ip_address,
      user_agent: result.user_agent,
      request_method: result.request_method,
      request_path: result.request_path,
      status_code: result.status_code,
      error_message: result.error_message,
      created_at: result.created_at,
      user: result.user_full_name
        ? {
            id: result.user_id,
            full_name: result.user_full_name,
            email: result.user_email,
            role: result.user_role,
          }
        : null,
    };
  }

  /**
   * Obtener estadísticas de audit logs
   */
  async getAuditStats(fromDate?: number, toDate?: number): Promise<{
    total_logs: number;
    by_action: Record<string, number>;
    by_entity: Record<string, number>;
    by_user: Array<{ user_id: string; full_name: string; count: number }>;
  }> {
    let whereClause = 'WHERE 1=1';
    const params: any[] = [];

    if (fromDate) {
      whereClause += ' AND al.created_at >= ?';
      params.push(fromDate);
    }

    if (toDate) {
      whereClause += ' AND al.created_at <= ?';
      params.push(toDate);
    }

    // Total de logs
    const totalResult = await this.db
      .prepare(`SELECT COUNT(*) as total FROM audit_logs al ${whereClause}`)
      .bind(...params)
      .first<{ total: number }>();

    // Por acción
    const byActionResult = await this.db
      .prepare(
        `
        SELECT action, COUNT(*) as count 
        FROM audit_logs al 
        ${whereClause}
        GROUP BY action 
        ORDER BY count DESC
      `
      )
      .bind(...params)
      .all<{ action: string; count: number }>();

    // Por entidad
    const byEntityResult = await this.db
      .prepare(
        `
        SELECT entity_type, COUNT(*) as count 
        FROM audit_logs al 
        ${whereClause}
        GROUP BY entity_type 
        ORDER BY count DESC
      `
      )
      .bind(...params)
      .all<{ entity_type: string; count: number }>();

    // Por usuario
    const byUserResult = await this.db
      .prepare(
        `
        SELECT 
          al.user_id,
          u.full_name,
          COUNT(*) as count 
        FROM audit_logs al 
        LEFT JOIN users u ON al.user_id = u.id
        ${whereClause}
        GROUP BY al.user_id, u.full_name 
        ORDER BY count DESC 
        LIMIT 10
      `
      )
      .bind(...params)
      .all<{ user_id: string; full_name: string; count: number }>();

    return {
      total_logs: totalResult?.total || 0,
      by_action: Object.fromEntries(
        (byActionResult.results || []).map((r) => [r.action, r.count])
      ),
      by_entity: Object.fromEntries(
        (byEntityResult.results || []).map((r) => [r.entity_type, r.count])
      ),
      by_user: byUserResult.results || [],
    };
  }

  /**
   * Obtener logs de una entidad específica
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditLogWithUser[]> {
    const result = await this.db
      .prepare(
        `
        SELECT 
          al.*,
          u.id as user_id,
          u.full_name as user_full_name,
          u.email as user_email,
          u.role as user_role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.entity_type = ? AND al.entity_id = ?
        ORDER BY al.created_at DESC
        LIMIT ?
      `
      )
      .bind(entityType.toUpperCase(), entityId, limit)
      .all<any>();

    return (result.results || []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      action: row.action,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      old_values: row.old_values,
      new_values: row.new_values,
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      request_method: row.request_method,
      request_path: row.request_path,
      status_code: row.status_code,
      error_message: row.error_message,
      created_at: row.created_at,
      user: row.user_full_name
        ? {
            id: row.user_id,
            full_name: row.user_full_name,
            email: row.user_email,
            role: row.user_role,
          }
        : null,
    }));
  }
}

// Made with Bob

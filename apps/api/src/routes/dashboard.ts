import { Hono } from 'hono';
import { authMiddleware } from '../middleware/auth.middleware';
import { success, serverError } from '../utils/response';
import type { Env } from '../types';

const dashboard = new Hono<{ Bindings: Env }>();

dashboard.use('/*', authMiddleware);

dashboard.get('/stats', async (c) => {
  try {
    const db = c.env.DB;
    const now = Math.floor(Date.now() / 1000);
    const monthStart = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);
    const in15Days = now + 15 * 24 * 60 * 60;

    const propStats = await db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'ocupada' THEN 1 ELSE 0 END) as occupied,
          SUM(CASE WHEN status = 'desocupada' THEN 1 ELSE 0 END) as vacant,
          SUM(CASE WHEN delinquency_status != 'al_corriente' THEN 1 ELSE 0 END) as delinquent,
          SUM(CASE WHEN delinquency_status = 'suspendido' THEN 1 ELSE 0 END) as suspended
        FROM properties WHERE deleted_at IS NULL`
      )
      .first<{ total: number; occupied: number; vacant: number; delinquent: number; suspended: number }>();

    const feeStats = await db
      .prepare(
        `SELECT
          SUM(CASE WHEN status IN ('pending', 'partially_paid') THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'overdue' OR (status = 'pending' AND due_date < ?) THEN 1 ELSE 0 END) as overdue
        FROM monthly_fees WHERE deleted_at IS NULL`
      )
      .bind(now)
      .first<{ pending: number; overdue: number }>();

    const paymentStats = await db
      .prepare(
        `SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as amount
        FROM payments
        WHERE status = 'completed' AND payment_date >= ? AND deleted_at IS NULL`
      )
      .bind(monthStart)
      .first<{ count: number; amount: number }>();

    const recentPayments = await db
      .prepare(
        `SELECT p.*, pr.house_number, pr.street
        FROM payments p
        JOIN properties pr ON p.property_id = pr.id AND pr.deleted_at IS NULL
        WHERE p.deleted_at IS NULL
        ORDER BY p.payment_date DESC, p.created_at DESC
        LIMIT 5`
      )
      .all<any>();

    const upcomingDueFees = await db
      .prepare(
        `SELECT f.*, pr.house_number, pr.street
        FROM monthly_fees f
        JOIN properties pr ON f.property_id = pr.id AND pr.deleted_at IS NULL
        WHERE f.deleted_at IS NULL
          AND f.status IN ('pending', 'partially_paid', 'overdue')
          AND f.due_date <= ?
        ORDER BY f.due_date ASC
        LIMIT 5`
      )
      .bind(in15Days)
      .all<any>();

    return success(c, {
      totalProperties: propStats?.total || 0,
      occupiedProperties: propStats?.occupied || 0,
      vacantProperties: propStats?.vacant || 0,
      delinquentProperties: propStats?.delinquent || 0,
      suspendedProperties: propStats?.suspended || 0,
      pendingFees: feeStats?.pending || 0,
      overdueFeesCount: feeStats?.overdue || 0,
      monthlyPayments: paymentStats?.count || 0,
      monthlyPaymentsAmount: paymentStats?.amount || 0,
      recentPayments: (recentPayments.results || []).map((r) => ({
        ...r,
        property: { id: r.property_id, house_number: r.house_number, street: r.street },
      })),
      upcomingDueFees: (upcomingDueFees.results || []).map((r) => ({
        ...r,
        property: { id: r.property_id, house_number: r.house_number, street: r.street },
      })),
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return serverError(c, error instanceof Error ? error.message : 'Error');
  }
});

export default dashboard;

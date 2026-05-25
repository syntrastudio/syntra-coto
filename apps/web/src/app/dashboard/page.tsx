'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { StatCard } from '@/components/StatCard';
import { Building2, Home, AlertCircle, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function DashboardPage() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await apiClient.getDashboardStats();
      return response.data;
    },
    retry: 3,
    retryDelay: 1000,
  });

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Error al cargar datos
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {error instanceof Error ? error.message : 'No se pudo conectar con el servidor'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando estadísticas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Resumen general del fraccionamiento Paseo Coto Tonalá
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Propiedades"
          value={stats?.totalProperties || 0}
          icon={Building2}
          description="Casas registradas"
          color="blue"
        />
        <StatCard
          title="Propiedades Ocupadas"
          value={stats?.occupiedProperties || 0}
          icon={Home}
          description={`${stats?.vacantProperties || 0} vacías`}
          color="green"
        />
        <StatCard
          title="Cuotas Pendientes"
          value={stats?.pendingFees || 0}
          icon={AlertCircle}
          description={`${stats?.overdueFeesCount || 0} vencidas`}
          color="yellow"
        />
        <StatCard
          title="Pagos del Mes"
          value={`$${(stats?.monthlyPaymentsAmount || 0).toLocaleString()}`}
          icon={DollarSign}
          description={`${stats?.monthlyPayments || 0} pagos`}
          color="green"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Pagos Recientes
            </h2>
          </div>
          <div className="p-6">
            {stats?.recentPayments && stats.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {stats.recentPayments.slice(0, 5).map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Casa {payment.property?.house_number} - {payment.property?.street}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {format(new Date(payment.payment_date), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-600">
                        ${payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {payment.payment_method}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No hay pagos recientes
              </p>
            )}
          </div>
        </div>

        {/* Upcoming Due Fees */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow transition-colors">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Próximas Cuotas por Vencer
            </h2>
          </div>
          <div className="p-6">
            {stats?.upcomingDueFees && stats.upcomingDueFees.length > 0 ? (
              <div className="space-y-4">
                {stats.upcomingDueFees.slice(0, 5).map((fee) => (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        Casa {fee.property?.house_number} - {fee.property?.street}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Vence: {format(new Date(fee.due_date), "d 'de' MMMM", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        ${fee.amount.toLocaleString()}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          fee.status === 'overdue'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400'
                        }`}
                      >
                        {fee.status === 'overdue' ? 'Vencida' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No hay cuotas próximas a vencer
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob

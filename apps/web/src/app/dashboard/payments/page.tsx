'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { DollarSign, Calendar, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, methodFilter],
    queryFn: async () => {
      const filters: any = {};
      if (methodFilter) filters.payment_method = methodFilter;
      return await apiClient.getPayments(page, 12, filters);
    },
  });

  const methodColors = {
    cash: 'bg-green-100 text-green-800',
    transfer: 'bg-blue-100 text-blue-800',
    check: 'bg-purple-100 text-purple-800',
    card: 'bg-pink-100 text-pink-800',
    other: 'bg-gray-100 text-gray-800',
  };

  const methodLabels = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    check: 'Cheque',
    card: 'Tarjeta',
    other: 'Otro',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pagos</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Historial de pagos del fraccionamiento
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <select
          value={methodFilter}
          onChange={(e) => {
            setMethodFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="check">Cheque</option>
          <option value="card">Tarjeta</option>
          <option value="other">Otro</option>
        </select>
      </div>

      {/* Payments List */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando pagos...</p>
          </div>
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Propiedad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Método
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Referencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((payment: any) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <DollarSign className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            Casa {payment.property?.house_number}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {payment.property?.street}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                        ${payment.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-gray-100">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {format(new Date(payment.payment_date), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          methodColors[payment.payment_method as keyof typeof methodColors]
                        }`}
                      >
                        <CreditCard className="h-3 w-3 mr-1" />
                        {methodLabels[payment.payment_method as keyof typeof methodLabels]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100">
                        {payment.reference_number || '-'}
                      </div>
                      {payment.notes && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {payment.notes}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                Página {page} de {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center transition-colors">
          <DollarSign className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No se encontraron pagos
          </h3>
        </div>
      )}
    </div>
  );
}

// Made with Bob

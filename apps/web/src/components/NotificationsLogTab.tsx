'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Mail, CheckCircle2, AlertCircle, MinusCircle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const TYPE_LABELS: Record<string, string> = {
  payment_receipt: 'Recibo de pago',
  upcoming_fee: 'Cuota por vencer',
  overdue_reminder: 'Recordatorio de mora',
  suspension_notice: 'Aviso de suspensión',
  monthly_cycle: 'Ciclo mensual (sistema)',
};

const TYPE_COLORS: Record<string, string> = {
  payment_receipt: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  upcoming_fee: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  overdue_reminder: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  suspension_notice: 'bg-red-200 text-red-900 dark:bg-red-900/50 dark:text-red-200',
  monthly_cycle: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export function NotificationsLogTab() {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['notifications-log', page, typeFilter],
    queryFn: () => apiClient.getNotificationsLog({
      page,
      limit: 50,
      type: typeFilter || undefined,
    }),
  });

  const logs: any[] = (data?.data?.data || []) as any[];
  const pag = data?.data?.pagination;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Historial de correos
        </h2>
        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos los tipos</option>
          <option value="payment_receipt">Recibos de pago</option>
          <option value="upcoming_fee">Cuotas por vencer</option>
          <option value="overdue_reminder">Recordatorios de mora</option>
          <option value="suspension_notice">Avisos de suspensión</option>
          <option value="monthly_cycle">Ciclo mensual (sistema)</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}

      {!isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Destinatario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contexto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((l: any) => (
                <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {format(new Date(l.sent_at * 1000), "d MMM HH:mm", { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${TYPE_COLORS[l.type] || ''}`}>
                      {TYPE_LABELS[l.type] || l.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                    {l.target_email}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
                    {l.payment_folio && <span className="font-mono">{l.payment_folio}</span>}
                    {l.fee_period && <span className="ml-2">Periodo {l.fee_period}</span>}
                    {l.property_house_number && (
                      <div>
                        {l.property_street} #{l.property_house_number}
                      </div>
                    )}
                    {l.days_offset != null && (
                      <div>Día {l.days_offset}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {l.status === 'sent' && (
                      <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="h-4 w-4" /> Enviado
                      </span>
                    )}
                    {l.status === 'skipped' && (
                      <span className="text-gray-500 flex items-center gap-1">
                        <MinusCircle className="h-4 w-4" /> Omitido
                        {l.reason && <span className="text-xs ml-1">({l.reason})</span>}
                      </span>
                    )}
                    {l.status === 'failed' && (
                      <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4" /> Falló
                        {l.reason && <span className="text-xs ml-1">({l.reason})</span>}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Sin correos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pag && pag.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50 text-gray-900 dark:text-gray-100 dark:border-gray-600"
          >Anterior</button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Página {page} de {pag.totalPages} ({pag.total} correos)
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pag.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 text-gray-900 dark:text-gray-100 dark:border-gray-600"
          >Siguiente</button>
        </div>
      )}
    </div>
  );
}

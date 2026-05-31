'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  PlayCircle,
  FileText,
  AlertTriangle,
  RefreshCw,
  Zap,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type ActionKey = 'generate' | 'late_fees' | 'delinquency' | 'full_cycle';

interface ActionDef {
  key: ActionKey;
  label: string;
  description: string;
  icon: typeof PlayCircle;
  color: string;
  superAdminOnly?: boolean;
  confirm: string;
  run: () => Promise<any>;
}

export function AdminActionsCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [lastResult, setLastResult] = useState<{ key: ActionKey; data: any } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const actions: ActionDef[] = [
    {
      key: 'generate',
      label: 'Generar cuotas del mes',
      description: 'Crea las cuotas mensuales del mes en curso con el monto configurado',
      icon: FileText,
      color: 'blue',
      confirm: '¿Generar las cuotas mensuales del mes en curso? Se omitirán las propiedades que ya tengan cuota generada este mes.',
      run: () => apiClient.generateCurrentMonthFees(),
    },
    {
      key: 'late_fees',
      label: 'Aplicar recargos del mes',
      description: 'Aplica recargo del 15% sobre cuotas vencidas no liquidadas (idempotente)',
      icon: AlertTriangle,
      color: 'amber',
      confirm: '¿Aplicar recargo del 15% a todas las cuotas vencidas? Es idempotente — no se duplican recargos.',
      run: () => apiClient.applyLateFees(),
    },
    {
      key: 'delinquency',
      label: 'Recalcular morosidad',
      description: 'Actualiza el estado de mora (al_corriente / mora_1_mes / mora_2_meses / suspendido) de cada propiedad',
      icon: RefreshCw,
      color: 'purple',
      confirm: '¿Recalcular el estado de morosidad de todas las propiedades?',
      run: () => apiClient.recalculateDelinquency(),
    },
    {
      key: 'full_cycle',
      label: 'Ejecutar ciclo completo',
      description: 'Corre las 3 tareas anteriores + envía recordatorios automáticos (igual que el cron diario)',
      icon: Zap,
      color: 'green',
      superAdminOnly: true,
      confirm: '¿Ejecutar el CICLO COMPLETO? Esto enviará correos a los residentes con cuotas próximas a vencer o vencidas.',
      run: () => apiClient.runFullCycle(),
    },
  ];

  const mutation = useMutation({
    mutationFn: async (action: ActionDef) => {
      const data = await action.run();
      return { key: action.key, data: (data as any)?.data || data };
    },
    onSuccess: (result) => {
      setLastResult(result);
      setExpanded(true);
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['fees'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (e: Error) => alert(`Error: ${e.message}`),
  });

  const runAction = (action: ActionDef) => {
    if (action.superAdminOnly && user?.role !== 'super_admin') {
      alert('Solo super_admin puede ejecutar el ciclo completo');
      return;
    }
    if (!confirm(action.confirm)) return;
    mutation.mutate(action);
  };

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300',
    amber: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
    purple: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/40 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300',
    green: 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300',
  };

  return (
    <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Acciones administrativas
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Ciclo mensual de cobranza. El cron diario las ejecuta automáticamente.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {actions.map((a) => {
          const Icon = a.icon;
          const disabled = (a.superAdminOnly && user?.role !== 'super_admin') || mutation.isPending;
          const isRunning = mutation.isPending && (mutation.variables as any)?.key === a.key;
          return (
            <button
              key={a.key}
              onClick={() => runAction(a)}
              disabled={disabled}
              className={`text-left p-4 rounded-lg border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colorClasses[a.color]}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 mt-0.5 ${isRunning ? 'animate-spin' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{a.label}</p>
                  <p className="text-xs opacity-80 mt-1">{a.description}</p>
                  {a.superAdminOnly && (
                    <p className="text-[10px] uppercase tracking-wider mt-1 opacity-60">Solo super_admin</p>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {lastResult && (
        <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <span>Última ejecución: {actions.find((a) => a.key === lastResult.key)?.label}</span>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {expanded && (
            <pre className="mt-3 bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs font-mono text-gray-700 dark:text-gray-300 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(lastResult.data, null, 2)}
            </pre>
          )}
        </div>
      )}
    </section>
  );
}

'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/components/ConfirmDialog';
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
  confirmTitle: string;
  confirmDesc: string;
  tone?: 'default' | 'warning';
  run: () => Promise<any>;
}

export function AdminActionsCard() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [lastResult, setLastResult] = useState<{ key: ActionKey; data: any } | null>(null);
  const [expanded, setExpanded] = useState(false);

  const actions: ActionDef[] = [
    {
      key: 'generate',
      label: 'Cobrar mantenimiento del mes',
      description: 'Crea la cuota de este mes para todas las casas, con el monto configurado',
      icon: FileText,
      color: 'blue',
      confirmTitle: '¿Generar las cuotas de este mes?',
      confirmDesc: 'Se creará la cuota de mantenimiento para todas las casas. Las casas que ya tengan cuota de este mes se omiten (no se duplica).',
      run: () => apiClient.generateCurrentMonthFees(),
    },
    {
      key: 'late_fees',
      label: 'Aplicar recargos por atraso',
      description: 'Suma el recargo del 15% a las cuotas vencidas que no se han pagado',
      icon: AlertTriangle,
      color: 'amber',
      tone: 'warning',
      confirmTitle: '¿Aplicar recargo del 15%?',
      confirmDesc: 'Se sumará el recargo a todas las cuotas vencidas sin pagar. Es seguro repetirlo: no se duplican los recargos.',
      run: () => apiClient.applyLateFees(),
    },
    {
      key: 'delinquency',
      label: 'Actualizar quién debe',
      description: 'Revisa cada casa y marca su estado: al corriente, atrasada o suspendida',
      icon: RefreshCw,
      color: 'purple',
      confirmTitle: '¿Actualizar el estado de morosidad?',
      confirmDesc: 'Se revisará cada casa y se marcará si está al corriente, con 1 mes de atraso, 2 meses o suspendida.',
      run: () => apiClient.recalculateDelinquency(),
    },
    {
      key: 'full_cycle',
      label: 'Hacer todo de una vez',
      description: 'Cobra el mes, aplica recargos, actualiza morosidad y envía los correos (igual que lo automático)',
      icon: Zap,
      color: 'green',
      superAdminOnly: true,
      tone: 'warning',
      confirmTitle: '¿Ejecutar el ciclo completo?',
      confirmDesc: 'Hará las 3 tareas anteriores y ENVIARÁ CORREOS a los vecinos con cuotas por vencer o vencidas. Úsalo con cuidado.',
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
      toast.success('Listo, tarea ejecutada');
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['fees'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
    },
    onError: (e: Error) => toast.error('No se pudo ejecutar la tarea', { description: e.message }),
  });

  const runAction = async (action: ActionDef) => {
    if (action.superAdminOnly && user?.role !== 'super_admin') {
      toast.error('Solo el administrador principal puede hacer esto');
      return;
    }
    const ok = await confirm({
      title: action.confirmTitle,
      description: action.confirmDesc,
      confirmText: 'Sí, continuar',
      tone: action.tone || 'default',
    });
    if (ok) mutation.mutate(action);
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
          <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
            <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-gray-900 dark:text-gray-100">
                {actions.find((a) => a.key === lastResult.key)?.label}: completado
              </p>
              <ul className="mt-1 space-y-0.5 text-xs text-gray-600 dark:text-gray-400">
                {summarizeResult(lastResult.data).map((line, i) => (
                  <li key={i}>• {line}</li>
                ))}
              </ul>
              <button
                onClick={() => setExpanded((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {expanded ? 'Ocultar' : 'Ver'} detalle técnico
              </button>
              {expanded && (
                <pre className="mt-2 bg-gray-50 dark:bg-gray-900 p-3 rounded text-[11px] font-mono text-gray-600 dark:text-gray-400 overflow-x-auto whitespace-pre-wrap">
{JSON.stringify(lastResult.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Traduce el objeto de resultado del backend a líneas legibles en español.
 * Cubre las claves comunes; lo que no reconoce simplemente no lo muestra.
 */
function summarizeResult(data: any): string[] {
  if (!data || typeof data !== 'object') return ['Tarea ejecutada.'];
  const lines: string[] = [];
  const n = (v: any) => (typeof v === 'number' ? v : Number(v?.count ?? v ?? 0));

  // Generación de cuotas
  const gen = data.generated ?? data;
  if (gen && (gen.created != null || gen.skipped != null)) {
    if (gen.created != null) lines.push(`${n(gen.created)} cuotas nuevas creadas`);
    if (gen.skipped != null) lines.push(`${n(gen.skipped)} casas omitidas (ya tenían cuota)`);
    if (gen.credit_applied != null) lines.push(`${n(gen.credit_applied)} con saldo a favor aplicado`);
  }
  // Recargos
  const lf = data.late_fees ?? data;
  if (lf && lf.fees_charged != null) lines.push(`${n(lf.fees_charged)} cuotas con recargo aplicado`);
  // Morosidad
  const del = data.delinquency ?? data;
  if (del && del.updated != null) lines.push(`${n(del.updated)} casas actualizadas`);
  if (del && del.suspended != null) lines.push(`${n(del.suspended)} casas suspendidas`);
  // Notificaciones
  const no = data.notifications ?? data;
  if (no && no.sent != null) lines.push(`${n(no.sent)} correos enviados`);

  return lines.length ? lines : ['Tarea ejecutada correctamente.'];
}

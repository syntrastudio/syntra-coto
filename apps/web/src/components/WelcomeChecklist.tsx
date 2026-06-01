'use client';

/**
 * Banner de bienvenida para administradores. Muestra los primeros pasos para
 * dejar el sistema listo, con palomita cuando cada paso ya está hecho.
 *
 * Se oculta solo cuando todos los pasos están completos, o si el usuario lo
 * cierra (se recuerda en el navegador).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { CheckCircle2, Circle, X, Sparkles, ArrowRight } from 'lucide-react';

const DISMISS_KEY = 'syntra_welcome_dismissed';

export function WelcomeChecklist({ stats }: { stats: any }) {
  const [dismissed, setDismissed] = useState(true); // empieza oculto hasta leer localStorage

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  const { data: settingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => apiClient.getSettings(),
  });

  const feeAmount = Number(
    settingsData?.data?.find((s: any) => s.key === 'maintenance_fee_amount')?.value || 0
  );
  const totalProperties = Number(stats?.totalProperties || 0);
  const hasFees = Number(stats?.pendingFees || 0) + Number(stats?.monthlyPayments || 0) > 0;

  const steps = [
    {
      done: feeAmount > 0,
      title: 'Pon la cuota mensual de mantenimiento',
      desc: 'Es el monto que paga cada casa al mes.',
      href: '/dashboard/settings',
      cta: 'Ir a Configuración',
    },
    {
      done: totalProperties > 0,
      title: 'Registra las casas y a los vecinos',
      desc: 'Da de alta las propiedades y quién vive en cada una.',
      href: '/dashboard/properties',
      cta: 'Ir a Casas',
    },
    {
      done: hasFees,
      title: 'Genera las cuotas del mes',
      desc: 'Con el botón azul de abajo se crean las cuotas de todas las casas.',
      href: undefined,
      cta: undefined,
    },
  ];

  const allDone = steps.every((s) => s.done);
  const doneCount = steps.filter((s) => s.done).length;

  if (dismissed || allDone) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6">
      <button
        onClick={dismiss}
        aria-label="Ocultar"
        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          ¡Bienvenido! Configura tu sistema en 3 pasos
        </h2>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Llevas {doneCount} de {steps.length}. Cuando termines, este aviso desaparece solo.
      </p>

      <div className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl p-3 ${
              step.done
                ? 'bg-white/40 dark:bg-gray-800/30'
                : 'bg-white dark:bg-gray-800 shadow-sm'
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0" />
            ) : (
              <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-gray-100'}`}>
                {i + 1}. {step.title}
              </p>
              {!step.done && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{step.desc}</p>
              )}
            </div>
            {!step.done && step.href && step.cta && (
              <Link
                href={step.href}
                className="flex-shrink-0 inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
              >
                {step.cta}
                <ArrowRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

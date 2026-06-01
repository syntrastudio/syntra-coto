'use client';

/**
 * Diálogo de confirmación global, accesible vía hook `useConfirm()`.
 *
 * Reemplaza al `window.confirm()` nativo (que se ve feo y "técnico") por un
 * modal suave estilo Apple. Devuelve una promesa que resuelve true/false.
 *
 * Uso:
 *   const confirm = useConfirm();
 *   const ok = await confirm({
 *     title: '¿Borrar a Juan Pérez?',
 *     description: 'Esta acción no se puede deshacer.',
 *     confirmText: 'Sí, borrar',
 *     tone: 'danger',
 *   });
 *   if (ok) { ...borrar... }
 */

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, HelpCircle, Trash2 } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  /** 'danger' = rojo (borrar/irreversible), 'default' = azul, 'warning' = ámbar */
  tone?: 'default' | 'danger' | 'warning';
}

type Resolver = (value: boolean) => void;

const ConfirmContext = createContext<((opts: ConfirmOptions) => Promise<boolean>) | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<Resolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions) => {
    setOpts(options);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    setOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
  }, []);

  const tone = opts?.tone || 'default';
  const toneStyles = {
    default: {
      icon: HelpCircle,
      iconWrap: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      btn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
    danger: {
      icon: Trash2,
      iconWrap: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
      btn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      icon: AlertTriangle,
      iconWrap: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
      btn: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
  }[tone];
  const Icon = toneStyles.icon;

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {open && opts && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => close(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
          >
            <div className="flex flex-col items-center text-center">
              <div className={`h-14 w-14 rounded-full flex items-center justify-center mb-4 ${toneStyles.iconWrap}`}>
                <Icon className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {opts.title}
              </h2>
              {opts.description && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {opts.description}
                </p>
              )}
            </div>
            <div className="mt-6 flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => close(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                {opts.cancelText || 'Cancelar'}
              </button>
              <button
                onClick={() => close(true)}
                autoFocus
                className={`flex-1 px-4 py-2.5 rounded-xl text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${toneStyles.btn}`}
              >
                {opts.confirmText || 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    // Fallback al confirm nativo si el provider no está montado (no debería pasar)
    return async (opts: ConfirmOptions) =>
      typeof window !== 'undefined' ? window.confirm(opts.title) : false;
  }
  return ctx;
}

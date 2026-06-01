'use client';

/**
 * Estado vacío amigable con llamada a la acción. Para cuando una lista no tiene
 * datos todavía: en vez de "No hay X", invita a crear el primero.
 */

import { type LucideIcon } from 'lucide-react';
import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Texto del botón principal. Si se omite, no se muestra botón. */
  actionLabel?: string;
  onAction?: () => void;
  /** Contenido extra opcional (ej. un segundo botón o nota). */
  children?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, children }: EmptyStateProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-12 text-center">
      <div className="mx-auto h-16 w-16 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-blue-500 dark:text-blue-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
        >
          {actionLabel}
        </button>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

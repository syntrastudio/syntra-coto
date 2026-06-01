'use client';

/**
 * Pequeño ícono "?" con tooltip explicativo. Para aclarar términos que pueden
 * confundir a usuarios no técnicos (FIFO, saldo a favor, depósito de terraza...).
 *
 * Uso:
 *   <Help text="El pago se aplica a las cuotas más viejas primero." />
 *   <Help text="..." size="sm" />
 */

import * as Tooltip from '@radix-ui/react-tooltip';
import { HelpCircle } from 'lucide-react';
import { type ReactNode } from 'react';

interface HelpProps {
  text: ReactNode;
  size?: 'sm' | 'md';
  /** Si se pasa, envuelve este contenido en vez del ícono "?" */
  children?: ReactNode;
}

export function Help({ text, size = 'md', children }: HelpProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  return (
    <Tooltip.Provider delayDuration={150}>
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {children ? (
            <span className="cursor-help border-b border-dotted border-gray-400">{children}</span>
          ) : (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Ayuda"
              className="inline-flex text-gray-400 hover:text-blue-500 transition-colors align-middle"
              onClick={(e) => e.preventDefault()}
            >
              <HelpCircle className={iconSize} />
            </button>
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Content
            sideOffset={6}
            className="z-[120] max-w-xs rounded-lg bg-gray-900 dark:bg-gray-700 px-3 py-2 text-xs leading-relaxed text-white shadow-lg animate-in fade-in zoom-in-95 duration-100"
          >
            {text}
            <Tooltip.Arrow className="fill-gray-900 dark:fill-gray-700" />
          </Tooltip.Content>
        </Tooltip.Portal>
      </Tooltip.Root>
    </Tooltip.Provider>
  );
}

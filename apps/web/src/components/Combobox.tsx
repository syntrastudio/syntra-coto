'use client';

/**
 * Combobox buscable: el usuario escribe y filtra entre las opciones, pero
 * también puede dejar texto libre (por si su marca/modelo no está en la lista).
 */

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check, Loader2 } from 'lucide-react';

interface ComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyHint?: string;
}

export function Combobox({ value, onChange, options, loading, disabled, placeholder, emptyHint }: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const filtered = query.trim()
    ? options.filter((o) => o.toLowerCase().includes(query.toLowerCase())).slice(0, 50)
    : options.slice(0, 50);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-9 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </div>
      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {loading ? (
            <p className="px-3 py-2 text-sm text-gray-400">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">{emptyHint || 'Sin coincidencias. Puedes escribirlo tal cual.'}</p>
          ) : (
            filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => { onChange(o); setQuery(o); setOpen(false); }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30"
              >
                <span>{o}</span>
                {value === o && <Check className="h-4 w-4 text-blue-600" />}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

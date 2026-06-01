'use client';

/**
 * Accesos rápidos a las tareas más comunes, en tarjetas grandes y claras.
 * Pensado para que el usuario no técnico encuentre lo que busca de inmediato.
 */

import Link from 'next/link';
import { CreditCard, Users, AlertTriangle, Receipt, type LucideIcon } from 'lucide-react';

interface Shortcut {
  href: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  color: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    href: '/dashboard/payments',
    icon: CreditCard,
    title: 'Registrar un pago',
    desc: 'Cuando un vecino paga su cuota',
    color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    href: '/dashboard/properties',
    icon: AlertTriangle,
    title: 'Ver quién debe',
    desc: 'Estado de pago de cada casa',
    color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    href: '/dashboard/residents',
    icon: Users,
    title: 'Dar de alta un vecino',
    desc: 'Agregar al padrón',
    color: 'text-green-600 bg-green-50 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    href: '/dashboard/fees',
    icon: Receipt,
    title: 'Revisar cuotas',
    desc: 'Mantenimiento del mes',
    color: 'text-purple-600 bg-purple-50 dark:bg-purple-900/30 dark:text-purple-400',
  },
];

export function QuickActions() {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Accesos rápidos
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {SHORTCUTS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md border border-transparent hover:border-blue-200 dark:hover:border-blue-800 p-4 transition-all"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center mb-3 ${s.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                {s.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.desc}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

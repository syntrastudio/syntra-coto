'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  LifeBuoy,
  ChevronDown,
  CreditCard,
  Users,
  Receipt,
  AlertTriangle,
  Wallet,
  KeyRound,
  PlayCircle,
} from 'lucide-react';

interface GuideItem {
  icon: typeof CreditCard;
  q: string;
  steps: string[];
  link?: { href: string; label: string };
}

const GUIDE: GuideItem[] = [
  {
    icon: CreditCard,
    q: '¿Cómo registro un pago?',
    steps: [
      'Entra a "Pagos" en el menú de la izquierda.',
      'Toca el botón azul "Registrar pago".',
      'Elige cómo cobrar: lo más fácil es "A la casa" (el dinero se aplica solo a lo que más debe).',
      'Selecciona la casa, escribe el monto y el método (efectivo, transferencia, etc.).',
      'Si el pago lo recibió otro miembro de la mesa, elígelo en "¿Quién recibió el dinero?".',
      'Toca "Registrar pago". El recibo se le envía solo al vecino por correo.',
    ],
    link: { href: '/dashboard/payments', label: 'Ir a Pagos' },
  },
  {
    icon: Users,
    q: '¿Cómo doy de alta a un vecino y le doy acceso al sistema?',
    steps: [
      'Entra a "Vecinos" y toca "Registrar vecino".',
      'Llena sus datos: nombre, correo, teléfono.',
      'Si quieres que pueda entrar al sistema, marca la casilla "Crear cuenta de acceso".',
      'Al guardar, le llega un correo con su contraseña temporal.',
      'Después, en "Casas", puedes asignarle su propiedad como dueño o inquilino.',
    ],
    link: { href: '/dashboard/residents', label: 'Ir a Vecinos' },
  },
  {
    icon: PlayCircle,
    q: '¿Cómo cobro el mantenimiento del mes a todas las casas?',
    steps: [
      'Normalmente NO tienes que hacer nada: el sistema crea las cuotas solo el día 1 de cada mes.',
      'Si quieres hacerlo a mano, ve a "Inicio".',
      'Busca la tarjeta "Cobrar mantenimiento del mes" y tócala.',
      'Confirma. Se crean las cuotas de todas las casas con el monto configurado.',
    ],
    link: { href: '/dashboard', label: 'Ir a Inicio' },
  },
  {
    icon: AlertTriangle,
    q: '¿Qué pasa si un vecino no paga?',
    steps: [
      'Cada día el sistema revisa quién debe y actualiza su estado.',
      'Con 1 mes de atraso, la casa se marca con restricciones (terraza, visitas).',
      'Con 2 meses o más, queda suspendida.',
      'Además se le suma un recargo del 15% por cada mes vencido (según el reglamento).',
      'En "Casas" puedes ver el estado de pago de cada una de un vistazo.',
    ],
    link: { href: '/dashboard/properties', label: 'Ver estado de las casas' },
  },
  {
    icon: Receipt,
    q: '¿Cómo funciona el pago anual con descuento?',
    steps: [
      'En "Pagos" → "Registrar pago", elige el modo "Pago anual".',
      'Selecciona la casa y el año.',
      'El sistema cobra 10 meses y regala 2 (según el reglamento).',
      'Se liquidan automáticamente las 12 cuotas del año.',
    ],
    link: { href: '/dashboard/payments', label: 'Ir a Pagos' },
  },
  {
    icon: Wallet,
    q: '¿Para qué sirve "Caja de la mesa"?',
    steps: [
      'Cada miembro de la mesa tiene su propio saldo de efectivo.',
      'Cuando registras un pago, el dinero se suma al saldo de quien lo recibió.',
      'Desde ahí puedes "Depositar al banco" (baja tu saldo) o "Entregar a otro miembro".',
      'Así siempre se sabe quién tiene cuánto dinero del coto.',
    ],
    link: { href: '/dashboard/mesa', label: 'Ir a Caja de la mesa' },
  },
  {
    icon: KeyRound,
    q: '¿Cómo entro sin contraseña (con huella o Face ID)?',
    steps: [
      'Entra a "Configuración" → pestaña "Mi cuenta".',
      'En "Mis dispositivos", toca "Agregar este dispositivo".',
      'Confirma con tu huella, Face ID o el PIN de tu equipo.',
      'La próxima vez podrás entrar con un toque, sin escribir contraseña.',
    ],
    link: { href: '/dashboard/settings', label: 'Ir a Configuración' },
  },
];

export default function AyudaPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <LifeBuoy className="h-7 w-7" />
          ¿Cómo se usa?
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Guías cortas para las tareas más comunes. Toca cada pregunta para ver los pasos.
        </p>
      </div>

      <div className="space-y-3">
        {GUIDE.map((item, i) => {
          const Icon = item.icon;
          const isOpen = open === i;
          return (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <Icon className="h-5 w-5" />
                </div>
                <span className="flex-1 font-medium text-gray-900 dark:text-gray-100">{item.q}</span>
                <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pl-16">
                  <ol className="space-y-2">
                    {item.steps.map((step, s) => (
                      <li key={s} className="flex gap-3 text-sm text-gray-700 dark:text-gray-300">
                        <span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center">
                          {s + 1}
                        </span>
                        <span className="leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>
                  {item.link && (
                    <Link
                      href={item.link.href}
                      className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {item.link.label} →
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300">
        ¿No encuentras lo que buscas? Usa el asistente del botón flotante abajo a la derecha
        para preguntar con tus propias palabras cómo hacer algo.
      </div>
    </div>
  );
}

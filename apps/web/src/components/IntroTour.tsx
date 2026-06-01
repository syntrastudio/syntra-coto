'use client';

/**
 * Mini-tour de bienvenida (una sola vez). Carrusel de tarjetas que explica las
 * secciones principales en lenguaje simple. Sin librerías externas.
 * Se muestra solo la primera vez que un admin entra; queda recordado en el
 * navegador. Se puede volver a ver desde "¿Cómo se usa?".
 */

import { useEffect, useState } from 'react';
import { Building2, CreditCard, AlertTriangle, LifeBuoy, Sparkles, ChevronRight, ChevronLeft } from 'lucide-react';

const SEEN_KEY = 'syntra_intro_seen';

const SLIDES = [
  {
    icon: Sparkles,
    title: 'Te damos la bienvenida',
    body: 'Este es el sistema para administrar Paseo Coto Tonalá. En 4 pantallas te enseñamos lo básico. Puedes saltarlo cuando quieras.',
  },
  {
    icon: Building2,
    title: 'Casas y Vecinos',
    body: 'En "Casas" están todas las propiedades del coto y su estado de pago. En "Vecinos" llevas el padrón de quién vive en cada una.',
  },
  {
    icon: CreditCard,
    title: 'Cobrar es muy fácil',
    body: 'En "Pagos" registras cuando alguien paga su cuota. El recibo se manda solito por correo. El mantenimiento del mes se genera automático cada día 1.',
  },
  {
    icon: AlertTriangle,
    title: 'El sistema vigila la morosidad',
    body: 'Cada día revisa quién debe, aplica los recargos del reglamento y avisa por correo. Tú solo registras los pagos.',
  },
  {
    icon: LifeBuoy,
    title: '¿Dudas? Estamos aquí',
    body: 'En "¿Cómo se usa?" hay guías paso a paso. Y el botón azul de abajo a la derecha es un asistente al que le puedes preguntar lo que sea.',
  },
];

export function IntroTour() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (localStorage.getItem(SEEN_KEY) !== '1') setShow(true);
  }, []);

  const finish = () => {
    localStorage.setItem(SEEN_KEY, '1');
    setShow(false);
  };

  if (!show) return null;

  const slide = SLIDES[i]!;
  const Icon = slide.icon;
  const isLast = i === SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-7 animate-in zoom-in-95 duration-150">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
            <Icon className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{slide.title}</h2>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 leading-relaxed min-h-[72px]">
            {slide.body}
          </p>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-2 mt-5">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 rounded-full transition-all ${idx === i ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300 dark:bg-gray-600'}`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          {i > 0 ? (
            <button
              onClick={() => setI(i - 1)}
              className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <ChevronLeft className="h-4 w-4" /> Atrás
            </button>
          ) : (
            <button onClick={finish} className="text-sm text-gray-400 hover:text-gray-600">
              Saltar
            </button>
          )}
          <button
            onClick={() => (isLast ? finish() : setI(i + 1))}
            className="inline-flex items-center gap-1 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium"
          >
            {isLast ? '¡Empezar!' : 'Siguiente'}
            {!isLast && <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

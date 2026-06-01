'use client';

/**
 * Asistente flotante de ayuda. Botón abajo a la derecha que abre un chat donde
 * el usuario pregunta "¿cómo hago X?" y un modelo de IA (Workers AI) responde
 * con pasos, usando el manual del sistema como contexto.
 *
 * Reutiliza el control de uso del bot del reglamento (mismo presupuesto diario).
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { MessageCircleQuestion, X, Send, Sparkles } from 'lucide-react';

interface Msg {
  role: 'user' | 'bot';
  text: string;
}

const SUGGESTIONS = [
  '¿Cómo registro un pago?',
  '¿Cómo doy de alta a un vecino?',
  '¿Qué pasa si alguien no paga?',
  '¿Cómo cobro el mantenimiento del mes?',
];

export function HelpBot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([
    { role: 'bot', text: '¡Hola! Soy tu asistente. Pregúntame cómo hacer cualquier cosa en el sistema y te explico paso a paso. 👇' },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (q: string) => apiClient.askHelp(q),
    onSuccess: (resp: any) => {
      const answer = resp?.data?.answer || 'No pude generar una respuesta. Intenta de nuevo.';
      setMessages((m) => [...m, { role: 'bot', text: answer }]);
    },
    onError: (e: Error) => {
      setMessages((m) => [...m, { role: 'bot', text: `Ups, ${e.message}. Mientras tanto, revisa la sección "¿Cómo se usa?" del menú.` }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, ask.isPending]);

  const send = (q: string) => {
    const question = q.trim();
    if (!question || ask.isPending) return;
    setMessages((m) => [...m, { role: 'user', text: question }]);
    setInput('');
    ask.mutate(question);
  };

  return (
    <>
      {/* Botón flotante */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Abrir asistente de ayuda"
          className="fixed bottom-6 right-6 z-[90] h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105"
        >
          <MessageCircleQuestion className="h-7 w-7" />
        </button>
      )}

      {/* Panel de chat */}
      {open && (
        <div className="fixed bottom-6 right-6 z-[90] w-[calc(100vw-3rem)] max-w-sm h-[32rem] max-h-[80vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              <div>
                <p className="font-semibold text-sm leading-tight">Asistente</p>
                <p className="text-[11px] text-blue-100 leading-tight">Te ayuda a usar el sistema</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="text-blue-100 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mensajes */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-bl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {ask.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
                  </div>
                </div>
              </div>
            )}

            {/* Sugerencias (solo al inicio) */}
            {messages.length === 1 && !ask.isPending && (
              <div className="space-y-2 pt-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="p-3 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu pregunta..."
              className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={ask.isPending || !input.trim()}
              className="h-9 w-9 flex-shrink-0 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

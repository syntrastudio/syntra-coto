'use client';

import { useEffect, useRef, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { BookOpen, Send, AlertTriangle, Bot, User as UserIcon, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  neurons?: number;
}

export function ReglamentoView() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '¡Hola! Soy el asistente del reglamento del fraccionamiento. Puedes preguntarme sobre cuotas, mora, asambleas, áreas comunes, etc. Te citaré los artículos cuando corresponda.',
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar PDF como blob URL (porque el endpoint requiere auth)
  useEffect(() => {
    let revokedUrl: string | null = null;
    apiClient
      .getReglamentoPdfBlobUrl()
      .then((url) => {
        revokedUrl = url;
        setPdfUrl(url);
      })
      .catch((e: Error) => setPdfError(e.message));
    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, []);

  // Estado del asistente (uso del día)
  const { data: usageData, refetch: refetchUsage } = useQuery({
    queryKey: ['assistant-usage'],
    queryFn: () => apiClient.getAssistantUsage(),
    refetchInterval: 60000,
  });
  const usage = usageData?.data;

  // Mandar pregunta
  const askMut = useMutation({
    mutationFn: (q: string) => apiClient.askAssistant(q),
    onSuccess: (r) => {
      const d = r.data!;
      setMessages((m) => [...m, { role: 'assistant', content: d.answer, neurons: d.neurons }]);
      refetchUsage();
    },
    onError: (e: Error) => {
      setMessages((m) => [...m, { role: 'assistant', content: `❌ ${e.message}` }]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, askMut.isPending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = question.trim();
    if (!q || askMut.isPending) return;
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setQuestion('');
    askMut.mutate(q);
  };

  const suggestions = [
    '¿Cuánto es el recargo por mora?',
    '¿Cuáles son los requisitos para ser parte del Consejo de Administración?',
    '¿Cuánto cuesta reservar la terraza?',
    '¿Qué pasa si me atraso 2 meses en el pago?',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <BookOpen className="h-7 w-7" />
          Reglamento del fraccionamiento
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Consulta el reglamento oficial o pregunta al asistente con lenguaje natural.
        </p>
      </div>

      {usage && !usage.enabled && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            El asistente está deshabilitado temporalmente por administración. Puedes seguir consultando el PDF.
          </div>
        </div>
      )}
      {usage && usage.enabled && usage.percentage_used >= 80 && usage.percentage_used < 95 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
          ⚠️ El asistente está al {usage.percentage_used.toFixed(0)}% de uso diario.
        </div>
      )}
      {usage && !usage.available && usage.enabled && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-800 dark:text-red-300">
          🚫 Se alcanzó el límite diario del asistente ({usage.percentage_used.toFixed(0)}%). Vuelve a intentar mañana o consulta directamente el PDF.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-[700px]">
        {/* PDF VIEWER (3 cols) */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 font-mono">
            reglamento-paseo-coto-tonala.pdf
          </div>
          {pdfError ? (
            <div className="flex-1 flex items-center justify-center text-sm text-red-600 p-6">
              {pdfError}
            </div>
          ) : !pdfUrl ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <iframe
              src={pdfUrl}
              title="Reglamento"
              className="flex-1 w-full h-full min-h-[600px]"
            />
          )}
        </div>

        {/* CHAT (2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Asistente</h2>
            </div>
            {usage && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {usage.percentage_used.toFixed(0)}% del día
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: '500px' }}>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {m.role === 'assistant' && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                }`}>
                  {m.content}
                  {m.neurons != null && (
                    <div className="mt-1 text-[10px] opacity-60">
                      {m.neurons.toFixed(1)} neurons usados
                    </div>
                  )}
                </div>
                {m.role === 'user' && (
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <UserIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </div>
                )}
              </div>
            ))}
            {askMut.isPending && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 h-7 w-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Buscando en el reglamento...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2 space-y-1">
              <p className="text-xs text-gray-500 dark:text-gray-400">Sugerencias:</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setQuestion(s); }}
                    disabled={!usage?.available || askMut.isPending}
                    className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300 disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={submit} className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={usage?.available ? 'Pregunta sobre el reglamento...' : 'Asistente no disponible'}
              disabled={!usage?.available || askMut.isPending}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!question.trim() || !usage?.available || askMut.isPending}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

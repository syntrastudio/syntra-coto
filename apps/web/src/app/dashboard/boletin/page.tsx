'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useConfirm } from '@/components/ConfirmDialog';
import { Megaphone, Sparkles, Send, Users, Search, Check, Undo2, History } from 'lucide-react';

export default function BoletinPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();

  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [signature, setSignature] = useState('Mesa Directiva — Paseo Coto Tonalá');
  const [audience, setAudience] = useState<'all' | 'selected'>('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [recipientSearch, setRecipientSearch] = useState('');
  const [prevBody, setPrevBody] = useState<string | null>(null);

  const { data: recipientsData } = useQuery({ queryKey: ['bulletin-recipients'], queryFn: () => apiClient.getBulletinRecipients() });
  const recipients = recipientsData?.data || [];
  const { data: historyData } = useQuery({ queryKey: ['bulletins'], queryFn: () => apiClient.getBulletins() });
  const history = historyData?.data || [];

  const filteredRecipients = useMemo(() => {
    const q = recipientSearch.toLowerCase();
    return recipients.filter((r) => !q || r.full_name?.toLowerCase().includes(q) || `${r.street} ${r.house_number}`.toLowerCase().includes(q));
  }, [recipients, recipientSearch]);

  const improveMut = useMutation({
    mutationFn: () => apiClient.improveBulletin(body),
    onSuccess: (resp: any) => {
      const improved = resp?.data?.improved;
      if (improved) { setPrevBody(body); setBody(improved); toast.success('Texto mejorado con IA', { description: 'Puedes deshacer si no te gustó.' }); }
    },
    onError: (e: Error) => toast.error('No se pudo mejorar el texto', { description: e.message }),
  });

  const sendMut = useMutation({
    mutationFn: () => apiClient.sendBulletin({
      subject, body, signature: signature || undefined, audience,
      resident_ids: audience === 'selected' ? Array.from(selected) : undefined,
    }),
    onSuccess: (resp: any) => {
      qc.invalidateQueries({ queryKey: ['bulletins'] });
      toast.success(resp?.message || 'Boletín enviado');
      setSubject(''); setBody(''); setSelected(new Set()); setPrevBody(null);
    },
    onError: (e: Error) => toast.error('No se pudo enviar', { description: e.message }),
  });

  const recipientCount = audience === 'all' ? recipients.length : selected.size;

  const handleSend = async () => {
    if (!subject.trim()) { toast.error('Escribe un asunto'); return; }
    if (!body.trim()) { toast.error('Escribe el mensaje'); return; }
    if (audience === 'selected' && selected.size === 0) { toast.error('Elige al menos un vecino'); return; }
    const ok = await confirm({
      title: `¿Enviar el boletín a ${recipientCount} ${recipientCount === 1 ? 'vecino' : 'vecinos'}?`,
      description: 'Se enviará por correo a cada destinatario. Revisa el asunto y el mensaje antes de continuar.',
      confirmText: 'Sí, enviar',
    });
    if (ok) sendMut.mutate();
  };

  const toggle = (id: string) => {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Megaphone className="h-7 w-7" /> Boletín oficial
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manda comunicados por correo a los vecinos. Escribe tu mensaje y la IA te ayuda a redactarlo bien.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-4">
        <div>
          <label className={lbl}>Asunto</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className={inp} placeholder="Ej: Corte de agua programado el sábado" />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={lbl}>Mensaje</label>
            <div className="flex items-center gap-2">
              {prevBody !== null && (
                <button onClick={() => { setBody(prevBody!); setPrevBody(null); }} className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
                  <Undo2 className="h-3.5 w-3.5" /> Deshacer
                </button>
              )}
              <button
                onClick={() => body.trim() ? improveMut.mutate() : toast.error('Escribe algo primero')}
                disabled={improveMut.isPending}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs font-semibold disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {improveMut.isPending ? 'Mejorando…' : 'Mejorar con IA'}
              </button>
            </div>
          </div>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} className={inp} placeholder="Escribe aquí tu comunicado. La IA corrige ortografía y lo hace más claro al tocar 'Mejorar con IA'." />
        </div>

        <div>
          <label className={lbl}>Firma (opcional)</label>
          <input value={signature} onChange={(e) => setSignature(e.target.value)} className={inp} />
        </div>

        {/* Destinatarios */}
        <div>
          <label className={lbl}>¿A quién se lo mandamos?</label>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setAudience('all')} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium ${audience === 'all' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              <Users className="h-4 w-4 inline mr-1" /> A todos ({recipients.length})
            </button>
            <button onClick={() => setAudience('selected')} className={`flex-1 px-3 py-2 rounded-lg border text-sm font-medium ${audience === 'selected' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300'}`}>
              <Check className="h-4 w-4 inline mr-1" /> Solo algunos ({selected.size})
            </button>
          </div>

          {audience === 'selected' && (
            <div className="mt-3 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="p-2 border-b border-gray-100 dark:border-gray-700 relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <input value={recipientSearch} onChange={(e) => setRecipientSearch(e.target.value)} placeholder="Buscar vecino o casa…" className={`${inp} pl-9`} />
              </div>
              <div className="max-h-52 overflow-y-auto">
                {filteredRecipients.length === 0 ? (
                  <p className="p-3 text-sm text-gray-400">Sin vecinos con correo.</p>
                ) : filteredRecipients.map((r) => (
                  <label key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4 rounded text-blue-600" />
                    <span className="text-sm text-gray-900 dark:text-gray-100">{r.full_name}</span>
                    <span className="text-xs text-gray-400 ml-auto">{r.street} {r.house_number}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-400">Se enviará a <strong>{recipientCount}</strong> {recipientCount === 1 ? 'vecino' : 'vecinos'} con correo.</p>
          <button onClick={handleSend} disabled={sendMut.isPending} className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium disabled:opacity-50">
            <Send className="h-4 w-4" /> {sendMut.isPending ? 'Enviando…' : 'Enviar boletín'}
          </button>
        </div>
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 flex items-center gap-2">
            <History className="h-4 w-4" /> Boletines enviados
          </h2>
          <div className="space-y-2">
            {history.map((b: any) => (
              <div key={b.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{b.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {b.folio} · {b.audience === 'all' ? 'A todos' : 'Selección'} · Enviado a {b.sent_count}/{b.recipient_count}
                      {b.failed_count > 0 && <span className="text-red-500"> · {b.failed_count} fallaron</span>}
                      {b.sent_by_name ? ` · por ${b.sent_by_name}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300';

'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { EmptyState } from '@/components/EmptyState';
import { whatsappLink } from '@/lib/whatsapp';
import { UserPlus, Mail, MessageCircle, Check, X, Copy } from 'lucide-react';

const STATUS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  contactado: { label: 'Contactado', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  descartado: { label: 'Descartado', cls: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

export default function InteresadosPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['access-requests'], queryFn: () => apiClient.getAccessRequests() });
  const requests = data?.data || [];

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: any }) => apiClient.updateAccessRequestStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['access-requests'] }); toast.success('Actualizado'); },
    onError: (e: Error) => toast.error('Error', { description: e.message }),
  });

  const publicUrl = typeof window !== 'undefined' ? `${window.location.origin}/solicitar-acceso` : '/solicitar-acceso';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <UserPlus className="h-7 w-7" /> Interesados
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Vecinos que pidieron acceso al portal desde la página pública.
        </p>
      </div>

      {/* Link público para compartir */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Comparte este enlace con los vecinos</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-blue-700 dark:text-blue-300 truncate">{publicUrl}</code>
          <button
            onClick={() => { navigator.clipboard?.writeText(publicUrl); toast.success('Enlace copiado'); }}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1"
          >
            <Copy className="h-4 w-4" /> Copiar
          </button>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Cualquiera con el enlace puede dejar su correo. Tú decides a quién le das acceso.</p>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Cargando…</p>
      ) : requests.length === 0 ? (
        <EmptyState icon={UserPlus} title="Aún no hay interesados" description="Comparte el enlace de arriba. Cuando alguien deje sus datos, aparecerá aquí." />
      ) : (
        <div className="space-y-2">
          {requests.map((r: any) => (
            <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-gray-100">{r.full_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status]?.cls || ''}`}>{STATUS[r.status]?.label || r.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.email}{r.phone ? ` · ${r.phone}` : ''}{r.house_label ? ` · ${r.house_label}` : ''}</p>
                  {r.message && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">“{r.message}”</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={`mailto:${r.email}`} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Correo</a>
                  {r.phone && whatsappLink(r.phone) && (
                    <a href={whatsappLink(r.phone, `Hola ${r.full_name?.split(' ')[0] || ''}, te escribimos de la administración de Paseo Coto Tonalá sobre tu acceso al portal.`)!} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
                  )}
                  <Link href="/dashboard/residents" className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> Dar de alta</Link>
                  {r.status !== 'contactado' && (
                    <button onClick={() => statusMut.mutate({ id: r.id, status: 'contactado' })} className="px-2.5 py-1 rounded-lg bg-green-600 text-white text-xs flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Contactado</button>
                  )}
                  {r.status !== 'descartado' && (
                    <button onClick={() => statusMut.mutate({ id: r.id, status: 'descartado' })} className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1"><X className="h-3.5 w-3.5" /> Descartar</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

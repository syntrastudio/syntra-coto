'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { EmptyState } from '@/components/EmptyState';
import { whatsappLink } from '@/lib/whatsapp';
import { UserPlus, Mail, MessageCircle, X, Copy, AlertTriangle, Eye, Loader2 } from 'lucide-react';

const STATUS: Record<string, { label: string; cls: string }> = {
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  en_revision: { label: 'En revisión', cls: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  contactado: { label: 'Contactado', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  dado_de_alta: { label: 'Dado de alta ✓', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  descartado: { label: 'Descartado', cls: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

export default function InteresadosPage() {
  const qc = useQueryClient();
  const [approving, setApproving] = useState<any | null>(null);

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
          Vecinos que pidieron acceso. Revisa sus datos y dales de alta sin volver a escribirlos.
        </p>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mb-1">Comparte este enlace con los vecinos</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-3 py-2 text-blue-700 dark:text-blue-300 truncate">{publicUrl}</code>
          <button onClick={() => { navigator.clipboard?.writeText(publicUrl); toast.success('Enlace copiado'); }} className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center gap-1">
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
          {requests.map((r: any) => {
            const hasDup = r.dup_email_name || r.dup_phone_name;
            return (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{r.full_name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status]?.cls || ''}`}>{STATUS[r.status]?.label || r.status}</span>
                      {hasDup && r.status !== 'dado_de_alta' && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Posible duplicado
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{r.email}{r.phone ? ` · ${r.phone}` : ''}{r.house_label ? ` · ${r.house_label}` : ''}</p>
                    {r.dup_email_name && <p className="text-xs text-red-600 dark:text-red-400 mt-1">⚠ El correo ya es de {r.dup_email_name}.</p>}
                    {r.dup_phone_name && !r.dup_email_name && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">⚠ El teléfono ya lo tiene {r.dup_phone_name}.</p>}
                    {r.message && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">“{r.message}”</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {r.status !== 'dado_de_alta' && (
                      <button onClick={() => setApproving(r)} className="px-2.5 py-1 rounded-lg bg-blue-600 text-white text-xs flex items-center gap-1"><UserPlus className="h-3.5 w-3.5" /> Revisar y dar de alta</button>
                    )}
                    <a href={`mailto:${r.email}`} className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> Correo</a>
                    {r.phone && whatsappLink(r.phone) && (
                      <a href={whatsappLink(r.phone, `Hola ${r.full_name?.split(' ')[0] || ''}, te escribimos de la administración de Paseo Coto Tonalá sobre tu acceso al portal.`)!} target="_blank" rel="noreferrer" className="px-2.5 py-1 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
                    )}
                    {r.status === 'pendiente' && (
                      <button onClick={() => statusMut.mutate({ id: r.id, status: 'en_revision' })} className="px-2.5 py-1 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> A revisión</button>
                    )}
                    {r.status !== 'descartado' && r.status !== 'dado_de_alta' && (
                      <button onClick={() => statusMut.mutate({ id: r.id, status: 'descartado' })} className="px-2.5 py-1 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs flex items-center gap-1"><X className="h-3.5 w-3.5" /> Descartar</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {approving && <ApproveModal request={approving} onClose={() => setApproving(null)} />}
    </div>
  );
}

function ApproveModal({ request, onClose }: { request: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(request.full_name || '');
  const [email, setEmail] = useState(request.email || '');
  const [phone, setPhone] = useState(request.phone || '');
  const [type, setType] = useState<'propietario' | 'inquilino'>('propietario');
  const [propertyId, setPropertyId] = useState('');
  const [createAccount, setCreateAccount] = useState(true);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const { data: propsData } = useQuery({
    queryKey: ['properties', 'all', 'approve'],
    queryFn: async () => {
      const r = await apiClient.getProperties(1, 100);
      return Array.isArray(r.data) ? r.data : ((r.data as any)?.data || []);
    },
  });
  const properties: any[] = propsData || [];

  const run = async (override: boolean) => {
    if (!fullName.trim() || !email.trim() || !phone.trim()) { toast.error('Completa nombre, correo y teléfono'); return; }
    setBusy(true);
    try {
      const res = await apiClient.approveAccessRequest(request.id, {
        full_name: fullName.trim(), email: email.trim(), phone: phone.trim(), type,
        property_id: propertyId || undefined, override,
      });
      if (!res.ok) {
        if (res.body?.code === 'EMAIL_DUP') { toast.error('Correo duplicado', { description: res.body.error }); setBusy(false); return; }
        if (res.body?.code === 'NEEDS_OVERRIDE') { setWarnings(res.body.warnings || []); setBusy(false); return; }
        toast.error('No se pudo dar de alta', { description: res.body?.error || `Error ${res.status}` });
        setBusy(false); return;
      }
      const residentId = res.body?.data?.resident_id;
      // Crear cuenta de acceso (reusa el flujo con correo de bienvenida)
      if (createAccount && residentId) {
        try {
          const u: any = await apiClient.createUser({ resident_id: residentId, role: 'resident' });
          const d = u?.data;
          if (d?.email_sent) toast.success('Vecino dado de alta', { description: 'Cuenta creada y correo de bienvenida enviado.' });
          else toast.success('Vecino dado de alta', { description: 'Cuenta creada; avísale su contraseña (el correo no salió).' });
        } catch (e: any) {
          toast.success('Vecino dado de alta', { description: 'Pero la cuenta no se creó: ' + (e?.message || '') });
        }
      } else {
        toast.success('Vecino dado de alta');
      }
      qc.invalidateQueries({ queryKey: ['access-requests'] });
      qc.invalidateQueries({ queryKey: ['residents'] });
      qc.invalidateQueries({ queryKey: ['properties'] });
      onClose();
    } catch (e: any) {
      toast.error('Error', { description: e?.message });
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">Revisar y dar de alta</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Verifica los datos del interesado antes de crear al vecino.{request.house_label ? ` Dijo que vive en: ${request.house_label}.` : ''}</p>

        {warnings.length > 0 && (
          <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-800 rounded-lg p-3">
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1"><AlertTriangle className="h-4 w-4" /> Revisa estas advertencias</p>
            <ul className="text-sm text-amber-700 dark:text-amber-300 list-disc pl-5 space-y-0.5">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">Si confirmas que es correcto, puedes registrarlo de todos modos.</p>
          </div>
        )}

        <div className="space-y-3">
          <div><label className={lbl}>Nombre completo *</label><input value={fullName} onChange={(e) => setFullName(e.target.value)} className={inp} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Correo *</label><input value={email} onChange={(e) => setEmail(e.target.value)} className={inp} /></div>
            <div><label className={lbl}>Teléfono *</label><input value={phone} onChange={(e) => setPhone(e.target.value)} className={inp} placeholder="10 dígitos" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <select value={type} onChange={(e) => setType(e.target.value as any)} className={inp}>
                <option value="propietario">Propietario</option>
                <option value="inquilino">Inquilino</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Vincular a casa (opcional)</label>
              <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={inp}>
                <option value="">No vincular ahora</option>
                {properties.map((p) => <option key={p.id} value={p.id}>{p.street} {p.house_number}</option>)}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} className="h-4 w-4 rounded text-blue-600" />
            Crear cuenta de acceso y enviar correo de bienvenida
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm">Cancelar</button>
          {warnings.length > 0 ? (
            <button onClick={() => run(true)} disabled={busy} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Registrar de todos modos
            </button>
          ) : (
            <button onClick={() => run(false)} disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Dar de alta
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

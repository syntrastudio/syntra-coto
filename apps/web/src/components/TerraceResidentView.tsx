'use client';

/**
 * Vista de terraza para el residente: aparta una fecha, ve el costo y el estado
 * de sus solicitudes. El flujo de pago/aprobación lo maneja la mesa directiva.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useConfirm } from '@/components/ConfirmDialog';
import { CalendarDays, Plus, Info } from 'lucide-react';

const STATUS: Record<string, { label: string; cls: string; hint: string }> = {
  solicitada: { label: 'Por revisar', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', hint: 'La mesa está revisando tu solicitud.' },
  aprobada: { label: 'Aprobada · paga para confirmar', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', hint: 'Revisa tu correo: tiene el monto y cómo pagar.' },
  confirmada: { label: 'Confirmada ✓', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', hint: '¡La terraza es tuya ese día!' },
  completada: { label: 'Completada', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300', hint: 'Evento realizado y depósito devuelto.' },
  rechazada: { label: 'Rechazada', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', hint: 'Revisa tu correo para más detalles.' },
  cancelada: { label: 'Cancelada', cls: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400', hint: '' },
};

function fmtDate(ymd: string) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y!, (m || 1) - 1, d || 1, 12).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
const money = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

export function TerraceResidentView() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [showForm, setShowForm] = useState(false);

  const { data: infoData } = useQuery({ queryKey: ['terrace-info'], queryFn: () => apiClient.getTerraceInfo() });
  const { data: takenData } = useQuery({ queryKey: ['terrace-taken'], queryFn: () => apiClient.getTerraceTakenDates() });
  const { data: mineData, isLoading } = useQuery({ queryKey: ['terrace-mine'], queryFn: () => apiClient.getTerraceReservations() });

  const info = infoData?.data;
  const taken: string[] = takenData?.data || [];
  const mine: any[] = mineData?.data || [];

  const cancelMut = useMutation({
    mutationFn: (id: string) => apiClient.cancelTerraceReservation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['terrace-mine'] }); qc.invalidateQueries({ queryKey: ['terrace-taken'] }); toast.success('Solicitud cancelada'); },
    onError: (e: Error) => toast.error('No se pudo cancelar', { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Apartar la terraza
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Reserva el área común para tu evento.</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="h-4 w-4" /> Apartar fecha
          </button>
        )}
      </div>

      {/* Costo */}
      {info && (info.reservation_fee > 0 || info.deposit_amount > 0) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3 text-sm">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-gray-700 dark:text-gray-300">
            <p>Apartar la terraza cuesta {info.reservation_fee > 0 && <><strong>{money(info.reservation_fee)}</strong> de cuota de uso</>}{info.reservation_fee > 0 && info.deposit_amount > 0 && ' más '}{info.deposit_amount > 0 && <><strong>{money(info.deposit_amount)}</strong> de depósito reembolsable</>}.</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">El depósito se te devuelve después del evento si todo queda en buen estado. Solo casas al corriente pueden apartar.</p>
          </div>
        </div>
      )}

      {showForm && <RequestForm taken={taken} onClose={() => setShowForm(false)} />}

      {/* Mis solicitudes */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Mis solicitudes</h3>
        {isLoading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : mine.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 rounded-xl p-6 text-center">Todavía no has apartado la terraza.</p>
        ) : (
          <div className="space-y-2">
            {mine.map((r) => (
              <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status]?.cls || ''}`}>{STATUS[r.status]?.label || r.status}</span>
                    <p className="mt-1.5 font-semibold text-gray-900 dark:text-gray-100 capitalize">{fmtDate(r.event_date)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{STATUS[r.status]?.hint} {r.folio}</p>
                  </div>
                  {(r.status === 'solicitada' || r.status === 'aprobada') && (
                    <button
                      onClick={async () => {
                        const ok = await confirm({ title: '¿Cancelar tu solicitud?', description: `Se cancelará tu apartado del ${fmtDate(r.event_date)}.`, confirmText: 'Sí, cancelar', tone: 'danger' });
                        if (ok) cancelMut.mutate(r.id);
                      }}
                      className="text-sm text-red-600 hover:text-red-800"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function RequestForm({ taken, onClose }: { taken: string[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [date, setDate] = useState('');
  const [eventType, setEventType] = useState('');
  const [guests, setGuests] = useState('');
  const [notes, setNotes] = useState('');

  const mut = useMutation({
    mutationFn: () => apiClient.createTerraceReservation({
      event_date: date,
      event_type: eventType || undefined,
      guests_estimate: guests ? Number(guests) : undefined,
      resident_notes: notes || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['terrace-mine'] });
      toast.success('Solicitud enviada', { description: 'La mesa la revisará y te avisará por correo.' });
      onClose();
    },
    onError: (e: Error) => toast.error('No se pudo enviar', { description: e.message }),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) { toast.error('Elige una fecha'); return; }
    if (taken.includes(date)) { toast.error('Esa fecha ya está apartada, elige otra'); return; }
    mut.mutate();
  };

  return (
    <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 space-y-4">
      <div>
        <label className={lbl}>Fecha del evento *</label>
        <input type="date" required min={todayStr()} value={date} onChange={(e) => setDate(e.target.value)} className={inp} />
        {date && taken.includes(date) && <p className="text-xs text-red-600 mt-1">Esa fecha ya está apartada. Elige otra.</p>}
        {taken.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fechas ya ocupadas: {taken.slice(0, 8).map((d) => fmtDate(d).replace(/^\w/, (c) => c.toUpperCase())).join(' · ')}{taken.length > 8 ? '…' : ''}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Tipo de evento</label>
          <input value={eventType} onChange={(e) => setEventType(e.target.value)} className={inp} placeholder="Cumpleaños, reunión…" />
        </div>
        <div>
          <label className={lbl}>Invitados aprox.</label>
          <input type="number" min="1" value={guests} onChange={(e) => setGuests(e.target.value)} className={inp} placeholder="30" />
        </div>
      </div>
      <div>
        <label className={lbl}>Notas para la mesa (opcional)</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={inp} placeholder="Algo que la mesa deba saber" />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm">Cancelar</button>
        <button type="submit" disabled={mut.isPending} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
          {mut.isPending ? 'Enviando…' : 'Enviar solicitud'}
        </button>
      </div>
    </form>
  );
}

const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const lbl = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

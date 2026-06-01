'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/Skeleton';
import {
  CalendarDays, Check, X, DollarSign, RotateCcw, MapPin, User, Calendar,
} from 'lucide-react';

const STATUS: Record<string, { label: string; cls: string }> = {
  solicitada: { label: 'Por revisar', cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
  aprobada: { label: 'Aprobada · esperando pago', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  confirmada: { label: 'Confirmada', cls: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  completada: { label: 'Completada', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  rechazada: { label: 'Rechazada', cls: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
  cancelada: { label: 'Cancelada', cls: 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400' },
};

const FILTERS = [
  { key: '', label: 'Todas' },
  { key: 'solicitada', label: 'Por revisar' },
  { key: 'aprobada', label: 'Esperando pago' },
  { key: 'confirmada', label: 'Confirmadas' },
  { key: 'completada', label: 'Completadas' },
];

function fmtDate(ymd: string) {
  const [y, m, d] = String(ymd).split('-').map(Number);
  return new Date(y!, (m || 1) - 1, d || 1, 12).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}
const money = (n: number) => `$${Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

export default function TerrazaPage() {
  const [filter, setFilter] = useState('');
  const [action, setAction] = useState<{ type: 'approve' | 'reject' | 'pay' | 'return'; res: any } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['terrace', filter],
    queryFn: () => apiClient.getTerraceReservations(filter || undefined),
  });
  const reservations: any[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CalendarDays className="h-7 w-7" />
          Terraza
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Solicitudes de apartado del área común. Aprueba, registra el pago y la devolución del depósito.
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <TableSkeleton rows={4} cols={4} />
      ) : reservations.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No hay solicitudes de terraza"
          description="Cuando un vecino aparte la terraza desde su portal, su solicitud aparecerá aquí para que la revises."
        />
      ) : (
        <div className="space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS[r.status]?.cls || ''}`}>
                      {STATUS[r.status]?.label || r.status}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{r.folio}</span>
                  </div>
                  <p className="mt-2 font-semibold text-gray-900 dark:text-gray-100 capitalize flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    {fmtDate(r.event_date)}
                  </p>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 space-y-0.5">
                    <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> {r.property ? `${r.property.street} ${r.property.house_number}` : '—'}</p>
                    <p className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> {r.requester_name || 'Vecino'}{r.event_type ? ` · ${r.event_type}` : ''}{r.guests_estimate ? ` · ~${r.guests_estimate} personas` : ''}</p>
                  </div>
                  {r.resident_notes && (
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 rounded-lg p-2">“{r.resident_notes}”</p>
                  )}
                </div>

                {/* Montos */}
                <div className="text-right text-sm shrink-0">
                  <p className="text-gray-500 dark:text-gray-400">Cuota de uso: <strong className="text-gray-900 dark:text-gray-100">{money(r.reservation_fee)}</strong></p>
                  <p className="text-gray-500 dark:text-gray-400">Depósito: <strong className="text-gray-900 dark:text-gray-100">{money(r.deposit_amount)}</strong></p>
                  {r.status === 'completada' && (
                    <p className="text-green-600 dark:text-green-400 mt-1">Devuelto: {money(r.deposit_returned_amount)}</p>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 dark:border-gray-700 pt-3">
                {r.status === 'solicitada' && (
                  <>
                    <button onClick={() => setAction({ type: 'approve', res: r })} className="btn-green"><Check className="h-4 w-4" /> Aprobar</button>
                    <button onClick={() => setAction({ type: 'reject', res: r })} className="btn-red"><X className="h-4 w-4" /> Rechazar</button>
                  </>
                )}
                {r.status === 'aprobada' && (
                  <>
                    <button onClick={() => setAction({ type: 'pay', res: r })} className="btn-blue"><DollarSign className="h-4 w-4" /> Registrar pago</button>
                    <button onClick={() => setAction({ type: 'reject', res: r })} className="btn-red"><X className="h-4 w-4" /> Rechazar</button>
                  </>
                )}
                {r.status === 'confirmada' && (
                  <button onClick={() => setAction({ type: 'return', res: r })} className="btn-amber"><RotateCcw className="h-4 w-4" /> Devolver depósito</button>
                )}
                {(r.status === 'completada' || r.status === 'rechazada' || r.status === 'cancelada') && (
                  <span className="text-xs text-gray-400">Sin acciones pendientes.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {action && <ActionModal action={action} onClose={() => setAction(null)} />}

      <style jsx>{`
        :global(.btn-green), :global(.btn-red), :global(.btn-blue), :global(.btn-amber) {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 8px; font-size: 13px; font-weight: 600;
        }
        :global(.btn-green) { background:#16a34a; color:#fff; }
        :global(.btn-green:hover) { background:#15803d; }
        :global(.btn-red) { background:#fee2e2; color:#b91c1c; }
        :global(.btn-red:hover) { background:#fecaca; }
        :global(.btn-blue) { background:#2563eb; color:#fff; }
        :global(.btn-blue:hover) { background:#1d4ed8; }
        :global(.btn-amber) { background:#f59e0b; color:#fff; }
        :global(.btn-amber:hover) { background:#d97706; }
      `}</style>
    </div>
  );
}

function ActionModal({ action, onClose }: { action: { type: string; res: any }; onClose: () => void }) {
  const qc = useQueryClient();
  const r = action.res;
  const { data: balancesData } = useQuery({ queryKey: ['mesa-balances'], queryFn: () => apiClient.getMesaBalances(), enabled: action.type === 'pay' });
  const members = balancesData?.data || [];

  const [fee, setFee] = useState(String(r.reservation_fee ?? 0));
  const [deposit, setDeposit] = useState(String(r.deposit_amount ?? 0));
  const [instructions, setInstructions] = useState('');
  const [reason, setReason] = useState('');
  const [method, setMethod] = useState('transfer');
  const [reference, setReference] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [returnAmount, setReturnAmount] = useState(String(r.deposit_amount ?? 0));
  const [returnMethod, setReturnMethod] = useState('transfer');

  const mut = useMutation({
    mutationFn: () => {
      if (action.type === 'approve') return apiClient.approveTerrace(r.id, { reservation_fee: Number(fee), deposit_amount: Number(deposit), payment_instructions: instructions || undefined });
      if (action.type === 'reject') return apiClient.rejectTerrace(r.id, reason || undefined);
      if (action.type === 'pay') return apiClient.markTerracePaid(r.id, { payment_method: method, payment_reference: reference || undefined, received_by_user_id: receivedBy || undefined });
      return apiClient.returnTerraceDeposit(r.id, { returned_amount: Number(returnAmount), method: returnMethod });
    },
    onSuccess: (resp: any) => {
      qc.invalidateQueries({ queryKey: ['terrace'] });
      toast.success(resp?.message || 'Listo');
      onClose();
    },
    onError: (e: Error) => toast.error('No se pudo completar', { description: e.message }),
  });

  const titles: Record<string, string> = {
    approve: 'Aprobar solicitud', reject: 'Rechazar solicitud', pay: 'Registrar pago', return: 'Devolver depósito',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">{titles[action.type]}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 capitalize">{fmtDate(r.event_date)} · {r.property ? `${r.property.street} ${r.property.house_number}` : ''}</p>

        <div className="space-y-3">
          {action.type === 'approve' && (
            <>
              <Field label="Cuota de uso (no reembolsable)"><input type="number" min="0" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} className={inp} /></Field>
              <Field label="Depósito en garantía (reembolsable)"><input type="number" min="0" step="0.01" value={deposit} onChange={(e) => setDeposit(e.target.value)} className={inp} /></Field>
              <Field label="Instrucciones de pago (opcional)"><textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} placeholder="Ej: Transferencia a BBVA 1234567890 a nombre de…, o efectivo con el tesorero." className={inp} /></Field>
              <p className="text-xs text-gray-500 dark:text-gray-400">Se enviará un correo al vecino con el monto a pagar y estas instrucciones.</p>
            </>
          )}
          {action.type === 'reject' && (
            <Field label="Motivo (se incluye en el correo al vecino)"><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Ej: La fecha ya está apartada / la casa tiene adeudos." className={inp} /></Field>
          )}
          {action.type === 'pay' && (
            <>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-gray-700 dark:text-gray-300">
                Total a cobrar: <strong>{money(Number(r.reservation_fee) + Number(r.deposit_amount))}</strong> (cuota {money(r.reservation_fee)} + depósito {money(r.deposit_amount)})
              </div>
              <Field label="Método de pago"><select value={method} onChange={(e) => setMethod(e.target.value)} className={inp}><option value="cash">Efectivo</option><option value="transfer">Transferencia</option><option value="card">Tarjeta</option><option value="check">Cheque</option></select></Field>
              <Field label="Referencia (opcional)"><input value={reference} onChange={(e) => setReference(e.target.value)} className={inp} placeholder="Folio de transferencia, etc." /></Field>
              <Field label="¿Quién recibió el dinero?"><select value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} className={inp}><option value="">Yo (predeterminado)</option>{members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name}</option>)}</select></Field>
            </>
          )}
          {action.type === 'return' && (
            <>
              <Field label="Monto a devolver"><input type="number" min="0" step="0.01" value={returnAmount} onChange={(e) => setReturnAmount(e.target.value)} className={inp} /></Field>
              <p className="text-xs text-gray-500 dark:text-gray-400">Si hubo daños, reduce el monto. El depósito original fue {money(r.deposit_amount)}.</p>
              <Field label="Método de devolución"><select value={returnMethod} onChange={(e) => setReturnMethod(e.target.value)} className={inp}><option value="transfer">Transferencia</option><option value="cash">Efectivo</option></select></Field>
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-sm">Cancelar</button>
          <button onClick={() => mut.mutate()} disabled={mut.isPending} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50">
            {mut.isPending ? 'Guardando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>{children}</div>;
}

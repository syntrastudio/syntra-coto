'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/components/ConfirmDialog';
import type { BoardMember, BoardPosition } from '@/types';
import { Users, ShieldCheck, UserPlus, Trash2, X, AlertCircle, CheckCircle2, Ban } from 'lucide-react';

const POSITION_LABELS: Record<BoardPosition, string> = {
  presidente: 'Presidente',
  tesorero: 'Tesorero',
  secretario: 'Secretario',
  vocal: 'Vocal',
  suplente: 'Suplente',
};

const POSITIONS: BoardPosition[] = ['presidente', 'tesorero', 'secretario', 'vocal', 'suplente'];

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export default function MesaDirectivaPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [showAdd, setShowAdd] = useState(false);

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['board-members'],
    queryFn: () => apiClient.getBoardMembers(),
  });
  const members = data?.data || [];
  const approverCount = members.filter((m) => m.is_active && m.can_approve_gateway).length;

  const removeMut = useMutation({
    mutationFn: (id: string) => apiClient.removeBoardMember(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members'] });
      qc.invalidateQueries({ queryKey: ['gateway-status'] });
      toast.success('Miembro removido de la mesa');
    },
    onError: (e: Error) => toast.error('No se pudo remover', { description: e.message }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => apiClient.updateBoardMember(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members'] });
      qc.invalidateQueries({ queryKey: ['gateway-status'] });
      toast.success('Mesa actualizada');
    },
    onError: (e: Error) => toast.error('No se pudo actualizar', { description: e.message }),
  });

  if (user && !isAdmin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Acceso denegado</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Solo administradores gestionan la mesa directiva.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Users className="h-7 w-7 text-blue-600" /> Mesa Directiva
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Los miembros de la mesa son quienes <strong>aprueban cambios sensibles</strong> con firma de todos —
            empezando por la cuenta de cobro de Mercado Pago.
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" /> Agregar miembro
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <ShieldCheck className="h-5 w-5 flex-shrink-0" />
        <span>
          Para poder cambiar la cuenta de Mercado Pago se necesitan <strong>al menos 2</strong> miembros con permiso de
          aprobación. Actualmente hay <strong>{approverCount}</strong>.
        </span>
      </div>

      {showAdd && <AddMemberForm onClose={() => setShowAdd(false)} />}

      {isLoading && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}

      {!isLoading && members.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
          <Users className="h-10 w-10 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600 dark:text-gray-400">Aún no hay miembros en la mesa.</p>
        </div>
      )}

      <div className="space-y-3">
        {members.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            onToggleApprove={(v) => updateMut.mutate({ id: m.id, data: { can_approve_gateway: v } })}
            onToggleActive={(v) => updateMut.mutate({ id: m.id, data: { is_active: v } })}
            onChangePosition={(p) => updateMut.mutate({ id: m.id, data: { position: p } })}
            onRemove={async () => {
              const ok = await confirm({
                title: 'Remover de la mesa',
                description: `¿Quitar a ${m.full_name} de la mesa directiva? Dejará de poder aprobar cambios.`,
                confirmText: 'Remover',
                tone: 'danger',
              });
              if (ok) removeMut.mutate(m.id);
            }}
          />
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  onToggleApprove,
  onToggleActive,
  onChangePosition,
  onRemove,
}: {
  member: BoardMember;
  onToggleApprove: (v: boolean) => void;
  onToggleActive: (v: boolean) => void;
  onChangePosition: (p: BoardPosition) => void;
  onRemove: () => void;
}) {
  const active = !!member.is_active;
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${
        active ? '' : 'opacity-60'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{member.full_name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{member.email}</p>
      </div>

      <select
        value={member.position}
        onChange={(e) => onChangePosition(e.target.value as BoardPosition)}
        className="text-sm px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
      >
        {POSITIONS.map((p) => (
          <option key={p} value={p}>
            {POSITION_LABELS[p]}
          </option>
        ))}
      </select>

      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer whitespace-nowrap">
        <input
          type="checkbox"
          checked={!!member.can_approve_gateway}
          onChange={(e) => onToggleApprove(e.target.checked)}
          className="rounded"
        />
        Firma cuenta MP
      </label>

      <button
        onClick={() => onToggleActive(!active)}
        className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded ${
          active
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
        }`}
        title={active ? 'Activo (clic para desactivar)' : 'Inactivo (clic para activar)'}
      >
        {active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
        {active ? 'Activo' : 'Inactivo'}
      </button>

      <button onClick={onRemove} className="text-gray-400 hover:text-red-600 p-1" title="Remover de la mesa">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function AddMemberForm({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [position, setPosition] = useState<BoardPosition>('vocal');
  const [canApprove, setCanApprove] = useState(true);
  const [notes, setNotes] = useState('');

  const { data: eligible } = useQuery({
    queryKey: ['board-eligible'],
    queryFn: () => apiClient.getBoardEligibleUsers(),
  });
  const users = eligible?.data || [];

  const addMut = useMutation({
    mutationFn: () =>
      apiClient.addBoardMember({ user_id: userId, position, can_approve_gateway: canApprove, notes: notes || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['board-members'] });
      qc.invalidateQueries({ queryKey: ['board-eligible'] });
      qc.invalidateQueries({ queryKey: ['gateway-status'] });
      toast.success('Miembro agregado a la mesa');
      onClose();
    },
    onError: (e: Error) => toast.error('No se pudo agregar', { description: e.message }),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!userId) {
          toast.error('Elige un usuario');
          return;
        }
        addMut.mutate();
      }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-4 border border-blue-200 dark:border-blue-800"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">Agregar miembro a la mesa</h3>
        <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="h-5 w-5" />
        </button>
      </div>

      {users.length === 0 ? (
        <p className="text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
          No hay usuarios disponibles para agregar. El miembro debe tener una <strong>cuenta de usuario</strong> (con
          login) para poder aprobar. Crea su usuario primero en Vecinos / Configuración.
        </p>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuario</label>
            <select required value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
              <option value="">Selecciona un usuario...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} — {u.email}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo</label>
              <select value={position} onChange={(e) => setPosition(e.target.value as BoardPosition)} className={inputCls}>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>
                    {POSITION_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mt-6 cursor-pointer">
              <input type="checkbox" checked={canApprove} onChange={(e) => setCanApprove(e.target.checked)} className="rounded" />
              Cuenta para aprobar la cuenta de Mercado Pago
            </label>
          </div>

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas (opcional)"
            className={inputCls}
          />

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100">
              Cancelar
            </button>
            <button type="submit" disabled={addMut.isPending} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
              {addMut.isPending ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

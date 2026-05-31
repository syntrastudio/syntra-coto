'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import {
  Wallet,
  ArrowDownToLine,
  ArrowRightLeft,
  Receipt,
  TrendingUp,
  TrendingDown,
  X,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function MesaPage() {
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);
  const { user } = useAuth();

  const { data, isLoading, error } = useQuery({
    queryKey: ['mesa-balances'],
    queryFn: () => apiClient.getMesaBalances(),
  });
  const members = data?.data || [];

  const totalCash = members.reduce((s, m) => s + Number(m.balance), 0);

  if (user && user.role !== 'super_admin' && user.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Acceso denegado</h2>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Mesa directiva — Caja</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Balance de efectivo y movimientos de cada miembro de la mesa
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Efectivo total en mesa" value={`$${totalCash.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`} icon={<Wallet className="h-5 w-5" />} />
        <Card label="Miembros activos" value={String(members.length)} icon={<Receipt className="h-5 w-5" />} />
        <Card
          label="Total movimientos"
          value={String(members.reduce((s, m) => s + m.movements_count, 0))}
          icon={<ArrowRightLeft className="h-5 w-5" />}
        />
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {members.map((m) => (
          <button
            key={m.id}
            onClick={() => setDrawerUserId(m.id)}
            className="text-left bg-white dark:bg-gray-800 rounded-xl shadow p-5 hover:shadow-md transition-shadow border border-transparent hover:border-blue-200 dark:hover:border-blue-800"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">{m.role === 'super_admin' ? 'Super Admin' : 'Admin'}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">{m.full_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{m.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                <p className={`text-2xl font-bold mt-1 ${
                  m.balance > 0 ? 'text-green-600 dark:text-green-400' :
                  m.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'
                }`}>
                  ${Number(m.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>{m.movements_count} movimientos</span>
              {m.last_movement_at && (
                <span>· último: {format(new Date(m.last_movement_at * 1000), "d 'de' MMM HH:mm", { locale: es })}</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {drawerUserId && (
        <MemberDrawer
          userId={drawerUserId}
          members={members}
          currentUserId={user?.id}
          currentUserRole={user?.role}
          onClose={() => setDrawerUserId(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
function MemberDrawer({
  userId, members, currentUserId, currentUserRole, onClose,
}: {
  userId: string;
  members: any[];
  currentUserId?: string;
  currentUserRole?: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'view' | 'deposit' | 'transfer'>('view');

  const { data, isLoading } = useQuery({
    queryKey: ['mesa-member', userId],
    queryFn: () => apiClient.getMemberDetail(userId),
  });
  const detail = data?.data;

  const isSelf = userId === currentUserId;
  const isSuper = currentUserRole === 'super_admin';
  const canModify = isSelf || isSuper;

  const depositMut = useMutation({
    mutationFn: (args: { amount: number; notes?: string }) =>
      apiClient.depositToBank({ user_id: userId, ...args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesa-balances'] });
      qc.invalidateQueries({ queryKey: ['mesa-member', userId] });
      setMode('view');
      alert('Depósito registrado');
    },
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  const transferMut = useMutation({
    mutationFn: (args: { to_user_id: string; amount: number; notes?: string }) =>
      apiClient.transferBetweenMembers({ from_user_id: userId, ...args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mesa-balances'] });
      qc.invalidateQueries({ queryKey: ['mesa-member', userId] });
      setMode('view');
      alert('Transferencia registrada');
    },
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white dark:bg-gray-800 w-full max-w-xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              {detail?.user?.full_name || 'Cargando...'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{detail?.user?.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="text-center bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Balance actual</p>
            <p className={`text-4xl font-bold mt-2 ${
              (detail?.balance || 0) > 0 ? 'text-green-600 dark:text-green-400' :
              (detail?.balance || 0) < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'
            }`}>
              ${Number(detail?.balance || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {canModify && mode === 'view' && (detail?.balance ?? 0) > 0 && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('deposit')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <ArrowDownToLine className="h-4 w-4" />
                Depositar al banco
              </button>
              <button
                onClick={() => setMode('transfer')}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Entregar a otro miembro
              </button>
            </div>
          )}

          {mode === 'deposit' && (
            <DepositForm
              maxAmount={detail?.balance || 0}
              pending={depositMut.isPending}
              onCancel={() => setMode('view')}
              onSubmit={(args) => depositMut.mutate(args)}
            />
          )}

          {mode === 'transfer' && (
            <TransferForm
              fromUserId={userId}
              maxAmount={detail?.balance || 0}
              members={members.filter((m) => m.id !== userId)}
              pending={transferMut.isPending}
              onCancel={() => setMode('view')}
              onSubmit={(args) => transferMut.mutate(args)}
            />
          )}

          <div>
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3">
              Historial de movimientos
            </h3>
            {isLoading && <p className="text-sm text-gray-500">Cargando...</p>}
            {!isLoading && (detail?.movements?.length || 0) === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                Sin movimientos todavía.
              </p>
            )}
            <div className="space-y-2">
              {(detail?.movements || []).map((mv: any) => <MovementRow key={mv.id} mv={mv} />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
function DepositForm({ maxAmount, pending, onCancel, onSubmit }: {
  maxAmount: number;
  pending: boolean;
  onCancel: () => void;
  onSubmit: (args: { amount: number; notes?: string }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const a = Number(amount);
        if (!a || a <= 0) { alert('Monto inválido'); return; }
        if (a > maxAmount) { alert(`No puedes depositar más de tu balance ($${maxAmount})`); return; }
        onSubmit({ amount: a, notes: notes || undefined });
      }}
      className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3"
    >
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Depósito al banco</h4>
      <input
        type="number" step="0.01" min="0.01" max={maxAmount}
        required value={amount} onChange={(e) => setAmount(e.target.value)}
        placeholder={`Máximo: ${maxAmount}`}
        className={inputCls}
      />
      <input
        value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas (opcional, ej: 'Banamex cuenta XX-1234')"
        className={inputCls}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100">Cancelar</button>
        <button type="submit" disabled={pending} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
          {pending ? 'Registrando...' : 'Confirmar depósito'}
        </button>
      </div>
    </form>
  );
}

function TransferForm({ fromUserId: _from, maxAmount, members, pending, onCancel, onSubmit }: {
  fromUserId: string;
  maxAmount: number;
  members: any[];
  pending: boolean;
  onCancel: () => void;
  onSubmit: (args: { to_user_id: string; amount: number; notes?: string }) => void;
}) {
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!toId) { alert('Selecciona destinatario'); return; }
        const a = Number(amount);
        if (!a || a <= 0) { alert('Monto inválido'); return; }
        if (a > maxAmount) { alert(`No puedes transferir más de tu balance ($${maxAmount})`); return; }
        onSubmit({ to_user_id: toId, amount: a, notes: notes || undefined });
      }}
      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
    >
      <h4 className="font-semibold text-gray-900 dark:text-gray-100">Entregar a otro miembro</h4>
      <select required value={toId} onChange={(e) => setToId(e.target.value)} className={inputCls}>
        <option value="">Selecciona miembro destinatario...</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.full_name}</option>
        ))}
      </select>
      <input
        type="number" step="0.01" min="0.01" max={maxAmount}
        required value={amount} onChange={(e) => setAmount(e.target.value)}
        placeholder={`Máximo: ${maxAmount}`}
        className={inputCls}
      />
      <input
        value={notes} onChange={(e) => setNotes(e.target.value)}
        placeholder="Notas (opcional)"
        className={inputCls}
      />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-gray-100">Cancelar</button>
        <button type="submit" disabled={pending} className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
          {pending ? 'Registrando...' : 'Confirmar entrega'}
        </button>
      </div>
    </form>
  );
}

function MovementRow({ mv }: { mv: any }) {
  const amount = Number(mv.amount);
  const positive = amount > 0;
  const typeLabel: Record<string, string> = {
    receipt: 'Cobro de pago',
    transfer_in: `Recibido de ${mv.related_user_name || 'miembro'}`,
    transfer_out: `Entregado a ${mv.related_user_name || 'miembro'}`,
    deposit_bank: 'Depósito al banco',
    adjustment: 'Ajuste manual',
  };
  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg p-3 text-sm flex items-start justify-between">
      <div className="flex items-start gap-2">
        {positive ? (
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5" />
        )}
        <div>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {typeLabel[mv.type] || mv.type}
            {mv.payment_folio && (
              <span className="ml-2 font-mono text-xs text-gray-500">{mv.payment_folio}</span>
            )}
          </p>
          {mv.property_house_number && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {mv.property_street} #{mv.property_house_number}
            </p>
          )}
          {mv.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{mv.notes}</p>}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            {format(new Date(mv.created_at * 1000), "d 'de' MMM yyyy, HH:mm", { locale: es })}
            {mv.created_by_name && <> · por {mv.created_by_name}</>}
          </p>
        </div>
      </div>
      <p className={`text-base font-semibold whitespace-nowrap ${positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {positive ? '+' : ''}${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
      </p>
    </div>
  );
}

// ============================================================================
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Card({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</p>
        <div className="text-blue-600 dark:text-blue-400">{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">{value}</p>
    </div>
  );
}

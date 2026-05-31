'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import {
  Calendar,
  CreditCard,
  Plus,
  X,
  Receipt,
  Sparkles,
  ChevronsRight,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Property } from '@/types';

type PaymentMode = 'fee' | 'fifo' | 'annual';

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState('');
  const [propertyFilter, setPropertyFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['payments', page, methodFilter, propertyFilter],
    queryFn: () => {
      const filters: any = {};
      if (methodFilter) filters.payment_method = methodFilter;
      if (propertyFilter) filters.property_id = propertyFilter;
      return apiClient.getPayments(page, 20, filters);
    },
  });

  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all', 'payments-filter'],
    queryFn: async () => {
      const r = await apiClient.getProperties(1, 100);
      return Array.isArray(r.data) ? r.data : ((r.data as any)?.data || []);
    },
  });
  const properties: Property[] = propertiesData || [];

  const methodColors: Record<string, string> = {
    cash: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
    transfer: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    check: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
    card: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
    stripe: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
    mercadopago: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
  };
  const methodLabels: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    check: 'Cheque',
    card: 'Tarjeta',
    stripe: 'Stripe',
    mercadopago: 'Mercado Pago',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Pagos</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Historial y registro de pagos del fraccionamiento
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="h-5 w-5" />
          Registrar pago
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <select
          value={propertyFilter}
          onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }}
          className={inputCls}
        >
          <option value="">Todas las propiedades</option>
          {properties.map((p) => (
            <option key={p.id} value={p.id}>
              {p.street} #{p.house_number}
            </option>
          ))}
        </select>
        <select
          value={methodFilter}
          onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
          className={inputCls}
        >
          <option value="">Todos los métodos</option>
          <option value="cash">Efectivo</option>
          <option value="transfer">Transferencia</option>
          <option value="check">Cheque</option>
          <option value="card">Tarjeta</option>
          <option value="mercadopago">Mercado Pago</option>
        </select>
        {(propertyFilter || methodFilter) && (
          <button
            onClick={() => { setPropertyFilter(''); setMethodFilter(''); setPage(1); }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-gray-500">Cargando pagos...</div>
      ) : !data?.data || data.data.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Receipt className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No hay pagos</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Registra el primer pago con el botón de arriba.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className={thCls}>Folio</th>
                  <th className={thCls}>Propiedad</th>
                  <th className={thCls}>Monto</th>
                  <th className={thCls}>Fecha</th>
                  <th className={thCls}>Método</th>
                  <th className={thCls}>Referencia / notas</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                      {p.folio || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        Casa {p.property?.house_number || p.house_number || '?'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {p.property?.street || p.street || ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600 dark:text-green-400">
                      ${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      <Calendar className="h-3 w-3 inline mr-1" />
                      {format(new Date(p.payment_date * 1000), "d 'de' MMM yyyy", { locale: es })}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${methodColors[p.payment_method] || ''}`}>
                        <CreditCard className="h-3 w-3" />
                        {methodLabels[p.payment_method] || p.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                      {p.payment_reference && <div className="font-mono">{p.payment_reference}</div>}
                      {p.notes && <div className="text-gray-500 dark:text-gray-500 truncate">{p.notes}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((x) => x - 1)}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50 text-gray-900 dark:text-gray-100 dark:border-gray-600"
              >
                Anterior
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Página {page} de {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((x) => x + 1)}
                disabled={page === data.pagination.totalPages}
                className="px-3 py-1 border rounded disabled:opacity-50 text-gray-900 dark:text-gray-100 dark:border-gray-600"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}

      {showModal && (
        <RegisterPaymentModal
          properties={properties}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// MODAL DE REGISTRO
// ============================================================================
function RegisterPaymentModal({ properties, onClose }: { properties: Property[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<PaymentMode>('fifo');
  const [propertyId, setPropertyId] = useState('');
  const [amount, setAmount] = useState('');
  const [feeId, setFeeId] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());
  const [method, setMethod] = useState<'cash' | 'transfer' | 'card' | 'check' | 'stripe' | 'mercadopago'>('transfer');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receivedBy, setReceivedBy] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });

  // Lista de admins (super_admin/admin) que pueden recibir pagos
  const { data: balancesData } = useQuery({
    queryKey: ['mesa-balances'],
    queryFn: () => apiClient.getMesaBalances(),
  });
  const members = balancesData?.data || [];

  // Cuotas pendientes de la propiedad seleccionada (para modo "fee")
  const { data: pendingFeesData } = useQuery({
    queryKey: ['property-fees', propertyId],
    queryFn: () => apiClient.getPropertyPendingFees(propertyId),
    enabled: !!propertyId && (mode === 'fee' || mode === 'fifo'),
  });
  const pendingFees: any[] = useMemo(
    () => (pendingFeesData?.data || []).filter((f: any) => f.status !== 'paid' && f.status !== 'cancelled'),
    [pendingFeesData]
  );

  // Setting de cuota mensual + bonus para preview del pago anual
  const { data: settingsData } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => apiClient.getSettings(),
    enabled: mode === 'annual',
  });
  const monthlyFee = Number(
    settingsData?.data?.find((s: any) => s.key === 'maintenance_fee_amount')?.value || 0
  );
  const bonusMonths = Number(
    settingsData?.data?.find((s: any) => s.key === 'annual_prepayment_discount_months')?.value || 2
  );
  const annualChargedAmount = (12 - bonusMonths) * monthlyFee;

  const totalPending = pendingFees.reduce((s, f) => s + Number(f.balance), 0);

  const createMut = useMutation({
    mutationFn: () => {
      const parts = paymentDate.split('-').map(Number);
      const ts = Math.floor(new Date(parts[0]!, (parts[1] || 1) - 1, parts[2] || 1, 12).getTime() / 1000);

      if (mode === 'annual') {
        return apiClient.createAnnualPayment({
          property_id: propertyId,
          year,
          payment_method: method,
          payment_reference: reference || undefined,
          payment_date: ts,
          notes: notes || undefined,
          received_by_user_id: receivedBy || undefined,
        } as any);
      }

      const payload: any = {
        amount: Number(amount),
        payment_method: method,
        payment_reference: reference || undefined,
        payment_date: ts,
        notes: notes || undefined,
        received_by_user_id: receivedBy || undefined,
      };
      if (mode === 'fee') payload.monthly_fee_id = feeId;
      else payload.property_id = propertyId;
      return apiClient.createPayment(payload);
    },
    onSuccess: (resp: any) => {
      qc.invalidateQueries({ queryKey: ['payments'] });
      qc.invalidateQueries({ queryKey: ['property-fees'] });
      qc.invalidateQueries({ queryKey: ['mesa-balances'] });
      const d = resp?.data;
      let msg = 'Pago registrado.';
      if (mode === 'annual' && d?.charged) {
        msg = `Pago anual: $${Number(d.charged).toLocaleString('es-MX')} cobrados, ${d.fees_paid} cuotas liquidadas, ${d.bonus_months} meses bonificados.`;
      } else if (d?.folio) {
        msg = `Pago registrado con folio ${d.folio}.`;
      }
      alert(msg);
      onClose();
    },
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!propertyId) { alert('Selecciona una propiedad'); return; }
    if (mode === 'fee' && !feeId) { alert('Selecciona una cuota'); return; }
    if (mode !== 'annual' && (!amount || Number(amount) <= 0)) { alert('Ingresa un monto válido'); return; }
    createMut.mutate();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Registrar pago</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Mode selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg mb-5">
            <ModeButton
              active={mode === 'fifo'}
              onClick={() => setMode('fifo')}
              icon={<ChevronsRight className="h-4 w-4" />}
              label="A propiedad"
              hint="FIFO"
            />
            <ModeButton
              active={mode === 'fee'}
              onClick={() => setMode('fee')}
              icon={<Receipt className="h-4 w-4" />}
              label="Cuota específica"
              hint="seleccionar"
            />
            <ModeButton
              active={mode === 'annual'}
              onClick={() => setMode('annual')}
              icon={<Sparkles className="h-4 w-4" />}
              label="Pago anual"
              hint="2 meses gratis"
            />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <Field label="Propiedad *">
              <select
                required
                value={propertyId}
                onChange={(e) => { setPropertyId(e.target.value); setFeeId(''); }}
                className={inputCls}
              >
                <option value="">Selecciona una propiedad...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>{p.street} #{p.house_number}</option>
                ))}
              </select>
            </Field>

            {mode === 'fifo' && propertyId && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
                <p className="text-gray-700 dark:text-gray-300">
                  El pago se aplicará automáticamente a las cuotas pendientes más antiguas.
                  Total pendiente actual: <strong>${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                  {pendingFees.length > 0 && <> ({pendingFees.length} cuotas)</>}.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Si el monto excede el adeudo, el sobrante queda como saldo a favor.
                </p>
              </div>
            )}

            {mode === 'fee' && (
              <Field label="Cuota a liquidar *">
                <select
                  required
                  value={feeId}
                  onChange={(e) => setFeeId(e.target.value)}
                  className={inputCls}
                  disabled={!propertyId}
                >
                  <option value="">{propertyId ? 'Selecciona una cuota...' : 'Primero selecciona la propiedad'}</option>
                  {pendingFees.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.payment_period} — Adeudo ${Number(f.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            {mode === 'annual' ? (
              <>
                <Field label="Año a pagar *">
                  <input
                    type="number"
                    required
                    min={2000}
                    max={2100}
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className={inputCls}
                  />
                </Field>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-sm">
                  {monthlyFee > 0 ? (
                    <>
                      <p className="text-gray-700 dark:text-gray-300">
                        Cuota mensual configurada: <strong>${monthlyFee.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
                      </p>
                      <p className="text-gray-700 dark:text-gray-300 mt-1">
                        Total año completo: ${(12 * monthlyFee).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-lg font-bold text-green-700 dark:text-green-400 mt-2">
                        A cobrar: ${annualChargedAmount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                        <span className="text-xs font-normal ml-2">({bonusMonths} meses bonificados)</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-amber-700 dark:text-amber-400">
                      ⚠️ Configura primero <code>maintenance_fee_amount</code> en Configuración → General.
                    </p>
                  )}
                </div>
              </>
            ) : (
              <Field label="Monto *">
                <input
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputCls}
                  placeholder="0.00"
                />
              </Field>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Field label="Método de pago *">
                <select
                  required
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className={inputCls}
                >
                  <option value="cash">Efectivo</option>
                  <option value="transfer">Transferencia</option>
                  <option value="check">Cheque</option>
                  <option value="card">Tarjeta</option>
                  <option value="mercadopago">Mercado Pago</option>
                </select>
              </Field>
              <Field label="Fecha del pago *">
                <input
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className={inputCls}
                />
              </Field>
            </div>

            <Field label="¿Quién recibió el dinero?">
              <select
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className={inputCls}
              >
                <option value="">Yo (predeterminado)</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.role === 'super_admin' ? 'super_admin' : 'admin'})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                El monto se acreditará al balance personal de quien recibió. Si dejas vacío, se acredita al usuario logueado.
              </p>
            </Field>

            <Field label="Referencia / número de transacción (opcional)">
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className={inputCls}
                placeholder="Ej: TRX-123456 o folio del banco"
              />
            </Field>

            <Field label="Notas (opcional)">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className={inputCls}
              />
            </Field>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createMut.isPending || (mode === 'annual' && monthlyFee === 0)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
              >
                {createMut.isPending ? 'Registrando...' : 'Registrar pago'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const thCls = 'px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function ModeButton({
  active, onClick, icon, label, hint,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`py-2 px-2 rounded-md text-sm font-medium flex flex-col items-center gap-1 transition-colors ${
        active
          ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow'
          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      <div className="flex items-center gap-1">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-[10px] text-gray-500 dark:text-gray-400">{hint}</span>
    </button>
  );
}

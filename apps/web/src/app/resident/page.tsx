'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { Wallet, FileText, Car, User, Save, AlertTriangle, CheckCircle, Ticket, CalendarDays, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { PasskeysSection } from '@/components/PasskeysSection';
import { TicketsView } from '@/components/TicketsView';
import { TerraceResidentView } from '@/components/TerraceResidentView';
import { ReglamentoView } from '@/components/ReglamentoView';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://syntra-coto-api.lcdla-scheduler.workers.dev';

type Tab = 'account' | 'payments' | 'vehicles' | 'terrace' | 'reglamento' | 'tickets' | 'profile';

async function apiGet(path: string, token: string | undefined) {
  const r = await fetch(`${API}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const data = await r.json();
  if (!r.ok) throw new Error((data as any)?.error || 'Error');
  return (data as any).data;
}

async function apiPut(path: string, body: any, token: string | undefined) {
  const r = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data as any)?.error || 'Error');
  return (data as any).data;
}

function getCookieToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(/(?:^|; )syntra_token=([^;]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : undefined;
}

export default function ResidentHome() {
  const [tab, setTab] = useState<Tab>('account');

  const tabs: { id: Tab; label: string; icon: typeof Wallet }[] = [
    { id: 'account', label: 'Estado de cuenta', icon: Wallet },
    { id: 'payments', label: 'Pagos', icon: FileText },
    { id: 'vehicles', label: 'Vehículos', icon: Car },
    { id: 'terrace', label: 'Terraza', icon: CalendarDays },
    { id: 'reglamento', label: 'Reglamento', icon: BookOpen },
    { id: 'tickets', label: 'Tickets', icon: Ticket },
    { id: 'profile', label: 'Mi perfil', icon: User },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                tab === t.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </nav>

      {tab === 'account' && <AccountTab />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'vehicles' && <VehiclesTab />}
      {tab === 'terrace' && <TerraceResidentView />}
      {tab === 'reglamento' && <ReglamentoView />}
      {tab === 'tickets' && <TicketsView mode="resident" />}
      {tab === 'profile' && <ProfileTab />}
    </div>
  );
}

// ============================================================================
function AccountTab() {
  const token = getCookieToken();
  const { data, isLoading, error } = useQuery({
    queryKey: ['me-account'],
    queryFn: () => apiGet('/api/me/account', token),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (error) return <p className="text-red-600">{(error as Error).message}</p>;

  const net = Number(data?.net_balance || 0);
  const totalPending = Number(data?.total_pending || 0);
  const totalCredit = Number(data?.total_credit || 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Adeudo total"
          value={`$${totalPending.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          tone={totalPending > 0 ? 'red' : 'gray'}
        />
        <StatCard
          label="Saldo a favor"
          value={`$${totalCredit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          tone={totalCredit > 0 ? 'green' : 'gray'}
        />
        <StatCard
          label="Neto"
          value={`${net >= 0 ? '$' : '-$'}${Math.abs(net).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          tone={net > 0 ? 'red' : net < 0 ? 'green' : 'gray'}
        />
      </div>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Mis propiedades</h2>
        {data?.properties?.length === 0 && <p className="text-sm text-gray-500">No tienes propiedades asociadas.</p>}
        <div className="space-y-3">
          {(data?.properties || []).map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-4">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">Casa {p.house_number} — {p.street}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">Estado: {p.status}</p>
              </div>
              <DelinquencyBadge status={p.delinquency_status} months={p.months_overdue} />
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cuotas pendientes</h2>
        {(data?.pending_fees || []).length === 0 ? (
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="h-5 w-5" />
            <span>Estás al corriente.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                <tr>
                  <th className="text-left py-2">Periodo</th>
                  <th className="text-left py-2">Casa</th>
                  <th className="text-left py-2">Vencimiento</th>
                  <th className="text-right py-2">Adeudo</th>
                  <th className="text-left py-2 pl-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {(data.pending_fees || []).map((f: any) => (
                  <tr key={f.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium text-gray-900 dark:text-gray-100">{f.payment_period}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">#{f.house_number}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{formatDate(f.due_date)}</td>
                    <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                      ${Number(f.balance).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-2 pl-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        f.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        f.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{f.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================================
function PaymentsTab() {
  const token = getCookieToken();
  const { data, isLoading, error } = useQuery({
    queryKey: ['me-payments'],
    queryFn: () => apiGet('/api/me/payments', token),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (error) return <p className="text-red-600">{(error as Error).message}</p>;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Historial de pagos</h2>
      {(data || []).length === 0 ? (
        <p className="text-sm text-gray-500">Aún no tienes pagos registrados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th className="text-left py-2">Folio</th>
                <th className="text-left py-2">Fecha</th>
                <th className="text-left py-2">Casa</th>
                <th className="text-left py-2">Método</th>
                <th className="text-right py-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {(data || []).map((p: any) => (
                <tr key={p.id} className="border-t border-gray-100 dark:border-gray-700">
                  <td className="py-2 font-mono text-xs text-gray-600 dark:text-gray-400">{p.folio || '—'}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">{formatDate(p.payment_date)}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300">#{p.house_number}</td>
                  <td className="py-2 text-gray-700 dark:text-gray-300 capitalize">{p.payment_method}</td>
                  <td className="py-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                    ${Number(p.amount).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ============================================================================
function VehiclesTab() {
  const token = getCookieToken();
  const { data, isLoading, error } = useQuery({
    queryKey: ['me-vehicles'],
    queryFn: () => apiGet('/api/me/vehicles', token),
  });

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (error) return <p className="text-red-600">{(error as Error).message}</p>;

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Vehículos registrados</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Para alta/baja contacta a administración
        </span>
      </div>
      {(data || []).length === 0 ? (
        <p className="text-sm text-gray-500">No tienes vehículos registrados.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(data || []).map((v: any) => (
            <div key={v.id} className="border border-gray-100 dark:border-gray-700 rounded-lg p-4">
              <p className="font-medium text-gray-900 dark:text-gray-100">{v.brand} {v.model}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{v.year} · {v.color}</p>
              <p className="mt-2 text-sm font-mono">{v.license_plate}</p>
              <p className="mt-1 text-xs text-gray-500">Casa #{v.house_number}</p>
              <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${
                v.status === 'activo' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              }`}>{v.status}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ============================================================================
function ProfileTab() {
  const { user, refetchUser } = useAuth();
  const qc = useQueryClient();
  const token = getCookieToken();

  const { data: profile } = useQuery({
    queryKey: ['me-profile'],
    queryFn: () => apiGet('/api/me/profile', token),
  });

  const updateProfile = useMutation({
    mutationFn: (body: { phone?: string; full_name?: string }) => apiPut('/api/me/profile', body, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me-profile'] });
      refetchUser();
      toast.success('Datos actualizados');
    },
    onError: (e: Error) => toast.error('No se pudo guardar', { description: e.message }),
  });

  const updatePassword = useMutation({
    mutationFn: (body: { current_password: string; new_password: string }) =>
      apiPut('/api/me/password', body, token),
    onSuccess: () => toast.success('Contraseña actualizada'),
    onError: (e: Error) => toast.error('No se pudo cambiar la contraseña', { description: e.message }),
  });

  return (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Datos personales</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            updateProfile.mutate({
              full_name: String(fd.get('full_name') || ''),
              phone: String(fd.get('phone') || ''),
            });
          }}
          className="space-y-4"
        >
          <Field label="Nombre completo">
            <input name="full_name" defaultValue={profile?.full_name || user?.full_name} className={inputCls} />
          </Field>
          <Field label="Correo (no editable)">
            <input value={profile?.email || user?.email || ''} disabled className={inputCls + ' opacity-60'} />
          </Field>
          <Field label="Teléfono">
            <input name="phone" defaultValue={profile?.phone || ''} className={inputCls} />
          </Field>
          <button
            type="submit"
            disabled={updateProfile.isPending}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {updateProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </section>

      <PasskeysSection />

      <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Cambiar contraseña</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const np = String(fd.get('new_password') || '');
            const conf = String(fd.get('confirm') || '');
            if (np !== conf) { toast.error('Las contraseñas no coinciden'); return; }
            updatePassword.mutate({
              current_password: String(fd.get('current_password') || ''),
              new_password: np,
            });
            (e.target as HTMLFormElement).reset();
          }}
          className="space-y-4 max-w-md"
        >
          <Field label="Contraseña actual">
            <input name="current_password" type="password" required className={inputCls} />
          </Field>
          <Field label="Nueva contraseña (mín 8 caracteres)">
            <input name="new_password" type="password" required minLength={8} className={inputCls} />
          </Field>
          <Field label="Confirmar nueva contraseña">
            <input name="confirm" type="password" required minLength={8} className={inputCls} />
          </Field>
          <button
            type="submit"
            disabled={updatePassword.isPending}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {updatePassword.isPending ? 'Cambiando...' : 'Cambiar contraseña'}
          </button>
        </form>
      </section>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'red' | 'green' | 'gray' }) {
  const ring =
    tone === 'red' ? 'ring-red-200 dark:ring-red-900/30' :
    tone === 'green' ? 'ring-green-200 dark:ring-green-900/30' :
    'ring-gray-200 dark:ring-gray-700';
  const color =
    tone === 'red' ? 'text-red-600 dark:text-red-400' :
    tone === 'green' ? 'text-green-600 dark:text-green-400' :
    'text-gray-900 dark:text-gray-100';
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow p-5 ring-1 ${ring}`}>
      <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function DelinquencyBadge({ status, months }: { status?: string; months?: number }) {
  if (!status || status === 'al_corriente') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
        <CheckCircle className="h-3 w-3" /> al corriente
      </span>
    );
  }
  const label =
    status === 'mora_1_mes' ? '1 mes de mora' :
    status === 'mora_2_meses' ? '2 meses de mora' :
    'suspendido';
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-1 rounded-full">
      <AlertTriangle className="h-3 w-3" /> {label}{months ? ` (${months})` : ''}
    </span>
  );
}

function formatDate(unixSeconds: number) {
  return format(new Date(unixSeconds * 1000), "d 'de' MMM yyyy", { locale: es });
}

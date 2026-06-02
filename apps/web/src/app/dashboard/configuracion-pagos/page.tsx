'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/components/ConfirmDialog';
import type { GatewayStatus, GatewayProposal } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  CreditCard,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronRight,
  Users,
  KeyRound,
  Info,
} from 'lucide-react';
import Link from 'next/link';

const inputCls =
  'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

const WEBHOOK_URL = 'https://coto.syntrastudio.dev/api/webhooks/mercadopago';

function fmtDate(ts?: number | null) {
  if (!ts) return '—';
  return format(new Date(ts * 1000), "d 'de' MMM yyyy, HH:mm", { locale: es });
}

function ModeBadge({ mode }: { mode: 'test' | 'live' }) {
  return mode === 'live' ? (
    <span className="inline-block text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 border border-amber-300 dark:border-amber-700 rounded-full px-3 py-0.5">
      PRODUCCIÓN · dinero real
    </span>
  ) : (
    <span className="inline-block text-xs font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-700 rounded-full px-3 py-0.5">
      PRUEBA · sandbox
    </span>
  );
}

export default function ConfiguracionPagosPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  const { data, isLoading, error } = useQuery({
    queryKey: ['gateway-status'],
    queryFn: () => apiClient.getGatewayStatus(),
    retry: false,
  });
  const status: GatewayStatus | undefined = data?.data;

  if (isLoading) return <p className="text-gray-500">Cargando configuración de pagos...</p>;

  if (error) {
    return (
      <div className="text-center py-12">
        <Lock className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sin acceso</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">{(error as Error).message}</p>
      </div>
    );
  }

  const invalidate = () => qc.invalidateQueries({ queryKey: ['gateway-status'] });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <CreditCard className="h-7 w-7 text-blue-600" /> Pagos en línea (Mercado Pago)
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Conecta la cuenta de Mercado Pago del fraccionamiento. Cambiar la cuenta requiere la{' '}
          <strong>aprobación de toda la mesa directiva</strong>, para que ninguna persona pueda desviar el dinero por su
          cuenta.
        </p>
      </div>

      <SetupGuide />

      {status && (
        <>
          <ActiveAccountSection status={status} isAdmin={isAdmin} onChanged={invalidate} />
          {status.pending && (
            <PendingProposalSection
              status={status}
              proposal={status.pending}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onChanged={invalidate}
            />
          )}
          {isAdmin && !status.pending && <ProposeSection status={status} onChanged={invalidate} />}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function SetupGuide() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-900 dark:text-gray-100">
          <Info className="h-5 w-5 text-blue-600" /> ¿Cómo configurar la cuenta de Mercado Pago?
        </span>
        {open ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronRight className="h-5 w-5 text-gray-400" />}
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 text-sm text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-700 pt-4">
          <ol className="space-y-3 list-decimal list-inside">
            <li>
              Entra (o crea) la cuenta de Mercado Pago <strong>del fraccionamiento</strong> —no una personal— en{' '}
              <a className="text-blue-600 underline" href="https://www.mercadopago.com.mx" target="_blank" rel="noreferrer">
                mercadopago.com.mx
              </a>
              .
            </li>
            <li>
              Ve al panel de desarrollador:{' '}
              <a className="text-blue-600 underline" href="https://www.mercadopago.com.mx/developers/panel/app" target="_blank" rel="noreferrer">
                Tus integraciones
              </a>{' '}
              → <strong>Crear aplicación</strong> → tipo <strong>Pagos online / Checkout Pro</strong>.
            </li>
            <li>
              Abre la aplicación → <strong>Credenciales de producción</strong> y copia el <strong>Access Token</strong>{' '}
              (empieza con <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">APP_USR-</code>). Para
              probar primero, usa las <strong>Credenciales de prueba</strong> (token{' '}
              <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1 rounded">TEST-</code>).
            </li>
            <li>
              (Opcional) Copia también la <strong>Public Key</strong>.
            </li>
            <li>
              (Recomendado) En la app → <strong>Webhooks / Notificaciones</strong>, registra esta URL y copia la{' '}
              <strong>clave secreta</strong> que te da MP:
              <div className="mt-1 font-mono text-xs bg-gray-100 dark:bg-gray-900 rounded p-2 break-all">{WEBHOOK_URL}</div>
              <span className="text-xs text-gray-500">
                (Esta URL confirma los pagos automáticamente; queda activa cuando se publique la siguiente fase del cobro
                en línea.)
              </span>
            </li>
            <li>
              Pega el Access Token aquí abajo y presiona <strong>Proponer cuenta</strong>. <strong>Todos</strong> los
              miembros de la mesa recibirán un correo para aprobar. Cuando <strong>todos</strong> aprueben, la cuenta
              queda activa.
            </li>
            <li>
              Recomendado: empieza en <strong>modo prueba</strong>, haz un pago de prueba y, cuando todo funcione, repite
              el proceso con el token de <strong>producción</strong>.
            </li>
          </ol>
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-red-800 dark:text-red-300">
            <Lock className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <span>
              El Access Token es como la llave de la caja: <strong>nunca</strong> lo compartas por WhatsApp o correo.
              Pégalo solo aquí — se guarda <strong>cifrado</strong> y nunca se vuelve a mostrar completo.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ActiveAccountSection({
  status,
  isAdmin,
  onChanged,
}: {
  status: GatewayStatus;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const active = status.active;

  const enableMut = useMutation({
    mutationFn: (v: boolean) => apiClient.updateSetting('mp_enabled', v),
    onSuccess: () => {
      onChanged();
      toast.success('Configuración actualizada');
    },
    onError: (e: Error) => toast.error('No se pudo actualizar', { description: e.message }),
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-4">
      <h2 className="font-semibold text-gray-900 dark:text-gray-100">Cuenta activa</h2>

      {!active ? (
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          Aún no hay ninguna cuenta de Mercado Pago conectada.
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Cuenta de Mercado Pago</p>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{active.account_nickname || 'Sin alias'}</p>
              {active.account_email && <p className="text-sm text-gray-600 dark:text-gray-400">{active.account_email}</p>}
            </div>
            <ModeBadge mode={active.mode} />
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 pt-2 border-t border-gray-100 dark:border-gray-700">
            <p>ID de cuenta (collector): <span className="font-mono">{active.collector_id || '—'}</span></p>
            <p>Token: <span className="font-mono">{active.token_preview || '—'}</span></p>
            <p>Webhook configurado: {active.has_webhook_secret ? 'Sí' : 'No'}</p>
            <p>Activada: {fmtDate(active.activated_at)}{active.activated_by_name ? ` · por ${active.activated_by_name}` : ''}</p>
          </div>
        </div>
      )}

      {/* Toggle de cobro en línea + recargos (solo admin) */}
      {isAdmin && (
        <div className="space-y-4 pt-2">
          <label className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-gray-900 px-4 py-3">
            <span className="text-sm text-gray-800 dark:text-gray-200">
              <strong>Cobro en línea habilitado</strong>
              <span className="block text-xs text-gray-500 dark:text-gray-400">
                Si está activo, los vecinos verán el botón de pagar con Mercado Pago.
              </span>
            </span>
            <input
              type="checkbox"
              checked={status.enabled}
              disabled={!active || enableMut.isPending}
              onChange={(e) => enableMut.mutate(e.target.checked)}
              className="h-5 w-9 rounded-full"
            />
          </label>
          {!active && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Primero conecta y activa una cuenta para poder habilitar el cobro.
            </p>
          )}
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 dark:bg-gray-900 px-4 py-3 text-xs text-gray-600 dark:text-gray-400">
            <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Solo la <strong>tarjeta</strong> pasa por Mercado Pago. La <strong>transferencia</strong> y el{' '}
              <strong>efectivo</strong> se registran manualmente (sin comisión), como hasta ahora.
            </span>
          </div>
          <CardFeesEditor status={status} onChanged={onChanged} />
        </div>
      )}
    </div>
  );
}

function grossUpCard(net: number, f: { commission_pct: number; fixed_fee: number; iva_pct: number }) {
  const rate = (f.commission_pct || 0) / 100;
  const iva = (f.iva_pct || 0) / 100;
  const fixed = f.fixed_fee || 0;
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const denom = 1 - rate * (1 + iva);
  if (denom <= 0) return { charge: round2(net), fee: 0, net: round2(net) };
  const charge = (net + fixed * (1 + iva)) / denom;
  const fee = (rate * charge + fixed) * (1 + iva);
  return { charge: round2(charge), fee: round2(fee), net: round2(charge - fee) };
}

function CardFeesEditor({ status, onChanged }: { status: GatewayStatus; onChanged: () => void }) {
  const [commission, setCommission] = useState(String(status.card_fees.commission_pct));
  const [fixed, setFixed] = useState(String(status.card_fees.fixed_fee));
  const [iva, setIva] = useState(String(status.card_fees.iva_pct));
  const [example, setExample] = useState('400');

  const saveMut = useMutation({
    mutationFn: async () => {
      await apiClient.updateSetting('mp_card_commission_pct', Number(commission));
      await apiClient.updateSetting('mp_card_fixed_fee', Number(fixed));
      await apiClient.updateSetting('mp_card_iva_pct', Number(iva));
    },
    onSuccess: () => {
      onChanged();
      toast.success('Comisión de tarjeta guardada');
    },
    onError: (e: Error) => toast.error('No se pudo guardar', { description: e.message }),
  });

  const preview = grossUpCard(Number(example) || 0, {
    commission_pct: Number(commission) || 0,
    fixed_fee: Number(fixed) || 0,
    iva_pct: Number(iva) || 0,
  });
  const money = (n: number) => `$${n.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
        Comisión de tarjeta de Mercado Pago (la absorbe el residente)
      </p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Comisión (%)</label>
          <input type="number" step="0.01" min="0" value={commission} onChange={(e) => setCommission(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Tarifa fija ($)</label>
          <input type="number" step="0.01" min="0" value={fixed} onChange={(e) => setFixed(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">IVA (%)</label>
          <input type="number" step="1" min="0" value={iva} onChange={(e) => setIva(e.target.value)} className={inputCls} />
        </div>
      </div>

      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-gray-600 dark:text-gray-300">Si la cuota es</span>
          <div className="relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400">$</span>
            <input
              type="number"
              step="1"
              min="0"
              value={example}
              onChange={(e) => setExample(e.target.value)}
              className="w-28 pl-5 pr-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
        <ul className="space-y-1 text-gray-700 dark:text-gray-300">
          <li>El residente paga con tarjeta: <strong>{money(preview.charge)}</strong></li>
          <li>Mercado Pago se queda: <span className="text-red-600 dark:text-red-400">{money(preview.fee)}</span></li>
          <li>El fraccionamiento recibe: <strong className="text-green-600 dark:text-green-400">{money(preview.net)}</strong></li>
        </ul>
      </div>

      <p className="text-xs text-gray-500 dark:text-gray-400">
        Confirma estos valores en tu panel de Mercado Pago. El cobro hace <strong>gross-up</strong>: al residente que elige
        tarjeta se le suma la comisión para que la cuota llegue completa al fraccionamiento.
      </p>
      <div className="flex justify-end">
        <button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {saveMut.isPending ? 'Guardando...' : 'Guardar comisión'}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
function PendingProposalSection({
  status,
  proposal,
  currentUserId,
  isAdmin,
  onChanged,
}: {
  status: GatewayStatus;
  proposal: GatewayProposal;
  currentUserId?: string;
  isAdmin: boolean;
  onChanged: () => void;
}) {
  const confirm = useConfirm();
  const [comment, setComment] = useState('');

  const myApprover = status.approvers.some((a) => a.user_id === currentUserId);
  const myVote = proposal.approvals.find((a) => a.user_id === currentUserId);

  const decideMut = useMutation({
    mutationFn: ({ decision }: { decision: 'approve' | 'reject' }) =>
      apiClient.decideGatewayProposal(proposal.id, decision, comment || undefined),
    onSuccess: (_res, vars) => {
      onChanged();
      setComment('');
      toast.success(vars.decision === 'approve' ? 'Tu aprobación quedó registrada' : 'Propuesta rechazada');
    },
    onError: (e: Error) => toast.error('No se pudo registrar tu decisión', { description: e.message }),
  });

  const cancelMut = useMutation({
    mutationFn: () => apiClient.cancelGatewayProposal(proposal.id),
    onSuccess: () => {
      onChanged();
      toast.success('Propuesta cancelada');
    },
    onError: (e: Error) => toast.error('No se pudo cancelar', { description: e.message }),
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow border-2 border-amber-300 dark:border-amber-700 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-amber-600" />
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Cambio de cuenta pendiente de aprobación</h2>
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{proposal.account_nickname || 'Sin alias'}</p>
            {proposal.account_email && <p className="text-sm text-gray-600 dark:text-gray-400">{proposal.account_email}</p>}
          </div>
          <ModeBadge mode={proposal.mode} />
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-0.5 pt-2 border-t border-gray-200 dark:border-gray-700">
          <p>ID de cuenta: <span className="font-mono">{proposal.collector_id || '—'}</span></p>
          <p>Token: <span className="font-mono">{proposal.token_preview || '—'}</span></p>
          <p>Propuesto por: <strong>{proposal.proposed_by_name}</strong> · {fmtDate(proposal.created_at)}</p>
          {proposal.proposer_note && <p>Nota: {proposal.proposer_note}</p>}
          {proposal.expires_at && <p>Expira: {fmtDate(proposal.expires_at)}</p>}
        </div>
      </div>

      {/* Progreso de firmas */}
      <div>
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-700 dark:text-gray-300 flex items-center gap-1">
            <Users className="h-4 w-4" /> Firmas
          </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {proposal.approvals_count} de {proposal.required_approvals}
          </span>
        </div>
        <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all"
            style={{
              width: `${proposal.required_approvals ? (proposal.approvals_count / proposal.required_approvals) * 100 : 0}%`,
            }}
          />
        </div>
      </div>

      {/* Lista de decisiones */}
      <div className="space-y-1.5">
        {proposal.approvals.map((a) => (
          <div key={a.user_id} className="flex items-center gap-2 text-sm">
            {a.decision === 'approve' ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600" />
            )}
            <span className="text-gray-800 dark:text-gray-200">{a.full_name || a.user_id}</span>
            <span className="text-xs text-gray-500">
              {a.decision === 'approve' ? 'aprobó' : 'rechazó'}
              {a.comment ? ` · "${a.comment}"` : ''}
            </span>
          </div>
        ))}
        {proposal.pending_approvers.map((a) => (
          <div key={a.user_id} className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500 dark:text-gray-400">{a.full_name || a.user_id} — pendiente</span>
          </div>
        ))}
      </div>

      {/* Acciones de aprobación (solo miembros de la mesa) */}
      {myApprover && (
        <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          {myVote && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Ya registraste: <strong>{myVote.decision === 'approve' ? 'aprobado' : 'rechazado'}</strong>. Puedes cambiarlo
              mientras siga pendiente.
            </p>
          )}
          <input
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentario (opcional)"
            className={inputCls}
          />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: 'Confirmar aprobación',
                  description: '¿Confirmas que reconoces esta cuenta y autorizas que el dinero de las cuotas llegue ahí?',
                  confirmText: 'Sí, aprobar',
                });
                if (ok) decideMut.mutate({ decision: 'approve' });
              }}
              disabled={decideMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" /> Aprobar
            </button>
            <button
              onClick={async () => {
                const ok = await confirm({
                  title: 'Rechazar cambio',
                  description: 'Rechazar bloquea por completo este cambio de cuenta.',
                  confirmText: 'Rechazar',
                  tone: 'danger',
                });
                if (ok) decideMut.mutate({ decision: 'reject' });
              }}
              disabled={decideMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" /> Rechazar
            </button>
          </div>
        </div>
      )}

      {!myApprover && (
        <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <ShieldCheck className="h-4 w-4" /> Solo los miembros de la mesa pueden aprobar o rechazar.
        </p>
      )}

      {(isAdmin || proposal.proposed_by === currentUserId) && (
        <button
          onClick={async () => {
            const ok = await confirm({
              title: 'Cancelar propuesta',
              description: 'Se descartará esta propuesta de cambio de cuenta.',
              confirmText: 'Cancelar propuesta',
              tone: 'warning',
            });
            if (ok) cancelMut.mutate();
          }}
          disabled={cancelMut.isPending}
          className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 underline"
        >
          Cancelar esta propuesta
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
function ProposeSection({ status, onChanged }: { status: GatewayStatus; onChanged: () => void }) {
  const [token, setToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [note, setNote] = useState('');

  const proposeMut = useMutation({
    mutationFn: () =>
      apiClient.proposeGatewayChange({
        access_token: token.trim(),
        public_key: publicKey.trim() || undefined,
        webhook_secret: webhookSecret.trim() || undefined,
        proposer_note: note.trim() || undefined,
      }),
    onSuccess: () => {
      onChanged();
      setToken('');
      setPublicKey('');
      setWebhookSecret('');
      setNote('');
      toast.success('Propuesta enviada. La mesa recibió el correo para aprobar.');
    },
    onError: (e: Error) => toast.error('No se pudo proponer', { description: e.message }),
  });

  if (!status.can_propose) {
    return (
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
        <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Falta mesa directiva</p>
            <p className="text-sm mt-1">
              Para cambiar la cuenta de cobro se necesitan al menos <strong>{status.min_approvers}</strong> miembros con
              permiso de aprobación. Ahora hay <strong>{status.approvers.length}</strong>.
            </p>
            <Link href="/dashboard/mesa-directiva" className="inline-block mt-2 text-sm text-blue-600 underline">
              Ir a Mesa Directiva →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (token.trim().length < 10) {
          toast.error('Pega un Access Token válido');
          return;
        }
        proposeMut.mutate();
      }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 space-y-4"
    >
      <h2 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-blue-600" /> {status.active ? 'Cambiar cuenta' : 'Conectar cuenta'}
      </h2>

      <div className="flex items-start gap-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        <ShieldCheck className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <span>
          Al proponer, se avisa por correo a los <strong>{status.approvers.length}</strong> miembros de la mesa. La cuenta
          NO cambia hasta que <strong>todos</strong> aprueben.
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token *</label>
        <input
          type="password"
          autoComplete="off"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="APP_USR-... o TEST-..."
          className={`${inputCls} font-mono`}
        />
        <p className="text-xs text-gray-500 mt-1">Se detecta solo si es de prueba (TEST-) o producción (APP_USR-).</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Public Key (opcional)</label>
        <input
          value={publicKey}
          onChange={(e) => setPublicKey(e.target.value)}
          placeholder="APP_USR-xxxx... (pública)"
          className={`${inputCls} font-mono`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Clave secreta del webhook (opcional, recomendada)
        </label>
        <input
          type="password"
          autoComplete="off"
          value={webhookSecret}
          onChange={(e) => setWebhookSecret(e.target.value)}
          placeholder="Clave de firma de notificaciones"
          className={`${inputCls} font-mono`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nota para la mesa (opcional)</label>
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: cuenta nueva del fraccionamiento" className={inputCls} />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={proposeMut.isPending}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
        >
          {proposeMut.isPending ? 'Verificando con Mercado Pago...' : 'Proponer cuenta'}
        </button>
      </div>
    </form>
  );
}

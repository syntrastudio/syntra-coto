'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  Ticket as TicketIcon,
  Plus,
  X,
  MessageCircle,
  Send,
  Lock,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const STATUS_COLORS: Record<string, string> = {
  abierto: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_proceso: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  resuelto: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cerrado: 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  cancelado: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const PRIORITY_COLORS: Record<string, string> = {
  baja: 'text-gray-500',
  normal: 'text-blue-600 dark:text-blue-400',
  alta: 'text-amber-600 dark:text-amber-400',
  urgente: 'text-red-600 dark:text-red-400',
};

const CATEGORY_LABELS: Record<string, string> = {
  mantenimiento: 'Mantenimiento',
  seguridad: 'Seguridad',
  jardineria: 'Jardinería',
  ruido: 'Ruido',
  vehiculos: 'Vehículos',
  administrativo: 'Administrativo',
  otros: 'Otros',
};

interface TicketsViewProps {
  mode: 'admin' | 'resident';
}

export function TicketsView({ mode }: TicketsViewProps) {
  const [statusFilter, setStatusFilter] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => apiClient.getTickets({ status: statusFilter || undefined, limit: 100 }),
  });
  const tickets = (data?.data?.data || []) as any[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <TicketIcon className="h-6 w-6" />
            {mode === 'admin' ? 'Tickets' : 'Mis tickets'}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {mode === 'admin'
              ? 'Reportes de los residentes — atiende, comenta y cambia el estado.'
              : 'Reporta problemas a la administración y sigue su atención.'}
          </p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Nuevo ticket
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100"
        >
          <option value="">Todos los estados</option>
          <option value="abierto">Abiertos</option>
          <option value="en_proceso">En proceso</option>
          <option value="resuelto">Resueltos</option>
          <option value="cerrado">Cerrados</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}

      {!isLoading && tickets.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No hay tickets</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Cuando alguien reporte un problema aparecerá aquí.
          </p>
        </div>
      )}

      {!isLoading && tickets.length > 0 && (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setOpenTicketId(t.id)}
              className="w-full text-left bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-500 dark:text-gray-400">{t.folio}</span>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[t.status] || ''}`}>
                      {t.status}
                    </span>
                    <span className={`text-xs font-medium ${PRIORITY_COLORS[t.priority] || ''}`}>
                      {t.priority === 'urgente' && '⚠ '}
                      {t.priority}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{t.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{t.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>{CATEGORY_LABELS[t.category] || t.category}</span>
                    {t.property_house_number && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {t.property_street} #{t.property_house_number}
                      </span>
                    )}
                    {mode === 'admin' && t.reporter_name && (
                      <span>Reportó: {t.reporter_name}</span>
                    )}
                    {t.comments_count > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {t.comments_count}
                      </span>
                    )}
                    <span className="ml-auto">
                      {format(new Date(t.created_at * 1000), "d 'de' MMM HH:mm", { locale: es })}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showNewModal && (
        <NewTicketModal mode={mode} onClose={() => setShowNewModal(false)} />
      )}

      {openTicketId && (
        <TicketDrawer
          ticketId={openTicketId}
          mode={mode}
          onClose={() => setOpenTicketId(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
function NewTicketModal({ mode: _mode, onClose }: { mode: 'admin' | 'resident'; onClose: () => void }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (data: any) => apiClient.createTicket(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
      toast.success('Solicitud enviada');
    },
    onError: (e: Error) => toast.error('No se pudo enviar la solicitud', { description: e.message }),
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mut.mutate({
      title: fd.get('title'),
      description: fd.get('description'),
      category: fd.get('category') || 'otros',
      priority: fd.get('priority') || 'normal',
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-lg w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Nuevo ticket</h2>
          <button onClick={onClose} className="text-gray-400"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Título *</label>
            <input name="title" required maxLength={200} className={inputCls} placeholder="Resumen breve del problema" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descripción *</label>
            <textarea name="description" required minLength={5} rows={5} className={inputCls} placeholder="Describe con detalle..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoría</label>
              <select name="category" defaultValue="otros" className={inputCls}>
                {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prioridad</label>
              <select name="priority" defaultValue="normal" className={inputCls}>
                <option value="baja">Baja</option>
                <option value="normal">Normal</option>
                <option value="alta">Alta</option>
                <option value="urgente">Urgente</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded">Cancelar</button>
            <button type="submit" disabled={mut.isPending} className="px-3 py-2 text-sm bg-blue-600 text-white rounded disabled:opacity-50">
              {mut.isPending ? 'Creando...' : 'Crear ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
function TicketDrawer({ ticketId, mode, onClose }: { ticketId: string; mode: 'admin' | 'resident'; onClose: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const confirm = useConfirm();
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['ticket', ticketId],
    queryFn: () => apiClient.getTicket(ticketId),
  });
  const ticket: any = data?.data;

  const updateMut = useMutation({
    mutationFn: (patch: any) => apiClient.updateTicket(ticketId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      qc.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (e: Error) => toast.error('No se pudo actualizar', { description: e.message }),
  });

  const commentMut = useMutation({
    mutationFn: ({ body, isInternal }: { body: string; isInternal: boolean }) =>
      apiClient.commentTicket(ticketId, body, isInternal),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] });
      setCommentText('');
      setIsInternal(false);
    },
    onError: (e: Error) => toast.error('No se pudo enviar el comentario', { description: e.message }),
  });

  const isReporter = ticket?.reporter_user_id === user?.id;
  const isAdmin = mode === 'admin';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white dark:bg-gray-800 w-full max-w-2xl h-full overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-500 dark:text-gray-400">{ticket?.folio}</span>
            {ticket && (
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${STATUS_COLORS[ticket.status] || ''}`}>
                {ticket.status}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400"><X className="h-6 w-6" /></button>
        </div>

        {isLoading && <p className="p-6 text-gray-500">Cargando...</p>}

        {ticket && (
          <div className="p-6 space-y-5">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{ticket.title}</h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{ticket.description}</p>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Categoría</p>
                <p className="font-medium text-gray-900 dark:text-gray-100">{CATEGORY_LABELS[ticket.category]}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Prioridad</p>
                <p className={`font-medium ${PRIORITY_COLORS[ticket.priority]}`}>{ticket.priority}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Reportado por</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">{ticket.reporter_name}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400">Creado</p>
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {format(new Date(ticket.created_at * 1000), "d 'de' MMM yyyy HH:mm", { locale: es })}
                </p>
              </div>
              {ticket.property_house_number && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded p-3 col-span-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Propiedad</p>
                  <p className="text-sm text-gray-900 dark:text-gray-100">{ticket.property_street} #{ticket.property_house_number}</p>
                </div>
              )}
            </div>

            {/* Acciones (admin) */}
            {isAdmin && (
              <div className="border-y border-gray-200 dark:border-gray-700 py-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Cambiar estado</label>
                  <select
                    value={ticket.status}
                    onChange={(e) => updateMut.mutate({ status: e.target.value })}
                    disabled={updateMut.isPending}
                    className={inputCls}
                  >
                    <option value="abierto">Abierto</option>
                    <option value="en_proceso">En proceso</option>
                    <option value="resuelto">Resuelto</option>
                    <option value="cerrado">Cerrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1">Cambiar prioridad</label>
                  <select
                    value={ticket.priority}
                    onChange={(e) => updateMut.mutate({ priority: e.target.value })}
                    disabled={updateMut.isPending}
                    className={inputCls}
                  >
                    <option value="baja">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
              </div>
            )}

            {/* Botón cancelar (reporter, si está abierto) */}
            {!isAdmin && isReporter && ticket.status === 'abierto' && (
              <div className="border-y border-gray-200 dark:border-gray-700 py-3">
                <button
                  onClick={async () => {
                    const ok = await confirm({
                      title: '¿Cancelar esta solicitud?',
                      description: 'Se marcará como cancelada y ya no se le dará seguimiento.',
                      confirmText: 'Sí, cancelar',
                      cancelText: 'No, dejarla abierta',
                      tone: 'danger',
                    });
                    if (ok) updateMut.mutate({ status: 'cancelado' });
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Cancelar esta solicitud
                </button>
              </div>
            )}

            {/* Comentarios */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase mb-3">
                Comentarios ({ticket.comments?.length || 0})
              </h3>
              <div className="space-y-3 mb-4">
                {(ticket.comments || []).map((c: any) => (
                  <div
                    key={c.id}
                    className={`rounded p-3 ${
                      c.is_internal
                        ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                        : 'bg-gray-50 dark:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 text-xs">
                      <span className="font-medium text-gray-900 dark:text-gray-100">{c.user_name}</span>
                      <span className="text-gray-500">·</span>
                      <span className="text-gray-500">{format(new Date(c.created_at * 1000), "d 'de' MMM HH:mm", { locale: es })}</span>
                      {c.is_internal && (
                        <span className="flex items-center gap-0.5 text-amber-700 dark:text-amber-400 ml-1">
                          <Lock className="h-3 w-3" />
                          interno
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))}
                {(ticket.comments?.length || 0) === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Sin comentarios.</p>
                )}
              </div>

              {ticket.status !== 'cerrado' && ticket.status !== 'cancelado' && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!commentText.trim()) return;
                    commentMut.mutate({ body: commentText, isInternal });
                  }}
                  className="space-y-2"
                >
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    rows={3}
                    placeholder={isAdmin ? 'Responde al residente o deja una nota interna...' : 'Agregar comentario...'}
                    className={inputCls}
                  />
                  <div className="flex items-center justify-between">
                    {isAdmin && (
                      <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <input
                          type="checkbox"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="h-3 w-3 text-amber-600 focus:ring-amber-500"
                        />
                        <Lock className="h-3 w-3" />
                        Nota interna (no visible para el residente)
                      </label>
                    )}
                    <button
                      type="submit"
                      disabled={commentMut.isPending || !commentText.trim()}
                      className="ml-auto flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      {commentMut.isPending ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';

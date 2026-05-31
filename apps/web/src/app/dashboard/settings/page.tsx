'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { Users, FileText, Settings as SettingsIcon, Plus, Edit, Trash2, X, Save, KeyRound, ChevronDown, ChevronRight, User as UserIcon, Mail } from 'lucide-react';
import { PasskeysSection } from '@/components/PasskeysSection';
import { NotificationsLogTab } from '@/components/NotificationsLogTab';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { User, SystemSetting } from '@/types';

type Tab = 'users' | 'audit-logs' | 'notifications' | 'general' | 'account';

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('account');

  if (!user || (user.role !== 'super_admin' && user.role !== 'admin')) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Acceso Denegado</h1>
          <p className="text-gray-600 dark:text-gray-400">No tienes permisos para acceder a esta página.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Users }[] = [
    { id: 'account', label: 'Mi cuenta', icon: UserIcon },
    { id: 'users', label: 'Usuarios', icon: Users },
    { id: 'audit-logs', label: 'Audit Logs', icon: FileText },
    { id: 'notifications', label: 'Correos enviados', icon: Mail },
    { id: 'general', label: 'General', icon: SettingsIcon },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Configuración</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Gestiona usuarios administrativos, audit logs y configuración del sistema
        </p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === t.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mt-6">
        {activeTab === 'account' && (
          <div className="space-y-6">
            <PasskeysSection />
          </div>
        )}
        {activeTab === 'users' && <UsersTab currentUser={user} />}
        {activeTab === 'audit-logs' && <AuditLogsTab />}
        {activeTab === 'notifications' && <NotificationsLogTab />}
        {activeTab === 'general' && <GeneralTab />}
      </div>
    </div>
  );
}

// ============================================================================
// USERS TAB
// ============================================================================
function UsersTab({ currentUser }: { currentUser: User }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [selectedResidentId, setSelectedResidentId] = useState<string>('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiClient.getUsers(),
  });

  const { data: availableResidents } = useQuery({
    queryKey: ['available-residents'],
    queryFn: () => apiClient.getAvailableResidents(),
    enabled: showModal && !editing,
  });

  const selectedResident = availableResidents?.data?.find((r) => r.id === selectedResidentId);

  const createMut = useMutation({
    mutationFn: (payload: any) => apiClient.createUser(payload),
    onSuccess: (resp) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['available-residents'] });
      setShowModal(false);
      setEditing(null);
      setSelectedResidentId('');
      const sent = (resp as any)?.data?.email_sent;
      const skipped = (resp as any)?.data?.email_skipped;
      if (sent) {
        alert('Usuario creado. Se envió un correo con la contraseña temporal.');
      } else if (skipped) {
        alert('Usuario creado. ⚠️ El envío de correo está deshabilitado (configura RESEND_API_KEY y EMAIL_FROM).');
      } else {
        alert('Usuario creado. Pero el envío de correo falló — comunícale la contraseña manualmente.');
      }
    },
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => apiClient.updateUser(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setShowModal(false);
      setEditing(null);
    },
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiClient.deleteUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  const resetPasswordMut = useMutation({
    mutationFn: (args: { id: string; password?: string }) =>
      apiClient.resetUserPassword(args.id, args.password ? { password: args.password } : undefined),
    onSuccess: (resp) => {
      const d = (resp as any).data || {};
      if (d.temp_password) {
        // El correo no se envió (o no está configurado); mostrar la contraseña
        alert(
          `Contraseña temporal generada:\n\n${d.temp_password}\n\nCopia esta contraseña y compártela manualmente. ` +
          (d.email_skipped
            ? '(El envío automático por correo está deshabilitado.)'
            : '(El correo no pudo enviarse.)')
        );
      } else if (d.email_sent) {
        alert('Contraseña restablecida. Se envió un correo al usuario.');
      } else {
        alert('Contraseña restablecida.');
      }
    },
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  const handleResetPassword = (u: User) => {
    const choice = window.prompt(
      `Restablecer contraseña de ${u.full_name}\n\n` +
      `· Deja vacío para GENERAR una contraseña temporal y enviar por correo.\n` +
      `· O escribe una contraseña manualmente (mín 8 caracteres, mayúscula y número).`,
      ''
    );
    if (choice === null) return; // cancelado
    if (choice.trim() === '') {
      if (!confirm(`¿Generar una contraseña temporal para ${u.full_name} y enviarla por correo?`)) return;
      resetPasswordMut.mutate({ id: u.id });
    } else {
      if (choice.length < 8) {
        alert('La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      resetPasswordMut.mutate({ id: u.id, password: choice });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (editing) {
      const payload: any = {
        full_name: fd.get('full_name'),
        phone: fd.get('phone') || undefined,
        role: fd.get('role'),
        status: fd.get('status'),
      };
      updateMut.mutate({ id: editing.id, payload });
    } else {
      if (!selectedResidentId) {
        alert('Selecciona un residente');
        return;
      }
      createMut.mutate({
        resident_id: selectedResidentId,
        role: fd.get('role'),
      });
    }
  };

  const roleColors: Record<string, string> = {
    super_admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    admin: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    supervisor: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    resident: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  const users = data?.data || [];

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Gestión de Usuarios ({users.length})
        </h2>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
        >
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}
      {error && <p className="text-red-600">Error: {(error as Error).message}</p>}

      {!isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">{u.full_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${roleColors[u.role] || ''}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      u.status === 'active' ? 'bg-green-100 text-green-800' :
                      u.status === 'suspended' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                    }`}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-medium">
                    <button
                      onClick={() => { setEditing(u); setShowModal(true); }}
                      title="Editar"
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      <Edit className="h-4 w-4 inline" />
                    </button>
                    <button
                      onClick={() => handleResetPassword(u)}
                      title="Restablecer contraseña"
                      className="text-amber-600 hover:text-amber-800 mr-3"
                    >
                      <KeyRound className="h-4 w-4 inline" />
                    </button>
                    {u.id !== currentUser.id && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar a ${u.full_name}?`)) deleteMut.mutate(u.id);
                        }}
                        title="Eliminar"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4 inline" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal
          title={editing ? 'Editar Usuario' : 'Nuevo Usuario'}
          onClose={() => { setShowModal(false); setEditing(null); setSelectedResidentId(''); }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editing ? (
              <>
                <Field label="Residente *">
                  <select
                    required
                    value={selectedResidentId}
                    onChange={(e) => setSelectedResidentId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Selecciona un residente...</option>
                    {availableResidents?.data?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.full_name} — {r.email}
                      </option>
                    ))}
                  </select>
                </Field>

                {selectedResident && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm space-y-1">
                    <p className="text-gray-700 dark:text-gray-300"><strong>Email:</strong> {selectedResident.email}</p>
                    <p className="text-gray-700 dark:text-gray-300"><strong>Teléfono:</strong> {selectedResident.phone}</p>
                    <p className="text-gray-700 dark:text-gray-300"><strong>Tipo:</strong> {selectedResident.type}</p>
                  </div>
                )}

                <Field label="Rol del sistema *">
                  <select name="role" required defaultValue="admin" className={inputCls}>
                    {currentUser.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                    <option value="admin">Admin (mesa directiva)</option>
                    <option value="supervisor">Supervisor (caseta)</option>
                    <option value="resident">Residente</option>
                  </select>
                </Field>

                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Se generará una contraseña temporal y se enviará al correo del residente.
                </p>
              </>
            ) : (
              <>
                <Field label="Nombre completo *">
                  <input name="full_name" required defaultValue={editing.full_name} className={inputCls} />
                </Field>
                <Field label="Teléfono">
                  <input name="phone" defaultValue={editing.phone || ''} className={inputCls} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Rol *">
                    <select name="role" required defaultValue={editing.role} className={inputCls}>
                      {currentUser.role === 'super_admin' && <option value="super_admin">Super Admin</option>}
                      <option value="admin">Admin</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="resident">Residente</option>
                    </select>
                  </Field>
                  <Field label="Estado *">
                    <select name="status" required defaultValue={editing.status} className={inputCls}>
                      <option value="active">Activo</option>
                      <option value="inactive">Inactivo</option>
                      <option value="suspended">Suspendido</option>
                    </select>
                  </Field>
                </div>
              </>
            )}
            <ModalFooter
              onCancel={() => { setShowModal(false); setEditing(null); setSelectedResidentId(''); }}
              pending={createMut.isPending || updateMut.isPending}
            />
          </form>
        </Modal>
      )}
    </div>
  );
}

// ============================================================================
// AUDIT LOGS TAB
// ============================================================================
function AuditLogsTab() {
  const [page, setPage] = useState(1);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', page, entityFilter, actionFilter],
    queryFn: () => apiClient.getAuditLogs({
      page,
      limit: 50,
      entity_type: entityFilter || undefined,
      action: actionFilter || undefined,
    }),
  });

  const logs = data?.data || [];
  const pag = data?.pagination;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const formatJSON = (raw: string | null) => {
    if (!raw) return null;
    try {
      return JSON.stringify(JSON.parse(raw), null, 2);
    } catch {
      return raw;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className={inputCls + ' max-w-xs'}
        >
          <option value="">Todas las entidades</option>
          <option value="users">Usuarios</option>
          <option value="properties">Propiedades</option>
          <option value="residents">Residentes</option>
          <option value="payments">Pagos</option>
          <option value="vehicles">Vehículos</option>
          <option value="fees">Cuotas</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className={inputCls + ' max-w-xs'}
        >
          <option value="">Todas las acciones</option>
          <option value="CREATE">CREATE</option>
          <option value="UPDATE">UPDATE</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}

      {!isLoading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Entidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ruta</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {logs.map((log) => {
                const isOpen = expanded.has(log.id);
                const hasDetails = !!(log.new_values || log.old_values || log.error_message);
                return (
                  <React.Fragment key={log.id}>
                    <tr
                      onClick={() => hasDetails && toggleExpand(log.id)}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${hasDetails ? 'cursor-pointer' : ''}`}
                    >
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                        {hasDetails && (isOpen ? <ChevronDown className="inline h-3 w-3 mr-1" /> : <ChevronRight className="inline h-3 w-3 mr-1" />)}
                        {format(new Date(log.created_at * 1000), 'd MMM HH:mm:ss', { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                        {log.user_full_name || log.user_email || log.user_id || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          log.action === 'CREATE' ? 'bg-green-100 text-green-800' :
                          log.action === 'DELETE' ? 'bg-red-100 text-red-800' :
                          log.action === 'UPDATE' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                        }`}>{log.action}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{log.entity_type}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">
                        {log.request_method} {log.request_path}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className={log.status_code && log.status_code >= 400 ? 'text-red-600' : 'text-green-600'}>
                          {log.status_code || '—'}
                        </span>
                      </td>
                    </tr>
                    {isOpen && hasDetails && (
                      <tr className="bg-gray-50 dark:bg-gray-900">
                        <td colSpan={6} className="px-4 py-3 text-xs">
                          {log.error_message && (
                            <div className="mb-2 text-red-600 dark:text-red-400">
                              <strong>Error:</strong> {log.error_message}
                            </div>
                          )}
                          {log.new_values && (
                            <div className="mb-2">
                              <div className="text-gray-500 dark:text-gray-400 font-semibold mb-1">Datos enviados:</div>
                              <pre className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto font-mono text-xs text-gray-800 dark:text-gray-200">
{formatJSON(log.new_values)}
                              </pre>
                            </div>
                          )}
                          {log.old_values && (
                            <div>
                              <div className="text-gray-500 dark:text-gray-400 font-semibold mb-1">Datos anteriores:</div>
                              <pre className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto font-mono text-xs text-gray-800 dark:text-gray-200">
{formatJSON(log.old_values)}
                              </pre>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Sin logs</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {pag && pag.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page <= 1}
            className="px-3 py-1 border rounded disabled:opacity-50 text-gray-900 dark:text-gray-100 dark:border-gray-600"
          >Anterior</button>
          <span className="text-sm text-gray-700 dark:text-gray-300">Página {page} de {pag.totalPages}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= pag.totalPages}
            className="px-3 py-1 border rounded disabled:opacity-50 text-gray-900 dark:text-gray-100 dark:border-gray-600"
          >Siguiente</button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// GENERAL TAB (system_settings)
// ============================================================================
function GeneralTab() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => apiClient.getSettings(),
  });

  const updateMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: any }) => apiClient.updateSetting(key, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['system-settings'] }),
    onError: (e: Error) => alert('Error: ' + e.message),
  });

  const settings = data?.data || [];
  const grouped = settings.reduce<Record<string, SystemSetting[]>>((acc, s) => {
    const cat = s.category || 'general';
    (acc[cat] = acc[cat] || []).push(s);
    return acc;
  }, {});

  if (isLoading) return <p className="text-gray-500">Cargando...</p>;
  if (error) return <p className="text-red-600">Error: {(error as Error).message}</p>;

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 capitalize">
            {category}
          </h3>
          <div className="space-y-4">
            {items.map((s) => (
              <SettingRow key={s.key} setting={s} onSave={(value) => updateMut.mutate({ key: s.key, value })} pending={updateMut.isPending} />
            ))}
          </div>
        </div>
      ))}
      {Object.keys(grouped).length === 0 && (
        <div className="text-center py-12 text-gray-500">Sin configuraciones</div>
      )}
    </div>
  );
}

function SettingRow({ setting, onSave, pending }: { setting: SystemSetting; onSave: (v: any) => void; pending: boolean }) {
  const [value, setValue] = useState<any>(setting.value);
  const dirty = JSON.stringify(value) !== JSON.stringify(setting.value);

  let input: React.ReactNode;
  if (setting.data_type === 'boolean') {
    input = (
      <select
        value={value ? 'true' : 'false'}
        onChange={(e) => setValue(e.target.value === 'true')}
        disabled={!setting.is_editable}
        className={inputCls + ' max-w-xs'}
      >
        <option value="true">Sí</option>
        <option value="false">No</option>
      </select>
    );
  } else if (setting.data_type === 'number') {
    input = (
      <input
        type="number"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        disabled={!setting.is_editable}
        className={inputCls + ' max-w-xs'}
      />
    );
  } else if (setting.data_type === 'json') {
    input = (
      <textarea
        value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
        onChange={(e) => {
          try { setValue(JSON.parse(e.target.value)); } catch { setValue(e.target.value); }
        }}
        disabled={!setting.is_editable}
        rows={3}
        className={inputCls + ' font-mono text-xs'}
      />
    );
  } else {
    input = (
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!setting.is_editable}
        className={inputCls}
      />
    );
  }

  return (
    <div className="border-b border-gray-100 dark:border-gray-700 pb-4 last:border-0">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-sm font-mono text-gray-800 dark:text-gray-200">{setting.key}</code>
            {!setting.is_editable && (
              <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">solo lectura</span>
            )}
          </div>
          {setting.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{setting.description}</p>
          )}
          <div className="mt-2">{input}</div>
        </div>
        {dirty && setting.is_editable && (
          <button
            onClick={() => onSave(value)}
            disabled={pending}
            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm disabled:opacity-50"
          >
            <Save className="h-3 w-3" />
            Guardar
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// SHARED HELPERS
// ============================================================================
const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function ModalFooter({ onCancel, pending }: { onCancel: () => void; pending: boolean }) {
  return (
    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
      <button type="button" onClick={onCancel} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
        Cancelar
      </button>
      <button type="submit" disabled={pending} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50">
        {pending ? 'Guardando...' : 'Guardar'}
      </button>
    </div>
  );
}

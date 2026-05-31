'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Search, Plus, Edit, Trash2, X, Mail, Phone, Calendar, User } from 'lucide-react';
import type { Resident, CreateResidentInput, UpdateResidentInput } from '@/types';

export default function ResidentsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'propietario' | 'inquilino' | ''>('');
  const [statusFilter, setStatusFilter] = useState<'activo' | 'inactivo' | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingResident, setEditingResident] = useState<Resident | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['residents', page, search, typeFilter, statusFilter],
    queryFn: async () => {
      const filters: any = { page, limit: 20 };
      if (search) filters.search = search;
      if (typeFilter) filters.type = typeFilter;
      if (statusFilter) filters.status = statusFilter;
      return await apiClient.getResidents(filters.page, filters.limit, filters);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (args: { data: CreateResidentInput; createUser?: boolean; userRole?: string }) => {
      const created = await apiClient.createResident(args.data);
      const residentId = (created as any)?.data?.id;
      let userResult: any = null;
      if (args.createUser && residentId) {
        userResult = await apiClient.createUser({
          resident_id: residentId,
          role: (args.userRole as any) || 'resident',
        });
      }
      return { resident: created, user: userResult };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['available-residents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setShowModal(false);
      setEditingResident(null);

      const userData = (result.user as any)?.data;
      if (userData) {
        if (userData.email_sent) {
          alert('✅ Residente creado.\nCuenta de acceso generada y correo enviado.');
        } else if (userData.email_skipped) {
          alert('✅ Residente creado.\n⚠️ Cuenta generada pero el envío de correo está deshabilitado en el server.');
        } else {
          alert('✅ Residente creado.\n⚠️ Cuenta generada pero el correo no se envió.');
        }
      } else {
        alert('✅ Residente creado.');
      }
    },
    onError: (error: Error) => {
      console.error('❌ Error al crear residente:', error);
      alert(`❌ Error: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateResidentInput }) =>
      apiClient.updateResident(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      setShowModal(false);
      setEditingResident(null);
      alert('✅ Residente actualizado exitosamente');
    },
    onError: (error: Error) => {
      alert(`❌ Error al actualizar residente: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteResident(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setShowDeleteConfirm(null);
      alert('✅ Residente eliminado');
    },
    onError: (e: Error) => {
      alert(`❌ Error al eliminar residente: ${e.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Convertir fecha a timestamp Unix (segundos). El input "YYYY-MM-DD" se
    // parsea como medianoche LOCAL para que no haya desfase por timezone.
    const startDateString = formData.get('start_date') as string;
    const parts = startDateString.split('-').map(Number);
    const yy = parts[0] || 1970;
    const mm = parts[1] || 1;
    const dd = parts[2] || 1;
    const startDateTimestamp = Math.floor(new Date(yy, mm - 1, dd).getTime() / 1000);
    
    const data: CreateResidentInput = {
      full_name: formData.get('full_name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      type: formData.get('type') as 'propietario' | 'inquilino',
      start_date: startDateTimestamp,
      status: (formData.get('status') as 'activo' | 'inactivo') || 'activo',
    };

    if (editingResident) {
      updateMutation.mutate({ id: editingResident.id, data: { ...data, id: editingResident.id } as UpdateResidentInput });
    } else {
      const createUser = formData.get('create_user') === 'on';
      const userRole = (formData.get('user_role') as string) || 'resident';
      createMutation.mutate({ data, createUser, userRole });
    }
  };

  const openEditModal = (resident: Resident) => {
    setEditingResident(resident);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingResident(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingResident(null);
  };

  const formatDate = (unixSeconds: number | string) => {
    const ms = typeof unixSeconds === 'number' ? unixSeconds * 1000 : Date.parse(unixSeconds);
    return new Date(ms).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'America/Mexico_City',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Residentes</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gestiona los residentes del fraccionamiento
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          Agregar Residente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, email o teléfono..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los tipos</option>
            <option value="propietario">Propietario</option>
            <option value="inquilino">Inquilino</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as any);
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>

          {(search || typeFilter || statusFilter) && (
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setStatusFilter('');
                setPage(1);
              }}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando residentes...</p>
          </div>
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Propiedad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fecha Inicio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((resident: Resident) => (
                  <tr key={resident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {resident.full_name}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-gray-100 flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {resident.email}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center mt-1">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {resident.phone}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        resident.type === 'propietario'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                      }`}>
                        {resident.type === 'propietario' ? 'Propietario' : 'Inquilino'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {((resident as any).properties || []).length > 0 ? (
                        <div className="space-y-0.5">
                          {((resident as any).properties as Array<{ id: string; house_number: string; street: string; role: string }>).map((p) => (
                            <div key={p.id} className="text-gray-900 dark:text-gray-100">
                              <span className="font-medium">{p.street} #{p.house_number}</span>
                              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                ({p.role === 'propietario' ? 'dueño' : 'reside'})
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(resident.start_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        resident.status === 'activo'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                      }`}>
                        {resident.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(resident)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(resident.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data.pagination && data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
                Página {page} de {data.pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === data.pagination.totalPages}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center transition-colors">
          <User className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No se encontraron residentes
          </h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Comienza agregando un nuevo residente
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Agregar Residente
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {editingResident ? 'Editar Residente' : 'Nuevo Residente'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  name="full_name"
                  required
                  defaultValue={editingResident?.full_name}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Juan Pérez García"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Teléfono * (10 dígitos)
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    required
                    pattern="[0-9]{10}"
                    defaultValue={editingResident?.phone}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="3312345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    defaultValue={editingResident?.email}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="correo@ejemplo.com"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tipo *
                  </label>
                  <select
                    name="type"
                    required
                    defaultValue={editingResident?.type}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="propietario">Propietario</option>
                    <option value="inquilino">Inquilino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    name="start_date"
                    required
                    max={new Date().toISOString().split('T')[0]}
                    defaultValue={
                      editingResident?.start_date
                        ? (() => {
                            const ms = typeof editingResident.start_date === 'number'
                              ? editingResident.start_date * 1000
                              : Date.parse(editingResident.start_date as any);
                            const d = new Date(ms);
                            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                          })()
                        : ''
                    }
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {editingResident && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Estado
                  </label>
                  <select
                    name="status"
                    defaultValue={editingResident?.status}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}

              {!editingResident && <CreateUserToggle />}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Guardando...'
                    : editingResident
                    ? 'Actualizar'
                    : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 transition-colors">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar este residente? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateUserToggle() {
  const [enabled, setEnabled] = useState(false);
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          name="create_user"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Crear también cuenta de acceso al portal
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Se generará una contraseña temporal y se enviará por correo al residente.
          </p>
        </div>
      </label>

      {enabled && (
        <div className="mt-3 pl-7">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Rol en el sistema
          </label>
          <select
            name="user_role"
            defaultValue="resident"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
          >
            <option value="resident">Residente (portal básico)</option>
            <option value="supervisor">Supervisor (caseta)</option>
            <option value="admin">Admin (mesa directiva)</option>
          </select>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Para crear super_admin debes hacerlo desde Configuración → Usuarios.
          </p>
        </div>
      )}
    </div>
  );
}

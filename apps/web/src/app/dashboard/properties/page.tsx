'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Search, Plus, Edit, Trash2, X } from 'lucide-react';
import type { Property, CreatePropertyInput, Resident } from '@/types';
import { STREETS } from '@/lib/streets';

export default function PropertiesPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<Property['status'] | ''>('');
  const [showModal, setShowModal] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['properties', page, search, statusFilter],
    queryFn: async () => {
      const filters: any = { page, limit: 20 };
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;

      return await apiClient.getProperties(page, 20, filters);
    },
  });

  // Lista de residentes activos para los dropdowns del modal
  const { data: residentsData } = useQuery({
    queryKey: ['residents', 'active', 'all'],
    queryFn: () => apiClient.getResidents(1, 100, { status: 'activo' }),
    enabled: showModal,
  });
  const residents: Resident[] = Array.isArray((residentsData as any)?.data)
    ? ((residentsData as any).data as Resident[])
    : [];

  const createMutation = useMutation({
    mutationFn: (data: CreatePropertyInput) => apiClient.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setShowModal(false);
      setEditingProperty(null);
      // Mostrar mensaje de éxito
      alert('✅ Propiedad creada exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ Error al crear propiedad:', error);
      alert(`❌ Error al crear propiedad: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePropertyInput> }) =>
      apiClient.updateProperty(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setShowModal(false);
      setEditingProperty(null);
      alert('✅ Propiedad actualizada exitosamente');
    },
    onError: (error: Error) => {
      console.error('❌ Error al actualizar propiedad:', error);
      alert(`❌ Error al actualizar propiedad: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      setDeleteConfirm(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const propertyData: CreatePropertyInput = {
      house_number: formData.get('house_number') as string,
      street: formData.get('street') as string,
      status: formData.get('status') as Property['status'],
      owner_id: (formData.get('owner_id') as string) || null as any,
      current_resident_id: (formData.get('current_resident_id') as string) || null as any,
      gate_control_1: formData.get('gate_control_1') as string || undefined,
      gate_control_2: formData.get('gate_control_2') as string || undefined,
      gate_control_3: formData.get('gate_control_3') as string || undefined,
    };

    if (editingProperty) {
      updateMutation.mutate({ id: editingProperty.id, data: propertyData });
    } else {
      const initialBalance = Number(formData.get('initial_balance') || 0);
      if (initialBalance) (propertyData as any).initial_balance = initialBalance;
      createMutation.mutate(propertyData);
    }
  };

  const openEditModal = (property: Property) => {
    setEditingProperty(property);
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingProperty(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProperty(null);
  };

  const getStatusBadge = (status: Property['status']) => {
    const styles = {
      ocupada: 'bg-green-100 text-green-800',
      desocupada: 'bg-gray-100 text-gray-800',
      en_renta: 'bg-blue-100 text-blue-800',
      en_venta: 'bg-yellow-100 text-yellow-800',
    };
    const labels = {
      ocupada: 'Ocupada',
      desocupada: 'Desocupada',
      en_renta: 'En Renta',
      en_venta: 'En Venta',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Propiedades</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Gestiona las {data?.pagination?.total || 130} propiedades del fraccionamiento
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5" />
          Agregar Propiedad
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 transition-colors">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número de casa o calle..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as Property['status'] | '');
              setPage(1);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            <option value="ocupada">Ocupada</option>
            <option value="desocupada">Desocupada</option>
            <option value="en_renta">En Renta</option>
            <option value="en_venta">En Venta</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-400">Error al cargar datos: {error.message}</p>
        </div>
      )}

      {/* Properties Table */}
      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando propiedades...</p>
          </div>
        </div>
      ) : data?.data && data.data.length > 0 ? (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Calle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Propietario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Reside
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Estado de pago
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {data.data.map((property) => (
                  <tr key={property.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                      {property.house_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {property.street}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(property.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {(property as any).owner?.full_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {(property as any).current_resident?.full_name || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <FinancialStatusCell property={property as any} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => openEditModal(property)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(property.id)}
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
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No se encontraron propiedades
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Intenta ajustar los filtros de búsqueda
          </p>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto transition-colors">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {editingProperty ? 'Editar Propiedad' : 'Nueva Propiedad'}
                </h2>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Número de Casa *
                    </label>
                    <input
                      type="text"
                      name="house_number"
                      required
                      defaultValue={editingProperty?.house_number}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Calle *
                    </label>
                    <select
                      name="street"
                      required
                      defaultValue={editingProperty?.street || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar calle...</option>
                      {STREETS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                      {editingProperty?.street && !STREETS.includes(editingProperty.street as any) && (
                        <option value={editingProperty.street}>{editingProperty.street} (legado)</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Estado *
                    </label>
                    <select
                      name="status"
                      required
                      defaultValue={editingProperty?.status || 'desocupada'}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="ocupada">Ocupada</option>
                      <option value="desocupada">Desocupada</option>
                      <option value="en_renta">En Renta</option>
                      <option value="en_venta">En Venta</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Propietario
                    </label>
                    <select
                      name="owner_id"
                      defaultValue={editingProperty?.owner_id || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">— Sin asignar —</option>
                      {residents.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.full_name} ({(r as any).type})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Residente actual
                    </label>
                    <select
                      name="current_resident_id"
                      defaultValue={editingProperty?.current_resident_id || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">— Sin asignar —</option>
                      {residents.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.full_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Control Portón 1
                    </label>
                    <input
                      type="text"
                      name="gate_control_1"
                      defaultValue={editingProperty?.gate_control_1 || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Control Portón 2
                    </label>
                    <input
                      type="text"
                      name="gate_control_2"
                      defaultValue={editingProperty?.gate_control_2 || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Control Portón 3
                    </label>
                    <input
                      type="text"
                      name="gate_control_3"
                      defaultValue={editingProperty?.gate_control_3 || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {!editingProperty && (
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Saldo inicial (opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="initial_balance"
                      defaultValue="0"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <strong>Positivo</strong>: deuda heredada (ej. 5000 = la propiedad inicia con $5,000 de adeudo). Se crea una cuota de apertura.<br />
                      <strong>Negativo</strong>: crédito previo (ej. −2000 = saldo a favor inicial de $2,000).<br />
                      Dejar en 0 si la propiedad inicia sin movimientos.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-6">
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
                      : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 transition-colors">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
              Confirmar Eliminación
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              ¿Estás seguro de que deseas eliminar esta propiedad? Esta acción no se puede deshacer.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteConfirm)}
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

// ============================================================================
// Estado financiero por propiedad (badge + monto)
// ============================================================================
function FinancialStatusCell({ property }: { property: any }) {
  const owed = Number(property?.total_owed ?? 0);
  const credit = Number(property?.credit_balance ?? 0);
  const net = owed - credit;
  const status = property?.delinquency_status || 'al_corriente';
  const pending = Number(property?.pending_fees_count ?? 0);

  const STATUS_BADGES: Record<string, string> = {
    al_corriente: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    mora_1_mes: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    mora_2_meses: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    suspendido: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  };

  const STATUS_LABELS: Record<string, string> = {
    al_corriente: 'Al corriente',
    mora_1_mes: '1 mes mora',
    mora_2_meses: '2 meses mora',
    suspendido: 'Suspendido',
  };

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium w-fit ${STATUS_BADGES[status] || ''}`}>
        {STATUS_LABELS[status] || status}
      </span>
      {owed > 0 ? (
        <span className="text-xs font-semibold text-red-600 dark:text-red-400">
          Adeudo ${owed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
          {pending > 0 && <span className="font-normal text-gray-500 dark:text-gray-400"> · {pending} cuota{pending === 1 ? '' : 's'}</span>}
        </span>
      ) : credit > 0 ? (
        <span className="text-xs font-semibold text-green-600 dark:text-green-400">
          Saldo a favor ${credit.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      ) : (
        <span className="text-xs text-gray-500 dark:text-gray-400">$0.00</span>
      )}
      {credit > 0 && owed > 0 && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400">
          Neto: ${net.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
        </span>
      )}
    </div>
  );
}

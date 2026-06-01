'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Car, Search } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { useConfirm } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import type { Vehicle, VehicleFilters, CreateVehicleInput, UpdateVehicleInput, Property } from '@/types';

export default function VehiclesPage() {
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [formData, setFormData] = useState<CreateVehicleInput>({
    property_id: '',
    vehicle_type: 'automovil',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    license_plate: '',
    color: '',
    status: 'activo',
  });

  // Obtener vehículos
  const { data: vehiclesData, isLoading } = useQuery({
    queryKey: ['vehicles', filters],
    queryFn: async () => {
      const response = await apiClient.getVehicles(1, 100, filters);
      return Array.isArray(response.data) ? response.data : ((response.data as any)?.data || []);
    },
  });

  // Obtener propiedades para el select
  const { data: propertiesData } = useQuery({
    queryKey: ['properties', 'all'],
    queryFn: async () => {
      const response = await apiClient.getProperties(1, 100);
      return Array.isArray(response.data) ? response.data : ((response.data as any)?.data || []);
    },
  });

  // Crear vehículo
  const createMutation = useMutation({
    mutationFn: (data: CreateVehicleInput) => apiClient.createVehicle(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsModalOpen(false);
      resetForm();
      toast.success('Vehículo registrado');
    },
    onError: (error: Error) => {
      toast.error('No se pudo registrar el vehículo', { description: error.message });
    },
  });

  // Actualizar vehículo
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVehicleInput }) =>
      apiClient.updateVehicle(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setIsModalOpen(false);
      setEditingVehicle(null);
      resetForm();
      toast.success('Vehículo actualizado');
    },
    onError: (error: Error) => {
      toast.error('No se pudo actualizar el vehículo', { description: error.message });
    },
  });

  // Eliminar vehículo
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteVehicle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      toast.success('Vehículo eliminado');
    },
    onError: (error: Error) => {
      toast.error('No se pudo eliminar el vehículo', { description: error.message });
    },
  });

  const resetForm = () => {
    setFormData({
      property_id: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      license_plate: '',
      vehicle_type: 'automovil',
      color: '',
      status: 'activo',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingVehicle) {
      updateMutation.mutate({
        id: editingVehicle.id,
        data: { ...formData, id: editingVehicle.id }
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setFormData({
      property_id: vehicle.property_id,
      vehicle_type: vehicle.vehicle_type || 'automovil',
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.license_plate,
      color: vehicle.color,
      status: vehicle.status,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: '¿Eliminar este vehículo?',
      description: 'Se quitará del registro de autos del coto. Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      tone: 'danger',
    });
    if (ok) deleteMutation.mutate(id);
  };

  const vehicles = vehiclesData || [];
  const properties = propertiesData || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Vehículos</h1>
        <button
          onClick={() => {
            setEditingVehicle(null);
            resetForm();
            setIsModalOpen(true);
          }}
          className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Agregar Vehículo
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4 transition-colors">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Buscar</label>
            <input
              type="text"
              placeholder="Placas, marca o modelo..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Propiedad</label>
            <select
              value={filters.property_id || ''}
              onChange={(e) => setFilters({ ...filters, property_id: e.target.value })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Todas</option>
              {properties.map((property: Property) => (
                <option key={property.id} value={property.id}>
                  {property.street} {property.house_number}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de vehículos */}
      {!isLoading && vehicles.length === 0 ? (
        (filters.search || filters.property_id || filters.status) ? (
          <EmptyState
            icon={Search}
            title="Ningún vehículo coincide"
            description="Prueba con otras placas o quita los filtros para ver todos los autos."
          />
        ) : (
          <EmptyState
            icon={Car}
            title="Aún no hay vehículos registrados"
            description="Da de alta los autos de cada casa para llevar el control de quién entra al coto."
            actionLabel="Agregar primer vehículo"
            onAction={() => { setEditingVehicle(null); resetForm(); setIsModalOpen(true); }}
          />
        )
      ) : (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden transition-colors">
        {isLoading ? (
          <div className="p-8 text-center text-gray-600 dark:text-gray-400">Cargando...</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Placas</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tipo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Marca</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Modelo</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Año</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Color</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Propiedad</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {vehicles.map((vehicle: Vehicle) => (
                <tr key={vehicle.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap font-semibold text-gray-900 dark:text-gray-100">{vehicle.license_plate}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {vehicle.vehicle_type === 'motocicleta' ? '🏍️ Moto' : vehicle.vehicle_type === 'otro' ? 'Otro' : '🚗 Auto'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{vehicle.brand}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{vehicle.model}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{vehicle.year}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">{vehicle.color}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-100">
                    {vehicle.property ? `${vehicle.property.street} ${vehicle.property.house_number}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        vehicle.status === 'activo'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {vehicle.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleEdit(vehicle)}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(vehicle.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      )}

      {/* Modal de formulario */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              {editingVehicle ? 'Editar Vehículo' : 'Agregar Vehículo'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Propiedad *</label>
                <select
                  required
                  value={formData.property_id}
                  onChange={(e) => setFormData({ ...formData, property_id: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  disabled={!!editingVehicle}
                >
                  <option value="">Seleccionar propiedad</option>
                  {properties.map((property: Property) => (
                    <option key={property.id} value={property.id}>
                      {property.street} {property.house_number}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de vehículo *</label>
                <select
                  required
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value as any })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="automovil">Automóvil</option>
                  <option value="motocicleta">Motocicleta</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca *</label>
                <input
                  type="text"
                  required
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Modelo *</label>
                <input
                  type="text"
                  required
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Año *</label>
                <input
                  type="number"
                  required
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Placas *</label>
                <input
                  type="text"
                  required
                  value={formData.license_plate}
                  onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Color *</label>
                <input
                  type="text"
                  required
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              {editingVehicle && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                  </select>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingVehicle(null);
                    resetForm();
                  }}
                  className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-100 px-4 py-2 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Made with Bob

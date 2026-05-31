'use client';

export const runtime = 'edge';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useParams } from 'next/navigation';
import { Building2, MapPin, Users, Receipt, DollarSign, ArrowLeft, Car } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function PropertyDetailPage() {
  const params = useParams();
  const propertyId = params.id as string;

  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ['property', propertyId],
    queryFn: async () => {
      const response = await apiClient.getProperty(propertyId);
      return response.data;
    },
  });

  const { data: residents } = useQuery({
    queryKey: ['property-residents', propertyId],
    queryFn: async () => {
      const response = await apiClient.getResidentsByProperty(propertyId);
      return response.data;
    },
  });

  const { data: fees } = useQuery({
    queryKey: ['property-fees', propertyId],
    queryFn: async () => {
      const response = await apiClient.getFeesByProperty(propertyId);
      return response.data;
    },
  });

  const { data: payments } = useQuery({
    queryKey: ['property-payments', propertyId],
    queryFn: async () => {
      const response = await apiClient.getPaymentsByProperty(propertyId);
      return response.data;
    },
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['property-vehicles', propertyId],
    queryFn: async () => {
      const response = await apiClient.getVehiclesByProperty(propertyId);
      return response.data;
    },
  });

  if (propertyLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando propiedad...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Propiedad no encontrada</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    ocupada: 'bg-green-100 text-green-800',
    desocupada: 'bg-gray-100 text-gray-800',
    en_venta: 'bg-blue-100 text-blue-800',
    en_renta: 'bg-purple-100 text-purple-800',
  };

  const statusLabels: Record<string, string> = {
    ocupada: 'Ocupada',
    desocupada: 'Desocupada',
    en_venta: 'En Venta',
    en_renta: 'En Renta',
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link
        href="/dashboard/properties"
        className="inline-flex items-center text-blue-600 hover:text-blue-700"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a propiedades
      </Link>

      {/* Property Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-blue-50 rounded-lg">
              <Building2 className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Casa {property.house_number}
              </h1>
              <div className="flex items-center text-gray-600 mt-2">
                <MapPin className="h-5 w-5 mr-2" />
                {property.street}
                {property.block && ` - Manzana ${property.block}`}
              </div>
            </div>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              statusColors[property.status]
            }`}
          >
            {statusLabels[property.status]}
          </span>
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6 pt-6 border-t border-gray-200">
          {property.lot_area && (
            <div>
              <p className="text-sm text-gray-600">Área de Terreno</p>
              <p className="text-lg font-semibold text-gray-900">
                {property.lot_area}m²
              </p>
            </div>
          )}
          {property.construction_area && (
            <div>
              <p className="text-sm text-gray-600">Área de Construcción</p>
              <p className="text-lg font-semibold text-gray-900">
                {property.construction_area}m²
              </p>
            </div>
          )}
          {property.owner_name && (
            <div>
              <p className="text-sm text-gray-600">Propietario</p>
              <p className="text-lg font-semibold text-gray-900">
                {property.owner_name}
              </p>
            </div>
          )}
          {property.owner_phone && (
            <div>
              <p className="text-sm text-gray-600">Teléfono</p>
              <p className="text-lg font-semibold text-gray-900">
                {property.owner_phone}
              </p>
            </div>
          )}
        </div>

        {property.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Notas</p>
            <p className="text-gray-900">{property.notes}</p>
          </div>
        )}
      </div>

      {/* Residents */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-gray-600" />
            <h2 className="text-xl font-semibold text-gray-900">Residentes</h2>
          </div>
        </div>
        <div className="p-6">
          {residents && residents.length > 0 ? (
            <div className="space-y-4">
              {residents.map((resident: any) => (
                <div
                  key={resident.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{resident.name}</p>
                    <p className="text-sm text-gray-600 capitalize">
                      {resident.relationship}
                      {resident.is_primary && ' (Principal)'}
                    </p>
                    {resident.phone && (
                      <p className="text-sm text-gray-500 mt-1">{resident.phone}</p>
                    )}
                  </div>
                  {resident.email && (
                    <p className="text-sm text-gray-600">{resident.email}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">
              No hay residentes registrados
            </p>
          )}
        </div>
      </div>

      {/* Vehicles */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Car className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">Vehículos Registrados</h2>
            </div>
            {vehiclesData && (
              <span className="text-sm text-gray-600">
                {vehiclesData.filter((v) => v.status === 'activo').length}/4 vehículos activos
              </span>
            )}
          </div>
        </div>
        <div className="p-6">
          {vehiclesData && vehiclesData.length > 0 ? (
            <div className="space-y-4">
              {vehiclesData.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Car className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{vehicle.license_plate}</p>
                      <p className="text-sm text-gray-600">
                        {vehicle.brand} {vehicle.model} ({vehicle.year})
                      </p>
                      <p className="text-xs text-gray-500">Color: {vehicle.color}</p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                      vehicle.status === 'activo'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {vehicle.status}
                  </span>
                </div>
              ))}
              {vehiclesData.length < 4 && (
                <Link
                  href="/dashboard/vehicles"
                  className="block text-center py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                >
                  + Agregar vehículo
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No hay vehículos registrados</p>
              <Link
                href="/dashboard/vehicles"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Agregar primer vehículo
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Fees and Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Fees */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Receipt className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Cuotas Recientes
              </h2>
            </div>
          </div>
          <div className="p-6">
            {fees && fees.length > 0 ? (
              <div className="space-y-3">
                {fees.slice(0, 5).map((fee: any) => (
                  <div
                    key={fee.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {fee.period}
                      </p>
                      <p className="text-xs text-gray-500">
                        Vence: {format(new Date(fee.due_date), "d 'de' MMMM", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${fee.amount.toLocaleString()}
                      </p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          fee.status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : fee.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {fee.status === 'paid'
                          ? 'Pagada'
                          : fee.status === 'overdue'
                          ? 'Vencida'
                          : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No hay cuotas registradas
              </p>
            )}
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <DollarSign className="h-6 w-6 text-gray-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Pagos Recientes
              </h2>
            </div>
          </div>
          <div className="p-6">
            {payments && payments.length > 0 ? (
              <div className="space-y-3">
                {payments.slice(0, 5).map((payment: any) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        ${payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(payment.payment_date), "d 'de' MMMM, yyyy", {
                          locale: es,
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-600 capitalize">
                        {payment.payment_method}
                      </p>
                      {payment.reference_number && (
                        <p className="text-xs text-gray-500">
                          Ref: {payment.reference_number}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 py-8">
                No hay pagos registrados
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Made with Bob

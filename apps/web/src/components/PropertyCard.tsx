import Link from 'next/link';
import { Building2, MapPin, Users } from 'lucide-react';
import type { Property } from '@/types';

interface PropertyCardProps {
  property: Property;
}

const statusColors: Record<Property['status'], string> = {
  ocupada: 'bg-green-100 text-green-800',
  desocupada: 'bg-gray-100 text-gray-800',
  en_venta: 'bg-blue-100 text-blue-800',
  en_renta: 'bg-purple-100 text-purple-800',
};

const statusLabels: Record<Property['status'], string> = {
  ocupada: 'Ocupada',
  desocupada: 'Desocupada',
  en_venta: 'En Venta',
  en_renta: 'En Renta',
};

export function PropertyCard({ property }: PropertyCardProps) {
  return (
    <Link href={`/dashboard/properties/${property.id}`}>
      <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6 cursor-pointer">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Casa {property.house_number}
              </h3>
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <MapPin className="h-4 w-4 mr-1" />
                {property.street}
              </div>
            </div>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              statusColors[property.status]
            }`}
          >
            {statusLabels[property.status]}
          </span>
        </div>

        {property.owner_name && (
          <div className="flex items-center text-sm text-gray-600 mb-2">
            <Users className="h-4 w-4 mr-2" />
            <span>{property.owner_name}</span>
          </div>
        )}

        {(property.lot_area || property.construction_area) && (
          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
            {property.lot_area && (
              <div>
                <span className="font-medium">Terreno:</span> {property.lot_area}m²
              </div>
            )}
            {property.construction_area && (
              <div>
                <span className="font-medium">Construcción:</span>{' '}
                {property.construction_area}m²
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}

// Made with Bob

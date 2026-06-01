'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  Camera,
  Plus,
  X,
  Edit,
  Trash2,
  MapPin,
  Wifi,
  Smartphone,
  Info,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  activa: 'Activa',
  inactiva: 'Inactiva',
  mantenimiento: 'En mantenimiento',
  offline: 'Sin conexión',
};

const STATUS_COLORS: Record<string, string> = {
  activa: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  inactiva: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  mantenimiento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

export default function CamarasPage() {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['cameras'],
    queryFn: () => apiClient.getCameras(),
  });
  const cameras: any[] = (data?.data || []) as any[];

  const isAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Camera className="h-7 w-7" />
            Cámaras
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Inventario de cámaras del fraccionamiento
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Agregar cámara
          </button>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-700 dark:text-gray-300">
          <p className="font-medium mb-1">Visualización en vivo</p>
          <p>
            Las cámaras Dahua usan la app oficial <strong>DMSS</strong> para visualizar en tiempo real.
            Para integrar streaming en este panel se requiere instalar un Cloudflare Tunnel
            en la red del condominio. Por ahora este módulo funciona como inventario.
          </p>
        </div>
      </div>

      {isLoading && <p className="text-gray-500">Cargando...</p>}

      {!isLoading && cameras.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No hay cámaras registradas</h3>
          {isAdmin && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Agrega la primera con el botón de arriba.
            </p>
          )}
        </div>
      )}

      {!isLoading && cameras.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cameras.map((cam) => (
            <div key={cam.id} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
              <div className="aspect-video bg-gray-200 dark:bg-gray-900 flex items-center justify-center relative">
                <Camera className="h-12 w-12 text-gray-400 dark:text-gray-600" />
                <span className={`absolute top-2 right-2 px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[cam.status] || ''}`}>
                  {STATUS_LABELS[cam.status] || cam.status}
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{cam.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {cam.location}
                    </p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditing(cam); setShowModal(true); }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">{cam.brand}</span>
                    {cam.model && <span>· {cam.model}</span>}
                  </div>
                  {cam.channel && (
                    <div>Canal: {cam.channel}</div>
                  )}
                  {cam.ip_address && (
                    <div className="flex items-center gap-1">
                      <Wifi className="h-3 w-3" />
                      <code className="font-mono">{cam.ip_address}</code>
                    </div>
                  )}
                </div>
                <a
                  href="https://www.dahuasecurity.com/products/All-Products/Software/Mobile-Application/DMSS"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded text-sm text-gray-700 dark:text-gray-200"
                >
                  <Smartphone className="h-4 w-4" />
                  Ver en DMSS
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <CameraModal
          camera={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function CameraModal({ camera, onClose }: { camera: any | null; onClose: () => void }) {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const isEditing = !!camera;

  const mut = useMutation({
    mutationFn: (data: any) => isEditing ? apiClient.updateCamera(camera.id, data) : apiClient.createCamera(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] });
      toast.success(isEditing ? 'Cámara actualizada' : 'Cámara agregada');
      onClose();
    },
    onError: (e: Error) => toast.error('No se pudo guardar', { description: e.message }),
  });

  const deleteMut = useMutation({
    mutationFn: () => apiClient.deleteCamera(camera.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cameras'] });
      toast.success('Cámara eliminada');
      onClose();
    },
    onError: (e: Error) => toast.error('No se pudo eliminar', { description: e.message }),
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    mut.mutate({
      name: fd.get('name'),
      location: fd.get('location'),
      brand: fd.get('brand'),
      model: fd.get('model') || null,
      serial_number: fd.get('serial_number') || null,
      channel: fd.get('channel') ? Number(fd.get('channel')) : null,
      ip_address: fd.get('ip_address') || null,
      status: fd.get('status'),
      notes: fd.get('notes') || null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar cámara' : 'Nueva cámara'}
          </h2>
          <button onClick={onClose} className="text-gray-400"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lblCls}>Nombre *</label>
              <input name="name" required defaultValue={camera?.name} className={inputCls} placeholder="Acceso principal" />
            </div>
            <div>
              <label className={lblCls}>Ubicación *</label>
              <input name="location" required defaultValue={camera?.location} className={inputCls} placeholder="Entrada / Terraza / etc" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lblCls}>Marca</label>
              <select name="brand" defaultValue={camera?.brand || 'Dahua'} className={inputCls}>
                <option value="Dahua">Dahua</option>
                <option value="Hikvision">Hikvision</option>
                <option value="UniFi">UniFi</option>
                <option value="Reolink">Reolink</option>
                <option value="Otros">Otros</option>
              </select>
            </div>
            <div>
              <label className={lblCls}>Estado</label>
              <select name="status" defaultValue={camera?.status || 'activa'} className={inputCls}>
                <option value="activa">Activa</option>
                <option value="inactiva">Inactiva</option>
                <option value="mantenimiento">En mantenimiento</option>
                <option value="offline">Sin conexión</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lblCls}>Modelo</label>
              <input name="model" defaultValue={camera?.model || ''} className={inputCls} placeholder="IPC-HFW2230S" />
            </div>
            <div>
              <label className={lblCls}>Canal (NVR)</label>
              <input type="number" name="channel" defaultValue={camera?.channel || ''} min="1" className={inputCls} placeholder="1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lblCls}>N° de serie</label>
              <input name="serial_number" defaultValue={camera?.serial_number || ''} className={inputCls} />
            </div>
            <div>
              <label className={lblCls}>IP local (opcional)</label>
              <input name="ip_address" defaultValue={camera?.ip_address || ''} className={inputCls} placeholder="192.168.1.108" />
            </div>
          </div>
          <div>
            <label className={lblCls}>Notas</label>
            <textarea name="notes" defaultValue={camera?.notes || ''} rows={2} className={inputCls} />
          </div>

          <div className="flex justify-between items-center pt-3 border-t border-gray-200 dark:border-gray-700">
            {isEditing && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await confirm({
                    title: `¿Eliminar la cámara "${camera.name}"?`,
                    description: 'Se quitará del inventario. Esta acción no se puede deshacer.',
                    confirmText: 'Sí, eliminar',
                    tone: 'danger',
                  });
                  if (ok) deleteMut.mutate();
                }}
                disabled={deleteMut.isPending}
                className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </button>
            )}
            <div className="ml-auto flex gap-2">
              <button type="button" onClick={onClose} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded">Cancelar</button>
              <button type="submit" disabled={mut.isPending} className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50">
                {mut.isPending ? 'Guardando...' : isEditing ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm';
const lblCls = 'block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1';

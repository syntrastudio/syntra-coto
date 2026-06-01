'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { KeyRound, Trash2, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  listPasskeys,
  registerPasskey,
  deletePasskey,
  passkeySupported,
  type PasskeyRecord,
} from '@/lib/passkey';

export function PasskeysSection() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(passkeySupported());
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['my-passkeys'],
    queryFn: listPasskeys,
  });

  const register = useMutation({
    mutationFn: () => registerPasskey(),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['my-passkeys'] });
      toast.success('Dispositivo registrado', { description: `Ya puedes entrar con ${r.device_name}.` });
    },
    onError: (e: Error) => {
      const msg = e.message || '';
      if (/cancel|abort|NotAllowedError/i.test(msg)) return;
      toast.error('No se pudo registrar el dispositivo', { description: msg });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => deletePasskey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-passkeys'] });
      toast.success('Dispositivo eliminado');
    },
    onError: (e: Error) => toast.error('No se pudo eliminar', { description: e.message }),
  });

  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> Mis passkeys
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Inicia sesión con biometría (Face ID, Touch ID, Windows Hello) sin contraseña.
          </p>
        </div>
        {supported && (
          <button
            onClick={() => register.mutate()}
            disabled={register.isPending}
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {register.isPending ? 'Registrando...' : 'Agregar este dispositivo'}
          </button>
        )}
      </div>

      {!supported && (
        <p className="text-sm text-amber-600 dark:text-amber-400">
          Tu navegador no soporta passkeys. Prueba con Safari, Chrome, Edge o Firefox actualizado.
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Cargando...</p>
      ) : (data || []).length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 py-3">
          No tienes passkeys registradas todavía.
        </p>
      ) : (
        <div className="space-y-2">
          {(data || []).map((pk: PasskeyRecord) => (
            <div key={pk.id} className="flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-3">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{pk.device_name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Registrada {format(new Date(pk.created_at * 1000), "d 'de' MMM yyyy", { locale: es })}
                  {pk.last_used_at && (
                    <> · Último uso {format(new Date(pk.last_used_at * 1000), "d 'de' MMM", { locale: es })}</>
                  )}
                </p>
              </div>
              <button
                onClick={async () => {
                  const ok = await confirm({
                    title: '¿Quitar este dispositivo?',
                    description: `Ya no podrás entrar con "${pk.device_name}". Podrás volver a registrarlo cuando quieras.`,
                    confirmText: 'Sí, quitar',
                    tone: 'danger',
                  });
                  if (ok) remove.mutate(pk.id);
                }}
                className="text-red-600 hover:text-red-800"
                title="Eliminar"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

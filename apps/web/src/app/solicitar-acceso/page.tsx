'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { STREETS } from '@/lib/streets';
import { CheckCircle2, Building2 } from 'lucide-react';

export default function SolicitarAccesoPage() {
  const [done, setDone] = useState(false);
  const [street, setStreet] = useState('');
  const [houseNumber, setHouseNumber] = useState('');

  const { data: streetsResp } = useQuery({
    queryKey: ['public-streets'],
    queryFn: () => apiClient.getPublicStreets(),
    retry: 1,
  });
  // Lista canónica (la misma del formulario "crear casa") + cualquier calle
  // extra que ya exista en la BD, sin duplicados.
  const streets = Array.from(new Set<string>([...STREETS, ...(streetsResp?.data || [])]));

  const mut = useMutation({
    mutationFn: (data: any) => apiClient.submitAccessRequest(data),
    onSuccess: (resp: any) => { setDone(true); toast.success(resp?.message || '¡Gracias! Te contactaremos.'); },
    onError: (e: Error) => toast.error('No se pudo enviar', { description: e.message }),
  });

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const full_name = String(fd.get('full_name') || '').trim();
    const email = String(fd.get('email') || '').trim();
    if (!full_name || !email) { toast.error('Pon tu nombre y correo'); return; }

    // Componer "Tu casa": calle (del droplist) + número.
    const num = houseNumber.trim();
    const house_label = street ? (num ? `${street} ${num}` : street) : undefined;

    mut.mutate({
      full_name, email,
      phone: String(fd.get('phone') || '') || undefined,
      house_label,
      message: String(fd.get('message') || '') || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Paseo Coto Tonalá</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Portal de vecinos</p>
        </div>

        {done ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">¡Solicitud enviada!</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              La mesa directiva revisará tus datos y te dará acceso al portal por correo. Gracias por participar.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿Quieres probar el portal del fraccionamiento? Déjanos tus datos y la mesa te dará acceso para consultar tu estado de cuenta, pagos, apartar la terraza y más.
            </p>
            <div>
              <label className={lbl}>Nombre completo *</label>
              <input name="full_name" required className={inp} placeholder="Tu nombre" />
            </div>
            <div>
              <label className={lbl}>Correo electrónico *</label>
              <input name="email" type="email" required className={inp} placeholder="tucorreo@ejemplo.com" />
            </div>
            <div>
              <label className={lbl}>Teléfono</label>
              <input name="phone" className={inp} placeholder="33 1234 5678" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Tu calle</label>
                <select value={street} onChange={(e) => setStreet(e.target.value)} className={inp}>
                  <option value="">Selecciona tu calle…</option>
                  {streets.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={lbl}>Número</label>
                <input
                  value={houseNumber}
                  onChange={(e) => setHouseNumber(e.target.value)}
                  inputMode="numeric"
                  className={inp}
                  placeholder="116"
                />
              </div>
            </div>
            <div>
              <label className={lbl}>Mensaje (opcional)</label>
              <textarea name="message" rows={2} className={inp} placeholder="¿Algo que quieras decirle a la mesa?" />
            </div>
            <button type="submit" disabled={mut.isPending} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50">
              {mut.isPending ? 'Enviando…' : 'Solicitar acceso'}
            </button>
            <p className="text-xs text-center text-gray-400">Tus datos solo los usa la administración del fraccionamiento.</p>
          </form>
        )}
      </div>
    </div>
  );
}

const inp = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const lbl = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

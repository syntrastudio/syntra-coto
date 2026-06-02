'use client';

export const runtime = 'edge';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth-context';
import { apiClient } from '@/lib/api-client';
import { registerPasskey, passkeySupported } from '@/lib/passkey';
import { Lock, KeyRound, CheckCircle2, ShieldCheck, Fingerprint } from 'lucide-react';

const inp =
  'w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';

export default function BienvenidoPage() {
  const { user, isLoading, refetchUser } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<'password' | 'passkey'>('password');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [pkLoading, setPkLoading] = useState(false);
  const supported = typeof window !== 'undefined' && passkeySupported();

  const portal = () => (user?.role === 'resident' ? '/resident' : '/dashboard');

  // Guardas: sin sesión → login. Si ya no debe cambiar (y aún no entra al flujo) → portal.
  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!user.must_change_password && step === 'password') {
      router.replace(portal());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user, step]);

  const goToPortal = async () => {
    await refetchUser();
    router.push(portal());
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      toast.error('Mínimo 8 caracteres, una mayúscula y un número');
      return;
    }
    setSaving(true);
    try {
      const r = await apiClient.setInitialPassword(password);
      if (!r.success) throw new Error((r as any).error || 'Error');
      toast.success('Contraseña establecida');
      setStep('passkey'); // NO refetch aquí, para no disparar la guarda.
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const addPasskey = async () => {
    setPkLoading(true);
    try {
      await registerPasskey();
      toast.success('¡Passkey configurada! La próxima vez entras sin contraseña.');
      await goToPortal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error';
      if (!/cancel|abort|NotAllowedError/i.test(msg)) toast.error(msg);
    } finally {
      setPkLoading(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <p className="text-gray-500">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4 py-10">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center mb-3">
            <ShieldCheck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Hola, {user.full_name?.split(' ')[0] || 'vecino'}
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {step === 'password' ? (
            <form onSubmit={savePassword} className="space-y-5">
              <div className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
                <Lock className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold">Crea tu contraseña</h2>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Por seguridad, define tu propia contraseña antes de entrar. La temporal dejará de funcionar.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nueva contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inp}
                  placeholder="••••••••"
                  disabled={saving}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Mínimo 8 caracteres, una mayúscula y un número.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Confirmar contraseña</label>
                <input
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={inp}
                  placeholder="••••••••"
                  disabled={saving}
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
              >
                {saving ? 'Guardando…' : 'Guardar y continuar'}
              </button>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">¡Contraseña lista!</h2>

              {supported ? (
                <>
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 text-left">
                    <div className="flex items-center gap-2 mb-1">
                      <Fingerprint className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-900 dark:text-gray-100">Una cosa más, súper recomendada</span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Configura una <strong>passkey</strong>: entras con tu <strong>huella o Face ID</strong>, sin teclear
                      contraseñas. Es <strong>más segura y más rápida</strong>, y no se te puede olvidar.
                    </p>
                  </div>
                  <button
                    onClick={addPasskey}
                    disabled={pkLoading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg disabled:opacity-50"
                  >
                    <KeyRound className="h-4 w-4" />
                    {pkLoading ? 'Esperando…' : 'Configurar passkey'}
                  </button>
                  <button
                    onClick={goToPortal}
                    className="w-full text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Más tarde, entrar al portal
                  </button>
                </>
              ) : (
                <button
                  onClick={goToPortal}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg"
                >
                  Entrar al portal
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

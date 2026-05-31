'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import Link from 'next/link';
import { Mail, Phone, KeyRound } from 'lucide-react';
import { authenticateWithPasskey, passkeySupported } from '@/lib/passkey';

type LoginMode = 'email' | 'phone';

export default function LoginPage() {
  const [mode, setMode] = useState<LoginMode>('email');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [supported, setSupported] = useState(false);
  const { login, refetchUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setSupported(passkeySupported());
  }, []);

  const handlePasskey = async () => {
    setPasskeyLoading(true);
    try {
      // Si el usuario escribió un email, lo usamos para filtrar credenciales del lado del server
      const emailHint = mode === 'email' && identifier ? identifier : undefined;
      const result = await authenticateWithPasskey(emailHint);
      toast.success('¡Bienvenido!');
      await refetchUser();
      router.push(result.user.role === 'resident' ? '/resident' : '/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error con passkey';
      // Si el usuario cancela el diálogo, no es un error real
      if (!/cancel|abort|NotAllowedError/i.test(msg)) toast.error(msg);
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login({ identifier, password });
      toast.success('¡Bienvenido!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al iniciar sesión');
    } finally {
      setIsLoading(false);
    }
  };

  const isEmail = mode === 'email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
              Paseo Coto Tonalá
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Portal de Administración</p>
          </div>

          {/* Tab switcher */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg mb-6">
            <button
              type="button"
              onClick={() => { setMode('email'); setIdentifier(''); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'email'
                  ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Mail className="h-4 w-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => { setMode('phone'); setIdentifier(''); }}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                mode === 'phone'
                  ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-400 shadow'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              <Phone className="h-4 w-4" />
              Teléfono
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {isEmail ? 'Correo electrónico' : 'Teléfono (10 dígitos)'}
              </label>
              <input
                id="identifier"
                type={isEmail ? 'email' : 'tel'}
                inputMode={isEmail ? 'email' : 'numeric'}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                pattern={isEmail ? undefined : '[0-9]{10}'}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder={isEmail ? 'admin@coto.com' : '3312345678'}
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>

            <div className="text-center text-sm">
              <Link
                href="/forgot-password"
                className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </form>

          {supported && (
            <>
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">o</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handlePasskey}
                disabled={passkeyLoading}
                className="w-full flex items-center justify-center gap-2 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              >
                <KeyRound className="h-4 w-4" />
                {passkeyLoading ? 'Esperando...' : 'Ingresar con passkey'}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} Paseo Coto Tonalá
        </p>
      </div>
    </div>
  );
}

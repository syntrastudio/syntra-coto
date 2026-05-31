/**
 * Cliente para passkeys / WebAuthn.
 * Envuelve @simplewebauthn/browser y los endpoints /api/auth/passkey/*.
 */

import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from '@simplewebauthn/browser';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://syntra-coto-api.lcdla-scheduler.workers.dev';

export interface PasskeyRecord {
  id: string;
  device_name: string;
  transports: string | null;
  backed_up: number;
  created_at: number;
  last_used_at: number | null;
}

export interface PasskeyAuthResult {
  user: { id: string; email: string; full_name: string; role: string; status: string };
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

function getCookieToken(): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(/(?:^|; )syntra_token=([^;]+)/);
  return m && m[1] ? decodeURIComponent(m[1]) : undefined;
}

async function api<T>(path: string, body?: any, withAuth = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (withAuth) {
    const t = getCookieToken();
    if (t) headers['Authorization'] = `Bearer ${t}`;
  }
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body || {}),
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data as any)?.error || 'Error');
  return (data as any).data as T;
}

export function passkeySupported(): boolean {
  return typeof window !== 'undefined' && browserSupportsWebAuthn();
}

export async function registerPasskey(deviceName?: string): Promise<{ device_name: string }> {
  if (!passkeySupported()) throw new Error('Este navegador no soporta passkeys');
  const options = await api<any>('/api/auth/passkey/register/begin', {}, true);
  // @simplewebauthn/browser v10+ requiere envolver en { optionsJSON }
  const credential = await startRegistration({ optionsJSON: options });
  return api<{ device_name: string }>(
    '/api/auth/passkey/register/finish',
    { credential, device_name: deviceName },
    true
  );
}

export async function authenticateWithPasskey(email?: string): Promise<PasskeyAuthResult> {
  if (!passkeySupported()) throw new Error('Este navegador no soporta passkeys');
  const options = await api<any>('/api/auth/passkey/authenticate/begin', { email });
  const credential = await startAuthentication({ optionsJSON: options });
  const result = await api<PasskeyAuthResult>('/api/auth/passkey/authenticate/finish', { credential });

  // Guardar el token como hace api-client.login()
  if (typeof document !== 'undefined') {
    const days = 7;
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `syntra_token=${encodeURIComponent(result.access_token)}; expires=${expires}; path=/; SameSite=Lax`;
  }
  return result;
}

export async function listPasskeys(): Promise<PasskeyRecord[]> {
  const t = getCookieToken();
  const r = await fetch(`${API}/api/auth/passkey`, {
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  const data = await r.json();
  if (!r.ok) throw new Error((data as any)?.error || 'Error');
  return ((data as any).data || []) as PasskeyRecord[];
}

export async function deletePasskey(id: string): Promise<void> {
  const t = getCookieToken();
  const r = await fetch(`${API}/api/auth/passkey/${id}`, {
    method: 'DELETE',
    headers: t ? { Authorization: `Bearer ${t}` } : {},
  });
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    throw new Error((data as any)?.error || 'Error');
  }
}

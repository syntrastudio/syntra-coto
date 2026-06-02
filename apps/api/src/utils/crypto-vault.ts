/**
 * Cifrado simétrico (AES-GCM) para secretos en reposo — p. ej. el access token
 * de Mercado Pago. La clave se deriva de JWT_SECRET con HKDF-SHA256 y una sal de
 * dominio, para no introducir un secreto nuevo en el Worker y poder cifrar desde
 * el primer minuto.
 *
 * Formato del texto cifrado:  "v1:" + base64( iv(12 bytes) || ciphertext+tag )
 * El prefijo de versión permite rotar el esquema en el futuro.
 *
 * NOTA DE ROBUSTEZ: si JWT_SECRET rota, los secretos cifrados con la clave
 * anterior dejarán de poder descifrarse (habría que volver a capturar la cuenta
 * de MP, lo cual de todos modos pasa por la firma de la mesa). Para máxima
 * robustez se puede migrar a un secreto dedicado `MP_ENCRYPTION_KEY`.
 */

const VERSION = 'v1';
const SALT = new TextEncoder().encode('syntra-coto::gateway-vault::v1');
const INFO = new TextEncoder().encode('mercadopago-credentials');

async function deriveKey(masterSecret: string): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(masterSecret),
    'HKDF',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: SALT, info: INFO },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function toBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function encryptSecret(plaintext: string, masterSecret: string): Promise<string> {
  if (!masterSecret) throw new Error('Falta JWT_SECRET para cifrar credenciales');
  const key = await deriveKey(masterSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(plaintext)
    )
  );
  const packed = new Uint8Array(iv.length + ct.length);
  packed.set(iv, 0);
  packed.set(ct, iv.length);
  return `${VERSION}:${toBase64(packed)}`;
}

export async function decryptSecret(blob: string, masterSecret: string): Promise<string> {
  if (!masterSecret) throw new Error('Falta JWT_SECRET para descifrar credenciales');
  if (!blob) throw new Error('No hay dato cifrado');
  const idx = blob.indexOf(':');
  const ver = idx >= 0 ? blob.slice(0, idx) : '';
  const payload = idx >= 0 ? blob.slice(idx + 1) : '';
  if (ver !== VERSION || !payload) throw new Error('Formato de cifrado no reconocido');
  const key = await deriveKey(masterSecret);
  const packed = fromBase64(payload);
  const iv = packed.slice(0, 12);
  const ct = packed.slice(12);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/** Vista enmascarada de un token para mostrar en UI (nunca el valor completo). */
export function maskToken(token: string): string {
  if (!token) return '';
  const clean = token.trim();
  if (clean.length <= 12) return '••••';
  return `${clean.slice(0, 8)}••••${clean.slice(-4)}`;
}

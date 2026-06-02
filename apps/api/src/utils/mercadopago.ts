/**
 * Cliente mínimo de Mercado Pago basado en `fetch` (sin SDK), apto para
 * Cloudflare Workers. Cubre lo necesario para:
 *   - Validar credenciales e identificar la cuenta receptora (/users/me).
 *   - (Fase C) Crear preferencias de Checkout Pro, leer pagos y validar webhooks.
 */

const MP_API = 'https://api.mercadopago.com';

export interface MpAccount {
  id: string; // collector_id (user id de MP)
  nickname?: string;
  email?: string;
  site_id?: string; // MLM = México
  first_name?: string;
  last_name?: string;
}

/**
 * Valida el access token consultando /users/me y devuelve la identidad de la
 * cuenta. Lanza un error con `statusCode` si el token es inválido.
 */
export async function mpGetMe(accessToken: string): Promise<MpAccount> {
  const resp = await fetch(`${MP_API}/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    if (resp.status === 401 || resp.status === 403) {
      const err: any = new Error('El access token de Mercado Pago no es válido o no tiene permisos.');
      err.statusCode = 400;
      throw err;
    }
    const err: any = new Error(`Mercado Pago respondió ${resp.status}: ${body.slice(0, 200)}`);
    err.statusCode = 502;
    throw err;
  }

  const data = await resp.json<any>();
  return {
    id: String(data.id),
    nickname: data.nickname,
    email: data.email,
    site_id: data.site_id,
    first_name: data.first_name,
    last_name: data.last_name,
  };
}

/** Deduce el modo (test/live) a partir del prefijo del access token. */
export function inferMode(accessToken: string): 'test' | 'live' {
  return accessToken.trim().startsWith('TEST-') ? 'test' : 'live';
}

export interface CardFees {
  commission_pct: number; // ej. 3.19
  fixed_fee: number; // ej. 4 (MXN)
  iva_pct: number; // ej. 16
}

/**
 * Calcula el monto a cobrar con tarjeta (gross-up) para que, tras la comisión de
 * Mercado Pago, el fraccionamiento reciba EXACTAMENTE `net`.
 *
 *   comisión_total = (commission% × cargo + fixed) × (1 + iva%)
 *   cargo          = (net + fixed×(1+iva)) / (1 − commission×(1+iva))
 *
 * Devuelve el cargo redondeado a 2 decimales, la comisión y el neto resultante.
 */
export function grossUpCardCharge(net: number, fees: CardFees): { charge: number; fee: number; net: number } {
  const rate = (fees.commission_pct || 0) / 100;
  const iva = (fees.iva_pct || 0) / 100;
  const fixed = fees.fixed_fee || 0;
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const denom = 1 - rate * (1 + iva);
  if (denom <= 0) {
    // Configuración inválida (comisión absurda): no aplicar gross-up.
    return { charge: round2(net), fee: 0, net: round2(net) };
  }
  const charge = (net + fixed * (1 + iva)) / denom;
  const fee = (rate * charge + fixed) * (1 + iva);
  return { charge: round2(charge), fee: round2(fee), net: round2(charge - fee) };
}

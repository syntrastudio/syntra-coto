/**
 * "Click para WhatsApp": abre WhatsApp con el número y un mensaje listo.
 * No envía nada solo — el admin da "enviar". Gratis y sin riesgo de baneo.
 */

/** Normaliza un teléfono mexicano a formato internacional para wa.me. */
export function normalizePhoneMx(phone: string): string | null {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('52') && digits.length >= 12) return digits;        // ya trae 52
  if (digits.length === 10) return `52${digits}`;                            // 10 dígitos → +52
  if (digits.length === 12 && digits.startsWith('52')) return digits;
  if (digits.length >= 11 && digits.startsWith('1')) return `52${digits.slice(1)}`;
  return digits; // fallback: lo que haya
}

/** Devuelve el link wa.me con mensaje opcional, o null si no hay teléfono válido. */
export function whatsappLink(phone: string, message?: string): string | null {
  const num = normalizePhoneMx(phone);
  if (!num) return null;
  const text = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${num}${text}`;
}

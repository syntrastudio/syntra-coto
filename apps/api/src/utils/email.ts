/**
 * Envío de correo electrónico vía Resend (https://resend.com).
 *
 * Secrets requeridos:
 *   - RESEND_API_KEY  — API key de Resend
 *   - EMAIL_FROM      — Remitente verificado (ej: "Paseo Coto Tonalá <no-reply@syntrastudio.dev>")
 *   - APP_URL         — URL pública del frontend (para CTAs y reset links)
 *
 * Si los secrets no están configurados, las funciones registran un warning
 * y devuelven `skipped: true` sin lanzar.
 */

export interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  skipped?: boolean;
  reason?: string;
  id?: string;
}

export async function sendEmail(
  env: { RESEND_API_KEY?: string; EMAIL_FROM?: string },
  args: SendEmailArgs
): Promise<SendEmailResult> {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn('[email] RESEND_API_KEY o EMAIL_FROM no configurados; envío omitido');
    return { sent: false, skipped: true, reason: 'EMAIL_NOT_CONFIGURED' };
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
    }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.error('[email] Resend error', resp.status, body);
    return { sent: false, reason: `RESEND_${resp.status}` };
  }

  const data = await resp.json<{ id: string }>();
  return { sent: true, id: data.id };
}

// ============================================================================
// LAYOUT BASE — todas las plantillas heredan este wrapper
// ============================================================================

interface LayoutArgs {
  title: string;
  preheader?: string;
  content: string;
  cta?: { label: string; href: string };
  contactPhone?: string;
}

function emailLayout(args: LayoutArgs): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(args.title)}</title>
</head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f4f6f9;color:#1f2937;">
  ${args.preheader ? `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${escapeHtml(args.preheader)}</div>` : ''}
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color:#f4f6f9;padding:40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.06);">

          <tr>
            <td style="padding:32px 40px 24px;background:linear-gradient(135deg,#1e40af 0%,#3b82f6 100%);color:#ffffff;text-align:center;">
              <div style="font-size:14px;letter-spacing:1.5px;text-transform:uppercase;opacity:0.9;margin-bottom:6px;">Paseo Coto Tonalá</div>
              <h1 style="margin:0;font-size:24px;font-weight:600;">${escapeHtml(args.title)}</h1>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 40px 16px;">
              ${args.content}
              ${
                args.cta
                  ? `<div style="text-align:center;margin:28px 0;">
                       <a href="${args.cta.href}" style="display:inline-block;background-color:#1e40af;color:#ffffff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;font-size:15px;">${escapeHtml(args.cta.label)}</a>
                     </div>`
                  : ''
              }
            </td>
          </tr>

          <tr>
            <td style="padding:20px 40px;background-color:#f9fafb;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;line-height:1.5;">
              ${args.contactPhone ? `Administración: <strong>${escapeHtml(args.contactPhone)}</strong><br>` : ''}
              Paseo Coto Tonalá · Calle Jilguero Sur 200, Tonalá, Jalisco<br>
              <span style="color:#9ca3af;">Este correo se generó automáticamente. No respondas a este mensaje.</span>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================================================
// PLANTILLAS TIER 1
// ============================================================================

/**
 * 1) Bienvenida con credenciales (cuando se crea un usuario nuevo).
 */
export function welcomeEmailHTML(args: {
  full_name: string;
  email: string;
  temp_password: string;
  login_url: string;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Te damos la bienvenida al portal del fraccionamiento Paseo Coto Tonalá.
      Ya puedes ingresar para consultar tu estado de cuenta, historial de pagos y vehículos registrados.
    </p>
    ${credentialsBox(args.email, args.temp_password)}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:20px;">
      <strong style="color:#dc2626;">Importante:</strong> Por seguridad, cambia tu contraseña en cuanto ingreses.
      Si tú no solicitaste esta cuenta, ignora este correo.
    </p>
  `;
  return emailLayout({
    title: 'Bienvenido al portal',
    preheader: `Hola ${args.full_name}, tu cuenta está lista`,
    content,
    cta: { label: 'Ingresar al portal', href: args.login_url },
    contactPhone: args.contact_phone,
  });
}

/**
 * 2) Reset de contraseña hecho por un admin.
 */
export function passwordResetByAdminHTML(args: {
  full_name: string;
  email: string;
  temp_password: string;
  login_url: string;
  admin_name?: string;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      ${args.admin_name ? `<strong>${escapeHtml(args.admin_name)}</strong> restableció tu contraseña.` : 'Un administrador restableció tu contraseña.'}
      A continuación encuentras tu nuevo acceso. Por seguridad, cambia esta contraseña apenas ingreses.
    </p>
    ${credentialsBox(args.email, args.temp_password)}
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:20px;">
      <strong style="color:#dc2626;">¿No solicitaste este cambio?</strong> Contacta de inmediato a la administración.
    </p>
  `;
  return emailLayout({
    title: 'Tu contraseña fue restablecida',
    preheader: 'Un administrador restableció tu contraseña',
    content,
    cta: { label: 'Ingresar al portal', href: args.login_url },
    contactPhone: args.contact_phone,
  });
}

/**
 * 3) Olvidé mi contraseña — link con token.
 */
export function passwordResetRequestHTML(args: {
  full_name: string;
  reset_url: string;
  expires_minutes: number;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Recibimos una solicitud para restablecer tu contraseña. Haz click en el botón para establecer una nueva.
      Este enlace expira en <strong>${args.expires_minutes} minutos</strong> y solo puede usarse una vez.
    </p>
    <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:20px 0;font-size:13px;color:#92400e;">
      Si tú no solicitaste el cambio, ignora este correo. Tu contraseña actual seguirá funcionando.
    </div>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:20px;">
      ¿Problemas con el botón? Copia y pega esta URL en tu navegador:<br>
      <span style="word-break:break-all;color:#1e40af;">${escapeHtml(args.reset_url)}</span>
    </p>
  `;
  return emailLayout({
    title: 'Restablece tu contraseña',
    preheader: 'Enlace para crear una nueva contraseña',
    content,
    cta: { label: 'Restablecer mi contraseña', href: args.reset_url },
    contactPhone: args.contact_phone,
  });
}

/**
 * 4) Notificación de que la contraseña fue cambiada (medida de seguridad).
 */
export function passwordChangedNoticeHTML(args: {
  full_name: string;
  changed_at: Date;
  ip_address?: string;
  by_admin?: boolean;
  contact_phone?: string;
}): string {
  const dt = args.changed_at.toLocaleString('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  });
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Te confirmamos que ${args.by_admin ? 'un administrador cambió' : 'cambiaste'} tu contraseña.
    </p>
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin:20px 0;font-size:14px;">
      <p style="margin:0 0 6px;"><strong>Fecha:</strong> ${escapeHtml(dt)}</p>
      ${args.ip_address ? `<p style="margin:0;"><strong>IP:</strong> ${escapeHtml(args.ip_address)}</p>` : ''}
    </div>
    <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#dc2626;border-top:1px solid #e5e7eb;padding-top:20px;">
      <strong>¿No fuiste tú?</strong> Tu cuenta podría estar comprometida. Contacta de inmediato a la administración para revisarla.
    </p>
  `;
  return emailLayout({
    title: 'Contraseña actualizada',
    preheader: 'Tu contraseña acaba de cambiar',
    content,
    contactPhone: args.contact_phone,
  });
}

// ============================================================================
// TIER 2 — COBRANZA
// ============================================================================

/**
 * 5) Recibo de pago. Se manda al residente cuando se registra un pago.
 */
export function paymentReceiptHTML(args: {
  full_name: string;
  folio: string;
  amount: number;
  payment_method: string;
  payment_date: Date;
  property_address: string;
  notes?: string;
  fees_covered?: string[]; // periodos liquidados
  remaining_balance?: number;
  contact_phone?: string;
}): string {
  const methodLabels: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    check: 'Cheque',
    card: 'Tarjeta',
    stripe: 'Stripe',
    mercadopago: 'Mercado Pago',
  };
  const dateStr = args.payment_date.toLocaleDateString('es-MX', {
    dateStyle: 'long',
    timeZone: 'America/Mexico_City',
  });
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Confirmamos la recepción de tu pago. Este correo sirve como comprobante.
    </p>
    <div style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#15803d;letter-spacing:1.5px;text-transform:uppercase;">Folio</p>
      <p style="margin:6px 0 0;font-size:22px;font-weight:700;color:#15803d;font-family:'SF Mono',Menlo,Consolas,monospace;">${escapeHtml(args.folio)}</p>
    </div>
    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Propiedad:</td>
        <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;font-weight:500;">${escapeHtml(args.property_address)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Fecha:</td>
        <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${escapeHtml(dateStr)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Método:</td>
        <td style="padding:8px 0;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${escapeHtml(methodLabels[args.payment_method] || args.payment_method)}</td>
      </tr>
      <tr>
        <td style="padding:12px 0;font-size:16px;color:#374151;font-weight:600;">Total pagado:</td>
        <td style="padding:12px 0;font-size:22px;color:#15803d;text-align:right;font-weight:700;">$${args.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>
    </table>
    ${
      args.fees_covered && args.fees_covered.length > 0
        ? `<div style="background-color:#f9fafb;border-radius:6px;padding:14px;margin:16px 0;font-size:13px;color:#374151;">
            <strong>Periodos cubiertos:</strong> ${args.fees_covered.map(escapeHtml).join(', ')}
           </div>`
        : ''
    }
    ${
      typeof args.remaining_balance === 'number' && args.remaining_balance > 0
        ? `<p style="margin:16px 0;font-size:13px;color:#92400e;background-color:#fef3c7;padding:12px;border-radius:6px;">
            Aún tienes un saldo pendiente de <strong>$${args.remaining_balance.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>.
           </p>`
        : ''
    }
    ${
      args.notes
        ? `<p style="margin:16px 0;font-size:13px;color:#6b7280;font-style:italic;">Notas: ${escapeHtml(args.notes)}</p>`
        : ''
    }
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;">
      Guarda este correo como comprobante. Si tienes alguna duda sobre este pago, contacta a la administración.
    </p>
  `;
  return emailLayout({
    title: 'Recibo de pago',
    preheader: `Pago ${args.folio} por $${args.amount.toLocaleString('es-MX')} confirmado`,
    content,
    contactPhone: args.contact_phone,
  });
}

/**
 * 6) Cuota próxima a vencer.
 */
export function upcomingDueFeeHTML(args: {
  full_name: string;
  property_address: string;
  amount: number;
  due_date: Date;
  days_remaining: number;
  payment_url?: string;
  contact_phone?: string;
}): string {
  const dueStr = args.due_date.toLocaleDateString('es-MX', { dateStyle: 'long', timeZone: 'America/Mexico_City' });
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Te recordamos que tu cuota de mantenimiento vence próximamente.
    </p>
    <div style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#92400e;letter-spacing:1px;text-transform:uppercase;">Cuota pendiente · ${escapeHtml(args.property_address)}</p>
      <p style="margin:10px 0 4px;font-size:32px;font-weight:700;color:#92400e;">$${args.amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
      <p style="margin:0;font-size:13px;color:#92400e;">Vence el ${escapeHtml(dueStr)} (en ${args.days_remaining} día${args.days_remaining === 1 ? '' : 's'})</p>
    </div>
    <p style="margin:16px 0;font-size:14px;color:#374151;line-height:1.6;">
      Realiza tu pago a tiempo para evitar recargos. Recuerda que después del vencimiento se aplica un recargo
      mensual del <strong>15%</strong> sobre el monto de la cuota.
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;">
      Si ya realizaste el pago, ignora este correo.
    </p>
  `;
  return emailLayout({
    title: 'Tu cuota está por vencer',
    preheader: `$${args.amount.toLocaleString('es-MX')} vence en ${args.days_remaining} días`,
    content,
    cta: args.payment_url ? { label: 'Ver mi estado de cuenta', href: args.payment_url } : undefined,
    contactPhone: args.contact_phone,
  });
}

/**
 * 7) Recordatorio de mora.
 */
export function overdueReminderHTML(args: {
  full_name: string;
  property_address: string;
  amount_owed: number;
  days_overdue: number;
  fees_overdue_count: number;
  surcharge_total?: number;
  payment_url?: string;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Tienes pagos pendientes en tu propiedad <strong>${escapeHtml(args.property_address)}</strong>.
      Te invitamos a regularizar tu situación a la brevedad.
    </p>
    <div style="background-color:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#991b1b;letter-spacing:1px;text-transform:uppercase;">Adeudo total</p>
      <p style="margin:10px 0;font-size:34px;font-weight:700;color:#991b1b;">$${args.amount_owed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
      <p style="margin:0;font-size:13px;color:#991b1b;">
        ${args.fees_overdue_count} cuota${args.fees_overdue_count === 1 ? '' : 's'} vencida${args.fees_overdue_count === 1 ? '' : 's'} · ${args.days_overdue} día${args.days_overdue === 1 ? '' : 's'} de retraso
      </p>
    </div>
    ${
      args.surcharge_total && args.surcharge_total > 0
        ? `<p style="margin:16px 0;font-size:14px;color:#374151;background-color:#fef3c7;padding:12px;border-radius:6px;">
            <strong>Recargo aplicado:</strong> $${args.surcharge_total.toLocaleString('es-MX', { minimumFractionDigits: 2 })} (15% mensual por cuota vencida).
          </p>`
        : ''
    }
    <p style="margin:16px 0;font-size:14px;color:#374151;line-height:1.6;">
      Conforme al reglamento, los condóminos con cuotas vencidas tienen restricciones en el acceso al fraccionamiento
      (portón cerrado, no se reciben visitas, no se permite uso de terraza). Si llegas a <strong>2 meses</strong>
      de retraso, se suspenden todos los servicios.
    </p>
    <p style="margin:24px 0 0;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;">
      Si ya realizaste el pago, contacta a la administración para confirmar su registro.
    </p>
  `;
  return emailLayout({
    title: 'Pagos vencidos',
    preheader: `Adeudo de $${args.amount_owed.toLocaleString('es-MX')} · ${args.days_overdue} días de retraso`,
    content,
    cta: args.payment_url ? { label: 'Ver mi estado de cuenta', href: args.payment_url } : undefined,
    contactPhone: args.contact_phone,
  });
}

/**
 * 8) Aviso de suspensión de servicios.
 */
export function suspensionNoticeHTML(args: {
  full_name: string;
  property_address: string;
  amount_owed: number;
  months_overdue: number;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <div style="background-color:#7f1d1d;color:#ffffff;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;font-size:14px;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">Suspensión de servicios</p>
      <p style="margin:8px 0 0;font-size:22px;font-weight:700;">${escapeHtml(args.property_address)}</p>
    </div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Conforme al Artículo 18 BIS del Reglamento del Condominio Paseo Coto Tonalá, al exceder los 2 meses de
      mora en el pago de cuotas, se aplica la <strong>suspensión total de servicios comunes</strong> hasta
      regularizar tu situación.
    </p>
    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:24px 0;">
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #e5e7eb;">Adeudo total:</td>
        <td style="padding:8px 0;font-size:18px;color:#7f1d1d;text-align:right;border-bottom:1px solid #e5e7eb;font-weight:700;">$${args.amount_owed.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;">Meses de retraso:</td>
        <td style="padding:8px 0;font-size:18px;color:#7f1d1d;text-align:right;font-weight:700;">${args.months_overdue}</td>
      </tr>
    </table>
    <p style="margin:16px 0;font-size:14px;color:#374151;line-height:1.6;">
      Te pedimos comunicarte de inmediato con el Tesorero o el Administrador del Condominio para acordar
      la regularización de tu pago. De continuar la mora, se podrá proceder con acciones legales conforme
      al Artículo 19 del Reglamento.
    </p>
  `;
  return emailLayout({
    title: 'Aviso de suspensión',
    preheader: `Suspensión por ${args.months_overdue} meses de mora`,
    content,
    contactPhone: args.contact_phone,
  });
}

// ============================================================================
// PLANTILLAS TERRAZA (apartado de área común)
// ============================================================================

/** Formatea "2026-08-15" → "sábado 15 de agosto de 2026" (sin corrimiento de zona). */
export function formatEventDate(ymd: string): string {
  const parts = String(ymd).split('-').map(Number);
  const d = new Date(parts[0] || 2000, (parts[1] || 1) - 1, parts[2] || 1, 12);
  return d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function moneyRow(label: string, amount: number, highlight = false): string {
  return `<tr>
    <td style="padding:8px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #e5e7eb;">${escapeHtml(label)}</td>
    <td style="padding:8px 0;font-size:${highlight ? '18px' : '15px'};color:${highlight ? '#1e40af' : '#111827'};text-align:right;border-bottom:1px solid #e5e7eb;font-weight:${highlight ? '700' : '500'};">$${amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
  </tr>`;
}

/** 1) Para el residente: recibimos tu solicitud. */
export function terraceRequestReceivedHTML(args: { full_name: string; event_date: string; folio: string; contact_phone?: string }): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Recibimos tu solicitud para apartar la terraza el <strong>${escapeHtml(formatEventDate(args.event_date))}</strong>.
      La mesa directiva la revisará y te avisaremos en cuanto sea aprobada, junto con las instrucciones de pago.
    </p>
    <div style="background-color:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:14px;margin:20px 0;font-size:14px;color:#1e40af;">
      Folio de tu solicitud: <strong>${escapeHtml(args.folio)}</strong>
    </div>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Tu fecha aún no está garantizada hasta que se apruebe y se confirme el pago.</p>
  `;
  return emailLayout({ title: 'Solicitud de terraza recibida', preheader: `Apartado para el ${formatEventDate(args.event_date)}`, content, contactPhone: args.contact_phone });
}

/** 2) Para los administradores: nueva solicitud por revisar. */
export function terraceAdminNewRequestHTML(args: { property_address: string; requester_name: string; event_date: string; folio: string; app_url?: string; contact_phone?: string }): string {
  const content = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Hay una nueva solicitud de apartado de la terraza pendiente de revisión.
    </p>
    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:16px 0;">
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Casa:</td><td style="padding:6px 0;font-size:14px;text-align:right;font-weight:600;">${escapeHtml(args.property_address)}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Solicita:</td><td style="padding:6px 0;font-size:14px;text-align:right;">${escapeHtml(args.requester_name)}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Fecha del evento:</td><td style="padding:6px 0;font-size:14px;text-align:right;font-weight:600;">${escapeHtml(formatEventDate(args.event_date))}</td></tr>
      <tr><td style="padding:6px 0;font-size:14px;color:#6b7280;">Folio:</td><td style="padding:6px 0;font-size:14px;text-align:right;">${escapeHtml(args.folio)}</td></tr>
    </table>
  `;
  return emailLayout({
    title: 'Nueva solicitud de terraza',
    preheader: `${args.property_address} — ${formatEventDate(args.event_date)}`,
    content,
    cta: args.app_url ? { label: 'Revisar en el panel', href: args.app_url } : undefined,
    contactPhone: args.contact_phone,
  });
}

/** 3) Para el residente: aprobada, con instrucciones de pago. */
export function terraceApprovedHTML(args: {
  full_name: string; event_date: string; folio: string;
  reservation_fee: number; deposit_amount: number;
  payment_instructions?: string; contact_phone?: string;
}): string {
  const total = args.reservation_fee + args.deposit_amount;
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      ¡Buenas noticias! Tu solicitud para apartar la terraza el <strong>${escapeHtml(formatEventDate(args.event_date))}</strong> fue <strong style="color:#16a34a;">aprobada</strong>.
      Para confirmar tu reservación, realiza el siguiente pago:
    </p>
    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
      ${args.reservation_fee > 0 ? moneyRow('Cuota de uso', args.reservation_fee) : ''}
      ${args.deposit_amount > 0 ? moneyRow('Depósito en garantía (reembolsable)', args.deposit_amount) : ''}
      ${moneyRow('Total a pagar', total, true)}
    </table>
    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;color:#374151;line-height:1.6;">
      <strong>¿Cómo pagar?</strong><br>${args.payment_instructions ? escapeHtml(args.payment_instructions) : 'Comunícate con la mesa directiva para pagar en efectivo o por transferencia.'}
    </div>
    <div style="background-color:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:14px;margin:16px 0;font-size:13px;color:#92400e;">
      Tu fecha se confirma cuando la mesa registre tu pago. El depósito se te devuelve después del evento si la terraza queda en buen estado.
    </div>
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Folio: <strong>${escapeHtml(args.folio)}</strong></p>
  `;
  return emailLayout({ title: 'Tu apartado fue aprobado', preheader: `Aprobado para el ${formatEventDate(args.event_date)}`, content, contactPhone: args.contact_phone });
}

/** 4) Para el residente: rechazada. */
export function terraceRejectedHTML(args: { full_name: string; event_date: string; reason?: string; contact_phone?: string }): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Lamentamos informarte que tu solicitud para apartar la terraza el <strong>${escapeHtml(formatEventDate(args.event_date))}</strong> no pudo ser aprobada.
    </p>
    ${args.reason ? `<div style="background-color:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:14px;margin:16px 0;font-size:14px;color:#991b1b;"><strong>Motivo:</strong> ${escapeHtml(args.reason)}</div>` : ''}
    <p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;">
      Si tienes dudas o quieres proponer otra fecha, comunícate con la mesa directiva.
    </p>
  `;
  return emailLayout({ title: 'Solicitud de terraza no aprobada', preheader: 'Tu solicitud no pudo aprobarse', content, contactPhone: args.contact_phone });
}

/** 5) Para el residente: confirmada (pago recibido). */
export function terraceConfirmedHTML(args: { full_name: string; event_date: string; folio: string; deposit_amount: number; contact_phone?: string }): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <div style="background-color:#16a34a;color:#ffffff;border-radius:8px;padding:20px;margin:24px 0;text-align:center;">
      <p style="margin:0;font-size:14px;letter-spacing:1px;text-transform:uppercase;opacity:0.9;">Reservación confirmada</p>
      <p style="margin:8px 0 0;font-size:20px;font-weight:700;">${escapeHtml(formatEventDate(args.event_date))}</p>
    </div>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Recibimos tu pago y la terraza queda apartada a tu nombre para esa fecha. ¡Que disfrutes tu evento!
    </p>
    ${args.deposit_amount > 0 ? `<p style="margin:0 0 16px;font-size:14px;color:#374151;line-height:1.6;">Recuerda que tu depósito de <strong>$${args.deposit_amount.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong> se te devolverá después del evento, siempre que la terraza quede en buen estado.</p>` : ''}
    <p style="margin:8px 0 0;font-size:13px;color:#6b7280;">Folio: <strong>${escapeHtml(args.folio)}</strong></p>
  `;
  return emailLayout({ title: 'Terraza apartada', preheader: `Confirmada para el ${formatEventDate(args.event_date)}`, content, contactPhone: args.contact_phone });
}

/** 6) Para el residente: depósito devuelto. */
export function terraceDepositReturnedHTML(args: { full_name: string; event_date: string; returned_amount: number; method?: string; contact_phone?: string }): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.full_name)}</strong>,</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">
      Te confirmamos la devolución de tu depósito por el uso de la terraza del <strong>${escapeHtml(formatEventDate(args.event_date))}</strong>.
    </p>
    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:20px 0;">
      ${moneyRow('Monto devuelto', args.returned_amount, true)}
      ${args.method ? `<tr><td style="padding:8px 0;font-size:14px;color:#6b7280;">Método:</td><td style="padding:8px 0;font-size:14px;text-align:right;">${escapeHtml(args.method)}</td></tr>` : ''}
    </table>
    <p style="margin:16px 0 0;font-size:14px;color:#374151;line-height:1.6;">Gracias por cuidar las áreas comunes del fraccionamiento.</p>
  `;
  return emailLayout({ title: 'Depósito devuelto', preheader: `Devolución de $${args.returned_amount.toLocaleString('es-MX')}`, content, contactPhone: args.contact_phone });
}

// ============================================================================
// BOLETÍN OFICIAL
// ============================================================================

/** Comunicado oficial de la mesa directiva. El cuerpo viene en texto plano. */
export function bulletinHTML(args: { subject: string; body: string; signature?: string; contact_phone?: string }): string {
  // Convierte saltos de línea en párrafos/br para conservar el formato del escritor
  const bodyHtml = escapeHtml(args.body)
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  const content = `
    ${bodyHtml}
    ${args.signature ? `<p style="margin:24px 0 0;font-size:14px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:16px;">${escapeHtml(args.signature)}</p>` : ''}
  `;
  return emailLayout({
    title: args.subject,
    preheader: args.body.slice(0, 110),
    content,
    contactPhone: args.contact_phone,
  });
}

// ============================================================================
// HELPERS
// ============================================================================

function credentialsBox(email: string, password: string): string {
  return `<div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin:24px 0;">
    <p style="margin:0 0 12px;font-size:13px;color:#6b7280;text-transform:uppercase;letter-spacing:1px;">Datos de acceso</p>
    <table cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;width:120px;">Usuario:</td>
        <td style="padding:4px 0;font-size:14px;color:#111827;font-weight:500;">${escapeHtml(email)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:14px;color:#6b7280;">Contraseña:</td>
        <td style="padding:4px 0;font-size:14px;color:#111827;"><span style="font-family:'SF Mono',Menlo,Consolas,monospace;background-color:#fef3c7;padding:6px 10px;border-radius:4px;">${escapeHtml(password)}</span></td>
      </tr>
    </table>
  </div>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Contraseña temporal segura: 1 mayúscula + 3 minúsculas + 4 dígitos + 1 símbolo.
 */
export function generateTempPassword(): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)];
  const chars = [pick(upper), pick(lower), pick(lower), pick(lower), pick(digits), pick(digits), pick(digits), pick(digits), pick(symbols)];
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Token criptográficamente fuerte para reset de contraseña.
 * Se devuelve el token plano (para el link) y su hash (para guardar en DB).
 */
export async function generateResetToken(): Promise<{ token: string; hash: string }> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  const hashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(hashBuf), (b) => b.toString(16).padStart(2, '0')).join('');
  return { token, hash };
}

// ============================================================================
// PLANTILLAS — PASARELA DE PAGO (firma múltiple de la mesa)
// ============================================================================

function accountIdentityBox(args: {
  account_nickname?: string;
  account_email?: string;
  collector_id?: string;
  mode: string;
}): string {
  const modeLabel = args.mode === 'live' ? 'PRODUCCIÓN (dinero real)' : 'PRUEBA (sandbox)';
  const modeColor = args.mode === 'live' ? '#b45309' : '#1d4ed8';
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;margin:16px 0;">
      <tr><td style="padding:16px 20px;">
        <div style="font-size:13px;color:#6b7280;margin-bottom:4px;">Cuenta de Mercado Pago</div>
        <div style="font-size:16px;font-weight:600;color:#111827;">${escapeHtml(args.account_nickname || 'Sin alias')}</div>
        ${args.account_email ? `<div style="font-size:13px;color:#374151;margin-top:2px;">${escapeHtml(args.account_email)}</div>` : ''}
        ${args.collector_id ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">ID de cuenta (collector): <strong>${escapeHtml(args.collector_id)}</strong></div>` : ''}
        <div style="margin-top:10px;"><span style="display:inline-block;font-size:12px;font-weight:700;color:${modeColor};background:#fff;border:1px solid ${modeColor};border-radius:999px;padding:3px 10px;">Modo: ${modeLabel}</span></div>
      </td></tr>
    </table>`;
}

/** Aviso a un miembro de la mesa: se propuso cambiar la cuenta de cobro. */
export function gatewayProposalHTML(args: {
  member_name: string;
  proposer_name: string;
  account_nickname?: string;
  account_email?: string;
  collector_id?: string;
  mode: string;
  note?: string;
  approve_url: string;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.member_name)}</strong>,</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
      <strong>${escapeHtml(args.proposer_name)}</strong> propuso cambiar la <strong>cuenta de Mercado Pago</strong> donde el fraccionamiento recibe los pagos en línea.
      Este cambio <strong>no surte efecto</strong> hasta que <strong>todos</strong> los miembros de la mesa lo aprueben.
    </p>
    ${accountIdentityBox(args)}
    ${args.note ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><em>Nota de quien propone:</em> ${escapeHtml(args.note)}</p>` : ''}
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 18px;margin:16px 0;">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#991b1b;">
        ⚠️ <strong>Si tú no esperabas este cambio, NO lo apruebes</strong> y avisa de inmediato a la mesa.
        Cambiar la cuenta significa cambiar a dónde llega el dinero de las cuotas.
      </p>
    </div>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#374151;">Revisa los datos y registra tu decisión:</p>`;
  return emailLayout({
    title: 'Aprobación requerida: cuenta de cobro',
    preheader: 'Se propuso cambiar la cuenta de Mercado Pago del fraccionamiento.',
    content,
    cta: { label: 'Revisar y aprobar', href: args.approve_url },
    contactPhone: args.contact_phone,
  });
}

/** Aviso: la cuenta fue aprobada por toda la mesa y quedó activa. */
export function gatewayActivatedHTML(args: {
  member_name: string;
  account_nickname?: string;
  account_email?: string;
  collector_id?: string;
  mode: string;
  activated_by_name: string;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.member_name)}</strong>,</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
      La mesa aprobó <strong>por unanimidad</strong> la nueva cuenta de Mercado Pago y ya quedó <strong>activa</strong>.
      La última firma fue de <strong>${escapeHtml(args.activated_by_name)}</strong>.
    </p>
    ${accountIdentityBox(args)}
    <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;">
      A partir de ahora, los pagos en línea de los vecinos llegarán a esta cuenta. Si esto te sorprende, contacta a la mesa.
    </p>`;
  return emailLayout({
    title: 'Cuenta de cobro activada',
    preheader: 'La nueva cuenta de Mercado Pago fue aprobada por toda la mesa.',
    content,
    contactPhone: args.contact_phone,
  });
}

/** Aviso: la propuesta de cambio de cuenta fue rechazada. */
export function gatewayRejectedHTML(args: {
  member_name: string;
  account_nickname?: string;
  rejected_by_name: string;
  reason?: string;
  contact_phone?: string;
}): string {
  const content = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hola <strong>${escapeHtml(args.member_name)}</strong>,</p>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151;">
      La propuesta para cambiar la cuenta de Mercado Pago (${escapeHtml(args.account_nickname || 'sin alias')}) fue
      <strong>rechazada</strong> por <strong>${escapeHtml(args.rejected_by_name)}</strong>. La cuenta de cobro <strong>no cambió</strong>.
    </p>
    ${args.reason ? `<p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#374151;"><em>Motivo:</em> ${escapeHtml(args.reason)}</p>` : ''}`;
  return emailLayout({
    title: 'Cambio de cuenta rechazado',
    preheader: 'La propuesta de cambio de cuenta fue rechazada.',
    content,
    contactPhone: args.contact_phone,
  });
}

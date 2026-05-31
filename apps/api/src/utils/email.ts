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

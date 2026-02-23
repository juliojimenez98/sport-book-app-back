import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

// ─── SES Client ───────────────────────────────────────────────────────────────

const sesClient = new SESClient({
  region: process.env.AMAZON_SES_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AMAZON_SES_ACCESS_KEY!,
    secretAccessKey: process.env.AMAZON_SES_SECRET_KEY!,
  },
});

const FROM_EMAIL = (
  process.env.AMAZON_SES_FROM_EMAIL || "noreply@bookingpro.com"
).trim();

// ─── Core send helper ─────────────────────────────────────────────────────────

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const input: SendEmailCommandInput = {
    Source: FROM_EMAIL,
    Destination: { ToAddresses: [params.to] },
    Message: {
      Subject: { Data: params.subject, Charset: "UTF-8" },
      Body: {
        Html: { Data: params.html, Charset: "UTF-8" },
        Text: { Data: params.text, Charset: "UTF-8" },
      },
    },
  };
  await sesClient.send(new SendEmailCommand(input));
}

// ─── Platform colors (mirrors globals.css) ───────────────────────────────────
// primary:  #14b8a6  (teal-500)
// accent:   #06b6d4  (cyan-500)
// bg:       #ffffff
// text:     #0f172a  (slate-900)
// muted:    #64748b  (slate-500)
// border:   #e2e8f0  (slate-200)

// ─── Templates ────────────────────────────────────────────────────────────────

function getVerificationEmailHtml(
  firstName: string,
  verificationUrl: string,
): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verifica tu cuenta · Easy Sport Book</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Header gradient teal → cyan -->
          <tr>
            <td style="background:linear-gradient(135deg,#14b8a6 0%,#06b6d4 100%);padding:40px 48px;text-align:center;">
              <!-- Logo / icon -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:12px;width:52px;height:52px;text-align:center;vertical-align:middle;">
                    <span style="font-size:28px;line-height:52px;">📅</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Easy Sport Book</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;font-weight:400;">Reserva canchas deportivas</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 48px 32px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">¡Hola, ${firstName}! 👋</h2>
              <p style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
                Gracias por registrarte en <strong style="color:#0f172a;">Easy Sport Book</strong>. Solo falta un paso:<br/>
                confirma tu dirección de email para activar tu cuenta.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 32px;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#14b8a6 0%,#06b6d4 100%);box-shadow:0 4px 14px rgba(20,184,166,0.35);">
                    <a href="${verificationUrl}"
                       style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:0.2px;border-radius:10px;">
                      ✅ Verificar mi cuenta
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Warning box -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:28px;background:#f0fdf9;border:1px solid #99f6e4;border-radius:10px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0;color:#0f766e;font-size:13px;line-height:1.6;">
                      <strong>⏱ Este link expirará en 24 horas.</strong><br/>
                      Si no creaste esta cuenta, puedes ignorar este mensaje con seguridad.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Raw link fallback -->
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                ¿El botón no funciona? Copia y pega este link en tu navegador:<br/>
                <a href="${verificationUrl}" style="color:#14b8a6;word-break:break-all;text-decoration:none;">${verificationUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr><td style="padding:0 48px;"><hr style="border:none;border-top:1px solid #e2e8f0;" /></td></tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 48px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;">
                © ${year} Easy Sport Book · Todos los derechos reservados<br/>
                Este email fue generado automáticamente — por favor no respondas.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

function getVerificationEmailText(
  firstName: string,
  verificationUrl: string,
): string {
  return `¡Hola, ${firstName}!

Gracias por registrarte en Easy Sport Book.

Haz clic en el siguiente link para verificar tu cuenta (expira en 24 horas):
${verificationUrl}

Si no creaste esta cuenta, ignora este mensaje.

© ${new Date().getFullYear()} Easy Sport Book`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends an email verification link to a newly registered user.
 * Fire-and-forget: errors are logged but never thrown to the caller.
 */
export async function sendVerificationEmail(user: {
  email: string;
  firstName: string;
  verificationUrl: string;
}): Promise<void> {
  try {
    await sendVerificationEmailOrThrow(user);
    console.log(`✅ Verification email sent to ${user.email}`);
  } catch (error) {
    console.error(
      `⚠️  Failed to send verification email to ${user.email}:`,
      error,
    );
  }
}

/**
 * Same as sendVerificationEmail but THROWS on failure.
 * Use when you need to rollback user creation if the email cannot be sent.
 */
export async function sendVerificationEmailOrThrow(user: {
  email: string;
  firstName: string;
  verificationUrl: string;
}): Promise<void> {
  await sendEmail({
    to: user.email,
    subject: `Easy Sport Book — Verifica tu cuenta, ${user.firstName}`,
    html: getVerificationEmailHtml(user.firstName, user.verificationUrl),
    text: getVerificationEmailText(user.firstName, user.verificationUrl),
  });
  console.log(`✅ Verification email sent to ${user.email}`);
}

// ─── Password Reset / Setup Email ─────────────────────────────────────────────

function getPasswordResetEmailHtml(
  firstName: string,
  resetUrl: string,
  isInvitation: boolean = false,
  invitedBy?: string,
  tempPassword?: string,
): string {
  const year = new Date().getFullYear();
  const title = isInvitation ? "Configura tu cuenta" : "Recuperar contraseña";
  const greeting = isInvitation
    ? `¡Te han invitado, ${firstName}! 🎉`
    : `Hola ${firstName},`;
  const message = isInvitation
    ? `<strong style="color:#0f172a;">${invitedBy}</strong> te ha invitado a Easy Sport Book.<br/><br/>
       Tu contraseña temporal es: <strong style="color:#0f172a; background:#e0f2fe; padding:2px 6px; border-radius:4px; font-family:monospace;">${tempPassword}</strong><br/><br/>
       Inicia sesión con esta contraseña o cámbiala haciendo clic en el siguiente enlace:`
    : `Alguien ha solicitado restablecer tu contraseña en Easy Sport Book. Haz clic en el siguiente enlace para crear una nueva contraseña.`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#14b8a6 0%,#06b6d4 100%);padding:40px 48px;text-align:center;">
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 auto 16px;">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:12px;width:52px;height:52px;text-align:center;vertical-align:middle;">
                    <span style="font-size:28px;line-height:52px;">🗓️</span>
                  </td>
                </tr>
              </table>
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">Easy Sport Book</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Reserva canchas deportivas</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:48px 48px 32px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:700;">${greeting}</h2>
              <p style="margin:0 0 24px;color:#475569;font-size:15px;line-height:1.7;">
                ${message}
              </p>
              
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin:0 0 28px;">
                <tr>
                  <td style="border-radius:10px;background:linear-gradient(135deg,#14b8a6 0%,#06b6d4 100%);box-shadow:0 4px 14px rgba(20,184,166,0.35);">
                    <a href="${resetUrl}" style="display:inline-block;padding:14px 36px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">
                      Configurar Contraseña
                    </a>
                  </td>
                </tr>
              </table>
              <!-- Warning -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:20px;background:#fffbeb;border:1px solid #fcd34d;border-radius:10px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0;color:#92400e;font-size:13px;line-height:1.6;">
                      ⚠️ Este enlace es válido por 1 hora. Si no solicitaste esto, puedes ignorar este correo.
                    </p>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                Link alternativo: <a href="${resetUrl}" style="color:#14b8a6;word-break:break-all;text-decoration:none;">${resetUrl}</a>
              </p>
            </td>
          </tr>
          <tr><td style="padding:0 48px;"><hr style="border:none;border-top:1px solid #e2e8f0;" /></td></tr>
          <tr>
            <td style="padding:24px 48px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.7;">
                © ${year} Easy Sport Book &middot; Todos los derechos reservados<br/>
                Email generado automáticamente &mdash; no respondas.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function getPasswordResetEmailText(
  firstName: string,
  resetUrl: string,
  isInvitation: boolean = false,
  invitedBy?: string,
  tempPassword?: string,
): string {
  if (isInvitation) {
    return `¡Hola, ${firstName}!

${invitedBy} te ha invitado a Easy Sport Book.

Tu contraseña temporal es: ${tempPassword}

Para activar tu cuenta y configurar tu contraseña permanente, visita el siguiente enlace:
${resetUrl}

Este enlace expira en 1 hora.

© ${new Date().getFullYear()} Easy Sport Book`;
  }

  return `Hola ${firstName},

Has solicitado restablecer tu contraseña en Easy Sport Book.

Visita el siguiente enlace para configurar una nueva contraseña:
${resetUrl}

Este enlace expira en 1 hora. Si no solicitaste esto, ignora este correo.

© ${new Date().getFullYear()} Easy Sport Book`;
}

/**
 * Sends a password reset or invitation link to the user.
 * THROWS on failure — caller should handle rollback or response.
 */
export async function sendPasswordResetEmailOrThrow(data: {
  email: string;
  firstName: string;
  resetUrl: string;
  isInvitation?: boolean;
  invitedBy?: string;
  tempPassword?: string;
}): Promise<void> {
  const subject = data.isInvitation
    ? `Easy Sport Book — ${data.invitedBy} te invita a unirte`
    : `Easy Sport Book — Recuperar contraseña`;

  await sendEmail({
    to: data.email,
    subject,
    html: getPasswordResetEmailHtml(
      data.firstName,
      data.resetUrl,
      data.isInvitation,
      data.invitedBy,
      data.tempPassword,
    ),
    text: getPasswordResetEmailText(
      data.firstName,
      data.resetUrl,
      data.isInvitation,
      data.invitedBy,
      data.tempPassword,
    ),
  });
  console.log(`✅ Password reset/invitation email sent to ${data.email}`);
}

// ─── Booking Notifications ────────────────────────────────────────────────────

interface BookingEmailData {
  recipientName: string;
  eventName: string; // e.g. "Tu cancha fue reservada", "Nueva reserva en tu sucursal"
  messageHTML: string;
  messageText: string;
  branchName: string;
  resourceName: string;
  dateStr: string;
  timeStr: string;
  durationHours: number;
  totalPrice: number;
  currency: string;
  bookingStatus: string;
  clientName: string; // useful for admin to know who booked
  rejectionReason?: string;
}

function formatCurrency(amount: number, currency = "CLP"): string {
  const locale = currency === "CLP" ? "es-CL" : "en-US";
  const fractionDigits = currency === "CLP" ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amount);
}

function getBookingEmailHtml(data: BookingEmailData): string {
  const year = new Date().getFullYear();
  
  const statusColor = 
    data.bookingStatus === 'confirmed' ? '#10b981' : // emerald-500
    data.bookingStatus === 'pending' ? '#f59e0b' : // amber-500
    data.bookingStatus === 'rejected' || data.bookingStatus === 'cancelled' ? '#ef4444' : // red-500
    '#64748b'; // slate-500

  const statusText = 
    data.bookingStatus === 'confirmed' ? 'Confirmada' :
    data.bookingStatus === 'pending' ? 'Pendiente' :
    data.bookingStatus === 'rejected' ? 'Rechazada' : 
    data.bookingStatus === 'cancelled' ? 'Cancelada' : data.bookingStatus;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${data.eventName} · Easy Sport Book</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

          <!-- Header gradient -->
          <tr>
            <td style="background:linear-gradient(135deg,#14b8a6 0%,#06b6d4 100%);padding:32px 48px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.3px;">Easy Sport Book</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;font-weight:400;">Reserva canchas deportivas</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:48px 48px 32px;">
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:22px;font-weight:700;">¡Hola, ${data.recipientName}! 👋</h2>
              
              <div style="margin:0 0 28px;color:#475569;font-size:15px;line-height:1.7;">
                ${data.messageHTML}
              </div>

              <!-- Booking Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 32px;">
                <tr>
                  <td style="padding:24px;">
                    <h3 style="margin:0 0 16px;color:#0f172a;font-size:16px;font-weight:600;border-bottom:1px solid #e2e8f0;padding-bottom:12px;">
                      Detalle de la Reserva
                      <span style="float:right;background:${statusColor}22;color:${statusColor};padding:4px 12px;border-radius:9999px;font-size:12px;font-weight:600;text-transform:uppercase;">
                        ${statusText}
                      </span>
                    </h3>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="padding:8px 0;width:40%;color:#64748b;font-size:14px;">Sucursal:</td>
                        <td style="padding:8px 0;width:60%;color:#0f172a;font-size:14px;font-weight:500;">${data.branchName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:14px;">Cancha:</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${data.resourceName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:14px;">Cliente:</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${data.clientName}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:14px;">Fecha:</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${data.dateStr}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:14px;">Hora:</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:14px;font-weight:500;">${data.timeStr} (${data.durationHours} ${data.durationHours === 1 ? 'hora' : 'horas'})</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;border-top:1px dashed #e2e8f0;margin-top:8px;"></td>
                        <td style="padding:8px 0;border-top:1px dashed #e2e8f0;margin-top:8px;"></td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#64748b;font-size:14px;">Total a pagar:</td>
                        <td style="padding:8px 0;color:#0f172a;font-size:16px;font-weight:700;">${formatCurrency(data.totalPrice, data.currency)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              ${data.rejectionReason ? `
              <div style="margin:0 0 32px;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;">
                <h4 style="margin:0 0 8px;color:#b91c1c;font-size:14px;font-weight:600;">Motivo del rechazo:</h4>
                <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.5;">${data.rejectionReason}</p>
              </div>
              ` : ''}

              <p style="margin:0 0 24px;color:#475569;font-size:14px;line-height:1.6;">
                Si tienes alguna pregunta, no dudes en contactarnos.
              </p>
              
              <p style="margin:0;color:#0f172a;font-size:15px;font-weight:600;">
                El equipo de Easy Sport Book
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:32px 48px;text-align:center;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:13px;">
                © ${year} Easy Sport Book. Todos los derechos reservados.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

function getBookingEmailText(data: BookingEmailData): string {
  const statusText = 
    data.bookingStatus === 'confirmed' ? 'Confirmada' :
    data.bookingStatus === 'pending' ? 'Pendiente' :
    data.bookingStatus === 'rejected' ? 'Rechazada' : 
    data.bookingStatus === 'cancelled' ? 'Cancelada' : data.bookingStatus;

  let text = `Hola ${data.recipientName},

${data.messageText}

DETALLE DE LA RESERVA [${statusText.toUpperCase()}]
-------------------------------------------------
Sucursal: ${data.branchName}
Cancha: ${data.resourceName}
Cliente: ${data.clientName}
Fecha: ${data.dateStr}
Hora: ${data.timeStr} (${data.durationHours} ${data.durationHours === 1 ? 'hora' : 'horas'})
Total a pagar: ${formatCurrency(data.totalPrice, data.currency)}
`;

  if (data.rejectionReason) {
    text += `\nMotivo del rechazo: ${data.rejectionReason}\n`;
  }

  text += `
-------------------------------------------------
Si tienes alguna duda, contáctanos.

El equipo de Easy Sport Book
© ${new Date().getFullYear()} Easy Sport Book`;

  return text;
}

/**
 * Interface representing a complete Booking with relations needed for emails.
 * Matches the 'include' structure from booking.controller.ts
 */
export interface CompleteBooking {
  bookingId: number;
  startAt: Date;
  endAt: Date;
  status: string;
  totalPrice: number | string;
  currency: string;
  rejectionReason?: string;
  createdAt: Date;
  resource?: { name: string; pricePerHour?: number | string };
  branch?: { name: string; tenantId: number; branchId: number };
  user?: { email: string; firstName: string; lastName: string } | null;
  guest?: { email: string; firstName: string; lastName: string } | null;
}

function buildBookingEmailData(
  booking: CompleteBooking, 
  recipientName: string, 
  eventName: string, 
  messageHTML: string, 
  messageText: string
): BookingEmailData {
  
  // Parse dates carefully to avoid timezone shift (use local format matching the server for now or UTC offset)
  // Given we store UTC, we display it assuming Chilean time or the local time of the branch.
  // For simplicity, we use the date localized to es-CL
  const startDate = new Date(booking.startAt);
  const endDate = new Date(booking.endAt);
  const optionsDate: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Santiago' };
  const optionsTime: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone: 'America/Santiago' };
  
  const dateStr = startDate.toLocaleDateString('es-CL', optionsDate);
  const startTimeStr = startDate.toLocaleTimeString('es-CL', optionsTime);
  const endTimeStr = endDate.toLocaleTimeString('es-CL', optionsTime);
  const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

  const client = booking.user || booking.guest;
  const clientName = client ? `${client.firstName} ${client.lastName}` : 'Cliente Desconocido';
  const branchName = booking.branch?.name || 'Sucursal';
  const resourceName = booking.resource?.name || 'Cancha';
  const totalPrice = typeof booking.totalPrice === 'string' ? parseFloat(booking.totalPrice) : booking.totalPrice;

  return {
    recipientName,
    eventName,
    messageHTML,
    messageText,
    branchName,
    resourceName,
    dateStr,
    timeStr: `${startTimeStr} a ${endTimeStr}`,
    durationHours,
    totalPrice,
    currency: booking.currency,
    bookingStatus: booking.status,
    clientName,
    rejectionReason: booking.rejectionReason
  };
}

export type BookingEmailType = 'created_auto_confirmed' | 'created_pending' | 'confirmed' | 'rejected';

/**
 * Sends a notification email to the client (User or Guest)
 */
export async function sendBookingNotificationToClient(booking: CompleteBooking, type: BookingEmailType): Promise<void> {
  const client = booking.user || booking.guest;
  if (!client || !client.email) {
    console.warn(`⚠️ Cannot send email to client: missing email for booking ${booking.bookingId}`);
    return;
  }

  let eventName = "";
  let messageHTML = "";
  let messageText = "";

  switch (type) {
    case 'created_auto_confirmed':
      eventName = "¡Tu cancha fue reservada con éxito!";
      messageHTML = `Tu reserva en <strong style="color:#0f172a;">${booking.branch?.name}</strong> se ha guardado correctamente. Ya puedes presentarte el día y hora indicados.`;
      messageText = `Tu reserva en ${booking.branch?.name} se ha guardado correctamente. Ya puedes presentarte el día y hora indicados.`;
      break;
    case 'created_pending':
      eventName = "Solicitud de reserva enviada";
      messageHTML = `Hemos recibido tu solicitud de reserva en <strong style="color:#0f172a;">${booking.branch?.name}</strong>. Esta cancha <strong style="color:#f59e0b;">requiere aprobación del administrador</strong>. Te enviaremos otro correo cuando sea confirmada.`;
      messageText = `Hemos recibido tu solicitud de reserva en ${booking.branch?.name}. Esta cancha requiere aprobación del administrador. Te enviaremos otro correo cuando sea confirmada.`;
      break;
    case 'confirmed':
      eventName = "¡Tu reserva ha sido confirmada!";
      messageHTML = `¡Buenas noticias! Tu solicitud de reserva en <strong style="color:#0f172a;">${booking.branch?.name}</strong> ha sido <strong style="color:#10b981;">confirmada</strong>.`;
      messageText = `¡Buenas noticias! Tu solicitud de reserva en ${booking.branch?.name} ha sido confirmada.`;
      break;
    case 'rejected':
      eventName = "Actualización sobre tu reserva (Rechazada)";
      messageHTML = `Lamentablemente tu solicitud de reserva en <strong style="color:#0f172a;">${booking.branch?.name}</strong> ha sido <strong style="color:#ef4444;">rechazada</strong>.`;
      messageText = `Lamentablemente tu solicitud de reserva en ${booking.branch?.name} ha sido rechazada.`;
      break;
  }

  const emailData = buildBookingEmailData(booking, client.firstName, eventName, messageHTML, messageText);
  
  await sendEmail({
    to: client.email,
    subject: `Easy Sport Book — ${eventName}`,
    html: getBookingEmailHtml(emailData),
    text: getBookingEmailText(emailData),
  });
  
  console.log(`✅ Booking [${type}] email sent to client ${client.email}`);
}

import UserRole from "../models/UserRole";
import Role from "../models/Role";
import AppUser from "../models/AppUser";

/**
 * Retrieves the email addresses of Branch Admins and Tenant Admins
 * for a specific branch and tenant.
 */
async function getAdminEmailsForBranch(tenantId: number, branchId: number): Promise<string[]> {
  try {
    const adminRoles = await UserRole.findAll({
      where: {
        // Admins that have global tenant scope OR specific branch scope
        tenantId,
      },
      include: [
        {
          model: Role,
          as: 'role',
          where: {
            name: ['tenant_admin', 'branch_admin']
          }
        },
        {
          model: AppUser,
          as: 'user',
          attributes: ['email', 'isActive'],
          where: { isActive: true }
        }
      ]
    });

    // Filter to those who are tenant_admin OR branch_admin for this specific branch
    const validAdmins = adminRoles.filter(ur => {
      const roleName = (ur as any).role.name;
      if (roleName === 'tenant_admin') return true; // tenant admin sees all 
      if (roleName === 'branch_admin' && ur.branchId === branchId) return true; // specific branch admin
      return false;
    });

    const emails = validAdmins.map(ur => (ur as any).user.email);
    // Remove duplicates
    return Array.from(new Set(emails));
  } catch (error) {
    console.error("Error fetching admin emails:", error);
    return [];
  }
}

/**
 * Sends a notification email to the branch/tenant administrators
 */
export async function sendBookingNotificationToAdmins(booking: CompleteBooking, type: 'created_auto_confirmed' | 'created_pending'): Promise<void> {
  if (!booking.branch?.tenantId || !booking.branch?.branchId) return;
  
  const adminEmails = await getAdminEmailsForBranch(booking.branch.tenantId, booking.branch.branchId);
  if (adminEmails.length === 0) return;

  const adminName = "Administrador";
  let eventName = "";
  let messageHTML = "";
  let messageText = "";

  switch (type) {
    case 'created_auto_confirmed':
      eventName = "Nueva reserva confirmada";
      messageHTML = `Se ha registrado una nueva reserva automáticamente en tu sucursal <strong style="color:#0f172a;">${booking.branch?.name}</strong>.`;
      messageText = `Se ha registrado una nueva reserva automáticamente en tu sucursal ${booking.branch?.name}.`;
      break;
    case 'created_pending':
      eventName = "Nueva solicitud pendiente de aprobación";
      messageHTML = `Tienes una nueva reserva <strong style="color:#f59e0b;">pendiente de revisión</strong> en tu sucursal <strong style="color:#0f172a;">${booking.branch?.name}</strong>.<br/><br/>Entra al panel de control de Easy Sport Book para aprobarla o rechazarla.`;
      messageText = `Tienes una nueva reserva pendiente de revisión en tu sucursal ${booking.branch?.name}. Entra al panel de control de Easy Sport Book para aprobarla o rechazarla.`;
      break;
  }

  const emailData = buildBookingEmailData(booking, adminName, eventName, messageHTML, messageText);
  
  // Send emails in parallel to all admins
  await Promise.all(
    adminEmails.map(email => 
      sendEmail({
        to: email,
        subject: `Easy Sport Book — ${eventName}`,
        html: getBookingEmailHtml(emailData),
        text: getBookingEmailText(emailData),
      })
    )
  );
  
  console.log(`✅ Booking [${type}] admin notification sent to ${adminEmails.length} admins.`);
}

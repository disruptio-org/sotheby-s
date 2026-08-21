import { createTransport, type Transporter } from 'nodemailer';
import { env, isProd } from '../env.js';

export interface Mail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type MailResult = { delivered: true } | { delivered: false; detail: string };

let cached: Transporter | null = null;

const transport = (): Transporter => {
  cached ??= createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    ...(env.SMTP_USER ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS ?? '' } } : {}),
    // The development catcher has no certificate worth checking. Production does.
    ...(isProd ? {} : { tls: { rejectUnauthorized: false } }),
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
  return cached;
};

/**
 * Never throws. A message that cannot be sent is a fact the caller has to show
 * somebody, not a failure that should undo the work which produced it — an
 * invitation still exists whether or not its e-mail left the building.
 *
 * Nothing about the message body is logged: an invitation link is a credential.
 */
export const sendMail = async (mail: Mail): Promise<MailResult> => {
  try {
    await transport().sendMail({
      from: env.MAIL_FROM,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
    return { delivered: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'erro desconhecido';
    return { delivered: false, detail };
  }
};

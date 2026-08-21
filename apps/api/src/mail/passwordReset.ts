import type { Mail } from './transport.js';

const escape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface PasswordResetMailInput {
  name: string;
  email: string;
  url: string;
  ttlMinutes: number;
}

/**
 * The last line matters more than the rest: somebody who did not ask for this
 * has to be told, in one sentence, that ignoring the message is enough.
 */
export const passwordResetMail = (input: PasswordResetMailInput): Mail => {
  const firstName = input.name.split(' ')[0] ?? input.name;
  const window = `${input.ttlMinutes} minutos`;

  const text = [
    `Olá ${firstName},`,
    '',
    'Recebemos um pedido para redefinir a palavra-passe da sua conta no AI Back Office.',
    '',
    'Defina uma nova palavra-passe através da ligação abaixo:',
    input.url,
    '',
    `A ligação é válida durante ${window} e só pode ser usada uma vez.`,
    '',
    'Se não foi você que pediu, ignore esta mensagem — a sua palavra-passe atual continua a funcionar.',
  ].join('\n');

  const html = [
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c1b19;max-width:520px">',
    `<p>Olá ${escape(firstName)},</p>`,
    '<p>Recebemos um pedido para redefinir a palavra-passe da sua conta no <strong>AI Back Office</strong>.</p>',
    `<p><a href="${escape(input.url)}" style="display:inline-block;background:#1c1b19;color:#fff;padding:12px 22px;text-decoration:none">Definir uma nova palavra-passe</a></p>`,
    `<p style="font-size:13px;color:#6b6862">A ligação é válida durante ${window} e só pode ser usada uma vez.</p>`,
    '<p style="font-size:13px;color:#6b6862">Se não foi você que pediu, ignore esta mensagem — a sua palavra-passe atual continua a funcionar.</p>',
    '</div>',
  ].join('');

  return {
    to: input.email,
    subject: 'Redefinir a sua palavra-passe',
    text,
    html,
  };
};

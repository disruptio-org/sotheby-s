import type { Mail } from './transport.js';

const escape = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const hoursInWords = (hours: number): string =>
  hours === 1 ? 'uma hora' : hours % 24 === 0 ? `${hours / 24} dias` : `${hours} horas`;

export interface InvitationMailInput {
  name: string;
  email: string;
  roleName: string;
  url: string;
  ttlHours: number;
}

/**
 * Deliberately plain: one sentence of context, one link, one line about expiry.
 * Anything more elaborate is a deliverability problem and reads like a phish.
 */
export const invitationMail = (input: InvitationMailInput): Mail => {
  const window = hoursInWords(input.ttlHours);
  const firstName = input.name.split(' ')[0] ?? input.name;

  const text = [
    `Olá ${firstName},`,
    '',
    `Foi criada uma conta para si no AI Back Office da Sotheby's International Realty, com o perfil ${input.roleName}.`,
    '',
    'Defina a sua palavra-passe através da ligação abaixo:',
    input.url,
    '',
    `A ligação é válida durante ${window} e só pode ser usada uma vez. Se expirar, peça um novo convite a um administrador.`,
    '',
    'Se não estava à espera deste convite, ignore esta mensagem.',
  ].join('\n');

  const html = [
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1c1b19;max-width:520px">',
    `<p>Olá ${escape(firstName)},</p>`,
    `<p>Foi criada uma conta para si no <strong>AI Back Office</strong> da Sotheby&rsquo;s International Realty, com o perfil <strong>${escape(input.roleName)}</strong>.</p>`,
    `<p><a href="${escape(input.url)}" style="display:inline-block;background:#1c1b19;color:#fff;padding:12px 22px;text-decoration:none">Definir a minha palavra-passe</a></p>`,
    `<p style="font-size:13px;color:#6b6862">A ligação é válida durante ${window} e só pode ser usada uma vez. Se expirar, peça um novo convite a um administrador.</p>`,
    '<p style="font-size:13px;color:#6b6862">Se não estava à espera deste convite, ignore esta mensagem.</p>',
    '</div>',
  ].join('');

  return {
    to: input.email,
    subject: 'O seu acesso ao AI Back Office',
    text,
    html,
  };
};

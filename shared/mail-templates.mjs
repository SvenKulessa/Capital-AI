import { readFileSync } from 'node:fs';
import { CONTROLLER } from './legal-identity.mjs';

// Single HTML shell shared with Supabase Auth. Keep HTML-only branding in this file,
// and all customer-facing copy/recipient-agnostic mail variants in this module.
export const MAIL_BRAND = Object.freeze({
  name: 'CAPITAL-AI',
  origin: 'https://capital-ai.online',
  logo: 'https://capital-ai.online/branding/asset-pack/avatars/capital-ai-avatar-120x120.png',
  accent: '#f9bf21',
  supportEmail: CONTROLLER.supportEmail,
});

export const MAIL_SHELL = readFileSync(
  new URL('../supabase/email-templates/capital-ai-auth-email-shell.html', import.meta.url),
  'utf8',
);

export function escapeMailHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const authNotice = 'Diese Nachricht gehört zu einem CAPITAL-AI Konto- oder Sicherheitsvorgang. Teile Passwörter, Passkeys, TOTP-Secrets oder Einmalcodes niemals mit Dritten.';
const authFooter = 'Wenn du diesen Vorgang nicht ausgelöst hast, ändere sicherheitsrelevante Zugangsdaten und prüfe deine Anmeldemethoden.';
const supportNotice = 'Bitte sende keine Passwörter, Einmalcodes, API-Schlüssel oder andere Zugangsdaten per E-Mail.';
const supportFooter = `CAPITAL-AI · ${CONTROLLER.name} · ${CONTROLLER.street} · ${CONTROLLER.postalCode} ${CONTROLLER.city} · Deutschland`;

export function renderBrandedMail({ shell = MAIL_SHELL, title, bodyHtml, actionHtml = '', detailHtml = '', kind = 'support' }) {
  if (!['support', 'auth', 'transaction'].includes(kind)) throw new Error('MAIL_KIND_UNSUPPORTED');
  if (typeof title !== 'string' || !title.trim() || typeof bodyHtml !== 'string' || !bodyHtml.trim()) {
    throw new Error('MAIL_CONTENT_REQUIRED');
  }
  const notice = kind === 'auth' ? authNotice : supportNotice;
  const footer = kind === 'auth' ? authFooter : `${supportFooter}<br><a href="${MAIL_BRAND.origin}/impressum" style="color:#f9bf21;text-decoration:none;">Impressum</a> · <a href="${MAIL_BRAND.origin}/datenschutz" style="color:#f9bf21;text-decoration:none;">Datenschutz</a>`;
  const html = shell
    .replaceAll('%%TITLE%%', escapeMailHtml(title))
    .replace('%%BODY%%', bodyHtml)
    .replace('%%ACTION%%', actionHtml)
    .replace('%%DETAIL%%', detailHtml)
    .replace('%%NOTICE%%', notice)
    .replace('%%FOOTER%%', footer);
  if (/%%[A-Z_]+%%/.test(html)) throw new Error('MAIL_TEMPLATE_PLACEHOLDER_UNRESOLVED');
  return html;
}

const safe = (value, fallback = '') => escapeMailHtml(value == null || value === '' ? fallback : value);
const safeText = (value, fallback = '') => String(value == null || value === '' ? fallback : value);

export function renderSupportMail(type, data = {}) {
  if (!['signature', 'reply', 'absence'].includes(type)) throw new Error('MAIL_SUPPORT_TEMPLATE_UNSUPPORTED');
  if (type === 'signature') {
    const html = `<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;font-family:Arial,Helvetica,sans-serif;">
<tr><td style="font-size:14px;line-height:1.6;padding:0 0 10px;">Mit freundlichen Grüßen</td></tr>
<tr><td style="background:#070b19;border:1px solid #25304a;border-top:3px solid ${MAIL_BRAND.accent};border-radius:14px;padding:18px 20px;color:#cbd5e1;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td width="72"><img src="${MAIL_BRAND.logo}" width="56" height="56" alt="CAPITAL-AI Logo" style="display:block;border-radius:14px;border:1px solid ${MAIL_BRAND.accent};"></td><td style="color:#fff;font-size:17px;font-weight:700;"><span style="font-size:11px;letter-spacing:2px;color:${MAIL_BRAND.accent};">CAPITAL-AI</span><br>Support &amp; Customer Service</td></tr></table>
<p style="margin:12px 0;color:#cbd5e1;font-size:13px;line-height:1.6;">Kundenservice &amp; technische Unterstützung<br><a href="mailto:${MAIL_BRAND.supportEmail}" style="color:${MAIL_BRAND.accent};">${MAIL_BRAND.supportEmail}</a> · <a href="${MAIL_BRAND.origin}" style="color:${MAIL_BRAND.accent};">capital-ai.online</a></p>
<p style="border-top:1px solid #27304a;padding-top:10px;color:#94a3b8;font-size:11px;line-height:1.6;">${supportFooter}<br><a style="color:#94a3b8;" href="${MAIL_BRAND.origin}/impressum">Impressum</a> · <a style="color:#94a3b8;" href="${MAIL_BRAND.origin}/datenschutz">Datenschutz</a></p>
</td></tr></table>`;
    return { subject: '', html, text: `Mit freundlichen Grüßen\nCAPITAL-AI Support\n${MAIL_BRAND.supportEmail}\n${MAIL_BRAND.origin}\n${supportFooter}` };
  }
  if (type === 'reply') {
    const name = safe(data.name, '[Name]');
    const topic = safe(data.topic, '[Thema]');
    const answer = safe(data.answer, '[Antwort / Lösung / Bearbeitungsstand]').replaceAll('\n', '<br>');
    const next = safe(data.nextSteps, '[Nächste Schritte]').replaceAll('\n', '<br>');
    const html = renderBrandedMail({ title: 'Ihre Supportanfrage', bodyHtml: `<p>Guten Tag ${name},</p><p>vielen Dank für Ihre Nachricht an den CAPITAL-AI Support.</p><p><strong>Zu Ihrer Anfrage „${topic}“:</strong></p><p>${answer}</p><p><strong>Nächste Schritte:</strong></p><p>${next}</p><p>Sie können direkt auf diese E-Mail antworten.</p>`, detailHtml: `<div style="margin-top:18px;font-size:13px;"><a style="color:#f9bf21;" href="${MAIL_BRAND.origin}/faq">Hilfe &amp; FAQ</a> · <a style="color:#f9bf21;" href="${MAIL_BRAND.origin}/learning">Learning Portal</a></div>` });
    return { subject: `Re: ${safeText(data.subject, '[Betreff der Anfrage]')}`, html, text: `Guten Tag ${safeText(data.name, '[Name]')},\n\nvielen Dank für Ihre Nachricht an den CAPITAL-AI Support.\n\nZu Ihrer Anfrage „${safeText(data.topic, '[Thema]')}“:\n${safeText(data.answer, '[Antwort / Lösung / Bearbeitungsstand]')}\n\nNächste Schritte:\n${safeText(data.nextSteps, '[Nächste Schritte]')}\n\nSie können direkt antworten.\n${MAIL_BRAND.supportEmail}\n${MAIL_BRAND.origin}/faq` };
  }
  const start = safe(data.start, '[Startdatum]');
  const end = safe(data.end, '[Enddatum]');
  const html = renderBrandedMail({ title: 'Support vorübergehend nicht erreichbar', bodyHtml: `<p>Guten Tag,</p><p>vielen Dank für Ihre Nachricht. Dies ist eine automatische Antwort.</p><p>Unser Support ist vom <strong>${start}</strong> bis einschließlich <strong>${end}</strong> vorübergehend nicht regulär erreichbar.</p><p>Ihre Nachricht ist eingegangen. Die Bearbeitung kann sich verzögern. Eine bestimmte Antwortzeit können wir derzeit nicht zusagen.</p><p>Weitere Informationen finden Sie in unserer <a style="color:#f9bf21;" href="${MAIL_BRAND.origin}/faq">Hilfe &amp; FAQ</a>.</p>` });
  return { subject: 'CAPITAL-AI Support | Automatische Abwesenheitsnotiz', html, text: `Guten Tag,\n\nvielen Dank für Ihre Nachricht. Dies ist eine automatische Antwort.\n\nUnser Support ist vom ${safeText(data.start, '[Startdatum]')} bis einschließlich ${safeText(data.end, '[Enddatum]')} nicht regulär erreichbar. Ihre Nachricht ist eingegangen; die Bearbeitung kann sich verzögern.\n\n${MAIL_BRAND.origin}/faq\n${MAIL_BRAND.supportEmail}` };
}

// Existing inbound course enquiry: operational message to the owner, not a
// customer confirmation, marketing outreach, or proof of successful delivery.
export function renderLearningInquiryMail(message) {
  if (typeof message !== 'string' || message.trim().length < 10 || message.length > 2000) throw new Error('MAIL_LEARNING_INQUIRY_INVALID');
  const trimmed = message.trim();
  return {
    subject: 'Capital-AI Learning-/Kursanfrage',
    text: `Learning-/Kursanfrage\n\n${trimmed}`,
    html: renderBrandedMail({ title: 'Learning-/Kursanfrage', kind: 'transaction', bodyHtml: `<p>Eine neue Learning-/Kursanfrage wurde über das öffentliche Formular übermittelt.</p><p style="white-space:pre-wrap;overflow-wrap:anywhere;">${escapeMailHtml(trimmed)}</p>` }),
  };
}

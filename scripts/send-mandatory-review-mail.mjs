import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { CONTROLLER } from '../shared/legal-identity.mjs';

const MAIL_SHELL = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../supabase/email-templates/capital-ai-auth-email-shell.html');

const escapeHtml = value => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

const renderWebdesignMail = ({ title, reportText, review }) => {
  const shell = readFileSync(MAIL_SHELL, 'utf8');
  const body = `<p style="margin:0 0 14px;">Der aktuelle CAPITAL-AI Pflichtreview ist abgeschlossen.</p><pre style="margin:0;padding:14px;border:1px solid #27304a;border-radius:12px;background:#040816;color:#cbd5e1;white-space:pre-wrap;word-break:break-word;font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;">${escapeHtml(reportText)}</pre>`;
  const detail = `<div style="margin-top:18px;font-size:13px;line-height:1.6;color:#94a3b8;">Production-Handoff: <strong style="color:#f9bf21;">${escapeHtml(review.productionHandoff || 'UNKNOWN')}</strong></div>`;
  const html = shell
    .replaceAll('%%TITLE%%', escapeHtml(title))
    .replace('%%BODY%%', body)
    .replace('%%ACTION%%', '')
    .replace('%%DETAIL%%', detail);
  if (/%%[A-Z_]+%%/.test(html)) throw new Error('MAIL_TEMPLATE_PLACEHOLDER_UNRESOLVED');
  return html;
};

const envFromRender = file => {
  const raw = readFileSync(file);
  if (raw.length > 1024 * 1024) throw new Error('RENDER_ENV_RESPONSE_OVERSIZED');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('RENDER_ENV_RESPONSE_INVALID');
  const out = {};
  for (const item of parsed) {
    const entry = item?.envVar || item;
    if (['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD'].includes(entry?.key) && typeof entry?.value === 'string') out[entry.key] = entry.value;
  }
  return out;
};

export async function sendMandatoryReview({ envFile, reportFile, reviewFile }) {
  const env = envFromRender(envFile);
  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']) {
    if (!env[key]?.trim()) throw new Error(`MISSING_${key}`);
  }
  if (/\s|[/\\]/.test(env.SMTP_HOST)) throw new Error('SMTP_HOST_INVALID');
  const reportText = readFileSync(reportFile, 'utf8');
  if (!reportText || Buffer.byteLength(reportText) > 128 * 1024) throw new Error('REPORT_SIZE_INVALID');
  const review = JSON.parse(readFileSync(reviewFile, 'utf8'));
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: 465,
    secure: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    tls: { rejectUnauthorized: true },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
    logger: false,
    debug: false,
    disableFileAccess: true,
    disableUrlAccess: true,
  });
  try {
    const subject = `[CAPITAL-AI] Pflichtreview ${review.productionHandoff || 'UNKNOWN'} ${String(review.generatedAt || '').slice(0, 10)}`;
    const result = await transport.sendMail({
      from: 'CAPITAL-AI <support@capital-ai.online>',
      to: CONTROLLER.email,
      subject,
      text: reportText,
      html: renderWebdesignMail({ title: 'CAPITAL-AI Pflichtreview', reportText, review }),
    });
    console.log(JSON.stringify({ mailSent: true, accepted: result.accepted?.length || 0, rejected: result.rejected?.length || 0 }));
    if (!result.accepted?.length || result.rejected?.length) throw new Error('SMTP_DELIVERY_NOT_ACCEPTED');
  } finally {
    transport.close();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [envFile, reportFile, reviewFile] = process.argv.slice(2);
  if (!envFile || !reportFile || !reviewFile) throw new Error('Usage: env.json report.txt review.json');
  await sendMandatoryReview({ envFile, reportFile, reviewFile });
}

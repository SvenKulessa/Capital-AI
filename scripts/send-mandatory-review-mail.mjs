import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nodemailer from 'nodemailer';
import { CONTROLLER } from '../shared/legal-identity.mjs';

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
    const result = await transport.sendMail({
      from: 'CAPITAL-AI <support@capital-ai.online>',
      to: CONTROLLER.email,
      subject: `[CAPITAL-AI] Pflichtreview ${review.productionHandoff || 'UNKNOWN'} ${String(review.generatedAt || '').slice(0, 10)}`,
      text: reportText,
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

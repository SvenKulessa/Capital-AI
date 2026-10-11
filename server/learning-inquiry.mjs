import nodemailer from 'nodemailer';
import { createLimiter, readJson } from './http-security.mjs';
import { CONTROLLER } from '../shared/legal-identity.mjs';

export function learningMeasurementId(env) {
  const id = env.GA4_MEASUREMENT_ID || env.GA4_NEASUREMENT_ID || '';
  return env.GA4_ENHANCED_MEASUREMENT_VERIFIED === 'true' && id === 'G-0542DT2HCE' ? id : null;
}

export function createLearningInquiry({ env = process.env, auth, sendMail, now = Date.now } = {}) {
  const perIp = createLimiter(3, 15 * 60_000, 1024, now);
  const globalLimit = createLimiter(30, 60 * 60_000, 1, now);
  const receipts = new Map();
  const configured = !!(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD && !/[\s/\\]/.test(env.SMTP_HOST));
  const deliver = sendMail || (async message => {
    const transport = nodemailer.createTransport({ host: env.SMTP_HOST, port: 465, secure: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD }, tls: { rejectUnauthorized: true },
      connectionTimeout: 7000, greetingTimeout: 7000, socketTimeout: 7000,
      logger: false, debug: false, disableFileAccess: true, disableUrlAccess: true });
    try { return await transport.sendMail(message); } finally { transport.close(); }
  });
  return { async handle(req, res, url, json) {
    if (url.pathname === '/api/public/learning-config') {
      if (req.method !== 'GET') { json(res, 405, { error: 'method_not_allowed' }); return true; }
      res.setHeader('Cache-Control', 'no-store');
      json(res, 200, { measurementId: learningMeasurementId(env), inquiryAvailable: configured }); return true;
    }
    if (url.pathname !== '/api/public/learning-inquiry') return false;
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') { json(res, 405, { error: 'method_not_allowed' }); return true; }
    if (req.headers.origin !== 'https://capital-ai.online') { json(res, 403, { error: 'forbidden_origin' }); return true; }
    if (!configured) { json(res, 503, { error: 'inquiry_unavailable' }); return true; }
    let body;
    try { body = await readJson(req, 8192); } catch { json(res, 400, { error: 'invalid_request' }); return true; }
    if (!body || Object.keys(body).some(k => !['requestId','email','message','website'].includes(k)) ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.requestId || '') ||
      typeof body.email !== 'string' || body.email.length > 254 || !/^[^\s@<>\r\n]+@[^\s@<>\r\n]+\.[^\s@<>\r\n]+$/.test(body.email) ||
      typeof body.message !== 'string' || body.message.trim().length < 10 || body.message.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(body.message) || body.website !== '') {
      json(res, 400, { error: 'invalid_request' }); return true;
    }
    for (const [key, record] of receipts) if (record.until < now()) receipts.delete(key);
    // Cache only the random request key and status, never contact data. Bound concurrent retries too.
    let record = receipts.get(body.requestId);
    if (!record) {
      if (!perIp(req.socket.remoteAddress || 'unknown') || !globalLimit() || receipts.size >= 1024) {
        res.setHeader('Retry-After', '900'); json(res, 429, { error: 'rate_limited' }); return true;
      }
      record = { until: now() + 15 * 60_000, promise: null };
      record.promise = deliver({ from: `Capital-AI <${CONTROLLER.supportEmail}>`, to: CONTROLLER.supportEmail,
        replyTo: body.email, subject: 'Capital-AI Learning-/Kursanfrage',
        text: `Learning-/Kursanfrage\n\n${body.message.trim()}` }).then(result => {
          if (!result.accepted?.some(address => String(address).toLowerCase() === CONTROLLER.supportEmail) || result.rejected?.length) throw new Error('not_accepted');
          return { received: true, receipt: body.requestId, status: 'MAIL_SERVER_ACCEPTED' };
        });
      receipts.set(body.requestId, record);
    }
    try { json(res, 200, await record.promise); } catch { receipts.delete(body.requestId); json(res, 502, { error: 'inquiry_delivery_failed' }); }
    return true;
  } };
}

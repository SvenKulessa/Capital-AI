import { createLimiter, readJson, boundedJson } from './http-security.mjs';

export function createTelegram({ auth, env = process.env, fetchImpl = fetch } = {}) {
  const globalLimit = createLimiter(30), userLimit = createLimiter(5);
  return async (req, res, url, json) => {
    if (url.pathname !== '/api/telegram/send') return false;
    if (req.method !== 'POST') { json(res, 405, { error: 'method_not_allowed' }); return true; }
    if (!auth.sameOrigin(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }
    const session = auth.session(req);
    if (!session) { json(res, 401, { error: 'authentication_required' }); return true; }
    const subjects = (env.TELEGRAM_ALLOWED_SUBJECTS || '').split(',').map(x => x.trim()).filter(Boolean);
    if (!subjects.includes(session.subject)) { json(res, 403, { error: 'telegram_not_authorized' }); return true; }
    if (!globalLimit() || !userLimit(session.subject)) { res.setHeader('Retry-After', '60'); json(res, 429, { error: 'rate_limited' }); return true; }
    if (!/^\d+:[A-Za-z0-9_-]{20,}$/.test(env.TELEGRAM_BOT_TOKEN || '') || !/^-?\d+$/.test(env.TELEGRAM_CHAT_ID || '')) { json(res, 503, { error: 'telegram_not_configured' }); return true; }
    try {
      const body = await readJson(req, 16384);
      if (!body || typeof body.text !== 'string' || !body.text.trim() || body.text.length > 4096 || Object.keys(body).some(key => key !== 'text')) { json(res, 400, { error: 'invalid_message' }); return true; }
      // Fixed destination and plain text: no browser-supplied credentials, recipient or HTML.
      const response = await boundedJson(await fetchImpl(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: body.text, disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000), redirect: 'error',
      }));
      if (response.ok !== true) throw new Error('delivery_failed');
      json(res, 200, { success: true, status: 'DELIVERED' });
    } catch (error) {
      const invalid = ['invalid_json', 'body_too_large', 'body_timeout'].includes(error.message);
      json(res, invalid ? 400 : 502, { error: invalid ? 'invalid_message' : 'telegram_delivery_failed' });
    }
    return true;
  };
}

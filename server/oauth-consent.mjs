/** CAPITAL-AI OAuth 2.1 consent bridge. Supabase remains the OAuth issuer. */
const MAX_FORM_BYTES = 2048;
const AUTH_ID = /^[A-Za-z0-9_-]{8,128}$/;
const CLIENT_ID = /^[A-Za-z0-9_-]{8,128}$/;

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function response(res, status, html) {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  res.end(html);
}

function page(content) {
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>CAPITAL-AI · App-Berechtigung</title></head><body><main><h1>CAPITAL-AI · App-Berechtigung</h1>${content}</main></body></html>`;
}

async function readForm(req) {
  let value = '';
  for await (const part of req) {
    value += part.toString('utf8');
    if (Buffer.byteLength(value) > MAX_FORM_BYTES) throw new Error('form_too_large');
  }
  return new URLSearchParams(value);
}

async function upstream(fetchImpl, endpoint, apiKey, token, origin, method = 'GET', action) {
  const headers = { Accept: 'application/json', apikey: apiKey, Authorization: `Bearer ${token}`, Origin: origin };
  if (action) headers['Content-Type'] = 'application/json';
  const result = await fetchImpl(endpoint, {
    method, headers, body: action ? JSON.stringify({ action }) : undefined,
    redirect: 'error', signal: AbortSignal.timeout(7000),
  });
  if (!result.ok) return { ok: false, data: null };
  const length = Number(result.headers.get('content-length') || '0');
  if (length > 16384) return { ok: false, data: null };
  const body = await result.text();
  if (Buffer.byteLength(body) > 16384) return { ok: false, data: null };
  try { return { ok: true, data: JSON.parse(body) }; }
  catch { return { ok: false, data: null }; }
}

// Supabase may return only redirect_url (already-consented flow), without
// client.id. Bind that case to exact owner-configured callback URIs as well.
function trustedRedirect(value, registeredCallbacks) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const target = new URL(value);
    if (target.protocol !== 'https:' || target.username || target.password || target.hash) return null;
    for (const callback of registeredCallbacks) {
      const base = new URL(callback);
      if (target.origin !== base.origin || target.pathname !== base.pathname) continue;
      const expected = new URLSearchParams(base.search);
      const actual = new URLSearchParams(target.search);
      for (const [key, value] of expected) {
        const index = actual.getAll(key).indexOf(value);
        if (index < 0) return null;
        actual.delete(key, value);
      }
      if ([...actual.keys()].every(key => ['code', 'state', 'error', 'error_description', 'iss'].includes(key))) {
        return target.toString();
      }
    }
    return null;
  } catch { return null; }
}

function redirect(res, location) {
  res.writeHead(303, { Location: location, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' });
  res.end();
}

function displayConsent(details, id) {
  const name = escapeHtml(details.client?.name || 'Unbekannte Anwendung');
  const dest = escapeHtml(details.redirect_uri || 'Nicht angegeben');
  const scopes = String(details.scope || '').trim().split(/\s+/).filter(Boolean).slice(0, 24);
  const permissions = scopes.length
    ? `<ul>${scopes.map(scope => `<li>${escapeHtml(scope.slice(0, 80))}</li>`).join('')}</ul>`
    : '<p>Keine zusätzlichen Berechtigungen angegeben.</p>';
  return page(`<p><strong>${name}</strong> möchte Zugriff auf dein CAPITAL-AI-Konto.</p>` +
    `<p>Registrierte Rücksprungadresse: <code>${dest}</code></p>` +
    `<h2>Angeforderte Berechtigungen</h2>${permissions}` +
    `<form method="POST" action="/oauth/consent"><input type="hidden" name="authorization_id" value="${escapeHtml(id)}">` +
    '<button name="decision" value="deny" type="submit">Ablehnen</button> ' +
    '<button name="decision" value="approve" type="submit">Zugriff erlauben</button></form>' +
    '<p>Diese Freigabe kann später in den Kontoeinstellungen widerrufen werden.</p>');
}

export function createOAuthConsent({ env = process.env, auth, fetchImpl = fetch } = {}) {
  if (!auth || typeof auth.internalAccessToken !== 'function' || typeof auth.verify !== 'function') {
    throw new Error('OAUTH_AUTH_BRIDGE_REQUIRED');
  }
  return {
    async handle(req, res, url) {
      if (url.pathname !== '/oauth/consent') return false;
      if (env.CAPITAL_AI_OAUTH_SERVER_CONSENT_ENABLED !== 'true') {
        response(res, 404, page('<p>Diese Funktion ist nicht verfügbar.</p>'));
        return true;
      }
      if (!['GET', 'POST'].includes(req.method)) {
        res.setHeader('Allow', 'GET, POST');
        response(res, 405, page('<p>Methode nicht unterstützt.</p>'));
        return true;
      }
      const rawOrigin = env.PUBLIC_APP_ORIGIN || '';
      const rawUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
      const apiKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || '';
      const allowed = new Set(String(env.CAPITAL_AI_OAUTH_ALLOWED_CLIENT_IDS || '').split(',').map(x => x.trim()).filter(x => CLIENT_ID.test(x)));
      // Separate exact callback allowlist prevents a pre-approved authorization
      // (OAuthRedirect response has no client ID) from bypassing the client gate.
      const callbacks = new Set(String(env.CAPITAL_AI_OAUTH_ALLOWED_REDIRECT_URIS || '')
        .split(',').map(x => x.trim()).filter(Boolean).filter(x => {
          try {
            const u = new URL(x);
            return u.protocol === 'https:' && !u.username && !u.password && !u.hash;
          } catch { return false; }
        }));
      let origin;
      let issuer;
      try {
        origin = new URL(rawOrigin);
        issuer = new URL(rawUrl);
        if (origin.protocol !== 'https:' || issuer.protocol !== 'https:' || origin.pathname !== '/' || issuer.pathname !== '/' || !apiKey || !allowed.size || !callbacks.size) throw Error();
      } catch {
        response(res, 503, page('<p>OAuth-Server ist noch nicht bereit.</p>'));
        return true;
      }
      if (req.method === 'POST' && (req.headers.origin !== origin.origin || !String(req.headers['content-type'] || '').startsWith('application/x-www-form-urlencoded'))) {
        response(res, 403, page('<p>Unerlaubte Anfrage.</p>'));
        return true;
      }
      let form = null;
      if (req.method === 'POST') {
        try { form = await readForm(req); }
        catch { response(res, 400, page('<p>Ungültige Anfrage.</p>')); return true; }
      }
      const id = req.method === 'POST' ? form.get('authorization_id') : url.searchParams.get('authorization_id');
      if (!id || !AUTH_ID.test(id)) {
        response(res, 400, page('<p>Ungültige OAuth-Anfrage.</p>'));
        return true;
      }
      const identity = await auth.verify(req, res);
      if (!identity) {
        if (req.method === 'GET') redirect(res, `/login?next=${encodeURIComponent('/oauth/consent?authorization_id=' + id)}`);
        else response(res, 401, page('<p>Bitte melde dich erneut an.</p>'));
        return true;
      }
      const token = await auth.internalAccessToken(req, res);
      if (!token) { response(res, 401, page('<p>Ungültige Sitzung.</p>')); return true; }
      try {
        const endpoint = new URL(`/auth/v1/oauth/authorizations/${encodeURIComponent(id)}`, issuer.origin);
        const checked = await upstream(fetchImpl, endpoint, apiKey, token, origin.origin);
        if (!checked.ok || !checked.data) {
          response(res, 502, page('<p>OAuth-Anfrage konnte nicht geprüft werden.</p>'));
          return true;
        }
        if (!('authorization_id' in checked.data)) {
          const target = trustedRedirect(checked.data.redirect_url, callbacks);
          if (target) redirect(res, target);
          else response(res, 502, page('<p>OAuth-Rücksprungziel ungültig.</p>'));
          return true;
        }
        const details = checked.data;
        // Supabase binds the authorization to a concrete user; never approve a
        // different user's pending request under this website session.
        if (details.authorization_id !== id || details.user?.id !== identity.userId) {
          response(res, 403, page('<p>OAuth-Anfrage stimmt nicht mit deiner Sitzung überein.</p>'));
          return true;
        }
        if (!callbacks.has(details.redirect_uri)) {
          response(res, 403, page('<p>Die OAuth-Rücksprungadresse ist nicht zugelassen.</p>'));
          return true;
        }
        if (!CLIENT_ID.test(String(details.client?.id || '')) || !allowed.has(details.client.id)) {
          response(res, 403, page('<p>Diese OAuth-App ist nicht zugelassen.</p>'));
          return true;
        }
        if (req.method === 'GET') {
          response(res, 200, displayConsent(details, id));
          return true;
        }
        const action = form.get('decision');
        if (!['approve', 'deny'].includes(action)) {
          response(res, 400, page('<p>Ungültige Entscheidung.</p>'));
          return true;
        }
        const decision = await upstream(fetchImpl, new URL(endpoint.pathname + '/consent', issuer.origin), apiKey, token, origin.origin, 'POST', action);
        const target = decision.ok ? trustedRedirect(decision.data?.redirect_url, callbacks) : null;
        if (!target) response(res, 502, page('<p>OAuth-Entscheidung konnte nicht verarbeitet werden.</p>'));
        else redirect(res, target);
      } catch {
        response(res, 503, page('<p>OAuth-Dienst vorübergehend nicht verfügbar.</p>'));
      }
      return true;
    },
  };
}

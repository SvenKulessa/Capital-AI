import { boundedJson, createLimiter, readJson, secureUrl } from './http-security.mjs';
import { CONTROLLER, PRIVACY_NOTICE_VERSION, PRIVACY_REQUEST_LABELS } from '../shared/legal-identity.mjs';


function privacyDbConfig(env) {
  try {
    const url = secureUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const key = String(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '');
    if (url.href !== url.origin + '/' || !key) return null;
    if (!/^sb_secret_[A-Za-z0-9_-]{24,}$/.test(key)) {
      const parts = key.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
      if (payload.role !== 'service_role') return null;
    }
    return { origin: url.origin, key };
  } catch {
    return null;
  }
}

function privacyRequestUrl(config, userId, { type = null, activeOnly = false, limit = 20 } = {}) {
  const url = new URL('/rest/v1/privacy_requests', config.origin);
  url.searchParams.set('select', 'id,request_type,status,created_at,due_at');
  url.searchParams.set('user_id', 'eq.' + userId);
  if (type) url.searchParams.set('request_type', 'eq.' + type);
  if (activeOnly) url.searchParams.set('status', 'in.(received,identity_verified,in_progress)');
  url.searchParams.set('order', 'created_at.desc');
  url.searchParams.set('limit', String(limit));
  return url;
}

function publicRequest(row) {
  if (!row || typeof row.id !== 'string' || typeof row.request_type !== 'string' ||
      typeof row.status !== 'string' || typeof row.created_at !== 'string' ||
      typeof row.due_at !== 'string') throw new Error('invalid_privacy_receipt');
  return {
    id: row.id, requestType: row.request_type, status: row.status,
    createdAt: row.created_at, dueAt: row.due_at,
  };
}

/** No client-selected identity: only the server's verified Supabase session is accepted. */
export function createPrivacy({ auth, now = Date.now, env = process.env, fetchImpl = fetch } = {}) {
  const globalLimit = createLimiter(60, 60_000, 1, now);
  const perIdentity = createLimiter(10, 60 * 60_000, 1024, now);
  return async (req, res, url, json) => {
    if (!url.pathname.startsWith('/api/privacy/')) return false;
    const exportRoute = url.pathname === '/api/privacy/export';
    const requestRoute = url.pathname === '/api/privacy/requests';
    if (!exportRoute && !requestRoute) { json(res, 404, { error: 'not_found' }); return true; }
    const validMethod = exportRoute ? req.method === 'GET' : ['GET', 'POST'].includes(req.method);
    if (!validMethod) {
      res.setHeader('Allow', exportRoute ? 'GET' : 'GET, POST');
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (url.search) { json(res, 400, { error: 'unexpected_query' }); return true; }
    if (requestRoute && req.method === 'POST' && !auth.sameOrigin(req)) {
      json(res, 403, { error: 'forbidden_origin' }); return true;
    }
    const session = auth.session(req);
    if (!session) { json(res, 401, { error: 'authentication_required' }); return true; }
    if (!globalLimit() || !perIdentity(JSON.stringify([session.issuer, session.subject]))) {
      res.setHeader('Retry-After', '60'); json(res, 429, { error: 'rate_limited' }); return true;
    }
    if (exportRoute) {
      // Export only known app-side data. Never export cookies, tokens, MFA material,
      // client credentials, provider secrets, or another user's records. This is not a complete Supabase account/Vault backup.
      res.setHeader('Content-Disposition', 'attachment; filename="capital-ai-datenauszug.json"');
      json(res, 200, {
        exportVersion: 1, generatedAt: new Date(now()).toISOString(), privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
        controller: CONTROLLER,
        subject: { issuer: session.issuer, subject: session.subject, name: session.name },
        data: { applicationSession: { expiresAt: new Date(session.expires).toISOString() } },
        scopeNotice: 'Dieser Datenauszug umfasst die verifizierten Identitätsangaben und Sitzungsdaten dieser Anwendung. Er ist kein vollständiger Auskunftsbescheid und enthält insbesondere keine entschlüsselten Vault-Secrets, keine vollständige Supabase-Auth-Historie, keine Finance-Altdaten und keine Postfachkopie.',
        unavailableSources: [
          { source: 'supabaseAuth', reason: 'Die vollständige Supabase-Auth-Historie und Sicherheitsfaktoren sind nicht Bestandteil dieses begrenzten Anwendungsexports.' },
          { source: 'providerVault', reason: 'API-Keys und API-Secrets werden aus Sicherheitsgründen niemals im Datenauszug im Klartext ausgegeben.' },
          { source: 'finance', reason: 'Altdaten werden nicht automatisch anhand einer E-Mail-Adresse einer Supabase-Identität zugeordnet.' },
          { source: 'privacyRequests', reason: 'Anfragen werden separat unter /api/privacy/requests im authentifizierten Konto angezeigt; dieser begrenzte Export enthält keine Anfragetexte.' },
        ],
      });
      return true;
    }
    // Supabase Auth must verify the active user before any register read or write.
    // A signed session cookie alone cannot establish revocation or current MFA state.
    const verified = await auth.verify(req, res);
    if (!verified || verified.userId !== session.subject) {
      json(res, 401, { error: 'authentication_required' }); return true;
    }
    const config = privacyDbConfig(env);
    if (!config) {
      json(res, 503, { error: 'privacy_register_unavailable' }); return true;
    }
    const headers = {
      apikey: config.key,
      Authorization: 'Bearer ' + config.key,
      Accept: 'application/json',
    };
    const requestRows = async (target, options = {}) => {
      const response = await fetchImpl(target, {
        ...options, headers: { ...headers, ...(options.headers || {}) },
        redirect: 'error', signal: AbortSignal.timeout(7000),
      });
      const rows = await boundedJson(response, 32_768);
      if (!Array.isArray(rows)) throw new Error('invalid_privacy_register_response');
      return rows;
    };
    try {
      if (req.method === 'GET') {
        const rows = await requestRows(privacyRequestUrl(config, verified.userId));
        json(res, 200, { requests: rows.map(publicRequest) }); return true;
      }

      const body = await readJson(req, 12288);
      if (!body || Array.isArray(body) || typeof body !== 'object' ||
          Object.keys(body).some(key => !['requestType', 'details'].includes(key)) ||
          typeof body.requestType !== 'string' || !Object.hasOwn(PRIVACY_REQUEST_LABELS, body.requestType) ||
          (body.details !== undefined && (typeof body.details !== 'string' || body.details.length > 2000))) {
        json(res, 400, { error: 'invalid_privacy_request' }); return true;
      }

      // The existing retention process owns the lifecycle. This records a real,
      // trackable request, NOT automatic Stripe cancellation or account deletion.
      const existing = await requestRows(privacyRequestUrl(config, verified.userId, {
        type: body.requestType, activeOnly: true, limit: 1,
      }));
      if (existing.length) {
        json(res, 200, {
          status: 'received', persisted: true, alreadyExists: true,
          request: publicRequest(existing[0]),
          processing: 'managed_review',
        }); return true;
      }

      const insert = new URL('/rest/v1/privacy_requests', config.origin);
      insert.searchParams.set('select', 'id,request_type,status,created_at,due_at');
      const created = await requestRows(insert, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: verified.userId,
          request_type: body.requestType,
          details: body.details?.trim() || null,
        }),
      });
      if (created.length !== 1) throw new Error('privacy_receipt_missing');
      json(res, 202, {
        status: 'received', persisted: true, alreadyExists: false,
        request: publicRequest(created[0]), processing: 'managed_review',
        message: 'Anfrage registriert. Abonnements, Vertragsnachweise und Aufbewahrungspflichten werden vor einer tatsächlichen Löschung geprüft.',
      });
    } catch (error) {
      // Only bad client JSON is a 400. Provider failures must never claim receipt.
      if (error?.message === 'invalid_json' || error?.message === 'body_too_large') {
        json(res, 400, { error: 'invalid_privacy_request' });
      } else {
        json(res, 503, { error: 'privacy_register_unavailable' });
      }
    }
    return true;
  };
}

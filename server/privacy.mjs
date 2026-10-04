import { createLimiter, readJson } from './http-security.mjs';
import { CONTROLLER, PRIVACY_NOTICE_VERSION, PRIVACY_REQUEST_LABELS } from '../shared/legal-identity.mjs';

/** No client-selected identity: only the server's verified Supabase session is accepted. */
export function createPrivacy({ auth, now = Date.now } = {}) {
  const globalLimit = createLimiter(60, 60_000, 1, now);
  const perIdentity = createLimiter(10, 60 * 60_000, 1024, now);
  return async (req, res, url, json) => {
    if (!url.pathname.startsWith('/api/privacy/')) return false;
    const exportRoute = url.pathname === '/api/privacy/export';
    const requestRoute = url.pathname === '/api/privacy/requests';
    if (!exportRoute && !requestRoute) { json(res, 404, { error: 'not_found' }); return true; }
    const method = exportRoute ? 'GET' : 'POST';
    if (req.method !== method) {
      res.setHeader('Allow', method); json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (url.search) { json(res, 400, { error: 'unexpected_query' }); return true; }
    if (requestRoute && !auth.sameOrigin(req)) { json(res, 403, { error: 'forbidden_origin' }); return true; }
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
          { source: 'privacyRequests', reason: 'Anfragen werden per E-Mail bearbeitet; es besteht hier kein persistentes Anfrageregister.' },
        ],
      });
      return true;
    }
    try {
      const body = await readJson(req, 12288);
      if (!body || Array.isArray(body) || typeof body !== 'object' ||
          Object.keys(body).some(key => !['requestType', 'details'].includes(key)) ||
          typeof body.requestType !== 'string' || !Object.hasOwn(PRIVACY_REQUEST_LABELS, body.requestType) ||
          (body.details !== undefined && (typeof body.details !== 'string' || body.details.length > 2000))) {
        json(res, 400, { error: 'invalid_privacy_request' }); return true;
      }
      const subject = `Datenschutzanfrage: ${PRIVACY_REQUEST_LABELS[body.requestType]}`;
      const text = `Anfragetyp: ${PRIVACY_REQUEST_LABELS[body.requestType]}\nSupabase-Aussteller: ${session.issuer}\nBenutzerkennung: ${session.subject}\n\n${body.details?.trim() || ''}`;
      json(res, 200, {
        status: 'email_draft', persisted: false, sent: false,
        mailto: `mailto:${CONTROLLER.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
        message: 'E-Mail-Entwurf vorbereitet. Erst durch Ihren Versand wird die Anfrage übermittelt; eine Löschung oder andere Bearbeitung wird hierdurch nicht ausgeführt.',
      });
    } catch {
      // Do not log request text, verified identities or provider credentials.
      json(res, 400, { error: 'invalid_privacy_request' });
    }
    return true;
  };
}

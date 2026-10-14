// CAPITAL_AI_X_OAUTH_MILESTONE@1 — one owner-initiated, account-bound X post.
// This reuses the existing Social Media Engine X transport and rotating OAuth2
// resolver; it is NOT a second publisher, scheduler or autonomous outreach bot.
import { createHash } from 'node:crypto';
import { createSocialXEdgeClient } from './x-edge-client.mjs';
import { resolveOwnerXCredentials } from './x-article-test.mjs';
import { createSocialProviderPublishTransport } from './provider-publish.mjs';

const BASE = '/api/social-media/x/milestone';
const POST = BASE + '/publish';
const STATUS = BASE + '/status';
const SCRIPT = '/x-milestone-post.js';
const EXPECTED_HANDLE = 'CapitalAIOnline';
const XID = /^[0-9]{1,25}$/;

export const MILESTONE_TEXT = "🚀 Weniger Content-Rauschen, mehr Kontext: CAPITAL-AI verbindet Content Adapter + Social Media Engine. Quellen & Rechte prüfen → Posts/Shorts entwerfen → Freigabe → Nachweis. Start: Daten- und Screener-Blueprints. 🧪 Pilot; keine Anlageberatung. https://capital-ai.online/";
export const MILESTONE_CONTENT_KEY = createHash('sha256').update(MILESTONE_TEXT, 'utf8').digest('hex');
if (MILESTONE_TEXT.length > 280) throw Error('X_MILESTONE_POST_TOO_LONG');
function must(ok, code) { if (!ok) throw Error(code); }

async function boundedProviderRead(fetchImpl, postId, bearer) {
  let response;
  try {
    response = await fetchImpl('https://api.x.com/2/tweets/' + postId + '?tweet.fields=author_id', {
      method: 'GET', headers: { Authorization: 'Bearer ' + bearer, Accept: 'application/json' },
      redirect: 'error', signal: AbortSignal.timeout(13000),
    });
  } catch { throw Error('x_milestone_readback_ambiguous'); }
  const raw = await response.text();
  must(raw.length <= 32768, 'x_milestone_readback_too_large');
  let result;
  try { result = JSON.parse(raw); } catch { throw Error('x_milestone_readback_invalid'); }
  must(response.ok, 'x_milestone_readback_rejected');
  return result;
}

export async function publishXMilestone({ edge, identity, jwt, env, fetchImpl, edgeFactory }) {
  // Refresh/account binding comes BEFORE the unique claim, to avoid consuming
  // the only attempt on an expired-but-recoverable grant.
  const credentials = await resolveOwnerXCredentials({
    edge, identity, jwt, env, fetchImpl, edgeFactory,
  });
  const context = { userId: identity.userId, accountId: credentials.accountId,
    contentKey: MILESTONE_CONTENT_KEY };
  const previous = await edge.invoke('milestone_status', context);
  if (previous.found) return { ...previous, retryPublish: false,
    note: 'existing_receipt_no_automatic_replay',
    ...(XID.test(previous.postId || '') ? {
      url: 'https://x.com/' + EXPECTED_HANDLE + '/status/' + previous.postId,
    } : {}) };
  const claim = await edge.invoke('milestone_claim', context);
  must(claim?.claimed === true, 'x_milestone_already_claimed');
  // Existing transport is enabled only inside this owner-gated, one-shot
  // workload; it does not enable the global unattended Social publisher.
  const transport = createSocialProviderPublishTransport({
    env: { ...env, SOCIAL_PROVIDER_PUBLISH_ENABLED: 'true',
      SOCIAL_X_PUBLISH_ENABLED: 'true' }, fetchImpl,
  });
  const receipt = await transport.submit({ channel: 'X',
    accessToken: credentials.accessToken, metadata: { caption: MILESTONE_TEXT } });
  const postId = receipt?.providerDeliveryId;
  must(receipt?.channel === 'X' && XID.test(postId || ''), 'x_milestone_receipt_invalid');
  await edge.invoke('milestone_record', { ...context, stage: 'post', postId });
  // A provider response is not equivalent to a verified publication.
  const read = await boundedProviderRead(fetchImpl, postId, credentials.accessToken);
  must(read?.data?.id === postId && read?.data?.author_id === credentials.accountId
    && typeof read?.data?.text === 'string' && read.data.text.length > 0,
    'x_milestone_readback_mismatch');
  await edge.invoke('milestone_record', { ...context, stage: 'verify', postId });
  return { found: true, status: 'VERIFIED_PUBLISHED', postId,
    url: 'https://x.com/' + EXPECTED_HANDLE + '/status/' + postId,
    retryPublish: false, refreshed: credentials.refreshed };
}

const PAGE_HTML = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Content + Social Engine: Meilenstein · CAPITAL-AI</title>
<style>
body{margin:0;padding:24px;background:#081025;color:#f5f6ff;font:16px/1.6 system-ui}
main{max-width:760px;margin:auto}h1{color:#f9bf21;line-height:1.22}
a{color:#f9bf21}h2{font-size:1.2rem}
button{font:inherit;padding:12px 18px;min-height:48px;border:0;border-radius:8px;
background:#f9bf21;color:#091027;cursor:pointer;margin:8px 8px 8px 0}
button:disabled{opacity:.48;cursor:not-allowed}
article{border:1px solid #52617b;border-radius:12px;padding:18px;margin:16px 0;
background:#122038}
blockquote{white-space:pre-wrap;margin:1em 0;padding:14px;border-left:4px solid #f9bf21;
background:#0b162c;overflow-wrap:anywhere}
pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #687a97;
padding:14px;border-radius:8px;min-height:50px}
small{color:#cbd5e1}a:focus-visible,button:focus-visible{outline:3px solid #63e4db;outline-offset:4px}
</style></head><body><main>
<p><a href="/studio?tab=content">← Content Studio</a></p>
<h1>CAPITAL-AI · Content &amp; Social Engine</h1>
<p>Ein Meilenstein für unsere modulare Content-Pipeline: Der <strong>Content Adapter</strong>
führt zulässige Quellen und Kontext in redaktionelle Entwürfe über. Die bestehende
<strong>Social Media Engine</strong> liefert die Medien- und Publisher-Bausteine.
An beiden Seiten bleiben Quellen-, Rechte-, Freigabe- und Veröffentlichungsnachweise sichtbar.</p>
<p><strong>Aktueller Stand:</strong> Architektur und erster Owner-only X-Pilot sind implementiert.
Die vollständige kanalübergreifende Automation ist noch nicht als Produktionsbetrieb
nachgewiesen. Die Daten- und Screener-Blueprints dienen als Lern- und Konzeptthema.</p>
<article aria-labelledby="preview-title">
<h2 id="preview-title">X-Meilenstein · Beitragsvorschau</h2>
<blockquote id="post-text">${MILESTONE_TEXT}</blockquote>
<p><small>Vor Veröffentlichung redaktionell zu prüfen. Finanzbildung und technische
Konzepte, keine individuelle Anlageberatung, kein Handelssignal, kein Renditeversprechen.
Externe Marktdaten-/Providerrechte und Live-Performance werden nicht behauptet.</small></p>
</article>
<h2>Einmalige Owner-Veröffentlichung</h2>
<p>Diese Vorschau ist ohne Anmeldung lesbar. Für die Veröffentlichung als
<strong>@CapitalAIOnline</strong> bitte auf <a href="/login">capital-ai.online anmelden</a>,
die bestätigte Owner-Rolle verwenden und danach diese Seite erneut öffnen.</p>
<p>👋⚙️ X API-Schreib- und Lesevorgänge können <strong>Free Credits</strong> verbrauchen.
Guthaben und Autopay-Status sind über diese Seite nicht verifiziert.
Die Anwendung aktiviert weder Zahlungsmethoden noch eine automatische Guthabenaufladung.
Kein automatischer Zweitversuch.</p>
<button id="publish" type="button" disabled>Einmalig auf X veröffentlichen</button>
<button id="status" type="button">Owner-Status prüfen (ohne X-API-Aufruf)</button>
<pre id="result" role="status" aria-live="polite">Owner-Status wird geprüft.</pre>
<p><small>Nur der Owner kann veröffentlichen. Der Status prüft die Quittung in der
eigenen Datenbank; kein öffentliches X-API-Lesen, keine automatische Freigabe.</small></p>
</main><script src="/x-milestone-post.js" defer></script></body></html>`;
const SCRIPT_SOURCE = `'use strict';
const out=document.getElementById('result');
const publish=document.getElementById('publish');
const status=document.getElementById('status');
const statusUrl='/api/social-media/x/milestone/status';
async function probe() {
  publish.disabled=true;
  out.textContent='Prüfe die Owner-Quittung; kein X-API-Aufruf.';
  try {
    const res=await fetch(statusUrl,{credentials:'same-origin',headers:{Accept:'application/json'}});
    const data=await res.json();
    if(res.status===403 || res.status===401) {
      out.textContent='Vorschau verfügbar. Für die Veröffentlichung zuerst unter /login als Owner anmelden.';
      return;
    }
    if(!res.ok) {
      out.textContent='Owner-Status aktuell nicht verfügbar ('+res.status+'). Keine Veröffentlichung möglich.';
      return;
    }
    if(data.found) {
      out.textContent='Bereits beanspruchter Einmalauftrag. Kein erneuter Post. Beleg: '+JSON.stringify(data);
      return;
    }
    out.textContent='Owner bestätigt. Einmaliger Veröffentlichungsauftrag bereit – erst Budget prüfen.';
    publish.disabled=false;
  } catch {
    out.textContent='Status nicht erreichbar. Keine Veröffentlichung möglich; nicht blind wiederholen.';
  }
}
publish.addEventListener('click',async()=>{
  if(publish.disabled)return;
  if(!confirm('Diesen Beitrag genau einmal auf X veröffentlichen? Die X API kann Free Credits verbrauchen. Bei unklarer Antwort keinen zweiten Versuch starten.'))return;
  publish.disabled=true;
  out.textContent='Auftrag eingereicht. Bei unklarem Ergebnis ausschließlich Status prüfen.';
  try {
    const res=await fetch('/api/social-media/x/milestone/publish',
      {method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'}});
    const data=await res.json();
    out.textContent=JSON.stringify({httpStatus:res.status,...data},null,2);
  } catch { out.textContent='Verbindungsfehler. Status prüfen, nicht erneut veröffentlichen.'; }
});
status.addEventListener('click',probe);
probe();
`;
export function createXMilestonePost({ env = process.env, auth, fetchImpl = fetch,
  edgeFactory = createSocialXEdgeClient } = {}) {
  async function handle(req, res, url, json) {
    if (![BASE, POST, STATUS, SCRIPT].includes(url.pathname)) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if ((url.pathname === POST && req.method !== 'POST')
      || (url.pathname !== POST && req.method !== 'GET')) {
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (url.pathname === POST && (!auth?.sameOrigin?.(req)
      || req.headers?.['sec-fetch-site'] !== 'same-origin')) {
      json(res, 403, { error: 'same_origin_required' }); return true;
    }
    // Public read-only preview fixes direct links without an Owner session.
    // The paid POST and the DB receipt/status remain owner-authenticated.
    if (url.pathname === SCRIPT) {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(SCRIPT_SOURCE); return true;
    }
    if (url.pathname === BASE) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE_HTML); return true;
    }
    const identity = await auth?.verify?.(req, res);
    if (!identity?.userId || identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      json(res, 403, { error: 'owner_authorization_required' }); return true;
    }
    if (env.SOCIAL_X_EDGE_STORE_ENABLED !== 'true'
      || env.SOCIAL_X_MILESTONE_POST_ENABLED !== 'true') {
      json(res, 503, { error: 'x_milestone_not_enabled' }); return true;
    }
    if (url.pathname === POST && (env.SOCIAL_X_PAID_WRITE_APPROVED !== 'true'
      || env.SOCIAL_X_PAID_READ_APPROVED !== 'true')) {
      json(res, 403, { error: 'x_milestone_cost_approval_missing' }); return true;
    }
    try {
      const jwt = await auth?.internalAccessToken?.(req, res);
      const edge = edgeFactory({ env, fetchImpl, channel: 'X', userAccessToken: jwt });
      if (url.pathname === STATUS) {
        const account = await edge.invoke('x_credentials', { userId: identity.userId });
        must(account?.handle === EXPECTED_HANDLE && XID.test(account?.accountId || ''),
          'x_wrong_connected_account');
        const receipt = await edge.invoke('milestone_status', {
          userId: identity.userId, accountId: account.accountId,
          contentKey: MILESTONE_CONTENT_KEY,
        });
        json(res, 200, { ...receipt, retryPublish: false,
          ...(XID.test(receipt.postId || '') ? {
            url: 'https://x.com/' + EXPECTED_HANDLE + '/status/' + receipt.postId,
          } : {}) });
        return true;
      }
      const receipt = await publishXMilestone({
        edge, identity, jwt, env, fetchImpl, edgeFactory,
      });
      json(res, receipt.status === 'VERIFIED_PUBLISHED' ? 200 : 409, receipt);
    } catch (error) {
      const exposed = ['x_reconnect_required', 'x_wrong_connected_account',
        'x_milestone_already_claimed', 'x_milestone_readback_mismatch',
        'x_refresh_not_available'];
      json(res, 503, { error: exposed.includes(error?.message)
        ? error.message : 'x_milestone_result_unconfirmed',
        retryPublish: false, statusUrl: STATUS });
    }
    return true;
  }
  return Object.freeze({ handle });
}

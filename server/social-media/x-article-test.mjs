// CAPITAL_AI_X_ARTICLE_TEST@1 — one owner-initiated Article, no automatic replay.
// A X Console spend limit is external: never claim to enforce a live $20 balance.
import { createHash } from 'node:crypto';
import { createSocialXEdgeClient } from './x-edge-client.mjs';
import { refreshOwnerXForWorkload, unsealOwnerXAccess } from './owner-token-refresh.mjs';

const PAGE = '/api/social-media/x/article-test';
const POST = PAGE + '/publish';
const STATUS = PAGE + '/status';
const SCRIPT = '/x-article-test.js';
const EXPECTED_HANDLE = 'CapitalAIOnline';
const XID = /^[0-9]{1,25}$/;
const blocks = [
  'Chartanalyse ohne Signal-Mythen: 5 Fragen vor jedem Indikator',
  'Ein Trading-Chart kann eindeutig wirken: eine grüne Kerze, ein kreuzender Durchschnitt, ein RSI im Extrembereich. Einzelne Beobachtungen sind aber kein verlässliches Handelssignal. Erst der Kontext macht eine Analyse nachvollziehbar.',
  '1. Welchen Zeitraum untersuche ich?',
  'Eine 5-Minuten-Kerze zeigt etwas anderes als eine Tageskerze. Kurze Intervalle enthalten viel Rauschen, größere Intervalle zeigen die übergeordnete Struktur. Prüfe erst den Tages- oder 4-Stunden-Chart und zoome danach für Details hinein.',
  '2. Was sagen die Candlesticks tatsächlich?',
  'Eine Kerze zeigt Eröffnung, Hoch, Tief und Schluss. Ein langer oberer Schatten kann auf Ablehnung eines Preisbereichs hindeuten, ist aber kein Beweis für eine Umkehr. Achte auf den vorherigen Trend, mögliche Unterstützungs- und Widerstandszonen und eine spätere Bestätigung.',
  '3. Gibt es einen Trend – oder nur Rauschen?',
  'Ein exponentieller gleitender Durchschnitt (EMA) glättet vergangene Kurse und macht eine Trendrichtung leichter erkennbar. Er reagiert verzögert und liefert in Seitwärtsmärkten häufig irreführende Kreuzungen. Beurteile deshalb auch Hochs, Tiefs und Preisstruktur.',
  '4. Wie stark schwankt der Markt?',
  'Der RSI beschreibt Momentum; ein hoher RSI bedeutet nicht automatisch, dass ein Kurs unmittelbar fällt. Die Average True Range (ATR) beschreibt Schwankungsbreite, nicht Richtung. Beide Indikatoren beantworten unterschiedliche Fragen und sind keine Prognosegarantie.',
  '5. Was würde meine Annahme widerlegen?',
  'Notiere vor einer Interpretation ein Gegenargument: Fällt der Kurs unter einen wichtigen Bereich? Fehlt eine Bestätigung? Ist das Handelsvolumen zuverlässig? Unsicherheit ist ein Ergebnis der Analyse, kein Fehler, den mehr Indikatoren beseitigen.',
  'Lern-Workflow: 1. übergeordnetes Zeitfenster wählen; 2. Candlesticks und Preisstruktur prüfen; 3. einen EMA und einen RSI ergänzen; 4. ATR als Volatilitätskontext betrachten; 5. eine alternative Erklärung dokumentieren.',
  'Mehr Finanzbildung und Lerninhalte: https://capital-ai.online/learning-platform',
  'Dieser Beitrag dient ausschließlich der allgemeinen Finanzbildung. Keine individuelle Anlageberatung, keine Handelsaufforderung, keine Rendite- oder Erfolgsgarantie. Anlagen können zu Verlusten führen.',
];
export const ARTICLE = Object.freeze({
  title: 'Chartanalyse ohne Signal-Mythen: 5 Fragen vor jedem Indikator',
  content_state: { blocks: blocks.map(text => ({ text, type: 'unstyled' })), entities: [] },
});
export const CONTENT_KEY = createHash('sha256').update(JSON.stringify(ARTICLE)).digest('hex');
function must(ok, message) { if (!ok) throw Error(message); }
async function providerJson(fetchImpl, uri, init) {
  let response;
  try { response = await fetchImpl(uri, { ...init, redirect: 'error',
    signal: AbortSignal.timeout(13000) }); }
  catch { throw Error('x_provider_network_ambiguous'); }
  const body = await response.text();
  must(body.length <= 32768, 'x_provider_response_too_large');
  let data;
  try { data = JSON.parse(body); } catch { throw Error('x_provider_invalid_json'); }
  // No provider errors/headers or token material in client responses.
  must(response.ok, 'x_provider_rejected');
  return data;
}
async function credentials({ edge, identity, jwt, env, fetchImpl, edgeFactory }) {
  let row = await edge.invoke('x_credentials', { userId: identity.userId });
  must(row?.handle === EXPECTED_HANDLE && XID.test(row?.accountId || '')
    && typeof row?.accessCipher === 'string', 'x_wrong_connected_account');
  let refreshed = false;
  if (Date.parse(row.expiresAt) <= Date.now() + 300000) {
    const result = await refreshOwnerXForWorkload({
      env, userId: identity.userId, userAccessToken: jwt, fetchImpl, edgeFactory });
    must(result.httpStatus === 200 && result.body.refreshed === true,
      result.body.status === 'reconnect_required' ? 'x_reconnect_required' : 'x_refresh_not_available');
    const fresh = await edge.invoke('x_credentials', { userId: identity.userId });
    must(fresh.accountId === row.accountId && fresh.handle === EXPECTED_HANDLE,
      'x_account_changed_after_refresh');
    row = fresh;
    refreshed = true;
  }
  must(Date.parse(row.expiresAt) > Date.now() + 120000
    && row.leaseActive !== true, 'x_access_not_current');
  return { accessToken: unsealOwnerXAccess(row.accessCipher, identity.userId, env),
    accountId: row.accountId, refreshed };
}
async function publish({ edge, identity, jwt, env, fetchImpl, edgeFactory }) {
  const secret = await credentials({ edge, identity, jwt, env, fetchImpl, edgeFactory });
  const context = { userId: identity.userId, accountId: secret.accountId,
    contentKey: CONTENT_KEY };
  const previous = await edge.invoke('article_status', context);
  if (previous.found) return { ...previous, retryPublish: false,
    note: 'existing_receipt_no_automatic_replay' };
  // Atomic claim precedes any billed Article mutation, including provider timeouts.
  const claim = await edge.invoke('article_claim', context);
  must(claim?.claimed === true, 'x_article_already_claimed');
  const authHeader = { Authorization: 'Bearer ' + secret.accessToken };
  const draft = await providerJson(fetchImpl, 'https://api.x.com/2/articles/draft', {
    method: 'POST', headers: { ...authHeader, 'Content-Type': 'application/json' },
    body: JSON.stringify(ARTICLE),
  });
  const articleId = draft?.data?.id;
  must(XID.test(articleId || ''), 'x_draft_receipt_invalid');
  await edge.invoke('article_record', { ...context, stage: 'draft', articleId });
  const posted = await providerJson(fetchImpl,
    'https://api.x.com/2/articles/' + articleId + '/publish',
    { method: 'POST', headers: authHeader });
  const postId = posted?.data?.post_id;
  must(XID.test(postId || ''), 'x_post_receipt_invalid');
  await edge.invoke('article_record', { ...context, stage: 'post', articleId, postId });
  // A readback is charged separately by X, guarded by the explicit read approval.
  const data = await providerJson(fetchImpl,
    'https://api.x.com/2/tweets/' + postId + '?tweet.fields=author_id,article',
    { method: 'GET', headers: authHeader });
  must(data?.data?.id === postId && data?.data?.author_id === secret.accountId
    && (!data.data.article?.id || data.data.article.id === articleId),
    'x_post_readback_mismatch');
  await edge.invoke('article_record', { ...context, stage: 'verify', articleId, postId });
  return { status: 'VERIFIED_PUBLISHED', articleId, postId,
    url: 'https://x.com/' + EXPECTED_HANDLE + '/status/' + postId,
    refreshed: secret.refreshed, retryPublish: false };
}
const PAGE_HTML = `<!doctype html><html lang="de"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>X-Artikeltest | CAPITAL AI</title>
<style>body{background:#091126;color:#fafbff;font:17px/1.6 system-ui;padding:24px}
main{max-width:720px;margin:auto}h1{color:#fac743}button,a{font:inherit}
button{padding:14px;border:0;border-radius:7px;min-height:48px;cursor:pointer}
pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #98a5bf;padding:14px}</style>
<main><h1>CAPITAL AI – einmaliger X-Artikeltest</h1>
<p>Account: @CapitalAIOnline. Artikel: Chartanalyse ohne Signal-Mythen.
Bei Bedarf wird das X-Token automatisch erneuert. Dieser Vorgang kann
abrechenbare X-API-Aufrufe auslösen. Das tatsächliche Restguthaben ist
nicht über diese Oberfläche verifiziert. Ein X-Console-Ausgabenlimit ist erforderlich.</p>
<button id="publish" type="button">Einmalig öffentlich auf X veröffentlichen</button>
<button id="status" type="button">Beleg prüfen (ohne X-API-Aufruf)</button>
<pre id="result" role="status" aria-live="polite">Noch kein Auftrag ausgelöst.</pre>
<script src="/x-article-test.js" defer></script></main></html>`;
const SCRIPT_SOURCE = `'use strict';
const out=document.getElementById('result');
for(const [id,path,method] of [
  ['publish','/api/social-media/x/article-test/publish','POST'],
  ['status','/api/social-media/x/article-test/status','GET'],
]){
  document.getElementById(id).addEventListener('click',async()=>{
    out.textContent='Anfrage läuft. Bei unklarem Ergebnis keinen zweiten Upload auslösen.';
    try {
      const response=await fetch(path,{method,credentials:'same-origin',
        ...(method==='POST'?{headers:{'Content-Type':'application/json'}}:{})});
      const result=await response.json();
      out.textContent=JSON.stringify({httpStatus:response.status,...result},null,2);
    } catch {
      out.textContent='Netzwerkfehler. Beleg prüfen, nicht erneut veröffentlichen.';
    }
  });
}
`;
export function createXArticleTest({ env = process.env, auth, fetchImpl = fetch,
  edgeFactory = createSocialXEdgeClient } = {}) {
  async function handle(req, res, url, json) {
    if (![PAGE, POST, STATUS, SCRIPT].includes(url.pathname)) return false;
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
    const identity = await auth?.verify?.(req, res);
    if (!identity?.userId || identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      json(res, 403, { error: 'owner_authorization_required' }); return true;
    }
    if (url.pathname === SCRIPT) {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(SCRIPT_SOURCE); return true;
    }
    if (url.pathname === PAGE) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE_HTML); return true;
    }
    if (env.SOCIAL_X_EDGE_STORE_ENABLED !== 'true'
      || env.SOCIAL_X_ARTICLE_TEST_ENABLED !== 'true') {
      json(res, 503, { error: 'x_article_test_not_enabled' }); return true;
    }
    if (url.pathname === POST
      && (env.SOCIAL_X_PAID_WRITE_APPROVED !== 'true'
        || env.SOCIAL_X_PAID_READ_APPROVED !== 'true')) {
      json(res, 403, { error: 'x_article_cost_approval_missing' }); return true;
    }
    try {
      const jwt = await auth?.internalAccessToken?.(req, res);
      const edge = edgeFactory({ env, fetchImpl, channel: 'X', userAccessToken: jwt });
      if (url.pathname === STATUS) {
        const account = await edge.invoke('x_credentials', { userId: identity.userId });
        must(account?.handle === EXPECTED_HANDLE && XID.test(account?.accountId || ''),
          'x_wrong_connected_account');
        const receipt = await edge.invoke('article_status', {
          userId: identity.userId, accountId: account.accountId, contentKey: CONTENT_KEY });
        json(res, 200, { ...receipt, retryPublish: false,
          ...(receipt.status === 'VERIFIED_PUBLISHED'
            ? { url: 'https://x.com/' + EXPECTED_HANDLE + '/status/' + receipt.postId } : {}) });
        return true;
      }
      const result = await publish({ edge, identity, jwt, env, fetchImpl, edgeFactory });
      json(res, result.status === 'VERIFIED_PUBLISHED' ? 200 : 409, result);
    } catch (error) {
      const exposed = ['x_reconnect_required', 'x_article_already_claimed',
        'x_wrong_connected_account', 'x_post_readback_mismatch', 'x_refresh_not_available'];
      json(res, 503, { error: exposed.includes(error?.message)
        ? error.message : 'x_article_result_unconfirmed',
        retryPublish: false,
        statusUrl: STATUS });
    }
    return true;
  }
  return Object.freeze({ handle });
}

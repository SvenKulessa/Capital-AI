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

export const MILESTONE_TEXT = '🚀 CAPITAL-AI Meilenstein: X-URL-Context ist in der Content Engine implementiert. Öffentliche Posts liefern Recherchekontext; OAuth2-Publishing bleibt separat.\n\nUnsere Vision: transparente Datenpipelines, nachvollziehbare Scores und Finanzbildung.\n\nhttps://capital-ai.online/';
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
<title>OAuth2-Meilenstein · CAPITAL-AI</title>
<style>body{background:#081025;color:#f5f6ff;font:16px/1.6 system-ui;margin:0;padding:24px}
main{max-width:720px;margin:auto}h1{color:#f9bf21}button{padding:14px;min-height:48px;
background:#f9bf21;color:#081025;border:0;border-radius:8px;cursor:pointer;font:inherit}
button:disabled{opacity:.5}pre{padding:14px;border:1px solid #94a3b8;white-space:pre-wrap;
overflow-wrap:anywhere}article{border:1px solid #465166;border-radius:12px;padding:18px;margin:16px 0}
a{color:#f9bf21}p{line-height:1.7}</style></head><body><main>
<h1>CAPITAL-AI · erster X-OAuth2-Meilenstein</h1>
<p>Zielkonto: <strong>@CapitalAIOnline</strong>. Einmalige, ausdrücklich ausgelöste
Veröffentlichung über den bestehenden X-Publisher der Social Media Engine.
Die Verbindung wird bei Bedarf per OAuth2 erneuert.</p>
<article><h2>Exakter Kurzpost</h2><p>${MILESTONE_TEXT}</p></article>
<p>Die X API kann Kosten für den Post, den Readback und gegebenenfalls die
Token-Erneuerung verursachen. Guthaben und 20-USD-X-Console-Limit sind hier
nicht verifiziert. Vor dem Klick im X Developer Portal prüfen. Kein automatischer
Zweitversuch bei unklarem Ergebnis.</p>
<button id="publish" type="button">Meilenstein einmalig auf X posten</button>
<button id="status" type="button">Beleg prüfen (ohne X-Kosten)</button>
<pre id="result" role="status" aria-live="polite">Noch nicht veröffentlicht.</pre>
<p><a href="/api/social-media/x/article-test">Separater X-Artikeltest</a></p>
<script src="/x-milestone-post.js" defer></script></main></body></html>`;
const SCRIPT_SOURCE = `'use strict';
const out=document.getElementById('result');
for(const [id,path,method] of [
  ['publish','/api/social-media/x/milestone/publish','POST'],
  ['status','/api/social-media/x/milestone/status','GET'],
]) {
  document.getElementById(id).addEventListener('click',async()=>{
    if(method==='POST') document.getElementById('publish').disabled=true;
    out.textContent='Prüfe den Beleg bei unklarem Ergebnis; keinen zweiten Post auslösen.';
    try {
      const res=await fetch(path,{method,credentials:'same-origin',
        ...(method==='POST'?{headers:{'Content-Type':'application/json'}}:{})});
      const data=await res.json();
      out.textContent=JSON.stringify({httpStatus:res.status,...data},null,2);
    } catch { out.textContent='Verbindungsfehler. Status prüfen, nicht erneut posten.'; }
  });
}`;

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
    const identity = await auth?.verify?.(req, res);
    if (!identity?.userId || identity.emailVerified !== true
      || await auth?.authorizeIamRole?.(req, res, 'owner') !== true) {
      json(res, 403, { error: 'owner_authorization_required' }); return true;
    }
    if (url.pathname === SCRIPT) {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(SCRIPT_SOURCE); return true;
    }
    if (url.pathname === BASE) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE_HTML); return true;
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

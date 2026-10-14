// CAPITAL_AI_X_URL_CONTEXT@1
// X is an explicit URL_CONTEXT source within the existing Content Engine,
// not a second Social publisher, spider, follow bot or outreach authority.
// Only the verified Owner can request one billed OAuth2 read of an exact URL.
import { createHash } from 'node:crypto';
import { parseXPostUrl } from '../../shared/x-url-context.mjs';
import { createSocialXEdgeClient } from './x-edge-client.mjs';
import { resolveOwnerXCredentials } from './x-article-test.mjs';

const PAGE = '/api/social-media/x/url-context';
const SCRIPT = '/x-url-context.js';
const ID = /^[0-9]{1,25}$/;

function ensure(value, code) {
  if (!value) throw Error(code);
}

export function normalizeXPostContext(sourceUrl, response, retrievedAt = new Date().toISOString()) {
  const source = parseXPostUrl(sourceUrl);
  const post = response?.data;
  ensure(post?.id === source.postId && ID.test(post?.author_id ?? '')
      && typeof post?.text === 'string' && post.text.trim().length > 0
      && post.text.length <= 32000 && post.possibly_sensitive !== true
      && !post.withheld, 'GROWTH_X_CONTEXT_POST_READBACK_INVALID');
  const author = response?.includes?.users?.find(user => user?.id === post.author_id);
  ensure(author && typeof author.username === 'string'
      && author.username.toLowerCase() === source.username.toLowerCase()
      && author.protected !== true && Number.isFinite(Date.parse(retrievedAt)),
    'GROWTH_X_CONTEXT_AUTHOR_UNVERIFIED');
  const text = typeof post.note_tweet?.text === 'string' && post.note_tweet.text.trim()
    ? post.note_tweet.text : post.text;
  ensure(typeof text === 'string' && text.length <= 32000 && text.trim(),
    'GROWTH_X_CONTEXT_TEXT_INVALID');
  const textExcerpt = text.slice(0, 1500);
  return Object.freeze({
    schema: 'CAPITAL_AI_X_URL_CONTEXT@1',
    role: 'URL_CONTEXT',
    source: source.canonicalUrl,
    sourceProvider: 'X',
    sourcePostId: source.postId,
    author: '@' + author.username,
    createdAt: Number.isFinite(Date.parse(post.created_at ?? '')) ? post.created_at : null,
    retrievedAt,
    textExcerpt,
    truncated: text.length > textExcerpt.length,
    excerptSha256: createHash('sha256').update(textExcerpt, 'utf8').digest('hex'),
    contentState: 'UNTRUSTED_EXTERNAL_CONTEXT',
    claimsStatus: 'REVIEW_REQUIRED',
    rightsStatus: 'REVIEW_REQUIRED',
    publicPublishAllowed: false,
    canAutoContactAuthor: false,
    canAutoFollowAuthor: false,
    downstream: 'CONTENT_ENGINE_URL_CONTEXT_DRAFT_ONLY',
    // No provider metrics, personal attributes, private account info or grant.
  });
}

async function bodyJson(req) {
  ensure(req.headers?.['content-type']?.split(';')[0] === 'application/json',
    'GROWTH_X_CONTEXT_CONTENT_TYPE_REQUIRED');
  let bytes = 0; const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    ensure(bytes <= 1024, 'GROWTH_X_CONTEXT_BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  let body;
  try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw Error('GROWTH_X_CONTEXT_JSON_INVALID'); }
  ensure(body && Object.keys(body).length === 1 && typeof body.url === 'string',
    'GROWTH_X_CONTEXT_REQUEST_INVALID');
  return parseXPostUrl(body.url);
}

async function getXPostContext(fetchImpl, source, accessToken) {
  const uri = 'https://api.x.com/2/tweets/' + source.postId
    + '?tweet.fields=author_id,created_at,possibly_sensitive,note_tweet'
    + '&expansions=author_id&user.fields=username,protected';
  let response;
  try {
    response = await fetchImpl(uri, { method: 'GET', redirect: 'error',
      headers: { Authorization: 'Bearer ' + accessToken },
      signal: AbortSignal.timeout(12000) });
  } catch { throw Error('GROWTH_X_CONTEXT_READ_UNAVAILABLE'); }
  const text = await response.text();
  ensure(text.length <= 65536, 'GROWTH_X_CONTEXT_RESPONSE_TOO_LARGE');
  ensure(response.ok, 'GROWTH_X_CONTEXT_PROVIDER_UNAVAILABLE');
  let data;
  try { data = JSON.parse(text); }
  catch { throw Error('GROWTH_X_CONTEXT_JSON_UNAVAILABLE'); }
  return normalizeXPostContext(source.canonicalUrl, data);
}

const PAGE_HTML = `<!doctype html><html lang="de"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>X als URL Context | CAPITAL AI</title>
<style>
body{margin:0;padding:24px;background:#080e1c;color:#edf3ff;font:16px/1.5 system-ui}
main{max-width:780px;margin:auto}h1{color:#f9bf21}
label{display:block;font-weight:700;margin:24px 0 8px}
input{width:100%;box-sizing:border-box;padding:14px;background:#111d34;color:white;border:1px solid #a1aabc;border-radius:8px}
button{padding:14px 20px;min-height:48px;border:0;border-radius:9px;background:#f9bf21;color:#121820;font:inherit;font-weight:700;cursor:pointer;margin:16px 0}
pre{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #7886a4;border-radius:8px;padding:18px}
a{color:#f9bf21}
</style>
<main><h1>X-Post als URL Context</h1>
<p>Ein exakt angegebener öffentlicher Post wird einmalig über den bestehenden Owner-OAuth2-Zugang gelesen und als Quellen-Evidence für die Content Engine vorbereitet. Der Readback ist gebührenpflichtig; kein Crawling und kein automatisches Publizieren.</p>
<label for="source">Öffentliche X-Post-URL</label>
<input id="source" type="url" maxlength="220" placeholder="https://x.com/CapitalAIOnline/status/1234567890123456789" autocomplete="off" spellcheck="false">
<button type="button" id="read">Post-Kontext explizit lesen</button>
<pre id="result" role="status" aria-live="polite">Noch kein Abruf. Der Content Autopilot übernimmt nur redaktionell geprüfte Quellen.</pre>
<p><a href="/studio">Zurück zum Content Studio</a></p>
</main><script defer src="/x-url-context.js"></script></html>`;
const SCRIPT_SOURCE = `'use strict';
const button=document.getElementById('read');
const result=document.getElementById('result');
button.addEventListener('click',async()=>{
  button.disabled=true;
  result.textContent='Ein einzelner X-Post wird gelesen; Providerkosten können anfallen.';
  try{
    const response=await fetch('/api/social-media/x/url-context',{
      method:'POST',credentials:'same-origin',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({url:document.getElementById('source').value})
    });
    const data=await response.json();
    result.textContent=JSON.stringify({httpStatus:response.status,...data},null,2);
  }catch{
    result.textContent='Kontext nicht verifiziert. Keine externe Folgeaktion wurde ausgelöst.';
  }finally{button.disabled=false}
});
`;

export function createXUrlContext({
  env = process.env, auth, fetchImpl = fetch, edgeFactory = createSocialXEdgeClient,
  resolveCredentials = resolveOwnerXCredentials,
} = {}) {
  async function handle(req, res, url, json) {
    if (![PAGE, SCRIPT].includes(url.pathname)) return false;
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (url.pathname === SCRIPT && req.method !== 'GET'
        || url.pathname === PAGE && !['GET','POST'].includes(req.method)) {
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (req.method === 'POST' && (!auth?.sameOrigin?.(req)
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
    if (req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(PAGE_HTML); return true;
    }
    if (env.SOCIAL_X_EDGE_STORE_ENABLED !== 'true'
        || env.SOCIAL_X_PAID_READ_APPROVED !== 'true') {
      json(res, 403, { error: 'x_context_paid_read_not_approved' }); return true;
    }
    try {
      const source = await bodyJson(req); // reject before any paid network call
      const jwt = await auth?.internalAccessToken?.(req, res);
      const edge = edgeFactory({ env, fetchImpl, channel: 'X',
        userAccessToken: jwt });
      const credentials = await resolveCredentials({
        edge, identity, jwt, env, fetchImpl, edgeFactory });
      ensure(credentials?.accountId && credentials?.accessToken,
        'GROWTH_X_CONTEXT_ACCOUNT_UNVERIFIED');
      const context = await getXPostContext(fetchImpl, source, credentials.accessToken);
      json(res, 200, context);
    } catch {
      // Fail closed; provider bodies and credentials never reach browser/log.
      json(res, 503, { error: 'x_url_context_unavailable',
        published: false, externalWrites: 0 });
    }
    return true;
  }
  return Object.freeze({ handle });
}

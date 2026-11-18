// CAPITAL_AI_X_OAUTH_MILESTONE@1 — one owner-initiated, account-bound X post.
// This reuses the existing Social Media Engine X transport and rotating OAuth2
// resolver; it is NOT a second publisher, scheduler or autonomous outreach bot.
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createSocialXEdgeClient } from './x-edge-client.mjs';
import { resolveOwnerXCredentials } from './x-article-test.mjs';
import { createSocialProviderPublishTransport } from './provider-publish.mjs';

const BASE = '/api/social-media/x/milestone';
const POST = BASE + '/publish';
const STATUS = BASE + '/status';
const SCRIPT = '/x-milestone-post.js';
const EXPECTED_HANDLE = 'CapitalAIOnline';
const PUBLISH_CHANNEL = 'X_PUBLISH';
const XID = /^[0-9]{1,25}$/;

const LAUNCH = BASE + '/launch';
const LAUNCH_POST = LAUNCH + '/publish';
const LAUNCH_STATUS = LAUNCH + '/status';
const LAUNCH_SCRIPT = '/x-milestone-launch.js';
const LAUNCH_MEDIA_PATH = 'public/branding/social/CAPITAL-AI-Universe-X-Launch-Final-20261115.png';
export const LAUNCH_MEDIA_SHA256 = '08886b933be8a162de0fe678c13fd2e610348ba827aaec25179b623e969809f1';
export const LAUNCH_TEXT = [
  '🚀 Finanzdaten überall. Aber was bedeuten sie? 🌌', '',
  'Willkommen bei CAPITAL-AI:',
  '📚 Learning Hub · Wissen',
  '📊 Analytics Hub · Methoden',
  '🔎 Studio Hub · Daten verstehen',
  '🎬 Content Engine · Inhalte', '',
  'Das ist erst der Anfang … 👀',
  '👉 https://capital-ai.online/learning', '', '#FinTech',
].join('\n');
export const LAUNCH_CONTENT_KEY = createHash('sha256')
  .update('capital-ai-x-launch-v1\n' + LAUNCH_TEXT + '\n' + LAUNCH_MEDIA_SHA256)
  .digest('hex');
if (LAUNCH_TEXT.length > 280) throw Error('X_LAUNCH_POST_TOO_LONG');

export function assertPinnedLaunchMedia(bytes) {
  const pngHeader = Buffer.from([137,80,78,71,13,10,26,10]);
  if (!Buffer.isBuffer(bytes) || bytes.length < 24 || bytes.length > 5*1024*1024
    || !bytes.subarray(0,8).equals(pngHeader)) throw Error('x_launch_image_invalid');
  if (createHash('sha256').update(bytes).digest('hex') !== LAUNCH_MEDIA_SHA256)
    throw Error('x_launch_image_sha_mismatch');
  return bytes;
}
async function loadPinnedLaunchMedia() {
  // No user URL, remote fetch, supplied path, symlink or filesystem traversal.
  const file = resolve(process.cwd(), LAUNCH_MEDIA_PATH);
  let info;
  try { info = await lstat(file); }
  catch { throw Error('x_launch_image_not_provisioned'); }
  if (!info.isFile() || info.isSymbolicLink() || info.size > 5*1024*1024)
    throw Error('x_launch_image_invalid');
  return assertPinnedLaunchMedia(await readFile(file));
}


export const MILESTONE_TEXT = "🚀 Weniger Content-Rauschen, mehr Kontext: CAPITAL-AI verbindet Content Adapter + Social Media Engine. Quellen & Rechte prüfen → Posts/Shorts entwerfen → Freigabe → Nachweis. Start: Daten- und Screener-Blueprints. 🧪 Pilot; keine Anlageberatung. https://capital-ai.online/";
export const MILESTONE_CONTENT_KEY = createHash('sha256').update(MILESTONE_TEXT, 'utf8').digest('hex');
if (MILESTONE_TEXT.length > 280) throw Error('X_MILESTONE_POST_TOO_LONG');
function must(ok, code) { if (!ok) throw Error(code); }

async function boundedProviderRead(fetchImpl, postId, bearer, launch = false) {
  let response;
  try {
    response = await fetchImpl('https://api.x.com/2/tweets/' + postId + (launch ? '?tweet.fields=author_id,attachments' : '?tweet.fields=author_id'), {
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

export async function publishXMilestone({
  edge, identity, jwt, env, fetchImpl, edgeFactory,
  launch = false, launchMediaLoader = loadPinnedLaunchMedia,
}) {
  let mediaBytes = null;
  if (launch) {
    must(env.SOCIAL_X_MILESTONE_MEDIA_ENABLED === 'true', 'x_launch_media_disabled');
    must(env.SOCIAL_X_MEDIA_UPLOAD_ENABLED === 'true'
      && env.SOCIAL_X_PAID_MEDIA_APPROVED === 'true',
      'x_launch_media_cost_approval_missing');
    // Validate exact bytes and scope BEFORE claim and before provider API requests.
    mediaBytes = assertPinnedLaunchMedia(await launchMediaLoader());
    const scope = await edge.invoke('x_credentials', { userId: identity.userId });
    must(scope?.mediaWriteApproved === true, 'x_media_write_scope_missing');
  }
  // Existing rotating owner OAuth and account identity are resolved before claim.
  const credentials = await resolveOwnerXCredentials({
    edge, identity, jwt, env, fetchImpl, edgeFactory,
  });
  const contentText = launch ? LAUNCH_TEXT : MILESTONE_TEXT;
  const context = { userId: identity.userId, accountId: credentials.accountId,
    contentKey: launch ? LAUNCH_CONTENT_KEY : MILESTONE_CONTENT_KEY };
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
    accessToken: credentials.accessToken, metadata: { caption: contentText },
    ...(launch ? { mediaBytes, mediaSha256: LAUNCH_MEDIA_SHA256 } : {}) });
  const postId = receipt?.providerDeliveryId;
  must(receipt?.channel === 'X' && XID.test(postId || ''), 'x_milestone_receipt_invalid');
  await edge.invoke('milestone_record', { ...context, stage: 'post', postId });
  // A provider response is not equivalent to a verified publication.
  const read = await boundedProviderRead(fetchImpl, postId, credentials.accessToken, launch);
  must(read?.data?.id === postId && read?.data?.author_id === credentials.accountId
    && typeof read?.data?.text === 'string' && read.data.text.length > 0
    && (!launch || (Array.isArray(read?.data?.attachments?.media_keys)
      && read.data.attachments.media_keys.length === 1)),
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

const LAUNCH_PAGE_HTML = `<!doctype html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CAPITAL-AI · X-Launch mit Infografik</title>
<style>
body{margin:0;padding:24px;background:#081025;color:#f5f6ff;font:16px/1.6 system-ui}
main{max-width:760px;margin:auto}h1{color:#f9bf21}a{color:#f9bf21}
button{font:inherit;padding:12px 16px;min-height:48px;border:0;border-radius:8px;
background:#f9bf21;color:#091027;margin:8px 8px 8px 0;cursor:pointer}
button:disabled{opacity:.48;cursor:not-allowed}
pre,blockquote{white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #52617b;
padding:16px;border-radius:10px}a:focus-visible,button:focus-visible{outline:3px solid #63e4db}
</style></head><body><main><h1>CAPITAL-AI · Erster X-Launch</h1>
<p>Ein Owner-only-Einmalauftrag mit SHA-256-gebundener Infografik.</p>
<blockquote>${LAUNCH_TEXT}</blockquote>
<img src="/branding/social/CAPITAL-AI-Universe-X-Launch-Final-20261115.png"
alt="CAPITAL-AI Universe: Learning Hub, Analytics Hub, Studio Hub und Content Engine um einen digitalen Globus."
width="760" height="428" style="display:block;max-width:100%;height:auto">
<p>Kein Upload ohne <code>media.write</code>, identische PNG-Bytes, Owner-Session,
ausdrückliche X-Kostenfreigabe und gültige bestehende One-shot-Receipt-Prüfung.</p>
<p>Finanzbildung, keine individuelle Anlageberatung, keine Erfolgsgarantie.</p>
<p><a href="/login">Als Owner anmelden</a></p>
<button id="publish" type="button" disabled>Einmalig mit Bild auf X veröffentlichen</button>
<button id="status" type="button">Owner-Receipt prüfen (kein X-API-Aufruf)</button>
<pre id="result" role="status" aria-live="polite">Owner-Status wird geprüft.</pre>
</main><script src="/x-milestone-launch.js" defer></script></body></html>`;
const LAUNCH_SCRIPT_SOURCE = SCRIPT_SOURCE
  .replaceAll('/api/social-media/x/milestone/status', '/api/social-media/x/milestone/launch/status')
  .replaceAll('/api/social-media/x/milestone/publish', '/api/social-media/x/milestone/launch/publish');
export function createXMilestonePost({ env = process.env, auth, fetchImpl = fetch,
  edgeFactory = createSocialXEdgeClient, launchMediaLoader = loadPinnedLaunchMedia } = {}) {
  async function handle(req, res, url, json) {
    if (![BASE, POST, STATUS, SCRIPT, LAUNCH, LAUNCH_POST, LAUNCH_STATUS,
      LAUNCH_SCRIPT].includes(url.pathname)) return false;
    const isLaunch = [LAUNCH, LAUNCH_POST, LAUNCH_STATUS, LAUNCH_SCRIPT].includes(url.pathname);
    const isPost = [POST, LAUNCH_POST].includes(url.pathname);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if ((isPost && req.method !== 'POST')
      || (!isPost && req.method !== 'GET')) {
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (isPost && (!auth?.sameOrigin?.(req)
      || req.headers?.['sec-fetch-site'] !== 'same-origin')) {
      json(res, 403, { error: 'same_origin_required' }); return true;
    }
    // Public read-only preview fixes direct links without an Owner session.
    // The paid POST and the DB receipt/status remain owner-authenticated.
    if (url.pathname === LAUNCH_SCRIPT) {
      res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
      res.end(LAUNCH_SCRIPT_SOURCE); return true;
    }
    if (url.pathname === LAUNCH) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(LAUNCH_PAGE_HTML); return true;
    }
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
      || env.SOCIAL_X_PUBLISH_OAUTH_ENABLED !== 'true'
      || env.SOCIAL_X_MILESTONE_POST_ENABLED !== 'true') {
      json(res, 503, { error: 'x_milestone_not_enabled' }); return true;
    }
    if (isPost && (env.SOCIAL_X_PAID_WRITE_APPROVED !== 'true'
      || env.SOCIAL_X_PAID_READ_APPROVED !== 'true'
      || (isLaunch && (env.SOCIAL_X_MILESTONE_MEDIA_ENABLED !== 'true'
        || env.SOCIAL_X_MEDIA_UPLOAD_ENABLED !== 'true'
        || env.SOCIAL_X_PAID_MEDIA_APPROVED !== 'true')))) {
      json(res, 403, { error: 'x_milestone_cost_approval_missing' }); return true;
    }
    try {
      const jwt = await auth?.internalAccessToken?.(req, res);
      const edge = edgeFactory({ env, fetchImpl, channel: PUBLISH_CHANNEL, userAccessToken: jwt });
      if ([STATUS, LAUNCH_STATUS].includes(url.pathname)) {
        const account = await edge.invoke('x_credentials', { userId: identity.userId });
        must(account?.handle === EXPECTED_HANDLE && XID.test(account?.accountId || ''),
          'x_wrong_connected_account');
        const receipt = await edge.invoke('milestone_status', {
          userId: identity.userId, accountId: account.accountId,
          contentKey: isLaunch ? LAUNCH_CONTENT_KEY : MILESTONE_CONTENT_KEY,
        });
        json(res, 200, { ...receipt, retryPublish: false,
          ...(XID.test(receipt.postId || '') ? {
            url: 'https://x.com/' + EXPECTED_HANDLE + '/status/' + receipt.postId,
          } : {}) });
        return true;
      }
      const receipt = await publishXMilestone({
        edge, identity, jwt, env, fetchImpl, edgeFactory,
        launch: isLaunch, launchMediaLoader,
      });
      json(res, receipt.status === 'VERIFIED_PUBLISHED' ? 200 : 409, receipt);
    } catch (error) {
      const exposed = ['x_reconnect_required', 'x_wrong_connected_account',
        'x_milestone_already_claimed', 'x_milestone_readback_mismatch',
        'x_refresh_not_available'];
      json(res, 503, { error: exposed.includes(error?.message)
        ? error.message : 'x_milestone_result_unconfirmed',
        retryPublish: false, statusUrl: isLaunch ? LAUNCH_STATUS : STATUS });
    }
    return true;
  }
  return Object.freeze({ handle });
}

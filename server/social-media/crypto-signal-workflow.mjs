import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, readdir, rename, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readJson, secureUrl } from '../http-security.mjs';
import { buildDraftContentSocialPackage, findContentSocialApproval, withContentSocialApproval } from '../../src/contracts/contentSocialPackage.ts';
import { planContentCampaign } from '../../src/contracts/contentEngine.ts';
import { ASSETS, collectCryptoSignals, MARKET_ATTRIBUTION, WINDOW_MS } from './crypto-signal-sources.mjs';

const PUBLIC = '/api/crypto-signals';
const OWNER = '/api/internal/crypto-signals';
const ROOT = '/var/data/capital-ai-crypto-signals';
const WINDOW_DELAY = 10 * 60_000;
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const currentWindow = now => Math.floor((now - WINDOW_DELAY) / WINDOW_MS) * WINDOW_MS + WINDOW_DELAY;

function configFrom(env) {
  if (env.CAPITAL_AI_CRYPTO_SIGNALS_ENABLED !== 'true') return null;
  try {
    const { market, news } = JSON.parse(env.CAPITAL_AI_CRYPTO_SIGNAL_RIGHTS || '{}');
    // Operator records the contractual rights covering each source, derived display and inference.
    if (typeof market !== 'string' || !ASSETS.every(({ project }) => typeof news?.[project] === 'string')
      || !env.CAPITAL_AI_CRYPTO_COINGECKO_KEY) return null;
    const evidence = [market, ...ASSETS.map(({ project }) => news[project])].map(ref => secureUrl(ref).href);
    const ollama = new URL(env.CAPITAL_AI_CRYPTO_OLLAMA_URL || 'http://127.0.0.1:11434/api/generate');
    const local = ollama.protocol === 'http:' && ollama.hostname === '127.0.0.1';
    if ((!local && (ollama.protocol !== 'https:' || !env.CAPITAL_AI_CRYPTO_OLLAMA_TOKEN))
      || ollama.pathname !== '/api/generate' || ollama.search || ollama.hash || ollama.username || ollama.password) return null;
    return { rightsHash: hash(evidence), marketKey: env.CAPITAL_AI_CRYPTO_COINGECKO_KEY,
      ollama, ollamaToken: env.CAPITAL_AI_CRYPTO_OLLAMA_TOKEN };
  } catch { return null; }
}

function createDraft(results, window, rightsHash) {
  const sourceSha = hash({ rightsHash, inputs: results.map(({ symbol, evidence }) => ({ symbol, evidence })) });
  const signals = results.map(({ evidence, ...signal }) => signal);
  const contentId = 'crypto-signals-' + window;
  const content = { id: contentId, window, expiresAt: new Date(window + WINDOW_MS).toISOString(), signals, rightsHash };
  const digest = hash(content);
  const campaign = {
    campaignId: contentId, productId: 'crypto-market-research', sourceSha,
    canonicalUrl: 'https://capital-ai.online/#crypto-marktsignale', locale: 'de-DE',
    objective: 'Krypto-Marktsignale mit belegtem Marktdatenstand und KI-Nachrichtenstimmung einordnen.',
    audience: ['FinTech-Lernende'], channels: ['WEBSITE'], outputs: ['TEXT'],
    sourceUrls: [...new Set([MARKET_ATTRIBUTION, ...signals.flatMap(s => [s.marketSource, ...s.sources.map(source => source.url)])])].slice(0, 12),
  };
  if (planContentCampaign(campaign).cadsQuality.technicalStatus !== 'PASS') throw Error('CRYPTO_CONTENT_REJECTED');
  const manifest = buildDraftContentSocialPackage({ campaign, contentId, assets: [{
    assetId: contentId, contentId, kind: 'TEXT', sha256: digest, mimeType: 'application/json',
    evidenceRef: 'crypto-source-sha256:' + sourceSha, sourceSha,
  }] });
  return { content, digest, manifest, reviewSources: results.map(({ symbol, evidence }) => ({
    symbol, news: (evidence.news ?? []).map(({ title, url }) => ({ title, url })),
  })) };
}

function validDraft(draft, now, rightsHash) {
  return draft?.content?.window === currentWindow(now) && draft.content.rightsHash === rightsHash
    && hash(draft.content) === draft.digest && draft.manifest?.assets?.[0]?.sha256 === draft.digest;
}

export function createCryptoSignalWorkflow({
  auth, env = process.env, fetchImpl = fetch, root = ROOT, now = Date.now,
  collect = collectCryptoSignals,
} = {}) {
  const config = configFrom(env);
  const stateFile = window => join(root, 'cycle-' + window + '.json');
  let timer;
  let stopped = true;
  let active = false;
  let writes = Promise.resolve();
  let status = 'WAITING';
  const serialized = operation => {
    const result = writes.then(operation);
    writes = result.catch(() => {});
    return result;
  };
  async function readState(window = currentWindow(now())) {
    try {
      const directory = await lstat(root);
      if (!directory.isDirectory() || (directory.mode & 0o077)) throw Error('CRYPTO_STORAGE_UNAVAILABLE');
      return JSON.parse(await readFile(stateFile(window), 'utf8'));
    } catch (error) {
      if (error?.code === 'ENOENT') return null;
      throw error;
    }
  }
  async function saveState(state) {
    const tmp = join(root, 'cycle-' + randomUUID() + '.tmp');
    try {
      await writeFile(tmp, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
      await rename(tmp, stateFile(state.window));
    } finally {
      await unlink(tmp).catch(() => {});
    }
  }

  async function tick() {
    if (!config || active) return;
    active = true;
    const window = currentWindow(now());
    try {
      // The parent is a pre-existing persistent mount. Never fall back to an ephemeral directory.
      await mkdir(root, { mode: 0o700 }).catch(error => {
        if (error?.code !== 'EEXIST') throw error;
      });
      const previous = await readState(window);
      if (previous) return;
      const claim = await open(join(root, 'run-' + window), 'wx', 0o600).catch(error => {
        if (error?.code !== 'EEXIST') throw error;
        return null;
      });
      if (!claim) return;
      await claim.close();
      for (const name of await readdir(root)) {
        const match = /^(?:run-|cycle-)([0-9]+)(?:\.json)?$/.exec(name);
        if (match && Number(match[1]) < window) await unlink(join(root, name)).catch(() => {});
      }
      await serialized(() => saveState({ window, draft: null, status: 'COLLECTING' }));
      const results = await collect({ config, now: now(), fetchImpl });
      const draft = results.length ? createDraft(results, window, config.rightsHash) : null;
      await serialized(() => saveState({ window, draft, status: draft ? 'REVIEW_REQUIRED' : 'NO_VERIFIED_DATA' }));
      status = 'WAITING';
    } catch {
      status = 'WORKFLOW_UNAVAILABLE';
    } finally { active = false; }
  }

  async function handle(req, res, url, json) {
    const owner = url.pathname === OWNER;
    if (!owner && url.pathname !== PUBLIC) return false;
    if (!config) { json(res, 404, { error: 'not_found' }); return true; }
    if (req.method !== 'GET' && (!owner || req.method !== 'POST')) {
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (owner) {
      if (req.method === 'POST' && !auth.sameOrigin(req)) {
        json(res, 403, { error: 'forbidden_origin' }); return true;
      }
      if (!await auth.authorizeIamRole(req, res, 'owner')) {
        json(res, 403, { error: 'owner_required' }); return true;
      }
    }
    try {
      if (req.method === 'GET') {
        const state = await readState();
        const draft = state?.draft;
        const available = validDraft(draft, now(), config.rightsHash);
        const published = available && Boolean(findContentSocialApproval(draft.manifest, draft.content.id, 'WEBSITE'));
        if (owner) {
          json(res, 200, { status: status === 'WORKFLOW_UNAVAILABLE' ? status
            : state?.window === currentWindow(now()) ? state.status : 'WAITING',
          draft: available ? { ...draft.content, digest: draft.digest, reviewSources: draft.reviewSources } : null, published });
        } else if (published) {
          const { rightsHash, ...content } = draft.content;
          json(res, 200, { ...content, marketAttribution: MARKET_ATTRIBUTION });
        } else json(res, 404, { error: 'not_found' });
        return true;
      }

      const body = await readJson(req, 512).catch(() => null);
      if (!body || Object.keys(body).length !== 2 || !/^[a-f0-9]{64}$/.test(body.digest ?? '')
        || !['approve', 'reject'].includes(body.action)) {
        json(res, 400, { error: 'invalid_review' }); return true;
      }
      await serialized(async () => {
        const state = await readState();
        const draft = state?.draft;
        const at = now();
        if (!validDraft(draft, at, config.rightsHash) || draft.digest !== body.digest) {
          json(res, 409, { error: 'draft_changed_or_expired' }); return;
        }
        if (body.action === 'reject') {
          draft.manifest = { ...draft.manifest, approvals: [] };
        } else {
          const identity = await auth.verify(req, res);
          if (!identity?.userId || identity.emailVerified !== true) { json(res, 403, { error: 'owner_required' }); return; }
          if (!validDraft(draft, now(), config.rightsHash)) { json(res, 409, { error: 'draft_changed_or_expired' }); return; }
          if (!findContentSocialApproval(draft.manifest, draft.content.id, 'WEBSITE')) {
            draft.manifest = withContentSocialApproval(draft.manifest, {
              approvalRef: 'website:' + draft.digest, assetId: draft.content.id, assetSha256: draft.digest,
              approvedChannels: ['WEBSITE'], approvedAt: new Date(at).toISOString(),
              approvedBy: identity.userId, publicPublishAllowed: true,
            });
          }
        }
        state.status = body.action === 'approve' ? 'PUBLISHED' : 'REJECTED';
        await saveState(state);
        json(res, 200, { status: state.status });
      });
    } catch { json(res, 503, { error: 'workflow_unavailable' }); }
    return true;
  }

  function start() {
    if (!config || !stopped) return;
    stopped = false;
    const run = () => {
      if (stopped) return;
      void tick();
      timer = setTimeout(run, Math.max(1, currentWindow(now()) + WINDOW_MS - now()));
      timer.unref();
    };
    run();
  }
  return { handle, start, tick, stop() { stopped = true; clearTimeout(timer); } };
}

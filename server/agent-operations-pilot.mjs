import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { readJson } from './http-security.mjs';
import { BILLING_CATALOG } from './billing-catalog.mjs';
import { createAgentOperationsPilotStore } from './agent-operations-pilot-store.mjs';

const SHA = /^[a-f0-9]{40}$/;
const ID = /^[A-Za-z0-9._-]{1,48}$/;
const PROVIDER = /^[a-z][a-z0-9_-]{1,31}$/;
const TIERS = Object.freeze({ starter: 2, pro: 10, enterprise: 30 });
const WORKFLOWS = Object.freeze({
  'ci-evidence': Object.freeze({ domain: 'PLATFORM', skills: ['platform-engineering', 'trust-engineering'], title: 'CI- und PR-Evidence' }),
  'credential-expiry': Object.freeze({ domain: 'TRUST', skills: ['trust-engineering', 'incident-response'], title: 'Credential-Ablaufprüfung' }),
  'media-rights': Object.freeze({ domain: 'GROWTH', skills: ['growth-engineering', 'legal-compliance'], title: 'Medienrechte-Review' }),
});

// Canonical ordering is necessary because Postgres jsonb reorders object keys.
const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ?
    Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const IDEMPOTENCY = /^[A-Za-z0-9_-]{12,64}$/;

function checkedReceipt(receipt, storedHash, id = null) {
  if (!record(receipt) || !/^[a-f0-9]{64}$/.test(storedHash || '') ||
      receipt.receiptSha256 !== storedHash || !UUID.test(receipt.id || '') ||
      (id && receipt.id !== id) || !Object.hasOwn(WORKFLOWS, receipt.workflowId) ||
      receipt.executionStatus !== 'SYNTHETIC_LOCAL_COMPLETED' ||
      receipt.productionEligible !== false || receipt.publicationAuthorized !== false ||
      receipt.modelCalls !== 0 || receipt.externalApiCalls !== 0) return null;
  const { receiptSha256, ...withoutDigest } = receipt;
  return digest(withoutDigest) === storedHash ? receipt : null;
}
const record = x => x && typeof x === 'object' && !Array.isArray(x);
const exact = (obj, keys) => record(obj) && Object.keys(obj).every(k => keys.includes(k));
function validRegistry() {
  try {
    const registry = JSON.parse(readFileSync(new URL('../.agents/skills/registry.json', import.meta.url), 'utf8'));
    return Object.values(WORKFLOWS).every(w => w.skills.every(s => registry.skillGovernance?.[s]?.domainOwner));
  } catch { return false; }
}

export function simulateAgentPilotWorkflow(workflowId, input) {
  if (!record(input)) return null;
  if (workflowId === 'ci-evidence') {
    if (!exact(input, ['repository', 'commitSha', 'checks']) ||
      typeof input.repository !== 'string' ||
      !/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/.test(input.repository) ||
      typeof input.commitSha !== 'string' || !SHA.test(input.commitSha) ||
      !exact(input.checks, ['dockerSecurityGate', 'domainGovernance']) ||
      !['success', 'failure', 'pending'].includes(input.checks.dockerSecurityGate) ||
      !['success', 'failure', 'pending'].includes(input.checks.domainGovernance)) return null;
    return {
      repository: input.repository,
      commitSha: input.commitSha,
      reportedChecks: { ...input.checks },
      assessment: Object.values(input.checks).every(v => v === 'success') ? 'SYNTHETIC_READY_FOR_REVIEW' : 'REVIEW_REQUIRED',
      limitation: 'USER_SUPPLIED_CHECKS_NOT_GITHUB_VERIFIED',
    };
  }
  if (workflowId === 'credential-expiry') {
    if (!exact(input, ['entries']) || !Array.isArray(input.entries) || input.entries.length < 1 || input.entries.length > 8 ||
        !input.entries.every(e => exact(e, ['provider', 'daysToExpiry']) &&
          typeof e.provider === 'string' && PROVIDER.test(e.provider) &&
          Number.isInteger(e.daysToExpiry) && e.daysToExpiry >= -365 && e.daysToExpiry <= 3650)) return null;
    const entries = input.entries.map(e => ({
      provider: e.provider, daysToExpiry: e.daysToExpiry,
      status: e.daysToExpiry < 0 ? 'EXPIRED_REPORTED' : e.daysToExpiry <= 30 ? 'RENEWAL_REVIEW' : 'WITHIN_REPORTED_WINDOW',
    }));
    return { entries, reviewCount: entries.filter(e => e.status !== 'WITHIN_REPORTED_WINDOW').length,
      limitation: 'USER_SUPPLIED_METADATA_NO_PROVIDER_READBACK' };
  }
  if (workflowId === 'media-rights') {
    if (!exact(input, ['assets']) || !Array.isArray(input.assets) || input.assets.length < 1 || input.assets.length > 12 ||
      !input.assets.every(a => exact(a, ['id', 'commercialRights', 'sourceVerified', 'attributionComplete']) &&
        typeof a.id === 'string' && ID.test(a.id) &&
        ['ALLOWED', 'DENIED', 'UNVERIFIED'].includes(a.commercialRights) &&
        typeof a.sourceVerified === 'boolean' && typeof a.attributionComplete === 'boolean')) return null;
    const assets = input.assets.map(a => ({
      id: a.id,
      status: a.commercialRights === 'DENIED' ? 'BLOCKED' :
        a.commercialRights !== 'ALLOWED' || !a.sourceVerified || !a.attributionComplete ? 'NOT_PROVEN' : 'REVIEW_REQUIRED',
    }));
    return { assets, candidateCount: assets.filter(a => a.status === 'REVIEW_REQUIRED').length,
      limitation: 'SELF_REPORTED_RIGHTS_REQUIRE_HUMAN_VERIFICATION' };
  }
  return null;
}

export function createAgentOperationsPilot({
  auth, env = process.env, now = Date.now, uuid = randomUUID,
  byokResolver = null, registryBound = validRegistry(),
  store = createAgentOperationsPilotStore({ env }),
} = {}) {
  // No fallback to local maps: a missing DB binding must deny all writes.
  const enabled = env.AGENT_OPERATIONS_PILOT_ENABLED === 'true' && Boolean(store);
  const sourceSha = SHA.test(env.RENDER_GIT_COMMIT || '') ? env.RENDER_GIT_COMMIT : null;
  const catalog = Object.entries(WORKFLOWS).map(([id, w]) => ({ id, ...w }));

  async function authorize(req, res, json) {
    const user = await auth?.verify?.(req, res);
    if (!user?.userId || typeof user.userId !== 'string') {
      json(res, 401, { error: 'authentication_required' }); return null;
    }
    const tier = await auth?.resolvePaidTier?.(req, res);
    if (!Object.prototype.hasOwnProperty.call(TIERS, tier) || !BILLING_CATALOG.tiers[tier]) {
      json(res, 403, { error: 'paid_entitlement_required' }); return null;
    }
    return { userId: user.userId, tier, limit: TIERS[tier] };
  }
  async function handle(req, res, url, json) {
    if (!url.pathname.startsWith('/api/agent-operations-pilot/')) return false;
    res.setHeader('Cache-Control', 'no-store');
    const path = url.pathname;
    if (path === '/api/agent-operations-pilot/readiness') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET'); json(res, 405, { error: 'method_not_allowed' }); return true;
      }
      json(res, 200, {
        schema: 'CAPITAL_AI_AGENT_OPERATIONS_PILOT@2', enabled: enabled && registryBound,
        workflowCatalog: catalog, skillRegistryBound: registryBound,
        billingAuthority: BILLING_CATALOG.version, entitlementAuthority: 'auth.resolvePaidTier',
        executionMode: 'LOCAL_DETERMINISTIC_PREVIEW', langGraphRuntimeBound: false,
        persistence: store ? 'SUPABASE_TRANSACTIONAL_LEDGER_CONFIGURED' : 'NOT_BOUND',
        quotaScope: 'PER_VERIFIED_USER_PER_UTC_DAY_ATOMIC',
        ledgerMigrationApplied: 'NOT_PROVEN',
        byokMode: 'EXTERNAL_VAULT_REFERENCE_ONLY', externalProviderCalls: false,
        productionEligible: false, publicationAuthorized: false,
      }); return true;
    }
    if (!enabled || !registryBound) {
      json(res, 503, { error: 'agent_pilot_not_enabled' }); return true;
    }
    if (path !== '/api/agent-operations-pilot/runs' &&
        !/^\/api\/agent-operations-pilot\/runs\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path)) {
      json(res, 404, { error: 'not_found' }); return true;
    }
    if (path === '/api/agent-operations-pilot/runs' && req.method !== 'POST' ||
        path !== '/api/agent-operations-pilot/runs' && req.method !== 'GET') {
      res.setHeader('Allow', path.endsWith('/runs') ? 'POST' : 'GET');
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (req.method === 'POST' && !auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' }); return true;
    }
    const ctx = await authorize(req, res, json);
    if (!ctx) return true;
    if (req.method === 'GET') {
      const id = path.split('/').pop();
      try {
        const result = await store.getById(ctx.userId, id);
        if (result === null) { json(res, 404, { error: 'not_found' }); return true; }
        const receipt = checkedReceipt(result?.receipt, result?.receiptSha256, id);
        if (!receipt) { json(res, 503, { error: 'pilot_receipt_integrity_not_proven' }); return true; }
        json(res, 200, { receipt });
      } catch {
        json(res, 503, { error: 'pilot_ledger_unavailable' });
      }
      return true;
    }
    let body;
    try { body = await readJson(req, 8192); } catch {
      json(res, 400, { error: 'invalid_request' }); return true;
    }
    if (!exact(body, ['workflowId', 'input', 'idempotencyKey', 'byok']) ||
        !WORKFLOWS[body?.workflowId] ||
        typeof body.idempotencyKey !== 'string' || !IDEMPOTENCY.test(body.idempotencyKey)) {
      json(res, 400, { error: 'invalid_request' }); return true;
    }
    const output = simulateAgentPilotWorkflow(body.workflowId, body.input);
    if (!output) { json(res, 400, { error: 'invalid_workflow_input' }); return true; }
    let byok = { mode: 'none', calls: 0 };
    if (body.byok !== undefined) {
      if (exact(body.byok, ['mode']) && body.byok.mode === 'none') { /* default */ }
      else if (exact(body.byok, ['mode', 'provider', 'credentialRef']) &&
        body.byok.mode === 'vault_reference' && ['openai', 'google'].includes(body.byok.provider) &&
        typeof body.byok.credentialRef === 'string' && ID.test(body.byok.credentialRef)) {
        let verified = false;
        try {
          verified = env.AGENT_OPERATIONS_PILOT_BYOK_METADATA_ENABLED === 'true' &&
            typeof byokResolver === 'function' &&
            await byokResolver(ctx.userId, body.byok.provider, body.byok.credentialRef) === true;
        } catch { verified = false; }
        if (!verified) {
          json(res, 403, { error: 'byok_vault_binding_not_verified' }); return true;
        }
        byok = { mode: 'vault_reference', provider: body.byok.provider, bound: true, calls: 0 };
      } else { json(res, 400, { error: 'invalid_byok_reference' }); return true; }
    }
    const requestHash = digest({
      workflowId: body.workflowId, input: body.input, byok,
      // Reference identity contributes to idempotency but is not stored in receipts.
      credentialRef: body.byok?.mode === 'vault_reference' ? body.byok.credentialRef : null,
    });
    const id = uuid();
    const receiptData = {
      id, workflowId: body.workflowId, createdAt: new Date(now()).toISOString(),
      executionStatus: 'SYNTHETIC_LOCAL_COMPLETED', sourceSha, inputSha256: digest(body.input),
      result: output, outputSha256: digest(output), byok, tenantScope: 'VERIFIED_USER_ONLY',
      evidenceStatus: 'LOCAL_DEMO_NOT_PROVIDER_ATTESTED', modelCalls: 0, externalApiCalls: 0,
      estimatedApiCostEur: 0, productionEligible: false, publicationAuthorized: false,
    };
    const receipt = { ...receiptData, receiptSha256: digest(receiptData) };
    try {
      const result = await store.create({
        id, userId: ctx.userId, tier: ctx.tier,
        workflowId: body.workflowId, idempotencyKey: body.idempotencyKey,
        requestHash, receipt,
      });
      if (result?.state === 'conflict') {
        json(res, 409, { error: 'idempotency_conflict' }); return true;
      }
      if (result?.state === 'quota_exceeded') {
        json(res, 429, { error: 'pilot_quota_exceeded', dailyLimit: ctx.limit }); return true;
      }
      if (result?.state !== 'created' && result?.state !== 'replayed') {
        json(res, 503, { error: 'pilot_ledger_unavailable' }); return true;
      }
      const storedReceipt = checkedReceipt(result.receipt, result.receiptSha256,
        result.state === 'created' ? id : null);
      if (!storedReceipt) {
        json(res, 503, { error: 'pilot_receipt_integrity_not_proven' }); return true;
      }
      if (result.state === 'created' &&
          (!Number.isInteger(result.used) || result.used < 1 || result.used > ctx.limit ||
           result.dailyLimit !== ctx.limit)) {
        json(res, 503, { error: 'pilot_quota_evidence_not_proven' }); return true;
      }
      json(res, result.state === 'created' ? 201 : 200, {
        receipt: storedReceipt,
        ...(result.state === 'created' ? { quota: { used: result.used, dailyLimit: result.dailyLimit } } : {}),
      });
    } catch {
      // Unknown/ambiguous write outcomes must be retried with the SAME idempotency key.
      json(res, 503, { error: 'pilot_ledger_unavailable', retryWithSameIdempotencyKey: true });
    }
    return true;
  }
  return { handle, readiness: () => ({ enabled, registryBound }), simulate: simulateAgentPilotWorkflow };
}
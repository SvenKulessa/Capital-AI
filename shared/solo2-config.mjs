/**
 * SOLO2 configuration contract shared by browser and CLI.
 * DECLARATIVE ONLY: never an authority, runner, license approval, token store, or publisher.
 */
export const SOLO2_CONFIG_VERSION = 'CAPITAL_AI_SOLO2_RUNTIME_CONFIG@1';
export const SOLO2_DOMAINS = Object.freeze(['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH']);
export const SOLO2_RIGHTS = Object.freeze(['NONE', 'READ_REQUESTED', 'EXECUTE_REQUESTED']);
export const SOLO2_MODES = Object.freeze(['OFFLINE_LOCAL', 'HYBRID_REVIEW']);
export const SOLO2_PIPELINES = Object.freeze([
  'GROWTH_INSIGHT_DRAFT', 'MEDIA_CONTENT_CADS', 'SOCIAL_DRAFT_REVIEW',
  'CI_READBACK', 'RAG_OFFLINE_RESEARCH', 'N8N_INTERNAL_CANDIDATE', 'TINYFISH_BROWSER_CANDIDATE',
]);
/** Must remain aligned with .agents/skills/registry.json; see the drift test. */
export const SOLO2_SKILLS = Object.freeze([
  'accessibility-advisory', 'accessibility-audit', 'accessibility-engineering',
  'customer-success', 'mobile-engineering', 'product-advisory', 'product-engineering', 'visual-chat',
  'analytics-intelligence', 'data-engineering', 'market-advisory', 'market-engineering', 'quant-research',
  'ai-engineering', 'platform-advisory', 'platform-engineering', 'platform-observability',
  'integration-engineering', 'skill-lifecycle',
  'incident-response', 'legal-compliance', 'trust-advisory', 'trust-engineering', 'agent-evaluation',
  'growth-advisory', 'growth-engineering', 'revenue-engineering', 'sales-enterprise', 'seo-engineering',
]);
export const SOLO2_RESOURCES = Object.freeze([
  { id: 'langgraph-python', kind: 'ORCHESTRATOR', origin: 'REPOSITORY', path: 'scripts/growth-agent/auto_loop.py' },
  { id: 'offline-rag', kind: 'ENGINE', origin: 'REPOSITORY', path: 'scripts/growth-agent/agent_platform.py' },
  { id: 'growth-intelligence', kind: 'ENGINE', origin: 'REPOSITORY', path: 'src/contracts/growthIntelligenceContent.ts' },
  { id: 'content-engine', kind: 'ENGINE', origin: 'REPOSITORY', path: 'src/contracts/contentEngine.ts' },
  { id: 'social-media-engine', kind: 'ENGINE', origin: 'REPOSITORY', path: 'src/contracts/socialPublisherAdapter.ts' },
  { id: 'media-content-engine', kind: 'ENGINE', origin: 'REPOSITORY', path: 'scripts/growth/growth-intelligence-image-drafts.mjs' },
  { id: 'cads', kind: 'QUALITY', origin: 'REPOSITORY', path: 'packages/benchmark-core/growth-quality.mjs' },
  { id: 'github', kind: 'PLUGIN', origin: 'EXTERNAL', path: null },
  { id: 'render', kind: 'PLUGIN', origin: 'EXTERNAL', path: null },
  { id: 'n8n', kind: 'ORCHESTRATOR', origin: 'EXTERNAL', path: null },
  { id: 'tinyfish', kind: 'PLUGIN', origin: 'EXTERNAL', path: null },
  { id: 'metricool', kind: 'PLUGIN', origin: 'EXTERNAL', path: null },
  { id: 'supermetrics', kind: 'PLUGIN', origin: 'EXTERNAL', path: null },
]);

const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,95}$/;
const shaPattern = /^[a-f0-9]{40}$/;
const forbidden = /(?:secret|password|api.?key|token|bearer|session.?cookie|private.?key|recovery.?code|authorization|auth.?header|client.?secret|credential|webhook.?url)/i;
const selectedDefaults = new Set([
  'langgraph-python', 'offline-rag', 'growth-intelligence', 'content-engine',
  'social-media-engine', 'media-content-engine', 'cads',
]);
const defaultPipelines = new Set([
  'GROWTH_INSIGHT_DRAFT', 'MEDIA_CONTENT_CADS', 'SOCIAL_DRAFT_REVIEW', 'RAG_OFFLINE_RESEARCH',
]);
function fail(code) { throw new Error('SOLO2_CONFIG_' + code); }
function record(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exactKeys(object, keys, code) {
  if (!record(object) || Object.keys(object).some(key => !keys.includes(key))
      || keys.some(key => !Object.hasOwn(object, key))) fail(code);
}
function safeId(value) { return typeof value === 'string' && idPattern.test(value); }
function uniqueKnown(values, known, max, code) {
  if (!Array.isArray(values) || values.length > max
    || new Set(values).size !== values.length
    || values.some(value => !known.includes(value))) fail(code);
}
function scanForSecrets(value, depth = 0) {
  if (depth > 8) fail('DEPTH');
  if (Array.isArray(value)) { for (const item of value) scanForSecrets(item, depth + 1); return; }
  if (!record(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (forbidden.test(key) && key !== 'secretStorage') fail('SECRET_FIELD_DENIED');
    scanForSecrets(item, depth + 1);
  }
}
export function createSolo2Profile(sourceSha, tenantRef = 'owner-preview') {
  if (!shaPattern.test(sourceSha) || !safeId(tenantRef)) fail('SOURCE_OR_TENANT');
  return {
    schema: SOLO2_CONFIG_VERSION,
    project: 'CAPITAL-AI',
    repository: 'SvenKulessa/Capital-AI',
    sourceSha,
    tenantRef, // Declarative routing hint only; never an authenticated tenant identity.
    mode: 'OFFLINE_LOCAL',
    offline: { rootAgent: 'langgraph-python', modelRef: 'NOT_CONFIGURED', ragRef: 'LOCAL_NOT_PROVEN' },
    online: { enabled: false, ciPollSeconds: 30, maxExternalCalls: 0 },
    domains: ['GROWTH', 'PLATFORM', 'TRUST'],
    skills: ['growth-engineering', 'ai-engineering', 'trust-engineering', 'legal-compliance'],
    pipelines: SOLO2_PIPELINES.map(id => ({ id, selected: defaultPipelines.has(id) })),
    resources: SOLO2_RESOURCES.map(item => ({
      id: item.id, kind: item.kind,
      owner: item.origin === 'REPOSITORY' ? 'PROJECT_OPERATOR' : 'CUSTOMER_RESOURCE',
      selected: selectedDefaults.has(item.id),
      requestedRight: 'NONE', licenseEvidence: 'NOT_PROVEN', rightsEvidence: 'NOT_PROVEN',
    })),
    limits: { maxPaidEur: 0, maxRepairAttempts: 2 },
    safeguard: {
      execution: 'DISABLED', authority: 'NONE', publish: false,
      licenseGrant: false, secretStorage: false,
    },
  };
}
/**
 * Validate untrusted config for CLI/browser import. Reject unknown fields and
 * accidental secrets; these assertions do NOT verify provider rights or connection.
 */
export function validateSolo2Profile(input) {
  if (!record(input) || JSON.stringify(input).length > 32768) fail('SIZE_OR_OBJECT');
  scanForSecrets(input);
  exactKeys(input, ['schema', 'project', 'repository', 'sourceSha', 'tenantRef', 'mode', 'offline',
    'online', 'domains', 'skills', 'pipelines', 'resources', 'limits', 'safeguard'], 'TOP_LEVEL');
  if (input.schema !== SOLO2_CONFIG_VERSION || input.project !== 'CAPITAL-AI'
    || input.repository !== 'SvenKulessa/Capital-AI' || !shaPattern.test(input.sourceSha)
    || !safeId(input.tenantRef) || !SOLO2_MODES.includes(input.mode)) fail('IDENTITY');
  exactKeys(input.offline, ['rootAgent', 'modelRef', 'ragRef'], 'OFFLINE_KEYS');
  if (input.offline.rootAgent !== 'langgraph-python'
    || !safeId(input.offline.modelRef) || !safeId(input.offline.ragRef)) fail('OFFLINE_AUTHORITY');
  exactKeys(input.online, ['enabled', 'ciPollSeconds', 'maxExternalCalls'], 'ONLINE_KEYS');
  if (input.online.enabled !== false || !Number.isInteger(input.online.ciPollSeconds)
    || input.online.ciPollSeconds < 30 || input.online.ciPollSeconds > 3600
    || input.online.maxExternalCalls !== 0) fail('ONLINE_NOT_ADMITTED');
  uniqueKnown(input.domains, SOLO2_DOMAINS, 5, 'DOMAINS');
  uniqueKnown(input.skills, SOLO2_SKILLS, SOLO2_SKILLS.length, 'SKILLS');
  if (!input.domains.includes('TRUST')) fail('TRUST_REQUIRED');
  if (!Array.isArray(input.pipelines) || input.pipelines.length !== SOLO2_PIPELINES.length
    || new Set(input.pipelines.map(item => item?.id)).size !== SOLO2_PIPELINES.length) fail('PIPELINES');
  for (const item of input.pipelines) {
    exactKeys(item, ['id', 'selected'], 'PIPELINE_FIELDS');
    if (!SOLO2_PIPELINES.includes(item.id) || typeof item.selected !== 'boolean') fail('PIPELINE_VALUE');
  }
  if (!Array.isArray(input.resources) || input.resources.length !== SOLO2_RESOURCES.length
    || new Set(input.resources.map(item => item?.id)).size !== SOLO2_RESOURCES.length) fail('RESOURCES');
  for (const item of input.resources) {
    exactKeys(item, ['id', 'kind', 'owner', 'selected', 'requestedRight', 'licenseEvidence', 'rightsEvidence'], 'RESOURCE_FIELDS');
    const spec = SOLO2_RESOURCES.find(candidate => candidate.id === item.id);
    if (!spec || item.kind !== spec.kind || !['PROJECT_OPERATOR', 'CUSTOMER_RESOURCE'].includes(item.owner)
      || typeof item.selected !== 'boolean' || !SOLO2_RIGHTS.includes(item.requestedRight)
      || !['NOT_PROVEN', 'REVIEW_REQUIRED'].includes(item.licenseEvidence)
      || !['NOT_PROVEN', 'REVIEW_REQUIRED'].includes(item.rightsEvidence)) fail('RESOURCE_VALUE');
  }
  exactKeys(input.limits, ['maxPaidEur', 'maxRepairAttempts'], 'LIMITS');
  if (input.limits.maxPaidEur !== 0 || !Number.isInteger(input.limits.maxRepairAttempts)
    || input.limits.maxRepairAttempts < 0 || input.limits.maxRepairAttempts > 3) fail('BUDGET_OR_RETRIES');
  exactKeys(input.safeguard, ['execution', 'authority', 'publish', 'licenseGrant', 'secretStorage'], 'SAFEGUARD_KEYS');
  if (input.safeguard.execution !== 'DISABLED' || input.safeguard.authority !== 'NONE'
    || input.safeguard.publish !== false || input.safeguard.licenseGrant !== false
    || input.safeguard.secretStorage !== false) fail('AUTHORITY_ESCALATION');
  // JSON transport clone prevents getters/prototypes and normalizes both entrypoints identically.
  return JSON.parse(JSON.stringify(input));
}
export function solo2ConfigReadiness(input) {
  const profile = validateSolo2Profile(input);
  const selectedExternal = profile.resources.filter(item => item.selected
    && SOLO2_RESOURCES.find(spec => spec.id === item.id)?.origin === 'EXTERNAL');
  return {
    state: 'CONFIGURED_NOT_ACTIVATED',
    offline: 'LOCAL_RUNTIME_NOT_PROVEN',
    online: profile.mode === 'HYBRID_REVIEW' ? 'REQUESTED_NOT_CONNECTED' : 'DISABLED',
    selectedExternal: selectedExternal.map(item => item.id),
    reasons: ['NO_RUNTIME_AUTHORITY', 'NO_PROVEN_LICENSE_GRANT', 'NO_PROVIDER_PERMISSION_READBACK'],
  };
}

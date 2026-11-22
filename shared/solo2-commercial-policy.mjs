import { validateSolo2Profile } from './solo2-config.mjs';

export const SOLO2_COMMERCIAL_POLICY_VERSION = 'CAPITAL_AI_SOLO2_COMMERCIAL_POLICY@1';
export const SOLO2_MAINTAINER = 'SOLO_MAINTAINER_FLOW@2';
export const SOLO2_DOMAIN_POLICIES = Object.freeze({
  PRODUCT: 'CAPITAL-AI-PRODUCT',
  MARKET: 'CAPITAL-AI-MARKET',
  PLATFORM: 'CAPITAL-AI-PLATFORM',
  TRUST: 'CAPITAL-AI-TRUST',
  GROWTH: 'CAPITAL-AI-GROWTH',
});

const MERGE_METHODS = Object.freeze(['REBASE']);
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = code => { throw new Error(`SOLO2_COMMERCIAL_POLICY_${code}`); };

export function createSolo2CommercialPolicy(profile) {
  const validatedProfile = validateSolo2Profile(profile);
  return {
    schema: SOLO2_COMMERCIAL_POLICY_VERSION,
    profile: validatedProfile,
    agentLoop: {
      autoReadyDrafts: true,
      autoSyncBase: true,
      requireCurrentHead: true,
      requireRequiredChecks: true,
      mergeMethod: 'REBASE',
    },
    maintainer: {
      id: 'SOLO2',
      enabled: true,
      policy: SOLO2_MAINTAINER,
      domainPolicies: { ...SOLO2_DOMAIN_POLICIES },
    },
  };
}

export function validateSolo2CommercialPolicy(input) {
  if (!record(input) || JSON.stringify(input).length > 49152) fail('SIZE_OR_OBJECT');
  const topKeys = Object.keys(input).sort();
  if (topKeys.join(',') !== ['agentLoop', 'maintainer', 'profile', 'schema'].join(',')) fail('TOP_LEVEL');
  if (input.schema !== SOLO2_COMMERCIAL_POLICY_VERSION) fail('SCHEMA');
  const profile = validateSolo2Profile(input.profile);

  if (!record(input.agentLoop)
    || Object.keys(input.agentLoop).sort().join(',') !== ['autoReadyDrafts','autoSyncBase','mergeMethod','requireCurrentHead','requireRequiredChecks'].sort().join(',')) fail('AGENT_LOOP_KEYS');
  if (typeof input.agentLoop.autoReadyDrafts !== 'boolean'
    || input.agentLoop.autoSyncBase !== true
    || input.agentLoop.requireCurrentHead !== true
    || input.agentLoop.requireRequiredChecks !== true
    || !MERGE_METHODS.includes(input.agentLoop.mergeMethod)) fail('AGENT_LOOP_GUARDS');

  if (!record(input.maintainer)
    || Object.keys(input.maintainer).sort().join(',') !== ['domainPolicies','enabled','id','policy'].sort().join(',')) fail('MAINTAINER_KEYS');
  if (input.maintainer.id !== 'SOLO2' || input.maintainer.enabled !== true
    || input.maintainer.policy !== SOLO2_MAINTAINER || !record(input.maintainer.domainPolicies)) fail('MAINTAINER');
  const domains = Object.keys(SOLO2_DOMAIN_POLICIES);
  if (Object.keys(input.maintainer.domainPolicies).sort().join(',') !== domains.sort().join(',')) fail('DOMAIN_POLICY_KEYS');
  for (const [domain, policy] of Object.entries(SOLO2_DOMAIN_POLICIES)) {
    if (input.maintainer.domainPolicies[domain] !== policy) fail('DOMAIN_POLICY_VALUE');
  }
  return JSON.parse(JSON.stringify({ ...input, profile }));
}

export function solo2CommercialSystemVariables(input) {
  const config = validateSolo2CommercialPolicy(input);
  return Object.freeze({
    CAPITAL_AI_AGENT_LOOP_AUTO_READY_DRAFTS: config.agentLoop.autoReadyDrafts ? 'true' : 'false',
    CAPITAL_AI_AGENT_LOOP_AUTO_SYNC_BASE: 'true',
    CAPITAL_AI_AGENT_LOOP_REQUIRE_CURRENT_HEAD: 'true',
    CAPITAL_AI_AGENT_LOOP_REQUIRE_REQUIRED_CHECKS: 'true',
    CAPITAL_AI_AGENT_LOOP_MERGE_METHOD: config.agentLoop.mergeMethod,
    CAPITAL_AI_SOLO2_MAINTAINER: config.maintainer.policy,
    CAPITAL_AI_SOLO2_POLICY_PRODUCT: config.maintainer.domainPolicies.PRODUCT,
    CAPITAL_AI_SOLO2_POLICY_MARKET: config.maintainer.domainPolicies.MARKET,
    CAPITAL_AI_SOLO2_POLICY_PLATFORM: config.maintainer.domainPolicies.PLATFORM,
    CAPITAL_AI_SOLO2_POLICY_TRUST: config.maintainer.domainPolicies.TRUST,
    CAPITAL_AI_SOLO2_POLICY_GROWTH: config.maintainer.domainPolicies.GROWTH,
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import { createSolo2Profile } from './solo2-config.mjs';
import {
  createSolo2CommercialPolicy,
  validateSolo2CommercialPolicy,
  solo2CommercialSystemVariables,
} from './solo2-commercial-policy.mjs';

const SHA = 'a'.repeat(40);

test('commercial policy enables draft readiness by default without weakening merge guards', () => {
  const policy = createSolo2CommercialPolicy(createSolo2Profile(SHA));
  assert.equal(policy.agentLoop.autoReadyDrafts, true);
  assert.equal(policy.agentLoop.requireCurrentHead, true);
  assert.equal(policy.agentLoop.requireRequiredChecks, true);
  assert.equal(policy.agentLoop.mergeMethod, 'REBASE');
  assert.equal(validateSolo2CommercialPolicy(policy).maintainer.policy, 'SOLO_MAINTAINER_FLOW@2');
});

test('draft readiness can be disabled independently', () => {
  const policy = createSolo2CommercialPolicy(createSolo2Profile(SHA));
  policy.agentLoop.autoReadyDrafts = false;
  const variables = solo2CommercialSystemVariables(policy);
  assert.equal(variables.CAPITAL_AI_AGENT_LOOP_AUTO_READY_DRAFTS, 'false');
  assert.equal(variables.CAPITAL_AI_AGENT_LOOP_REQUIRE_REQUIRED_CHECKS, 'true');
});

test('merge safety policy cannot be weakened by configuration', () => {
  const policy = createSolo2CommercialPolicy(createSolo2Profile(SHA));
  policy.agentLoop.requireRequiredChecks = false;
  assert.throws(() => validateSolo2CommercialPolicy(policy), /AGENT_LOOP_GUARDS/);
});

test('domain policy references are fixed system variables', () => {
  const policy = createSolo2CommercialPolicy(createSolo2Profile(SHA));
  policy.maintainer.domainPolicies.TRUST = 'UNTRUSTED';
  assert.throws(() => validateSolo2CommercialPolicy(policy), /DOMAIN_POLICY_VALUE/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AGENT_STATE_SCHEMA,
  AGENT_TRAJECTORY_SCHEMA,
  LANGGRAPH_ADAPTER_SCHEMA,
  actorHash,
  assertShadowAuthority,
  createLangGraphAdapter,
  createShadowAgentState,
  createTrajectoryEvent,
  supervisorRoute,
} from './agent-shadow-runtime.mjs';

test('shadow state stores a fingerprint, not the transient prompt, and denies mutation authority', () => {
  const state = createShadowAgentState({
    actorRef: actorHash('user-123'),
    transientInput: 'research ECB transmission',
    requestedCapability: 'research',
    evidenceRefs: ['ev-1'],
    capabilityGrantIds: ['grant-read-1'],
    approvalIds: ['approval-reference-only'],
  });
  assert.equal(state.schema, AGENT_STATE_SCHEMA);
  assert.match(state.inputFingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(state).includes('research ECB transmission'), false);
  assert.deepEqual(state.authority, {
    read: true, propose: true, write: false, trade: false, publish: false, legalDecision: false,
  });
});

test('supervisor routes only admitted shadow/proposal capabilities', () => {
  const state = createShadowAgentState({
    actorRef: actorHash('user-123'),
    transientInput: 'prepare a portfolio proposal',
    requestedCapability: 'portfolio-proposal',
  });
  const routed = supervisorRoute(state);
  assert.equal(routed.currentNode, 'portfolio-proposal');
  assert.equal(routed.authority.trade, false);
  assert.throws(() => createShadowAgentState({
    actorRef: actorHash('user-123'),
    transientInput: 'trade now',
    requestedCapability: 'trade',
  }), /AGENT_CAPABILITY_NOT_ADMITTED/);
});

test('LangGraph adapter accepts an injected compiled graph but rejects authority escalation', async () => {
  const state = createShadowAgentState({
    actorRef: actorHash('user-123'),
    transientInput: 'truth review',
    requestedCapability: 'truth-review',
  });
  const safe = createLangGraphAdapter({
    packageVersion: null,
    compiledGraph: { invoke: async current => ({ ...current, currentNode: 'truth' }) },
  });
  assert.equal(safe.schema, LANGGRAPH_ADAPTER_SCHEMA);
  assert.equal(safe.runtimePromotion, 'BLOCKED');
  assert.equal((await safe.invoke(state)).currentNode, 'truth');

  const unsafe = createLangGraphAdapter({
    compiledGraph: { invoke: async current => ({ ...current, authority: { ...current.authority, trade: true } }) },
  });
  await assert.rejects(() => unsafe.invoke(state), /AGENT_AUTHORITY_ESCALATION_DENIED/);

  const extraField = createLangGraphAdapter({
    compiledGraph: { invoke: async () => ({ currentNode: 'truth', rawText: 'must-not-enter-state' }) },
  });
  await assert.rejects(() => extraField.invoke(state), /LANGGRAPH_OUTPUT_FIELD_NOT_ADMITTED/);

});

test('trajectory correlates tool, capability and approval references without making them authority', () => {
  const before = createShadowAgentState({
    actorRef: actorHash('user-123'),
    transientInput: 'private read proposal',
    requestedCapability: 'market-read',
    evidenceRefs: ['ev-1'],
    capabilityGrantIds: ['grant-read-1'],
    approvalIds: ['approval-1'],
  });
  const after = supervisorRoute(before);
  const event = createTrajectoryEvent({
    before,
    after,
    startedAt: '2026-10-06T17:00:00.000Z',
    completedAt: '2026-10-06T17:00:00.025Z',
    tool: {
      toolCallId: 'tool-1',
      toolName: 'private-provider-read',
      capabilityGrantId: 'grant-read-1',
      approvalId: 'approval-1',
      output: { count: 2 },
    },
    model: { provider: 'local', id: 'deterministic-router' },
  });
  assert.equal(event.schema, AGENT_TRAJECTORY_SCHEMA);
  assert.equal(event.capabilityGrantId, 'grant-read-1');
  assert.equal(event.approvalId, 'approval-1');
  assert.equal(event.durationMs, 25);
  assert.match(event.outputFingerprint, /^sha256:[0-9a-f]{64}$/);
  assert.equal(after.authority.write, false);
  assert.equal(after.authority.trade, false);
});

test('secret-bearing state/config/trajectory metadata fails closed', async () => {
  assert.throws(() => createShadowAgentState({
    actorRef: actorHash('user-123'),
    transientInput: 'x',
    requestedCapability: 'research',
    apiKey: 'forbidden',
  }), /AGENT_INPUT_FORBIDDEN/);

  const state = createShadowAgentState({
    actorRef: actorHash('user-123'),
    transientInput: 'x',
    requestedCapability: 'research',
  });
  const adapter = createLangGraphAdapter({ compiledGraph: { invoke: async current => current } });
  await assert.rejects(() => adapter.invoke(state, { authorization: 'Bearer x' }), /LANGGRAPH_CONFIG_FORBIDDEN/);
  assert.throws(() => createTrajectoryEvent({
    before: state,
    after: supervisorRoute(state),
    startedAt: '2026-10-06T17:00:00.000Z',
    completedAt: '2026-10-06T17:00:00.001Z',
    tool: { apiSecret: 'forbidden' },
  }), /AGENT_TRAJECTORY_SECRET_FORBIDDEN/);
  assert.doesNotThrow(() => assertShadowAuthority(state));
});

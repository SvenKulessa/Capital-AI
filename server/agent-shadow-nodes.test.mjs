import assert from 'node:assert/strict';
import test from 'node:test';

import { actorHash, createShadowAgentState } from './agent-shadow-runtime.mjs';
import {
  runMarketReadNode,
  runPortfolioProposalNode,
  runResearchNode,
  runTruthReviewNode,
} from './agent-shadow-nodes.mjs';

function state(capability, overrides = {}) {
  return createShadowAgentState({
    actorRef: actorHash('agent-node-test-user'),
    transientInput: 'transient request that must not persist',
    requestedCapability: capability,
    evidenceRefs: [],
    capabilityGrantIds: [],
    approvalIds: [],
    agentRunId: 'agent-node-run',
    graphRunId: 'agent-node-graph',
    traceId: '11111111111111111111111111111111',
    ...overrides,
  });
}

test('research node persists evidence refs only and rejects raw/secret-bearing adapter output', async () => {
  const input = state('research');
  const output = await runResearchNode(input, {
    retrieveEvidence: async request => {
      assert.match(request.inputFingerprint, /^sha256:/);
      assert.equal(JSON.stringify(request).includes('transient request'), false);
      return { evidenceRefs: ['research-ev-1'], methodRef: 'method-graphrag' };
    },
  });
  assert.equal(output.currentNode, 'research');
  assert.ok(output.evidenceRefs.includes('research-ev-1'));
  assert.equal(JSON.stringify(output).includes('transient request'), false);
  assert.equal(output.authority.write, false);
  assert.equal(output.authority.trade, false);

  await assert.rejects(
    () => runResearchNode(input, {
      retrieveEvidence: async () => ({ evidenceRefs: ['ev'], rawData: { apiKey: 'forbidden' } }),
    }),
    /AGENT_NODE_SECRET_OR_RAW_DATA_FORBIDDEN/,
  );
});

test('MARKET node requires an existing grant and only accepts the canonical read-only provider registry', async () => {
  await assert.rejects(
    () => runMarketReadNode(state('market-read'), {
      request: { provider: 'kraken', operation: 'account.balance', params: {} },
      executeRead: async () => ({ evidenceRef: 'market-ev', toolCallId: 'tool-1' }),
    }),
    /MARKET_READ_CAPABILITY_GRANT_REQUIRED/,
  );

  const input = state('market-read', { capabilityGrantIds: ['grant-market-read'] });
  await assert.rejects(
    () => runMarketReadNode(input, {
      request: { provider: 'kraken', operation: 'orders.create', params: {} },
      executeRead: async () => ({ evidenceRef: 'market-ev', toolCallId: 'tool-1' }),
    }),
    /OPERATION_NOT_ADMITTED/,
  );

  const output = await runMarketReadNode(input, {
    request: { provider: 'kraken', operation: 'account.balance', params: {} },
    executeRead: async request => {
      assert.equal(request.provider, 'kraken');
      assert.equal(request.operation, 'account.balance');
      assert.deepEqual(request.capabilityGrantIds, ['grant-market-read']);
      return { evidenceRef: 'market-read-ev-1', toolCallId: 'tool-read-1' };
    },
  });
  assert.equal(output.currentNode, 'market');
  assert.ok(output.evidenceRefs.includes('market-read-ev-1'));
  assert.deepEqual(output.capabilityGrantIds, input.capabilityGrantIds);
  assert.deepEqual(output.approvalIds, input.approvalIds);
  assert.equal(output.authority.trade, false);
});

test('portfolio node creates an evidence-bound proposal and never execution authority', () => {
  const input = state('portfolio-proposal', { evidenceRefs: ['market-ev-1', 'risk-ev-1'] });
  const output = runPortfolioProposalNode(input, { proposalKind: 'rebalance' });
  assert.equal(output.currentNode, 'portfolio-proposal');
  assert.ok(output.evidenceRefs.some(ref => ref.startsWith('proposal:')));
  assert.ok(output.policyDecisionIds.includes('PORTFOLIO_PROPOSAL_ONLY'));
  assert.equal(output.authority.write, false);
  assert.equal(output.authority.trade, false);
});

test('truth review can pass evidence while publication and legal authority remain denied', async () => {
  const input = state('truth-review', { evidenceRefs: ['claim-ev-1'] });
  const output = await runTruthReviewNode(input, {
    reviewEvidence: async request => ({
      decision: 'pass',
      evidenceRef: 'truth-review-ev-1',
      reasonCodes: ['EVIDENCE_BOUND'],
    }),
  });
  assert.equal(output.currentNode, 'truth');
  assert.ok(output.policyDecisionIds.includes('TRUTH_REVIEW_PASS_SHADOW'));
  assert.equal(output.authority.publish, false);
  assert.equal(output.authority.legalDecision, false);
  assert.deepEqual(output.capabilityGrantIds, input.capabilityGrantIds);
  assert.deepEqual(output.approvalIds, input.approvalIds);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { runResearchNode } from './agent-shadow-nodes.mjs';
import { createAgentCoreGraphRagEvidenceRetriever } from './agent-graphrag-evidence-adapter.mjs';
import { actorHash, createShadowAgentState } from './agent-shadow-runtime.mjs';

function researchState(query) {
  return createShadowAgentState({
    actorRef: actorHash('graphrag-test-user'),
    transientInput: query,
    requestedCapability: 'research',
    evidenceRefs: [],
    capabilityGrantIds: [],
    approvalIds: [],
    agentRunId: 'agent-graphrag-1',
    graphRunId: 'graph-graphrag-1',
    traceId: '22222222222222222222222222222222',
  });
}

test('Agent-Core GraphRAG adapter persists only bounded shadow evidence refs', async () => {
  const query = 'Wie wirken EZB Zinsen auf Aktienbewertungen?';
  const adapter = {
    id: 'jaja-agent-core',
    async search(receivedQuery, hops) {
      assert.equal(receivedQuery, query);
      assert.equal(hops, 2);
      return [{
        id: 'ezb',
        label: 'EZB-Leitzins',
        snippet: 'Transient explanatory graph text that must not be persisted.',
        score: 2.5,
        hop: 0,
        relation: 'EZB moves equity valuation',
      }];
    },
  };

  const input = researchState(query);
  const retrieveEvidence = createAgentCoreGraphRagEvidenceRetriever({
    adapter,
    transientQuery: query,
    hops: 2,
  });
  const output = await runResearchNode(input, { retrieveEvidence });

  assert.equal(output.currentNode, 'research');
  assert.ok(output.evidenceRefs.some(ref => ref.startsWith('graphrag-shadow:jaja-agent-core:')));
  assert.ok(output.evidenceRefs.includes('method-graphrag:jaja-agent-core'));
  const serialized = JSON.stringify(output);
  assert.equal(serialized.includes(query), false);
  assert.equal(serialized.includes('Transient explanatory graph text'), false);
  assert.equal(output.authority.write, false);
  assert.equal(output.authority.trade, false);
  assert.equal(output.authority.publish, false);
});

test('GraphRAG adapter fails closed on mismatched prompt fingerprint and unbounded output', async () => {
  const query = 'research request';
  const input = researchState(query);

  const mismatchRetriever = createAgentCoreGraphRagEvidenceRetriever({
    adapter: { id: 'core', search: async () => [{ id: 'x', label: 'x', snippet: 'x', score: 1, hop: 0 }] },
    transientQuery: 'different request',
  });
  await assert.rejects(
    () => runResearchNode(input, { retrieveEvidence: mismatchRetriever }),
    /GRAPHRAG_INPUT_FINGERPRINT_MISMATCH/,
  );

  const rawRetriever = createAgentCoreGraphRagEvidenceRetriever({
    adapter: {
      id: 'core',
      search: async () => [{
        id: 'x',
        label: 'x',
        snippet: 'x',
        score: 1,
        hop: 0,
        rawData: { value: 'forbidden' },
      }],
    },
    transientQuery: query,
  });
  await assert.rejects(
    () => runResearchNode(input, { retrieveEvidence: rawRetriever }),
    /GRAPHRAG_OUTPUT_FORBIDDEN|GRAPHRAG_HIT_FIELD_NOT_ADMITTED/,
  );
});

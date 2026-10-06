import { createRequire } from 'node:module';
import { performance } from 'node:perf_hooks';

import {
  actorHash,
  agentStateFingerprint,
  createLangGraphAdapter,
  createShadowAgentState,
  supervisorRoute,
} from '../server/agent-shadow-runtime.mjs';

const EXACT_LANGGRAPH_VERSION = '1.4.19';
const CAPABILITIES = [
  ['research', 'research'],
  ['market-read', 'market'],
  ['portfolio-proposal', 'portfolio-proposal'],
  ['truth-review', 'truth'],
];

function percentile(values, q) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * q))] || 0;
}

function summarize(samples) {
  const total = samples.reduce((sum, value) => sum + value, 0);
  return {
    count: samples.length,
    meanMs: +(total / samples.length).toFixed(6),
    p50Ms: +percentile(samples, 0.50).toFixed(6),
    p95Ms: +percentile(samples, 0.95).toFixed(6),
    operationsPerSecond: total > 0 ? +(samples.length / (total / 1000)).toFixed(3) : 0,
  };
}

function baseState(capability, index) {
  const suffix = String(index).padStart(4, '0');
  return createShadowAgentState({
    actorRef: actorHash('benchmark-actor'),
    transientInput: 'benchmark:' + capability,
    requestedCapability: capability,
    evidenceRefs: ['benchmark-evidence'],
    capabilityGrantIds: ['benchmark-read-grant'],
    approvalIds: [],
    agentRunId: 'agent-bench-' + suffix,
    graphRunId: 'graph-bench-' + suffix,
    traceId: index.toString(16).padStart(32, '0').slice(-32),
  });
}

async function buildLangGraph() {
  let langgraph;
  try {
    langgraph = await import('@langchain/langgraph');
  } catch (error) {
    const blocked = new Error('LANGGRAPH_DEPENDENCY_NOT_PINNED');
    blocked.cause = error;
    throw blocked;
  }

  const require = createRequire(import.meta.url);
  const manifest = require('@langchain/langgraph/package.json');
  if (manifest.version !== EXACT_LANGGRAPH_VERSION) {
    throw new Error('LANGGRAPH_VERSION_DRIFT:' + manifest.version);
  }

  const { Annotation, StateGraph } = langgraph;
  const State = Annotation.Root({
    schema: Annotation(),
    agentRunId: Annotation(),
    graphRunId: Annotation(),
    traceId: Annotation(),
    actorRef: Annotation(),
    mode: Annotation(),
    requestedCapability: Annotation(),
    currentNode: Annotation(),
    inputFingerprint: Annotation(),
    evidenceRefs: Annotation(),
    capabilityGrantIds: Annotation(),
    approvalIds: Annotation(),
    policyDecisionIds: Annotation(),
    checkpointId: Annotation(),
    attempt: Annotation(),
    authority: Annotation(),
  });

  const compiledGraph = new StateGraph(State)
    .addNode('capitalRouter', state => supervisorRoute(state))
    .addEdge('__start__', 'capitalRouter')
    .addEdge('capitalRouter', '__end__')
    .compile();

  return createLangGraphAdapter({ compiledGraph, packageVersion: manifest.version });
}

async function run() {
  if (process.env.CAPITAL_AI_BENCHMARK_ENV !== 'isolated-nonproduction') {
    throw new Error('AGENT_BENCHMARK_ENV_REQUIRED');
  }
  const requested = Number(process.env.CAPITAL_AI_AGENT_BENCHMARK_ITERATIONS || 1000);
  if (!Number.isSafeInteger(requested) || requested < 100 || requested > 5000) {
    throw new Error('AGENT_BENCHMARK_ITERATIONS_INVALID');
  }

  const adapter = await buildLangGraph();
  const directSamples = [];
  const langGraphSamples = [];
  let compared = 0;

  for (let i = 0; i < requested; i += 1) {
    for (const [capability, expectedNode] of CAPABILITIES) {
      const state = baseState(capability, i);

      const directStarted = performance.now();
      const direct = supervisorRoute(state);
      directSamples.push(performance.now() - directStarted);

      const graphStarted = performance.now();
      const viaGraph = await adapter.invoke(state);
      langGraphSamples.push(performance.now() - graphStarted);

      if (direct.currentNode !== expectedNode || viaGraph.currentNode !== expectedNode) {
        throw new Error('AGENT_BENCHMARK_ROUTE_DIVERGENCE');
      }
      if (agentStateFingerprint(direct) !== agentStateFingerprint(viaGraph)) {
        throw new Error('AGENT_BENCHMARK_STATE_DIVERGENCE');
      }
      compared += 1;
    }
  }

  const report = {
    schemaVersion: 'CAPITAL_AI_AGENT_ORCHESTRATION_BENCHMARK@1',
    generatedAt: new Date().toISOString(),
    environment: 'isolated-nonproduction',
    candidate: { package: '@langchain/langgraph', version: EXACT_LANGGRAPH_VERSION },
    comparedTransitions: compared,
    functionalEquivalence: true,
    baseline: summarize(directSamples),
    langGraph: summarize(langGraphSamples),
    authority: { write: false, trade: false, publish: false, legalDecision: false },
    productionApproval: false,
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

run().catch(error => {
  process.stderr.write(JSON.stringify({
    schemaVersion: 'CAPITAL_AI_AGENT_ORCHESTRATION_BENCHMARK@1',
    outcome: 'BLOCKED',
    error: error?.message || 'UNKNOWN',
    productionApproval: false,
  }) + '\n');
  process.exitCode = 1;
});

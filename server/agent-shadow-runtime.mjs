import { createHash, randomBytes, randomUUID } from 'node:crypto';

import { sanitizeTelemetry, writeOperationalLog } from './observability.mjs';

export const AGENT_STATE_SCHEMA = 'CAPITAL_AI_AGENT_STATE@1';
export const AGENT_TRAJECTORY_SCHEMA = 'CAPITAL_AI_AGENT_TRAJECTORY@1';
export const LANGGRAPH_ADAPTER_SCHEMA = 'CAPITAL_AI_LANGGRAPH_ADAPTER@1';

const ALLOWED_CAPABILITIES = new Set(['research', 'market-read', 'portfolio-proposal', 'truth-review']);
const ROUTES = Object.freeze({
  research: 'research',
  'market-read': 'market',
  'portfolio-proposal': 'portfolio-proposal',
  'truth-review': 'truth',
});
const SECRET_KEY = /(secret|password|authorization|cookie|api[_-]?key|private[_-]?key|credential|access[_-]?token|auth[_-]?token|bearer[_-]?token|rawprompt|prompttext)/i;
const ALLOWED_NODES = new Set(['supervisor', 'research', 'market', 'portfolio-proposal', 'truth']);
const ID = /^[A-Za-z0-9._:-]{1,128}$/;
const HASH_REF = /^sha256:[0-9a-f]{64}$/;

export const SHADOW_AUTHORITY = Object.freeze({
  read: true,
  propose: true,
  write: false,
  trade: false,
  publish: false,
  legalDecision: false,
});

function sha256(value) {
  return 'sha256:' + createHash('sha256').update(String(value)).digest('hex');
}

function spanId() {
  return randomBytes(8).toString('hex');
}

function containsForbiddenKey(value, depth = 0) {
  if (depth > 8 || !value || typeof value !== 'object') return false;
  if (Array.isArray(value)) return value.some(item => containsForbiddenKey(item, depth + 1));
  return Object.entries(value).some(([key, nested]) => SECRET_KEY.test(key) || containsForbiddenKey(nested, depth + 1));
}

function boundedRefs(values, max = 32) {
  if (!Array.isArray(values) || values.length > max) throw new Error('AGENT_REFS_INVALID');
  const unique = [...new Set(values)];
  if (unique.some(value => typeof value !== 'string' || !ID.test(value))) throw new Error('AGENT_REFS_INVALID');
  return unique;
}

export function createShadowAgentState(input) {
  if (!input || typeof input !== 'object' || containsForbiddenKey(input)) throw new Error('AGENT_INPUT_FORBIDDEN');
  if (!HASH_REF.test(String(input.actorRef || ''))) throw new Error('AGENT_ACTOR_REF_INVALID');
  if (!ALLOWED_CAPABILITIES.has(input.requestedCapability)) throw new Error('AGENT_CAPABILITY_NOT_ADMITTED');
  if (typeof input.transientInput !== 'string' || input.transientInput.length < 1 || input.transientInput.length > 16000) {
    throw new Error('AGENT_INPUT_INVALID');
  }
  const agentRunId = input.agentRunId || randomUUID();
  const graphRunId = input.graphRunId || randomUUID();
  const traceId = String(input.traceId || randomBytes(16).toString('hex')).toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(traceId)) throw new Error('AGENT_TRACE_ID_INVALID');
  return Object.freeze({
    schema: AGENT_STATE_SCHEMA,
    agentRunId,
    graphRunId,
    traceId,
    actorRef: input.actorRef,
    mode: 'SHADOW',
    requestedCapability: input.requestedCapability,
    currentNode: 'supervisor',
    inputFingerprint: sha256(input.transientInput),
    evidenceRefs: boundedRefs(input.evidenceRefs || []),
    capabilityGrantIds: boundedRefs(input.capabilityGrantIds || []),
    approvalIds: boundedRefs(input.approvalIds || []),
    policyDecisionIds: ['AGENT_SHADOW_ONLY', 'AGENT_MUTATION_AUTHORITY_DENIED'],
    checkpointId: input.checkpointId || null,
    attempt: Number.isSafeInteger(input.attempt) && input.attempt > 0 ? input.attempt : 1,
    authority: SHADOW_AUTHORITY,
  });
}

export function assertShadowAuthority(value) {
  const a = value?.authority;
  if (!a || a.read !== true || a.propose !== true || a.write !== false || a.trade !== false ||
      a.publish !== false || a.legalDecision !== false) {
    throw new Error('AGENT_AUTHORITY_ESCALATION_DENIED');
  }
  if (value.mode !== 'SHADOW') throw new Error('AGENT_MODE_NOT_ADMITTED');
  return value;
}

export function supervisorRoute(state) {
  assertShadowAuthority(state);
  const nextNode = ROUTES[state.requestedCapability];
  if (!nextNode) throw new Error('AGENT_ROUTE_NOT_ADMITTED');
  return Object.freeze({
    ...state,
    currentNode: nextNode,
    policyDecisionIds: [...new Set([...state.policyDecisionIds, 'SUPERVISOR_ROUTE_ADMITTED'])],
  });
}

function normalizeGraphOutput(state, output) {
  if (!output || typeof output !== 'object' || Array.isArray(output) || containsForbiddenKey(output)) {
    throw new Error('LANGGRAPH_OUTPUT_INVALID');
  }
  const allowed = new Set(['currentNode', 'evidenceRefs', 'checkpointId', 'attempt', 'policyDecisionIds', 'authority']);
  for (const key of Object.keys(output)) {
    if (!allowed.has(key)) throw new Error('LANGGRAPH_OUTPUT_FIELD_NOT_ADMITTED');
  }
  const currentNode = output.currentNode ?? state.currentNode;
  if (!ALLOWED_NODES.has(currentNode)) throw new Error('LANGGRAPH_NODE_NOT_ADMITTED');
  const checkpointId = output.checkpointId ?? state.checkpointId;
  if (checkpointId !== null && (typeof checkpointId !== 'string' || !ID.test(checkpointId))) {
    throw new Error('LANGGRAPH_CHECKPOINT_INVALID');
  }
  const attempt = output.attempt ?? state.attempt;
  if (!Number.isSafeInteger(attempt) || attempt < 1 || attempt > 100) throw new Error('LANGGRAPH_ATTEMPT_INVALID');
  const next = {
    ...state,
    currentNode,
    evidenceRefs: output.evidenceRefs === undefined ? state.evidenceRefs : boundedRefs(output.evidenceRefs),
    checkpointId,
    attempt,
    policyDecisionIds: output.policyDecisionIds === undefined
      ? state.policyDecisionIds
      : boundedRefs(output.policyDecisionIds),
    authority: output.authority ?? state.authority,
  };
  return assertShadowAuthority(next);
}

export function createLangGraphAdapter({ compiledGraph, packageVersion = null } = {}) {
  if (!compiledGraph || typeof compiledGraph.invoke !== 'function') throw new Error('LANGGRAPH_COMPILED_GRAPH_REQUIRED');
  return Object.freeze({
    schema: LANGGRAPH_ADAPTER_SCHEMA,
    packageName: '@langchain/langgraph',
    packageVersion,
    runtimePromotion: 'BLOCKED',
    async invoke(state, config = {}) {
      assertShadowAuthority(state);
      if (containsForbiddenKey(config)) throw new Error('LANGGRAPH_CONFIG_FORBIDDEN');
      const output = await compiledGraph.invoke(structuredClone(state), sanitizeTelemetry(config));
      return normalizeGraphOutput(state, output);
    },
  });
}

export function createTrajectoryEvent({ before, after, startedAt, completedAt, tool = null, model = null, outcome = 'ok', errorClass = null, retryReason = null, tokenUsage = null, costEvidence = null }) {
  assertShadowAuthority(before);
  assertShadowAuthority(after);
  if (containsForbiddenKey({ tool, model, tokenUsage, costEvidence })) throw new Error('AGENT_TRAJECTORY_SECRET_FORBIDDEN');
  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(completedAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) throw new Error('AGENT_TRAJECTORY_TIME_INVALID');
  const event = {
    schema: AGENT_TRAJECTORY_SCHEMA,
    eventId: randomUUID(),
    agentRunId: after.agentRunId,
    graphRunId: after.graphRunId,
    traceId: after.traceId,
    spanId: spanId(),
    parentSpanId: tool?.parentSpanId || null,
    actorRef: after.actorRef,
    agentId: 'capital-ai-supervisor',
    nodeId: after.currentNode,
    parentNodeId: before.currentNode,
    transitionFrom: before.currentNode,
    transitionTo: after.currentNode,
    toolCallId: tool?.toolCallId || null,
    toolName: tool?.toolName || null,
    capabilityGrantId: tool?.capabilityGrantId || null,
    approvalId: tool?.approvalId || null,
    modelProvider: model?.provider || null,
    modelId: model?.id || null,
    inputFingerprint: after.inputFingerprint,
    outputFingerprint: tool?.output === undefined ? null : sha256(JSON.stringify(tool.output)),
    evidenceRefs: after.evidenceRefs,
    startedAt: new Date(startMs).toISOString(),
    completedAt: new Date(endMs).toISOString(),
    durationMs: endMs - startMs,
    attempt: after.attempt,
    retryReason,
    outcome,
    errorClass,
    tokenUsage,
    costEvidence,
    checkpointId: after.checkpointId,
    policyDecisionIds: after.policyDecisionIds,
  };
  return Object.freeze(sanitizeTelemetry(event));
}

export function emitTrajectory(event) {
  if (event?.schema !== AGENT_TRAJECTORY_SCHEMA) throw new Error('AGENT_TRAJECTORY_SCHEMA_INVALID');
  writeOperationalLog('info', 'agent-trajectory', event.agentRunId, 'agent.transition', { trajectory: event });
}

export function actorHash(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 512) throw new Error('AGENT_ACTOR_INVALID');
  return sha256(value);
}

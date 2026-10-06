import { createHash } from 'node:crypto';

import { validateProviderQueryRequest } from './private-provider-query.mjs';
import { agentStateFingerprint, assertShadowAuthority } from './agent-shadow-runtime.mjs';

const REF = /^[A-Za-z0-9._:-]{1,128}$/;
const FORBIDDEN_KEY = /(secret|password|authorization|cookie|api[_-]?key|private[_-]?key|credential|access[_-]?token|auth[_-]?token|bearer[_-]?token|rawprompt|prompttext|rawdata|payload)/i;

function sha256(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function assertNoForbiddenKeys(value, depth = 0) {
  if (depth > 6 || value == null || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) assertNoForbiddenKeys(item, depth + 1);
    return;
  }
  for (const [key, child] of Object.entries(value)) {
    if (FORBIDDEN_KEY.test(key)) throw new Error('AGENT_NODE_SECRET_OR_RAW_DATA_FORBIDDEN');
    assertNoForbiddenKeys(child, depth + 1);
  }
}

function safeRefs(values, errorCode = 'AGENT_NODE_EVIDENCE_INVALID') {
  if (!Array.isArray(values) || values.length > 16) throw new Error(errorCode);
  const refs = [...new Set(values)];
  if (refs.some(value => typeof value !== 'string' || !REF.test(value))) throw new Error(errorCode);
  return refs;
}

function appendEvidence(state, refs) {
  return [...new Set([...state.evidenceRefs, ...safeRefs(refs)])].slice(0, 32);
}

function appendPolicy(state, decision) {
  if (!REF.test(decision)) throw new Error('AGENT_NODE_POLICY_INVALID');
  return [...new Set([...state.policyDecisionIds, decision])].slice(0, 32);
}

function requireCapability(state, capability) {
  assertShadowAuthority(state);
  if (state.requestedCapability !== capability) throw new Error('AGENT_NODE_CAPABILITY_MISMATCH');
}

function assertResultShape(result, allowedKeys) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('AGENT_NODE_RESULT_INVALID');
  assertNoForbiddenKeys(result);
  for (const key of Object.keys(result)) {
    if (!allowedKeys.has(key)) throw new Error('AGENT_NODE_RESULT_FIELD_NOT_ADMITTED');
  }
}

export async function runResearchNode(state, { retrieveEvidence } = {}) {
  requireCapability(state, 'research');
  if (typeof retrieveEvidence !== 'function') throw new Error('RESEARCH_ADAPTER_REQUIRED');
  const result = await retrieveEvidence(Object.freeze({
    inputFingerprint: state.inputFingerprint,
    evidenceRefs: [...state.evidenceRefs],
    stateFingerprint: agentStateFingerprint(state),
  }));
  assertResultShape(result, new Set(['evidenceRefs', 'methodRef']));
  const evidenceRefs = safeRefs(result.evidenceRefs || []);
  if (evidenceRefs.length === 0) throw new Error('RESEARCH_EVIDENCE_REQUIRED');
  if (result.methodRef !== undefined && (typeof result.methodRef !== 'string' || !REF.test(result.methodRef))) {
    throw new Error('RESEARCH_METHOD_REF_INVALID');
  }
  return Object.freeze(assertShadowAuthority({
    ...state,
    currentNode: 'research',
    evidenceRefs: appendEvidence(state, result.methodRef ? [...evidenceRefs, result.methodRef] : evidenceRefs),
    policyDecisionIds: appendPolicy(state, 'RESEARCH_EVIDENCE_BOUND'),
  }));
}

export async function runMarketReadNode(state, { request, executeRead } = {}) {
  requireCapability(state, 'market-read');
  if (state.capabilityGrantIds.length === 0) throw new Error('MARKET_READ_CAPABILITY_GRANT_REQUIRED');
  if (typeof executeRead !== 'function') throw new Error('MARKET_READ_ADAPTER_REQUIRED');
  assertNoForbiddenKeys(request);
  const validated = validateProviderQueryRequest(request);
  const result = await executeRead(Object.freeze({
    ...validated,
    stateFingerprint: agentStateFingerprint(state),
    capabilityGrantIds: [...state.capabilityGrantIds],
  }));
  assertResultShape(result, new Set(['evidenceRef', 'toolCallId']));
  if (typeof result.evidenceRef !== 'string' || !REF.test(result.evidenceRef)) throw new Error('MARKET_READ_EVIDENCE_REQUIRED');
  if (typeof result.toolCallId !== 'string' || !REF.test(result.toolCallId)) throw new Error('MARKET_READ_TOOL_CALL_ID_REQUIRED');
  return Object.freeze(assertShadowAuthority({
    ...state,
    currentNode: 'market',
    evidenceRefs: appendEvidence(state, [result.evidenceRef]),
    policyDecisionIds: appendPolicy(state, 'MARKET_READ_ONLY_VALIDATED'),
  }));
}

export function runPortfolioProposalNode(state, { proposalKind = 'rebalance' } = {}) {
  requireCapability(state, 'portfolio-proposal');
  if (state.evidenceRefs.length === 0) throw new Error('PORTFOLIO_PROPOSAL_EVIDENCE_REQUIRED');
  if (typeof proposalKind !== 'string' || !/^[a-z0-9._-]{1,40}$/.test(proposalKind)) {
    throw new Error('PORTFOLIO_PROPOSAL_KIND_INVALID');
  }
  const proposalRef = 'proposal:' + sha256(JSON.stringify({
    inputFingerprint: state.inputFingerprint,
    evidenceRefs: [...state.evidenceRefs].sort(),
    proposalKind,
  })).slice(0, 48);
  return Object.freeze(assertShadowAuthority({
    ...state,
    currentNode: 'portfolio-proposal',
    evidenceRefs: appendEvidence(state, [proposalRef]),
    policyDecisionIds: appendPolicy(state, 'PORTFOLIO_PROPOSAL_ONLY'),
  }));
}

export async function runTruthReviewNode(state, { reviewEvidence } = {}) {
  requireCapability(state, 'truth-review');
  if (typeof reviewEvidence !== 'function') throw new Error('TRUTH_REVIEW_ADAPTER_REQUIRED');
  if (state.evidenceRefs.length === 0) throw new Error('TRUTH_REVIEW_EVIDENCE_REQUIRED');
  const result = await reviewEvidence(Object.freeze({
    inputFingerprint: state.inputFingerprint,
    evidenceRefs: [...state.evidenceRefs],
    stateFingerprint: agentStateFingerprint(state),
  }));
  assertResultShape(result, new Set(['decision', 'evidenceRef', 'reasonCodes']));
  if (!['pass', 'blocked'].includes(result.decision)) throw new Error('TRUTH_REVIEW_DECISION_INVALID');
  if (typeof result.evidenceRef !== 'string' || !REF.test(result.evidenceRef)) throw new Error('TRUTH_REVIEW_EVIDENCE_INVALID');
  safeRefs(result.reasonCodes || [], 'TRUTH_REVIEW_REASON_INVALID');
  return Object.freeze(assertShadowAuthority({
    ...state,
    currentNode: 'truth',
    evidenceRefs: appendEvidence(state, [result.evidenceRef]),
    policyDecisionIds: appendPolicy(
      state,
      result.decision === 'pass' ? 'TRUTH_REVIEW_PASS_SHADOW' : 'TRUTH_REVIEW_BLOCKED',
    ),
    // A passing shadow review is evidence only. Publication/legal authority remains denied by state authority.
  }));
}

export const CAPITAL_AI_AGENT_STATE_VERSION = 'CAPITAL_AI_AGENT_STATE@1' as const;

export type AgentRequestedCapability =
  | 'research'
  | 'market-read'
  | 'portfolio-proposal'
  | 'truth-review';

export type AgentNodeId =
  | 'supervisor'
  | 'research'
  | 'market'
  | 'portfolio-proposal'
  | 'truth';

export interface AgentAuthorityBoundary {
  read: true;
  propose: true;
  write: false;
  trade: false;
  publish: false;
  legalDecision: false;
}

export interface CapitalAiAgentStateV1 {
  schema: typeof CAPITAL_AI_AGENT_STATE_VERSION;
  agentRunId: string;
  graphRunId: string;
  traceId: string;
  actorRef: `sha256:${string}`;
  mode: 'SHADOW';
  requestedCapability: AgentRequestedCapability;
  currentNode: AgentNodeId;
  inputFingerprint: `sha256:${string}`;
  evidenceRefs: readonly string[];
  capabilityGrantIds: readonly string[];
  approvalIds: readonly string[];
  policyDecisionIds: readonly string[];
  checkpointId: string | null;
  attempt: number;
  authority: AgentAuthorityBoundary;
}

export const SHADOW_AGENT_AUTHORITY: AgentAuthorityBoundary = Object.freeze({
  read: true,
  propose: true,
  write: false,
  trade: false,
  publish: false,
  legalDecision: false,
});

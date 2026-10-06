import type { AgentNodeId } from './agentState';

export const CAPITAL_AI_AGENT_TRAJECTORY_VERSION = 'CAPITAL_AI_AGENT_TRAJECTORY@1' as const;

export interface AgentTokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface AgentCostEvidence {
  currency: 'EUR' | 'USD';
  amount: number;
  source: 'provider-readback' | 'deterministic-estimate';
}

export interface CapitalAiAgentTrajectoryV1 {
  schema: typeof CAPITAL_AI_AGENT_TRAJECTORY_VERSION;
  eventId: string;
  agentRunId: string;
  graphRunId: string;
  traceId: string;
  spanId: string;
  parentSpanId: string | null;
  actorRef: `sha256:${string}`;
  agentId: string;
  nodeId: AgentNodeId;
  parentNodeId: AgentNodeId | null;
  transitionFrom: AgentNodeId | null;
  transitionTo: AgentNodeId;
  toolCallId: string | null;
  toolName: string | null;
  capabilityGrantId: string | null;
  approvalId: string | null;
  modelProvider: string | null;
  modelId: string | null;
  inputFingerprint: `sha256:${string}`;
  outputFingerprint: `sha256:${string}` | null;
  evidenceRefs: readonly string[];
  startedAt: string;
  completedAt: string;
  durationMs: number;
  attempt: number;
  retryReason: string | null;
  outcome: 'ok' | 'blocked' | 'error';
  errorClass: string | null;
  tokenUsage: AgentTokenUsage | null;
  costEvidence: AgentCostEvidence | null;
  checkpointId: string | null;
  policyDecisionIds: readonly string[];
}

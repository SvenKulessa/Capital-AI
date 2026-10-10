/** Content research/QA connector policy; advisory only, never publication authority. */
export type ContentUseMode = 'PRIVATE_PERSONAL' | 'COMMERCIAL';
export type ContentExternalTool = 'METRICDUCK' | 'METRICOOL' | 'AGENT_READY';
export type ToolCapability = 'SEC_RESEARCH' | 'SOCIAL_PLANNER' | 'AGENT_READABILITY';
export interface ExternalToolEvidence {
  tool: ContentExternalTool;
  mode: ContentUseMode;
  capability: ToolCapability;
  connected: boolean;
  rightsVerified: boolean;
  consentVerified: boolean;
  evidenceRef: string | null;
}
export const TOOL_CAPABILITIES: Readonly<Record<ContentExternalTool, ToolCapability>> = {
  METRICDUCK: 'SEC_RESEARCH',
  METRICOOL: 'SOCIAL_PLANNER',
  AGENT_READY: 'AGENT_READABILITY',
} as const;
/** Fail closed. No token, raw provider output, or private data should enter this DTO. */
export function assessExternalTool(e: ExternalToolEvidence): 'READ_ONLY' | 'DRAFT_ONLY' | 'BLOCKED' {
  if (e.capability !== TOOL_CAPABILITIES[e.tool] || !e.connected || !e.evidenceRef?.trim()) return 'BLOCKED';
  if (e.mode === 'COMMERCIAL' && !e.rightsVerified) return 'DRAFT_ONLY';
  if (!e.consentVerified) return 'DRAFT_ONLY';
  return 'READ_ONLY';
}
/** Publishing must be enforced separately through the server-side publisher approval workflow.
 * READ_ONLY is deliberately not a 'PUBLISH_READY' capability.
 */

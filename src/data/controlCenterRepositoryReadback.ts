/** Validate the shared repository envelope before either owner view uses it.
 * Cached/stale are permitted for labelled display, never promoted to live evidence.
 */
export type RepositoryFreshness = 'LIVE' | 'CACHED' | 'STALE';
const SOURCE_SHA = /^[a-f0-9]{40}$/;
export function isSourceSha(value: unknown): value is string {
  return typeof value === 'string' && SOURCE_SHA.test(value);
}
export function isRepositoryReadback(value: unknown, expectedRepository: string): value is Record<string, unknown> & {
  repository: string; sourceSha: string; observedAt: string; freshness: RepositoryFreshness;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const payload = value as Record<string, unknown>;
  return payload.schema === 'CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1' &&
    payload.repository === expectedRepository && isSourceSha(payload.sourceSha) &&
    typeof payload.observedAt === 'string' && Number.isFinite(Date.parse(payload.observedAt)) &&
    (payload.freshness === 'LIVE' || payload.freshness === 'CACHED' || payload.freshness === 'STALE');
}

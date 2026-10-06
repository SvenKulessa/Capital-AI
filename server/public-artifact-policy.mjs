const BLOCKED_PUBLIC_PREFIXES = Object.freeze([
  '/downloads/blueprints/',
]);

export function isBlockedPublicArtifactPath(pathname) {
  const normalized = String(pathname || '').toLowerCase();
  return BLOCKED_PUBLIC_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export function publicArtifactPolicySnapshot() {
  return {
    schema: 'CAPITAL_AI_PUBLIC_ARTIFACT_POLICY@1',
    blockedPrefixes: [...BLOCKED_PUBLIC_PREFIXES],
    blueprintFullArtifactsPublic: false,
  };
}

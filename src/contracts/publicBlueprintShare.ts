/**
 * Allowlisted deep links to PUBLIC blueprint concepts only. No private session,
 * provider keys, trading configuration, entitlement or performance metrics.
 * A copied/shared link is not a social-provider delivery receipt.
 */
import { STUDIO_BLUEPRINTS } from '../data/studioData';

export const PUBLIC_BLUEPRINT_DOCUMENTATION_URL = 'https://capital-ai.online/marketscreener/dokumentation';
const PUBLIC_BLUEPRINT_IDS = new Set(STUDIO_BLUEPRINTS.map(item => item.id));

export function buildPublicBlueprintShareUrl(id: unknown): string | null {
  if (typeof id !== 'string' || !PUBLIC_BLUEPRINT_IDS.has(id)) return null;
  const url = new URL(PUBLIC_BLUEPRINT_DOCUMENTATION_URL);
  url.hash = `share=${id}`;
  return url.toString();
}

/** The fragment is untrusted input; accept exactly one known catalog identifier. */
export function readPublicBlueprintShareId(hash: unknown): string | null {
  if (typeof hash !== 'string' || !hash.startsWith('#share=') || hash.length > 128) return null;
  const raw = hash.slice('#share='.length);
  // No extra arguments, nested paths or percent-encoded strings.
  if (!/^[A-Z][A-Z0-9_]*$/.test(raw) || !PUBLIC_BLUEPRINT_IDS.has(raw)) return null;
  return raw;
}

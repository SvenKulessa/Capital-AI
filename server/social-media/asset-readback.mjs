// CAPITAL_AI_SOCIAL_ASSET_READBACK@1
// Private-storage adapter boundary: no URL-based fetches, no uploads or publishing.
import { createHash } from 'node:crypto';
import { assertSocialManifestHandoff } from './provider-adapter.mjs';
const HARD_LIMIT = 32 * 1024 * 1024;
function fail(code) { throw new Error(code); }
export async function verifySocialStoredAsset({ manifest, handoff, loadImmutableBytes,
  loadRightsEvidence, maxBytes = HARD_LIMIT } = {}) {
  const { asset } = assertSocialManifestHandoff(manifest, handoff);
  if (typeof loadImmutableBytes !== 'function' || typeof loadRightsEvidence !== 'function'
    || !Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > HARD_LIMIT) {
    fail('SOCIAL_ASSET_PRIVATE_SOURCE_REQUIRED');
  }
  // Both callables are server-injected. Never permit user-provided remote URLs.
  let row;
  try {
    row = await loadImmutableBytes({
      assetId: asset.assetId, contentId: manifest.contentId,
      sourceSha: manifest.sourceSha, expectedSha256: asset.sha256,
    });
  } catch { fail('SOCIAL_ASSET_STORAGE_UNAVAILABLE'); }
  if (row?.assetId !== asset.assetId || row?.contentId !== manifest.contentId
    || row?.sourceSha !== manifest.sourceSha || !(row.bytes instanceof Uint8Array)
    || row.bytes.byteLength <= 0 || row.bytes.byteLength > maxBytes) {
    fail('SOCIAL_ASSET_IMMUTABLE_STORAGE_MISMATCH');
  }
  const receivedSha = createHash('sha256').update(row.bytes).digest('hex');
  if (receivedSha !== asset.sha256) fail('SOCIAL_ASSET_BYTES_HASH_MISMATCH');
  let rights;
  try {
    rights = await loadRightsEvidence({
      assetId: asset.assetId, contentId: manifest.contentId, sourceSha: manifest.sourceSha,
      assetSha256: receivedSha,
    });
  } catch { fail('SOCIAL_ASSET_RIGHTS_UNAVAILABLE'); }
  if (rights?.assetId !== asset.assetId || rights?.assetSha256 !== receivedSha
    || rights?.contentId !== manifest.contentId || rights?.sourceSha !== manifest.sourceSha
    || rights?.rightsVerified !== true
    || typeof rights.evidenceRef !== 'string' || rights.evidenceRef.length === 0) {
    fail('SOCIAL_ASSET_RIGHTS_UNVERIFIED');
  }
  // Do not return bytes to callers: only immutable verification facts.
  return Object.freeze({
    assetId: asset.assetId, contentId: manifest.contentId,
    sourceSha: manifest.sourceSha, sha256: asset.sha256,
    retrievedBytesSha256: receivedSha, rightsVerified: true,
    rightsEvidenceRef: rights.evidenceRef,
  });
}

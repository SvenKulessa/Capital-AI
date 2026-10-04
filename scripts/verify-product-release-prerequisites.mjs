import { readFileSync, realpathSync, statSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export const PRODUCT_RELEASE_REQUIREMENTS = Object.freeze({
  registration: ['frontend_signup', 'backend_signup', 'session', 'refresh', 'logout'],
  documentation: ['complete_inventory', 'frontend_hub', 'social_engine_generation', 'licenses'],
  monetization: ['frontend_prices', 'backend_prices', 'product_inventory', 'checkout', 'webhook', 'entitlements'],
  enterprise_byok: ['private_investor_model', 'enterprise_integration', 'concept_review', 'production_e2e', 'key_isolation'],
  infrastructure_assets: ['nats_auth_ack_replay', 'valkey_recovery', 'supabase_auth_rls', 'webservice_health', 'repo_runtime_identity', 'data_rights', 'full_instrument_manifest', 'all_assets_live_scoreable'],
  components_implementation: ['50_prompts', '50_contents', '50_implementations', '50_tests'],
  frontend_backend_parity: ['route_api_contracts', 'layout_desktop_mobile', 'product_entitlement_parity'],
  components_results: ['50_real_results'],
  mobile_play: ['existing_release_key', 'apk_signature', 'play_release_readback', 'package_version_binding'],
  seo_leads: ['measurement_window', 'seo_metrics', 'lead_attribution', 'observed_leads'],
  google_management: ['console_api', 'verified_property', 'branding_verification', 'database_binding_evidence'],
});

const SHA = /^[a-f0-9]{40}$/;
const DIGEST = /^sha256:[a-f0-9]{64}$/;
const IMAGE = /^ghcr\.io\/svenkulessa\/[a-z0-9][a-z0-9._-]*@sha256:[a-f0-9]{64}$/;
const hash = bytes => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
const array = value => Array.isArray(value) ? value : [];

// Reads only bounded, hashed evidence files beneath the explicitly supplied bundle.
// Hash consistency is not an independent review or a provider attestation.
export function verifyProductReleasePrerequisites({ manifest, evidenceDirectory, expectedSourceSha, expectedImageRef, component = 'web', now = Date.now() } = {}) {
  const reasons = [];
  const hashes = new Map();
  const block = reason => reasons.push(reason);
  const expectedIdentityValid = SHA.test(expectedSourceSha || '') && IMAGE.test(expectedImageRef || '') && ['web', 'nats'].includes(component);
  if (!expectedIdentityValid) block('EXPECTED_IDENTITY_INVALID');
  if (manifest?.schema !== 'CAPITAL_AI_PRODUCT_RELEASE_PREREQUISITES@1' || manifest?.sourceSha !== expectedSourceSha || manifest?.imageRef !== expectedImageRef || manifest?.component !== component) block('MANIFEST_IDENTITY_MISMATCH');
  let root;
  try { root = realpathSync(evidenceDirectory); } catch { block('EVIDENCE_DIRECTORY_MISSING'); }

  function readEvidence(ref) {
    if (!root || typeof ref?.path !== 'string' || !ref.path || isAbsolute(ref.path) || !DIGEST.test(ref.sha256 || '')) throw new Error('Invalid evidence reference');
    const file = realpathSync(resolve(root, ref.path));
    const rel = relative(root, file);
    if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) throw new Error('Evidence escaped bundle');
    if (!statSync(file).isFile() || statSync(file).size > 2 * 1024 * 1024) throw new Error('Evidence is not a bounded file');
    const bytes = readFileSync(file);
    if (!bytes.length || hash(bytes) !== ref.sha256) throw new Error('Evidence hash mismatch or empty file');
    hashes.set(ref.path, ref.sha256);
    return bytes;
  }

  const entries = array(manifest?.requirements);
  const ids = entries.map(row => row?.id);
  if (new Set(ids).size !== ids.length || entries.length !== Object.keys(PRODUCT_RELEASE_REQUIREMENTS).length || ids.some(id => !Object.hasOwn(PRODUCT_RELEASE_REQUIREMENTS, id))) block('REQUIREMENT_INVENTORY_MISMATCH');
  const reports = new Map();
  const checks = Object.entries(PRODUCT_RELEASE_REQUIREMENTS).map(([id, required]) => {
    const row = entries.find(entry => entry?.id === id);
    let pass = false;
    try {
      const report = JSON.parse(readEvidence(row?.evidence).toString('utf8'));
      const observed = Date.parse(report.observedAt);
      pass = expectedIdentityValid && report.requirementId === id && report.status === 'PASS' && report.environment === 'production' && report.sourceSha === expectedSourceSha && report.imageRef === expectedImageRef && report.component === component && Number.isFinite(observed) && observed <= now && now - observed <= 24 * 60 * 60 * 1000 && required.every(check => report.checks?.[check] === 'PASS');
      reports.set(id, report);
    } catch { /* Missing, malformed or tampered evidence remains blocked. */ }
    if (!pass) block('REQUIREMENT_NOT_PROVEN:' + id);
    return { id, pass };
  });

  // The component inventory must be real, explicit and shared by implementation/results.
  // Numbered placeholder rows or a caller's count=50 cannot satisfy this gate.
  let componentInventoryPass = false;
  try {
    const catalog = JSON.parse(readEvidence(manifest.componentCatalog).toString('utf8'));
    const rows = array(catalog.components);
    const componentIds = rows.map(row => row?.id);
    if (catalog.sourceSha !== expectedSourceSha || rows.length !== 50 || new Set(componentIds).size !== 50 || componentIds.some(id => typeof id !== 'string' || !id.trim())) throw new Error('Invalid component catalog');
    for (const row of rows) {
      for (const kind of ['prompt', 'content', 'implementation', 'test', 'result']) readEvidence(row[kind]);
      const result = JSON.parse(readEvidence(row.result).toString('utf8'));
      if (result.componentId !== row.id || result.sourceSha !== expectedSourceSha || result.imageRef !== expectedImageRef || result.status !== 'PASS' || result.environment !== 'production' || result.component !== component || result.result == null || JSON.stringify(result.result) === '{}' || JSON.stringify(result.result) === '[]' || result.result === '') throw new Error('Unproven component result');
    }
    for (const id of ['components_implementation', 'components_results']) {
      const observedIds = array(reports.get(id)?.componentIds);
      if (observedIds.length !== 50 || new Set(observedIds).size !== 50 || observedIds.some(value => !componentIds.includes(value))) throw new Error('Component set mismatch');
    }
    componentInventoryPass = true;
  } catch { block('REAL_50_COMPONENT_INVENTORY_NOT_PROVEN'); }

  const fingerprint = manifest ? hash(Buffer.from(JSON.stringify({ manifest, evidenceHashes: [...hashes].sort(([a], [b]) => a.localeCompare(b)) }))) : null;
  return {
    schema: 'CAPITAL_AI_PRODUCT_RELEASE_PREREQUISITES_RESULT@1',
    status: reasons.length ? 'BLOCKED' : 'PASS',
    releaseEligible: reasons.length === 0,
    sourceSha: expectedSourceSha || null,
    imageRef: expectedImageRef || null,
    component,
    fingerprintType: 'PRODUCT_EVIDENCE_BUNDLE_SHA256',
    fingerprint,
    checks,
    componentInventoryPass,
    reasons,
    independentProviderReviewRequired: true,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifestPath = process.argv[2];
  let manifest;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch { /* Emit a blocked report. */ }
  const report = verifyProductReleasePrerequisites({ manifest, evidenceDirectory: manifestPath ? dirname(resolve(manifestPath)) : undefined, expectedSourceSha: process.env.EXPECTED_MAIN_SHA, expectedImageRef: process.env.EXPECTED_IMAGE_REF, component: process.env.RELEASE_COMPONENT || 'web' });
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (!report.releaseEligible) process.exitCode = 1;
}

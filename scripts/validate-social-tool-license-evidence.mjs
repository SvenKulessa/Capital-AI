import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const FILE = new URL('../CAPITAL-AI-GROWTH/social-tool-license-evidence-20261006.json', import.meta.url);

function fail(message) { throw new Error(`[SOCIAL-TOOL-LICENSE-EVIDENCE] ${message}`); }

export function validateSocialToolLicenseEvidence(raw) {
  if (raw?.schemaVersion !== 'SOCIAL_TOOL_LICENSE_EVIDENCE@1') fail('schemaVersion mismatch');
  if (!/^[0-9a-f]{40}$/.test(raw.targetMain || '')) fail('targetMain must be immutable SHA');
  if (!/^[0-9a-f]{40}$/.test(raw.financeSource || '')) fail('financeSource must be immutable SHA');
  const ids = new Set();
  for (const item of raw.items || []) {
    if (!item.id || ids.has(item.id)) fail(`duplicate/empty item id: ${item.id}`);
    ids.add(item.id);
    if (!item.decision?.mode) fail(`decision mode missing: ${item.id}`);
    if (item.decision.productionEligible === true) {
      if (!['COMMERCIAL_PRODUCT_BUNDLE','COMMERCIAL_INTERNAL_SERVICE'].includes(item.decision.mode)) {
        fail(`production eligible item has invalid commercial mode: ${item.id}`);
      }
      if (item.id === 'd3' && !item.sourceEvidence?.integrity?.startsWith('sha512-')) fail('d3 integrity missing');
    }
    if (item.id.includes('weights') && item.decision.productionEligible === true && !item.upstream?.modelFileSha256) {
      fail(`production weight artifact missing sha256: ${item.id}`);
    }
    if (item.decision.mode === 'OWNER_PRIVATE_NONCOMMERCIAL_ONLY' && item.decision.productionEligible === true) {
      fail(`noncommercial item cannot be production eligible: ${item.id}`);
    }
  }
  const fullyEligible = new Set(raw.summary?.fullyProductionEligible || []);
  for (const id of fullyEligible) {
    const item = raw.items.find(candidate => candidate.id === id);
    if (!item || item.decision.productionEligible !== true) fail(`summary production eligible drift: ${id}`);
  }
  if (!ids.has('d3') || !ids.has('pillow') || !ids.has('ffmpeg')) {
    fail('required point-4 baseline item missing');
  }
  for (const removed of ['qwen3-tts-code','qwen3-tts-weights','chatterbox-code','chatterbox-multilingual-v3-weights','openai-whisper-code']) {
    if (ids.has(removed)) fail(`removed Social audio runtime reintroduced: ${removed}`);
  }
  const pillow = raw.items.find(item => item.id === 'pillow');
  if (pillow?.upstream?.targetArtifactSha256 !== '236ff70b9312fb68943c703aa842ca6a758abfa45ac187a5e7c1452e96ef72b5') {
    fail('Pillow target wheel hash drift');
  }
  const ffmpeg = raw.items.find(item => item.id === 'ffmpeg');
  if (ffmpeg?.upstream?.sourceSha256 !== '8c3850283eb25fa026482078a04051e0be17347b09ef81a0849bec15a96e002e') {
    fail('FFmpeg source hash drift');
  }
  if (ffmpeg?.upstream?.buildProfile !== 'deploy/social-media/ffmpeg-build-profile.json') {
    fail('FFmpeg build profile reference drift');
  }
  const poppler = raw.items.find(item => item.id === 'poppler');
  if (poppler?.decision?.requiredForSocialCore !== false || poppler?.decision?.customerArtifactAllowed !== false) {
    fail('Poppler customer-runtime exclusion drift');
  }
  return {status:'PASS', items:raw.items.length, productionEligible:[...fullyEligible]};
}

export function readAndValidateSocialToolLicenseEvidence() {
  return validateSocialToolLicenseEvidence(JSON.parse(readFileSync(FILE,'utf8')));
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.stdout.write(JSON.stringify(readAndValidateSocialToolLicenseEvidence(), null, 2)+'\n');
}

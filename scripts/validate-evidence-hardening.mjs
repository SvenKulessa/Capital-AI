import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const required = [
  'RESEARCH_EVIDENCE@1','SOURCE_PROVENANCE@1','LICENSE_EVIDENCE@1','DATASET_EVIDENCE@1',
  'EXPERIMENT_EVIDENCE@1','COST_EVIDENCE@1','CLAIM_EVIDENCE@1','EVIDENCE_BUNDLE@1',
  'SPONSORSHIP_P2_READINESS@1'
];

function read(path) { return JSON.parse(readFileSync(resolve(root, path), 'utf8')); }
function assert(condition, message, failures) { if (!condition) failures.push(message); }

export function runEvidenceHardeningValidationSuite() {
  const failures = [];
  const registry = read('contracts/registry.json');
  const byId = new Map(registry.contracts.map(c => [c.id, c]));
  for (const id of required) {
    const entry = byId.get(id);
    assert(entry, `missing contract registration: ${id}`, failures);
    if (!entry) continue;
    const contract = read(entry.path);
    const schema = read(entry.schemaPath);
    assert(contract.schema === id, `${id}: contract identity mismatch`, failures);
    assert(schema.properties?.schema?.const === id, `${id}: schema identity mismatch`, failures);
    assert(contract.version === entry.version, `${id}: registry version mismatch`, failures);
  }

  const research = read(byId.get('RESEARCH_EVIDENCE@1').path);
  assert(research.research.negativeResultsRequired === true, 'research must preserve negative results', failures);
  assert(research.reproducibility.required === true, 'research must require reproducibility', failures);
  assert(research.safety.inferredSuccessForbidden === true, 'research inferred success must be forbidden', failures);

  const provenance = read(byId.get('SOURCE_PROVENANCE@1').path);
  assert(provenance.safety.unverifiedOriginMayPass === false, 'unverified provenance must block', failures);
  assert(provenance.safety.missingLicenseMayPass === false, 'missing source license must block', failures);

  const license = read(byId.get('LICENSE_EVIDENCE@1').path);
  assert(license.safety.researchPurposeOverridesLicense === false, 'research purpose must not override license rights', failures);
  assert(license.safety.unknownRightsMayPass === false, 'unknown rights must block', failures);

  const dataset = read(byId.get('DATASET_EVIDENCE@1').path);
  assert(dataset.safety.missingLineageMayPass === false, 'missing dataset lineage must block', failures);
  assert(dataset.safety.missingDigestMayPass === false, 'missing dataset digest must block', failures);

  const experiment = read(byId.get('EXPERIMENT_EVIDENCE@1').path);
  assert(experiment.safety.repositoryHeadAloneIsExecutionEvidence === false, 'repository HEAD must not be experiment evidence', failures);

  const cost = read(byId.get('COST_EVIDENCE@1').path);
  assert(cost.safety.unattributedCostMayPass === false, 'unattributed cost must block', failures);

  const claim = read(byId.get('CLAIM_EVIDENCE@1').path);
  assert(claim.safety.unsupportedClaimMayPublish === false, 'unsupported claims must not publish', failures);
  assert(claim.safety.conflictingEvidenceMayPublish === false, 'conflicting claims must not publish', failures);

  const bundle = read(byId.get('EVIDENCE_BUNDLE@1').path);
  assert(bundle.safety.missingRequiredClassMayPass === false, 'incomplete evidence bundle must block', failures);
  assert(bundle.safety.generatedProjectionIsCanonicalInput === false, 'generated projections must not become canonical evidence', failures);

  const p2 = read(byId.get('SPONSORSHIP_P2_READINESS@1').path);
  assert(p2.phase.current === 'P1_EVIDENCE_HARDENING', 'P2 gate must remain in P1 evidence hardening', failures);
  assert(p2.decision.status === 'BLOCKED', 'P2 must remain blocked before verified bundle', failures);
  assert(p2.decision.passRequiresAllGates === true, 'P2 must require every gate', failures);
  assert(p2.safety.documentaryMergeAloneMayPass === false, 'Documentary merge alone must not unlock P2', failures);
  assert(p2.safety.researchPurposeOverridesRights === false, 'research purpose must not override rights', failures);

  return { passed: failures.length === 0, failures };
}

if (process.argv[1]?.endsWith('validate-evidence-hardening.mjs')) {
  const result = runEvidenceHardeningValidationSuite();
  if (!result.passed) {
    console.error('P1 Evidence Hardening validation failed:', result.failures);
    process.exitCode = 1;
  } else {
    console.log('✓ P1 Evidence Hardening contracts validated; Sponsorship P2 remains fail-closed BLOCKED.');
  }
}

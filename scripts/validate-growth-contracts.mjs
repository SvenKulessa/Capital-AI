import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EXPECTED_STEPS = ['DETECT', 'CORRELATE', 'CLASSIFY', 'REMEDIATE', 'VERIFY'];
const EXPECTED_IDS = new Set([
  'GROWTH_HANDOFF@1',
  'GROWTH_PROJECTION@1',
  'DOCUMENTARY_EVIDENCE@1',
  'CHANGE_PROPAGATION@1',
  'OIDC_VERIFICATION_STATE@1',
]);

async function readJson(relativePath) {
  const source = await fs.readFile(path.join(ROOT, relativePath), 'utf8');
  return JSON.parse(source);
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function stepsMatch(value) {
  return Array.isArray(value) &&
    value.length === EXPECTED_STEPS.length &&
    value.every((step, index) => step === EXPECTED_STEPS[index]);
}

export async function runGrowthContractValidationSuite() {
  const failures = [];
  const registry = await readJson('contracts/registry.json');

  assert(registry.schema === 'CAPITAL_AI_CONTRACT_REGISTRY@1', 'registry schema must be CAPITAL_AI_CONTRACT_REGISTRY@1', failures);
  assert(registry.version === '1.0.0', 'registry version must be 1.0.0', failures);
  assert(Array.isArray(registry.contracts) && registry.contracts.length >= EXPECTED_IDS.size, `registry must contain at least ${EXPECTED_IDS.size} registered baseline contracts`, failures);

  const ids = new Set(registry.contracts?.map((entry) => entry.id));
  assert(ids.size === (registry.contracts?.length ?? 0) && [...EXPECTED_IDS].every((id) => ids.has(id)), 'registry contract IDs are incomplete or duplicated', failures);
  assert(registry.invariants?.historicalEvidenceImmutable === true, 'historical evidence must remain immutable', failures);
  assert(registry.invariants?.missingEvidenceFailClosed === true, 'missing evidence must fail closed', failures);
  assert(registry.invariants?.generatedOutputsAreNotCanonicalInputs === true, 'generated outputs must never become canonical inputs', failures);
  assert(registry.invariants?.repositoryHeadAloneIsNotDeploymentSignal === true, 'repository HEAD alone must not trigger deployment', failures);
  assert((registry.invariants?.selfHealingMinimumPositiveCycles ?? 0) >= 3, 'self-healing requires at least three positive validation cycles', failures);
  assert(stepsMatch(registry.invariants?.selfHealingValidationSteps), 'self-healing validation steps must match repository governance', failures);

  const contracts = new Map();
  for (const entry of registry.contracts ?? []) {
    const contract = await readJson(entry.path);
    const schema = await readJson(entry.schemaPath);
    contracts.set(entry.id, contract);

    assert(contract.schema === entry.id, `${entry.path}: schema/id mismatch`, failures);
    assert(contract.version === entry.version, `${entry.path}: version mismatch`, failures);
    assert(schema.properties?.schema?.const === entry.id, `${entry.schemaPath}: schema const mismatch`, failures);
    assert(schema.properties?.version?.const === entry.version, `${entry.schemaPath}: version const mismatch`, failures);
  }

  const handoff = contracts.get('GROWTH_HANDOFF@1');
  assert(handoff?.canonicalRules?.sourceOfTruth?.machineReadableContracts === true, 'GROWTH_HANDOFF must make machine-readable contracts canonical', failures);
  assert(handoff?.canonicalRules?.sourceOfTruth?.generatedMarkdown === false, 'generated Markdown must not be canonical', failures);
  assert(handoff?.canonicalRules?.sourceOfTruth?.generatedRoadmap === false, 'generated roadmap must not be canonical', failures);
  assert(handoff?.canonicalRules?.sourceOfTruth?.generatedSocialContent === false, 'generated social content must not be canonical', failures);
  assert(handoff?.canonicalRules?.sourceOfTruth?.generatedOutputsMayBecomeInput === false, 'generated outputs must not loop back into canonical inputs', failures);
  assert(handoff?.canonicalRules?.historicalEvidence?.mutable === false, 'historical evidence must be immutable', failures);
  assert(handoff?.canonicalRules?.missingEvidence?.behavior === 'FAIL_CLOSED', 'missing evidence behavior must be FAIL_CLOSED', failures);
  assert(handoff?.safety?.mayDeploy === false, 'GROWTH_HANDOFF may not deploy', failures);
  assert(handoff?.safety?.mayModifyDNS === false, 'GROWTH_HANDOFF may not modify DNS', failures);
  assert(handoff?.safety?.mayModifyBilling === false, 'GROWTH_HANDOFF may not modify billing', failures);
  assert(handoff?.safety?.mayModifySecrets === false, 'GROWTH_HANDOFF may not modify secrets', failures);
  assert(handoff?.safety?.mayRewriteHistoricalEvidence === false, 'GROWTH_HANDOFF may not rewrite historical evidence', failures);

  const documentary = contracts.get('DOCUMENTARY_EVIDENCE@1');
  assert(documentary?.safety?.historicalRecordsImmutable === true, 'DOCUMENTARY_EVIDENCE historical records must be immutable', failures);
  assert(documentary?.safety?.inferredSuccessForbidden === true, 'DOCUMENTARY_EVIDENCE must forbid inferred success', failures);
  assert(documentary?.safety?.missingEvidenceMeansSuccess === false, 'missing evidence must never mean success', failures);
  assert((documentary?.selfHealing?.validationCycle?.required ?? 0) >= 3, 'DOCUMENTARY_EVIDENCE self-healing requires >=3 cycles', failures);
  assert(stepsMatch(documentary?.selfHealing?.validationSteps), 'DOCUMENTARY_EVIDENCE must use the five governance self-healing steps', failures);
  assert(documentary?.selfHealing?.eligibleForAutomation === false, 'template must not begin eligible for automation', failures);
  assert(documentary?.state?.transitions?.some((t) => t.from === 'PROPOSED' && t.to === 'BLOCKED'), 'DOCUMENTARY_EVIDENCE must support PROPOSED -> BLOCKED', failures);
  assert(documentary?.state?.transitions?.some((t) => t.from === 'EFFECTIVE' && t.to === 'SUPERSEDED'), 'DOCUMENTARY_EVIDENCE must support EFFECTIVE -> SUPERSEDED', failures);

  const propagation = contracts.get('CHANGE_PROPAGATION@1');
  assert(propagation?.selfHealing?.autoRepair?.enabled === false, 'auto-repair must remain disabled in the initial contract', failures);
  assert((propagation?.selfHealing?.promotionRule?.minimumPositiveValidationCycles ?? 0) >= 3, 'CHANGE_PROPAGATION promotion requires >=3 positive cycles', failures);
  assert(stepsMatch(propagation?.selfHealing?.validationSteps), 'CHANGE_PROPAGATION must use the five governance self-healing steps', failures);
  for (const forbidden of ['SECURITY_POLICY_RELAXATION','LICENSE_APPROVAL','DNS_CHANGE','BILLING_CHANGE','SECRET_ROTATION','PRODUCTION_DEPLOYMENT']) {
    assert(propagation?.selfHealing?.forbiddenRepairClasses?.includes(forbidden), `forbidden self-healing class missing: ${forbidden}`, failures);
  }
  assert(propagation?.deploymentRules?.repositoryHeadAloneTriggersDeploy === false, 'repository HEAD alone must not trigger deploy', failures);
  assert(propagation?.deploymentRules?.repositoryHeadAloneTriggersNatsRedeploy === false, 'repository HEAD alone must not trigger NATS redeploy', failures);
  assert(propagation?.consistencyGate?.failureBehavior?.pullRequest === 'BLOCK', 'PR consistency failures must block', failures);
  assert(propagation?.consistencyGate?.failureBehavior?.main === 'REPORT_AND_FAIL', 'main consistency failures must report and fail', failures);

  const projection = contracts.get('GROWTH_PROJECTION@1');
  assert(projection?.truthfulness?.productionClaims?.requireRuntimeEvidence === true, 'production claims require runtime evidence', failures);
  assert(projection?.truthfulness?.securityClaims?.requireTrustEvidence === true, 'security claims require TRUST evidence', failures);
  assert(projection?.truthfulness?.licenseClaims?.requireLicenseEvidence === true, 'license claims require license evidence', failures);
  assert(projection?.truthfulness?.commercializationClaims?.requireCommercializationEvidence === true, 'commercialization claims require evidence', failures);
  assert(projection?.truthfulness?.unsupportedClaims?.behavior === 'OMIT', 'unsupported claims must be omitted', failures);
  assert(projection?.outputs?.socialContent?.autoPublish === false, 'social content must not auto-publish', failures);
  assert(projection?.automation?.manualApprovalBeforePublishing?.required === true, 'manual approval before publishing must remain required', failures);
  assert(projection?.integrity?.generatedFiles?.editableByHand === false, 'generated files must not be edited by hand', failures);
  assert(projection?.safety?.mayPublishAutomatically === false, 'GROWTH_PROJECTION may not publish automatically', failures);
  assert(projection?.safety?.mayModifyProduction === false, 'GROWTH_PROJECTION may not modify production', failures);
  assert(projection?.safety?.mayModifyBilling === false, 'GROWTH_PROJECTION may not modify billing', failures);
  assert(projection?.safety?.mayModifyDNS === false, 'GROWTH_PROJECTION may not modify DNS', failures);


  const oidc = contracts.get('OIDC_VERIFICATION_STATE@1');
  assert(oidc?.decision?.configurationOnlyMayPassOverallGate === false, 'OIDC configuration alone must not pass the overall gate', failures);
  assert(oidc?.decision?.greenWithoutLoginEvidenceForbidden === true, 'OIDC green status requires login evidence', failures);
  assert(oidc?.gates?.credentialAuthenticationVerified?.mayBeInferredFromPresence === false, 'OIDC credential authentication must not be inferred from secret presence', failures);
  assert(oidc?.gates?.loginVerified?.mayBeInferredFromConfiguration === false, 'OIDC login verification must not be inferred from configuration', failures);
  assert(oidc?.decision?.missingEvidence === 'BLOCKED', 'missing OIDC evidence must block', failures);
  assert(oidc?.selfHealing?.autoRepair === false, 'OIDC auto-repair must remain disabled', failures);
  assert((oidc?.selfHealing?.minimumPositiveValidationCycles ?? 0) >= 3, 'OIDC self-healing requires >=3 positive validation cycles', failures);

  for (const [id, contract] of contracts) {
    if (id !== 'GROWTH_HANDOFF@1') {
      assert(Object.prototype.hasOwnProperty.call(contract?.correlation ?? {}, 'changeId'), `${id} must expose correlation.changeId`, failures);
    }
  }

  return { passed: failures.length === 0, failures };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = await runGrowthContractValidationSuite();
  if (!result.passed) {
    console.error('GROWTH contract validation failed:', result.failures);
    process.exitCode = 1;
  } else {
    console.log('✓ GROWTH handoff contracts validated successfully.');
  }
}

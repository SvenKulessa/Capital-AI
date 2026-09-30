import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_SHA = /^[0-9a-f]{40}$/;
const IMAGE_REF = /^ghcr\.io\/svenkulessa\/capital-ai@sha256:[0-9a-f]{64}$/;
const REQUIRED_CONTEXT = 'Docker Security Gate';

function targetsMain(ruleset) {
  const include = ruleset?.conditions?.ref_name?.include || [];
  return include.includes('refs/heads/main') || include.includes('~DEFAULT_BRANCH');
}

function normalizeDigest(value) {
  if (typeof value !== 'string') return null;
  if (/^sha256:[0-9a-f]{64}$/.test(value)) return value;
  if (/^[0-9a-f]{64}$/.test(value)) return 'sha256:' + value;
  return null;
}

export function evaluateProductionHandoff({
  candidate,
  license,
  rulesets,
  service,
  deploy,
  health,
  expectedServiceId,
  expectedOwnerId,
}) {
  if (!candidate || candidate.status !== 'ATTESTED_CANDIDATE' || candidate.deployEligible !== false) {
    throw new Error('Expected an attested, non-deployable candidate');
  }
  if (!SOURCE_SHA.test(candidate.sourceSha || '') || !IMAGE_REF.test(candidate.imageRef || '')) {
    throw new Error('Candidate source/image identity is malformed');
  }

  const activeMainRulesets = (Array.isArray(rulesets) ? rulesets : [])
    .filter(r => r?.target === 'branch' && r?.enforcement === 'active' && targetsMain(r));
  const rules = activeMainRulesets.flatMap(r => Array.isArray(r.rules) ? r.rules : []);
  const ruleTypes = new Set(rules.map(r => r.type));
  const statusRule = rules.find(r => r.type === 'required_status_checks');
  const requiredContexts = statusRule?.parameters?.required_status_checks?.map(c => c.context) || [];
  const protectionPass =
    ruleTypes.has('deletion') &&
    ruleTypes.has('non_fast_forward') &&
    ruleTypes.has('pull_request') &&
    statusRule?.parameters?.strict_required_status_checks_policy === true &&
    requiredContexts.includes(REQUIRED_CONTEXT) &&
    activeMainRulesets.every(r => (r.bypass_actors || []).length === 0);

  const licenseSource = license?.applicationSourceSha || license?.sourceSha || null;
  const gates = [
    {
      name: 'LICENSE_REDISTRIBUTION_REVIEW',
      pass: license?.status === 'APPROVED' && license?.deployEligible === true && licenseSource === candidate.sourceSha,
      evidence: { status: license?.status || null, sourceSha: licenseSource },
    },
    {
      name: 'MAIN_PROTECTION',
      pass: protectionPass,
      evidence: { activeMainRulesets: activeMainRulesets.map(r => r.name), requiredContext: REQUIRED_CONTEXT, requiredContexts },
    },
    {
      name: 'RENDER_IMAGE_SOURCE',
      pass:
        service?.id === expectedServiceId &&
        service?.ownerId === expectedOwnerId &&
        service?.type === 'web_service' &&
        service?.imagePath === candidate.imageRef,
      evidence: { serviceId: service?.id || null, ownerId: service?.ownerId || null, imagePath: service?.imagePath || null },
    },
    {
      name: 'RUNTIME_DIGEST',
      pass:
        deploy?.status === 'live' &&
        deploy?.image?.ref === candidate.imageRef &&
        normalizeDigest(deploy?.image?.sha) !== null,
      evidence: {
        deployId: deploy?.id || null,
        imageRef: deploy?.image?.ref || null,
        requestedManifestDigest: candidate.imageRef.split('@')[1],
        providerImageSha: normalizeDigest(deploy?.image?.sha),
        manifestRefMatches: deploy?.image?.ref === candidate.imageRef,
      },
    },
    {
      name: 'RUNTIME_IDENTITY',
      pass:
        health?.buildIdentity?.bound === true &&
        health?.buildIdentity?.sourceSha === candidate.sourceSha &&
        health?.buildIdentity?.builder === 'SvenKulessa/Capital-AI/.github/workflows/build-security.yml',
      evidence: { buildIdentity: health?.buildIdentity || null },
    },
  ];

  const remainingGates = gates.filter(g => !g.pass).map(g => g.name);
  const deployEligible = remainingGates.length === 0;
  return {
    schemaVersion: 1,
    status: deployEligible ? 'PRODUCTION_HANDOFF_VERIFIED' : 'PRODUCTION_HANDOFF_BLOCKED',
    deployEligible,
    sourceSha: candidate.sourceSha,
    imageRef: candidate.imageRef,
    serviceId: service?.id || null,
    deployId: deploy?.id || null,
    gates,
    remainingGates,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [candidatePath, licensePath, rulesetsPath, servicePath, deployPath, healthPath, outputPath] = process.argv.slice(2);
  if (!outputPath) throw new Error('Expected candidate, license, rulesets, service, deploy, health and output paths');
  const report = evaluateProductionHandoff({
    candidate: readJson(candidatePath),
    license: readJson(licensePath),
    rulesets: readJson(rulesetsPath),
    service: readJson(servicePath),
    deploy: readJson(deployPath),
    health: readJson(healthPath),
    expectedServiceId: process.env.EXPECTED_RENDER_SERVICE_ID,
    expectedOwnerId: process.env.EXPECTED_RENDER_OWNER_ID,
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, remainingGates: report.remainingGates }));
  if (!report.deployEligible) process.exitCode = 1;
}

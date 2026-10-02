import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { verifyMainRuleset } from './verify-main-ruleset.mjs';
import { validateContainerIdentity } from './container-evidence-identity.mjs';

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
  expectedMainSha,
  registryManifest,
  registryScan,
  registryPlatformManifest,
  analysisResults = [],
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
  const statusRule = rules.find(r => r.type === 'required_status_checks');
  const requiredContexts = statusRule?.parameters?.required_status_checks?.map(c => c.context) || [];
  const protectionReports = activeMainRulesets.map(verifyMainRuleset);
  const protectionPass = protectionReports.some(r => r.pass) &&
    activeMainRulesets.every(r => (r.bypass_actors || []).length === 0);
  const requestedDigest = candidate.imageRef.split('@')[1];
  const manifests = registryManifest?.manifests?.filter(m =>
    m.platform?.os === 'linux' && m.platform?.architecture === 'amd64') || [];
  const platformDigest = manifests.length === 1 ? normalizeDigest(manifests[0].digest) : null;
  const configDigest = normalizeDigest(registryScan?.Metadata?.ImageID);
  let typedIdentity = null;
  let typedIdentityError = null;
  try {
    typedIdentity = validateContainerIdentity(candidate.containerIdentity);
  } catch (error) {
    typedIdentityError = error instanceof Error ? error.message : String(error);
  }
  const typedDigests = typedIdentity?.digests || {};
  const typedSource = typedIdentity?.source || {};
  const containerIdentityPass =
    typedIdentityError === null &&
    typedSource.sourceSha === candidate.sourceSha &&
    typedSource.testedSha === candidate.sourceSha &&
    typedSource.testedMergeSha === null &&
    typedDigests.artifactArchiveDigest !== null &&
    typedDigests.localImageId === configDigest &&
    typedDigests.ociIndexDigest === requestedDigest &&
    typedDigests.platformManifestDigest === platformDigest &&
    typedDigests.configDigest === configDigest;
  const registryPass = registryManifest?.digest === requestedDigest &&
    platformDigest !== null && configDigest !== null &&
    registryPlatformManifest?.digest === platformDigest &&
    registryPlatformManifest?.manifest?.config?.digest === configDigest &&
    registryScan?.Metadata?.ImageConfig?.os === 'linux' &&
    registryScan?.Metadata?.ImageConfig?.architecture === 'amd64';

  const licenseSource = license?.applicationSourceSha || license?.sourceSha || null;
  const gates = [
    {
      name: 'SOURCE_CURRENT_MAIN',
      pass: SOURCE_SHA.test(expectedMainSha || '') && expectedMainSha === candidate.sourceSha,
      evidence: { expectedMainSha: expectedMainSha || null, candidateSourceSha: candidate.sourceSha },
    },
    {
      name: 'LICENSE_REDISTRIBUTION_REVIEW',
      pass: license?.status === 'APPROVED' && license?.deployEligible === true && licenseSource === candidate.sourceSha,
      evidence: { status: license?.status || null, sourceSha: licenseSource },
    },
    {
      name: 'MAIN_PROTECTION',
      pass: protectionPass,
      evidence: { activeMainRulesets: activeMainRulesets.map(r => r.name), requiredContext: REQUIRED_CONTEXT, requiredContexts, protectionReports },
    },
    {
      name: 'CONTAINER_IDENTITY_CHAIN',
      pass: containerIdentityPass,
      evidence: {
        schema: typedIdentity?.schema || null,
        source: typedSource,
        digestTypes: typedIdentity?.digestTypes || null,
        digests: typedDigests,
        validationError: typedIdentityError,
      },
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
        registryPass &&
        normalizeDigest(deploy?.image?.sha) === platformDigest,
      evidence: {
        deployId: deploy?.id || null,
        imageRef: deploy?.image?.ref || null,
        requestedIndexDigest: requestedDigest,
        platformManifestDigest: platformDigest,
        configDigest,
        registryEvidenceMatches: registryPass,
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

  for (const type of ['code_scanning', 'code_quality']) {
    if (rules.some(r => r.type === type)) {
      const result = analysisResults.find(r => r.type === type && r.sourceSha === candidate.sourceSha);
      gates.push({
        name: type === 'code_scanning' ? 'REQUIRED_CODE_SCANNING_RESULTS' : 'REQUIRED_CODE_QUALITY_RESULTS',
        pass: result?.status === 'PASS' && typeof result?.evidenceUrl === 'string' &&
          result.evidenceUrl.startsWith('https://api.github.com/repos/SvenKulessa/Capital-AI/'),
        evidence: { result: result || null, policy: rules.filter(r => r.type === type) },
      });
    }
  }

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
    containerIdentity: typedIdentity ? {
      ...typedIdentity,
      digests: {
        ...typedIdentity.digests,
        runtimeProviderDigest: normalizeDigest(deploy?.image?.sha),
      },
    } : null,
    gates,
    remainingGates,
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [candidatePath, licensePath, rulesetsPath, servicePath, deployPath, healthPath, outputPath, registryManifestPath, registryScanPath, analysisResultsPath, platformManifestPath] = process.argv.slice(2);
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
    expectedMainSha: process.env.EXPECTED_MAIN_SHA,
    registryPlatformManifest: platformManifestPath ? {
      digest: 'sha256:' + createHash('sha256').update(readFileSync(platformManifestPath)).digest('hex'),
      manifest: readJson(platformManifestPath),
    } : null,
    registryManifest: registryManifestPath ? readJson(registryManifestPath) : null,
    registryScan: registryScanPath ? readJson(registryScanPath) : null,
    analysisResults: analysisResultsPath ? readJson(analysisResultsPath) : [],
  });
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ status: report.status, remainingGates: report.remainingGates }));
  if (!report.deployEligible) process.exitCode = 1;
}

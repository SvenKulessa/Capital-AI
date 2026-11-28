import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { assessGhcrPublicationRights } from '../assert-ghcr-publication-rights.mjs';

const GIT_SHA = /^[a-f0-9]{40}$/;
const SERVICE_ID = /^srv-[a-z0-9]+$/;
const OWNER_ID = /^tea-[a-z0-9]+$/;
const REPOSITORY = 'SvenKulessa/Capital-AI';
const GHCR_REPOSITORY = 'ghcr.io/svenkulessa/capital-ai';

const item = (name, status, reason) => ({ name, status, reason });
const allVerified = gates => gates.every(g => g.status === 'VERIFIED');

// This is a local, evidence-first planning view. It never grants cutover authority,
// creates provider resources, accesses secrets, or calls external APIs.
export function evaluateGhcrRenderCutoverPlan({
  expectedMainSha,
  currentMainSha,
  dockerfile,
  license,
  profile,
  service,
  deploy,
  expectedServiceId,
  expectedOwnerId,
}) {
  const sourceValid = typeof expectedMainSha === 'string' && GIT_SHA.test(expectedMainSha);
  const currentValid = typeof currentMainSha === 'string' && GIT_SHA.test(currentMainSha);
  const serviceIdValid = typeof expectedServiceId === 'string' && SERVICE_ID.test(expectedServiceId);
  const ownerIdValid = typeof expectedOwnerId === 'string' && OWNER_ID.test(expectedOwnerId);
  const sourceSame = sourceValid && currentValid && expectedMainSha === currentMainSha;
  const rights = assessGhcrPublicationRights({ sourceSha: expectedMainSha, dockerfile, license });
  const profileValid = profile?.repository === REPOSITORY &&
    profile?.registryRepository === GHCR_REPOSITORY &&
    profile?.platform === 'linux/amd64' &&
    profile?.workspaceId === expectedOwnerId &&
    typeof profile?.plan === 'string' && profile.plan.length > 0;
  const gitService = serviceIdValid && ownerIdValid && profileValid &&
    service?.id === expectedServiceId && service?.ownerId === expectedOwnerId &&
    service?.repo === 'https://github.com/' + REPOSITORY &&
    service?.branch === 'main' && service?.type === 'web_service' &&
    service?.serviceDetails?.env === 'docker' &&
    !service?.imagePath &&
    (service?.suspended == null || service.suspended === false || service.suspended === 'not_suspended');
  const exactDeploy = gitService && sourceSame &&
    typeof deploy?.id === 'string' && deploy.id.startsWith('dep-') &&
    deploy?.status === 'live' && deploy?.commit?.id === currentMainSha &&
    !deploy?.image;
  const oldPlanMatches = profileValid && service?.serviceDetails?.plan === profile.plan;

  const gates = [
    item('CURRENT_MAIN_SHA', sourceSame ? 'VERIFIED' : 'BLOCKED',
      sourceSame ? 'Exact supplied Main SHA matches the expected commit' : 'Missing, stale or mismatched Main SHA'),
    item('REDISTRIBUTION_RIGHTS', rights.blockers.length ? 'BLOCKED' : 'NOT_PROVEN',
      rights.blockers.length ? rights.blockers.join(',') : 'Existing rights guard structurally matches, but an offline input cannot independently authenticate a legal approval'),
    item('RENDER_GIT_SOURCE_BASELINE', gitService ? 'VERIFIED' : 'BLOCKED',
      gitService ? 'Existing Git-backed service scope and owner match' : 'Unknown or unexpected service, owner, source, or platform'),
    item('RENDER_LIVE_COMMIT_BASELINE', exactDeploy ? 'VERIFIED' : 'BLOCKED',
      exactDeploy ? 'Current Git-based live deployment matches supplied Main' : 'Live Git deployment cannot be uniquely bound to supplied Main'),
    item('CURRENT_SERVICE_PLAN', oldPlanMatches ? 'VERIFIED' : 'NOT_PROVEN',
      oldPlanMatches ? 'Existing plan matches repository profile; future billing is not verified' : 'Current service plan differs or is unavailable'),
    item('PUBLISHED_IMMUTABLE_REGISTRY_IMAGE', 'NOT_PROVEN',
      'Only the existing main-dispatch GHCR candidate job may publish after redistribution rights'),
    item('REGISTRY_RESCAN_AND_CYCLONEDX', 'NOT_PROVEN',
      'Requires registry-pulled image and digest-bound scan/SBOM from existing job'),
    item('VERIFIED_GITHUB_ATTESTATIONS', 'NOT_PROVEN',
      'Requires independent cryptographic provenance and SBOM verification at the immutable subject digest'),
    item('RENDER_REGISTRY_PULL_AUTHORITY', 'NOT_PROVEN',
      'Existing registry credential metadata does not prove the candidate is pullable'),
    item('PINNED_IMAGE_ROLLBACK', 'NOT_PROVEN',
      'Previous image must remain available by immutable digest; returning to Git source triggers a build'),
    item('CUTOVER_COST_AND_OWNER_APPROVAL', 'NOT_PROVEN',
      'No scoped authorization for source migration, automatic deployment, or potential additional costs'),
  ];
  // An offline plan never authorizes an action, including with fabricated data.
  return {
    schema: 'CAPITAL_AI_GHCR_RENDER_CUTOVER_PLAN@1',
    project: 'CAPITAL-AI',
    mode: 'OFFLINE_READ_ONLY',
    evidenceAuthority: 'SUPPLIED_SNAPSHOT_CONSISTENCY_ONLY',
    sourceSha: sourceValid ? expectedMainSha : null,
    currentMainSha: currentValid ? currentMainSha : null,
    serviceId: serviceIdValid ? expectedServiceId : null,
    deployId: exactDeploy ? deploy.id : null,
    currentSource: gitService ? 'GIT_DOCKER_BUILD' : 'NOT_PROVEN',
    targetImagePattern: GHCR_REPOSITORY + '@sha256:<immutable-manifest-digest>',
    expectedPlatform: 'linux/amd64',
    gates,
    rightsBlockers: [...rights.blockers],
    readyForCutover: false,
    admission: allVerified(gates) ? 'REVALIDATE' : 'BLOCKED',
    execution: {
      registryPush: 'NONE',
      sourceSwitch: 'NONE',
      renderDeploy: 'NONE',
      registryPermissionsChanged: 'NONE',
      costsActivated: 'NONE',
    },
    plan: [
      'TRUST: review exact-source license/notice/source-offer obligations and the existing redistributable-image rights contract',
      'PLATFORM: after rights admission, reuse build-security.yml dispatch candidate; verify local config ID against registry linux/amd64 platform manifest',
      'TRUST: verify GitHub-issued provenance and CycloneDX attestation against exact immutable GHCR digest',
      'PLATFORM: confirm existing Render registry credential can pull the pinned digest using an approved read-only provider method',
      'PLATFORM: capture old Git-backed service configuration and confirm provider rollback, package retention, and cost impact',
      'OWNER: explicitly authorize the source migration before any Render Settings change or deployment',
      'QUALITY: after separately authorized cutover, read live deploy.image.ref/sha, /healthz and exact Main identity; compare registry platform digest',
    ],
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [snapshotPath, dockerfilePath, rightsPath] = process.argv.slice(2);
    if (!snapshotPath || !dockerfilePath || !rightsPath) {
      throw new Error('Usage: node scripts/platform/ghcr-render-cutover-plan.mjs <sanitized-render-snapshot.json> <Dockerfile> <license-rights-review.json>');
    }
    const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8'));
    const result = evaluateGhcrRenderCutoverPlan({
      ...snapshot,
      dockerfile: readFileSync(dockerfilePath, 'utf8'),
      license: JSON.parse(readFileSync(rightsPath, 'utf8')),
    });
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
    if (result.admission !== 'REVALIDATE') process.exitCode = 2;
  } catch (error) {
    process.stderr.write('CUTOVER_PREFLIGHT_BLOCKED: ' + error.message + '\n');
    process.exitCode = 2;
  }
}

// SOURCE_PROVENANCE@1 companion for independent, read-only source review.
// Always hash immutable Git blobs, never working files or runtime secrets.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const REVIEW_PATHS = Object.freeze([
  'AGENTS.md',
  '.github/workflows/build-security.yml',
  '.github/workflows/google-cloud-admin.yml',
  '.github/workflows/merge-milestones.yml',
  '.github/workflows/post-merge-correlation.yml',
  'Dockerfile',
  'Dockerfile.security',
  'render.yaml',
  'package.json',
  'package-lock.json',
  'deploy/pr-agent/pyproject.toml',
  'deploy/pr-agent/uv.lock',
  'services/provider-bridge-rs/Cargo.lock',
  'server/billing-catalog.mjs',
  'server/vocabulary-checkout.mjs',
  'src/data/pricingCatalog.ts',
  'server/google-analytics-mcp.mjs',
  'server/google-maintenance-api.mjs',
  'scripts/growth/pr-merge-social-batch.mjs',
  'src/contracts/marketingOutreachPolicy.ts',
  'contracts/trust/SOURCE_PROVENANCE@1.yaml',
  'contracts/schemas/source-provenance.schema.json',
]);

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const execGit = (args, options = {}) => execFileSync('git', args, { maxBuffer: 10 * 1024 * 1024, ...options });

export function createIndependentReviewManifest({ git = execGit } = {}) {
  const commit = String(git(['rev-parse', '--verify', 'HEAD'], { encoding: 'utf8' })).trim();
  const tree = String(git(['rev-parse', '--verify', 'HEAD^{tree}'], { encoding: 'utf8' })).trim();
  if (!/^[a-f0-9]{40}$/.test(commit) || !/^[a-f0-9]{40}$/.test(tree)) throw new Error('REVIEW_GIT_IDENTITY_INVALID');
  const tracked = new Set(String(git(['ls-tree', '-r', '--name-only', 'HEAD'], { encoding: 'utf8' })).trimEnd().split('\n'));
  const files = REVIEW_PATHS.map(path => {
    if (!tracked.has(path)) throw new Error(`REVIEW_REQUIRED_SOURCE_MISSING:${path}`);
    const bytes = git(['show', `HEAD:${path}`]);
    if (!Buffer.isBuffer(bytes)) throw new Error(`REVIEW_SOURCE_BYTES_INVALID:${path}`);
    return { path, bytes: bytes.length, sha256: digest(bytes) };
  });
  return {
    schema: 'CAPITAL_AI_INDEPENDENT_SOURCE_REVIEW@1',
    provenanceContract: 'SOURCE_PROVENANCE@1',
    repository: 'SvenKulessa/Capital-AI',
    commit,
    tree,
    sourceUrl: `https://github.com/SvenKulessa/Capital-AI/tree/${commit}`,
    immutableSource: 'GIT_COMMIT_BLOBS',
    evidenceScope: 'STATIC_REPOSITORY_SOURCE_ONLY',
    generatedBy: 'scripts/independent-review-manifest.mjs',
    inventorySha256: digest(Buffer.from(JSON.stringify(files), 'utf8')),
    files,
    externalClaims: {
      dependencyRegistryLatest: 'NOT_VERIFIED',
      liveStripePriceOrCheckout: 'NOT_VERIFIED',
      renderRuntime: 'NOT_VERIFIED',
      productionOAuthAndWif: 'NOT_VERIFIED',
      publicationApproval: 'NOT_VERIFIED',
    },
    boundaries: [
      'This report contains public repository paths, byte counts and SHA-256 digests, never source contents or credentials.',
      'Reproducible from this exact Git commit; a ZIP file without immutable commit identity is insufficient.',
      'Never infer live security, legal rights, pricing, marketing consent or publishing authority from this report.',
      'NATS and private provider bridge remain subject to AGENTS.md and their separate runtime gates.',
    ],
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { process.stdout.write(JSON.stringify(createIndependentReviewManifest(), null, 2) + '\n'); }
  catch (error) { process.stderr.write(String(error?.message || 'REVIEW_MANIFEST_FAILED') + '\n'); process.exitCode = 1; }
}

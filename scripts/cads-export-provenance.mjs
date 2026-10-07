import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const EXPORT_PATHS = Object.freeze([
  'packages/benchmark-core/index.mjs',
  'packages/benchmark-core/index.test.mjs',
  'server/cads-marketplace.mjs',
  'server/cads-marketplace.test.mjs',
  'server/cads-observability.mjs',
  'server/cads-observability.test.mjs',
  'server/http-security.mjs',
  'apps/cads-github-app/github-app-registration.production.example.json',
  'apps/cads-github-app/marketplace-plans.production.json',
  'supabase/migrations/20261006210500_cads_marketplace_paid_entitlements.sql',
  'docs/licenses/CADS-PRODUCT-LICENSE.md',
  'docs/licenses/CADS-THIRD-PARTY-NOTICES.md',
  'docs/product/CADS-MARKETPLACE-INSTALLATION.md',
  'docs/product/CADS-MARKETPLACE-SUPPORT.md',
  'docs/product/CADS-STANDALONE-REPO-EXPORT.md',
  'docs/security/CADS-PACKAGE-ACCEPTANCE.md',
  'docs/security/CADS-SECURITY.md',
  'docs/legal/CADS-MARKETPLACE-PRIVACY.md',
  'docs/legal/CADS-MARKETPLACE-B2B-TERMS-DRAFT.md',
  'scripts/cads-package-benchmark.mjs',
  'scripts/cads-b2b-flow-benchmark.mjs',
  'scripts/cads-package-acceptance.test.mjs',
  'scripts/cads-package-acceptance-report.mjs',
]);

function gitBlobSha(buffer) {
  const header = Buffer.from('blob ' + buffer.length + '\0');
  return createHash('sha1').update(header).update(buffer).digest('hex');
}

const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const expectedSourceSha = String(process.env.CADS_SOURCE_SHA || '').trim().toLowerCase();
if (expectedSourceSha && sourceSha.toLowerCase() !== expectedSourceSha) {
  throw new Error('CADS_EXPORT_SOURCE_IDENTITY_MISMATCH expected=' + expectedSourceSha + ' actual=' + sourceSha);
}
const files = EXPORT_PATHS.map(path => {
  const bytes = readFileSync(path);
  return {
    path,
    bytes: bytes.length,
    gitBlobSha: gitBlobSha(bytes),
    sha256: createHash('sha256').update(bytes).digest('hex'),
  };
});

const report = {
  schemaVersion: 'CAPITAL_AI_CADS_EXPORT_PROVENANCE@1',
  generatedAt: new Date().toISOString(),
  sourceRepository: 'SvenKulessa/Capital-AI',
  sourceCommit: sourceSha,
  exportTarget: 'capital-ai-online/CADS',
  targetState: {
    initialStandalonePullRequest: 1,
    initialStandaloneMergeCommit: 'c8e8d91a4c988e75b93f587c4bf6e592016bcb71',
    initialCapitalAiSourceCommit: '0276d389412f806d2727c6b7b65d8215c703dbb1',
    laterSourceChangesRequireDeltaSync: true,
  },
  files,
  invariants: [
    'This manifest binds the Capital-AI CADS source candidate; the standalone repository owns its explicit transformation manifest.',
    'The standalone target is capital-ai-online/CADS.',
    'Benchmark-only event-backbone comparison artifacts are not automatically CADS release evidence.',
    'The unsuccessful NATS/Go comparison path must not be represented as CADS PASS, Marketplace approval or Production evidence.',
    'Do not export MARKET provider credentials, provider data, JaJa assets, Social Engine, SEO application code or unrelated Capital-AI UI.',
    'Do not export secrets or runtime credential values.',
    'First-party CADS licensing remains governed by LicenseRef-CAPITAL-AI-CADS-PROPRIETARY-1.0.',
    'Third-party runtime and service obligations remain independently applicable.',
    'A successful source-package acceptance or export does not confer Security, License, GitHub Marketplace or Production approval.',
  ],
};

const target = process.argv[2] || 'security-reports/cads-export-provenance.json';
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
process.stdout.write(JSON.stringify(report) + '\n');

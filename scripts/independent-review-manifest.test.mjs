import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createIndependentReviewManifest, REVIEW_PATHS } from './independent-review-manifest.mjs';

const commit = 'a'.repeat(40);
const tree = 'b'.repeat(40);
const fixtures = new Map(REVIEW_PATHS.map(p => [p, Buffer.from('file:' + p)]));
function mockGit(args) {
  if (args[0] === 'rev-parse') return args.at(-1) === 'HEAD' ? commit : tree;
  if (args[0] === 'ls-tree') return [...fixtures.keys()].join('\n') + '\n';
  if (args[0] === 'show') return fixtures.get(args[1].slice(5));
  throw new Error('unplanned git operation');
}

test('report uses immutable HEAD blobs and deterministic byte digests', () => {
  const a = createIndependentReviewManifest({ git: mockGit });
  const b = createIndependentReviewManifest({ git: mockGit });
  assert.deepEqual(a, b);
  assert.equal(a.commit, commit);
  assert.equal(a.tree, tree);
  assert.equal(a.files.length, REVIEW_PATHS.length);
  assert.equal(a.files[0].sha256, createHash('sha256').update(fixtures.get(REVIEW_PATHS[0])).digest('hex'));
  assert.equal(a.inventorySha256, createHash('sha256').update(JSON.stringify(a.files)).digest('hex'));
  assert.equal(a.externalClaims.liveStripePriceOrCheckout, 'NOT_VERIFIED');
  assert.equal(a.externalClaims.productionOAuthAndWif, 'NOT_VERIFIED');
  assert.equal(a.boundaries.length, 4);
});

test('source paths are fixed and only read-only Git commands execute', () => {
  assert.equal(new Set(REVIEW_PATHS).size, REVIEW_PATHS.length);
  assert.ok(REVIEW_PATHS.every(p => !p.startsWith('/') && !p.includes('..') && !p.includes('.env')));
  const calls = [];
  createIndependentReviewManifest({ git: (args, opts) => { calls.push(args); return mockGit(args, opts); } });
  assert.ok(calls.every(args => ['rev-parse', 'ls-tree', 'show'].includes(args[0])));
  assert.equal(calls.filter(args => args[0] === 'show').length, REVIEW_PATHS.length);
});

test('fail closed when source is missing or identity is not a commit SHA', () => {
  assert.throws(() => createIndependentReviewManifest({ git: args => args[0] === 'ls-tree' ? '' : mockGit(args) }), /REVIEW_REQUIRED_SOURCE_MISSING/);
  assert.throws(() => createIndependentReviewManifest({ git: args => args[0] === 'rev-parse' && args.at(-1) === 'HEAD' ? 'main' : mockGit(args) }), /REVIEW_GIT_IDENTITY_INVALID/);
});

test('never disclose source contents or credential-like fixture data', () => {
  const secret = 'sb_secret_NEVER_EXPORT_THIS_MATERIAL';
  const git = args => args[0] === 'show' ? Buffer.from(secret) : mockGit(args);
  const json = JSON.stringify(createIndependentReviewManifest({ git }));
  assert.ok(!json.includes(secret));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { XArticlesClient } from '../../src/services/x/xArticlesClient.ts';
import { refreshXAccessToken } from '../../src/services/x/xTokenRefresh.ts';
import { X_DRAFT_TEMPLATES } from '../../src/data/xDraftTemplates.ts';

test('X API calls fail closed by default even with supplied credentials', async () => {
  const previous = process.env.X_DRAFT_API_ENABLED;
  delete process.env.X_DRAFT_API_ENABLED;
  const fetchOriginal = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('unexpected network request'); };
  try {
    const client = new XArticlesClient('inert-test-token');
    await assert.rejects(client.createDraftArticle({ title: 'preview', content_state: { blocks: [] } }), /X_DRAFT_API_DISABLED/);
    await assert.rejects(client.uploadImageSimple(Buffer.from([1])), /X_DRAFT_API_DISABLED/);
    await assert.rejects(client.uploadMediaChunked(Buffer.from([1]), 'video\/mp4'), /X_DRAFT_API_DISABLED/);
    await assert.rejects(refreshXAccessToken(), /X_DRAFT_API_DISABLED/);
    await assert.rejects(client.createPostWithMedia('unapproved'), /PUBLISH_BLOCKED/);
    assert.throws(() => client.publishArticle('x'), /PUBLISH_BLOCKED/);
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.X_DRAFT_API_ENABLED;
    else process.env.X_DRAFT_API_ENABLED = previous;
  }
});

test('public post creation stays blocked even if draft flag is explicitly enabled', async () => {
  const previous = process.env.X_DRAFT_API_ENABLED;
  process.env.X_DRAFT_API_ENABLED = 'true';
  const fetchOriginal = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = async () => { requests++; throw new Error('unexpected public publish'); };
  try {
    await assert.rejects(new XArticlesClient('inert-test-token').createPostWithMedia('unapproved'), /PUBLISH_BLOCKED/);
    assert.equal(requests, 0);
  } finally {
    globalThis.fetch = fetchOriginal;
    if (previous === undefined) delete process.env.X_DRAFT_API_ENABLED;
    else process.env.X_DRAFT_API_ENABLED = previous;
  }
});

test('consolidation retains first article in reviewed template registry', () => {
  const t = X_DRAFT_TEMPLATES.find(x => x.id === 'evidence-first-scoring');
  assert.ok(t);
  assert.match(t.title, /Evidence-first Scoring/);
  assert.ok(t.blocks.length >= 4);
});

test('legacy entry point only previews and never requires credentials', () => {
  const result = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/growth/create-first-x-article-draft.mjs'], {
    encoding: 'utf8', env: { ...process.env, X_DRAFT_API_ENABLED: '', X_ACCESS_TOKEN: '' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /NO ACTION TAKEN/);
});

test('workflow contains no X secrets, real-media calls, credential output or hidden pass', () => {
  const workflow = readFileSync('.github/workflows/x-chunked-upload-test.yml', 'utf8');
  assert.doesNotMatch(workflow, /secrets\./);
  assert.doesNotMatch(workflow, /--confirm/);
  assert.doesNotMatch(workflow, /refreshXAccessToken/);
  assert.doesNotMatch(workflow, /\|\| true/);
  assert.match(workflow, /permissions:\n  contents: read/);
});

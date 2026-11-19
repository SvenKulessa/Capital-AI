import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { persistNewsFiles, recoverNewsLifecycle } from './news-lifecycle-transaction.mjs';
import { retireNews } from '../../shared/news-lifecycle.mjs';

const home = 'src/features/home/homeEditorialEdition.json';
const index = 'src/features/analysis/newsLifecycleIndex.json';
const archive = 'data/news-archive/technologie/2026/11/19/demo-1.json';
const records = n => [
  { path: home, content: 'HOME ' + n },
  { path: index, content: 'INDEX ' + n },
  { path: archive, content: 'ARCHIVE ' + n },
];
const tempDir = () => mkdtempSync(join(tmpdir(), 'news-txn-e2e-'));
const current = async dir => Promise.all([home, index, archive].map(path => readFile(join(dir, path), 'utf8')));

function crashInChild(root, event, after = 1) {
  // Terminate the child with SIGKILL: no JS catch, finally, or process exit hook.
  const script = 'import { persistNewsFiles } from ' +
    JSON.stringify(new URL('./news-lifecycle-transaction.mjs', import.meta.url).href) +
    '; await persistNewsFiles(' + JSON.stringify(records(1)) + ',' + JSON.stringify(root) +
    ', { hooks: { ' + event + ': ' +
    (event === 'afterCommit' ? '() => process.kill(process.pid, "SIGKILL")' :
      'n => { if(n === ' + after + ') process.kill(process.pid, "SIGKILL"); }') +
    ' } });';
  return spawnSync(process.execPath, ['--input-type=module', '-e', script],
    { encoding: 'utf8', timeout: 15000 });
}

test('WAL crash during the first file restores complete old edition, index and archive', async () => {
  const dir = tempDir();
  try {
    await persistNewsFiles(records(0), dir);
    assert.deepEqual(await current(dir), ['HOME 0', 'INDEX 0', 'ARCHIVE 0']);
    const child = crashInChild(dir, 'afterWrite');
    assert.equal(child.signal, 'SIGKILL', child.stderr);
    await assert.rejects(() => persistNewsFiles(records(2), dir), /LOCKED_OR_RECOVERY_REQUIRED/);
    assert.deepEqual(await recoverNewsLifecycle(dir), { recovered: true, outcome: 'ROLLED_BACK' });
    assert.deepEqual(await current(dir), ['HOME 0', 'INDEX 0', 'ARCHIVE 0']);
    assert.deepEqual(await recoverNewsLifecycle(dir), { recovered: false });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('durable commit marker survives SIGKILL before cleanup and preserves new snapshot', async () => {
  const dir = tempDir();
  try {
    await persistNewsFiles(records(0), dir);
    const child = crashInChild(dir, 'afterCommit');
    assert.equal(child.signal, 'SIGKILL', child.stderr);
    assert.deepEqual(await recoverNewsLifecycle(dir), { recovered: true, outcome: 'COMMITTED' });
    assert.deepEqual(await current(dir), ['HOME 1', 'INDEX 1', 'ARCHIVE 1']);
    await assert.rejects(() => persistNewsFiles(records(2), dir, { expected: { [home]: 'STALE' } }),
      /STALE_BASELINE/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('competing writer between snapshot and journal claim cannot erase newer state', async () => {
  const dir = tempDir();
  try {
    await persistNewsFiles(records(0), dir);
    await assert.rejects(
      () => persistNewsFiles(records(1), dir, {
        expected: { [home]: 'HOME 0', [index]: 'INDEX 0' },
        hooks: {
          beforeClaim: async () => {
            // A distinct writer commits while the first has only staged its
            // journal; neither pending lock nor destination rename exists yet.
            await persistNewsFiles(records(2), dir);
          },
        },
      }),
      /NEWS_TX_STALE_BASELINE/,
    );
    assert.deepEqual(await current(dir), ['HOME 2', 'INDEX 2', 'ARCHIVE 2']);
    assert.deepEqual(await recoverNewsLifecycle(dir), { recovered: false });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('reviewed immutable archive snapshots cannot be modified through the WAL writer', async () => {
  const dir = tempDir();
  try {
    await persistNewsFiles(records(0), dir, { archiveImmutable: true });
    await assert.rejects(
      () => persistNewsFiles(records(1), dir, { archiveImmutable: true }),
      /NEWS_TX_ARCHIVE_IMMUTABLE/,
    );
    assert.deepEqual(await current(dir), ['HOME 0', 'INDEX 0', 'ARCHIVE 0']);
    assert.deepEqual(await recoverNewsLifecycle(dir), { recovered: false });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('recovery refuses foreign mutation without erasing the transaction journal', async () => {
  const dir = tempDir();
  try {
    await persistNewsFiles(records(0), dir);
    assert.equal(crashInChild(dir, 'afterWrite').signal, 'SIGKILL');
    await writeFile(join(dir, home), 'external edit');
    await assert.rejects(() => recoverNewsLifecycle(dir), /RECOVERY_CONFLICT/);
    assert.equal(await readFile(join(dir, home), 'utf8'), 'external edit');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('in-process write error rolls back, and symlink destinations never mutate external files', async () => {
  const dir = tempDir(), outside = tempDir();
  try {
    await persistNewsFiles(records(0), dir);
    await assert.rejects(
      () => persistNewsFiles(records(1), dir, { hooks: { afterWrite: () => { throw Error('synthetic EIO'); } } }),
      /synthetic EIO/,
    );
    assert.deepEqual(await current(dir), ['HOME 0', 'INDEX 0', 'ARCHIVE 0']);
    const target = join(outside, 'untouched.json');
    await writeFile(target, 'untouched');
    // The existing archive target is replaced with a symlink only in an isolated temp root.
    rmSync(join(dir, archive));
    symlinkSync(target, join(dir, archive));
    await assert.rejects(() => persistNewsFiles(records(2), dir), /UNSAFE_PATH/);
    assert.equal(await readFile(target, 'utf8'), 'untouched');
  } finally {
    rmSync(dir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('synthetic Home → three overview slots → category/date archive persists without losing IDs', async () => {
  const dir = tempDir();
  const fixture = JSON.parse(await readFile(new URL('../../src/features/home/homeEditorialEdition.json', import.meta.url), 'utf8'));
  let edition = fixture;
  let lifecycle = { version: 1, overview: [], archive: [] };
  const snapshot = value => JSON.stringify(value, null, 2) + '\n';
  const planned = () => [
    { path: home, content: snapshot(edition) },
    { path: index, content: snapshot(lifecycle) },
    ...[...lifecycle.overview, ...lifecycle.archive].map(item => ({
      path: 'data/' + item.archivePath, content: snapshot(item),
    })),
  ];
  try {
    await persistNewsFiles(planned(), dir);
    for (let n = 1; n <= 5; n++) {
      const previous = edition;
      const previousHome = await readFile(join(dir, home), 'utf8');
      const previousIndex = await readFile(join(dir, index), 'utf8');
      edition = { ...previous, date: '2026-11-19', stories: [
        { ...previous.stories[0], id: 'synthetic-' + n,
          source: { ...previous.stories[0].source, url: 'https://example.invalid/' + n },
          evidence: { ...previous.stories[0].evidence,
            graphic: { ...previous.stories[0].evidence.graphic, assetId: 'home-synthetic-' + n + '-vector-v1' } },
        }, ...previous.stories.slice(0, 2),
      ] };
      lifecycle = retireNews(previous, edition, lifecycle, '2026-11-19');
      await persistNewsFiles(planned(), dir, { expected: {
        [home]: previousHome, [index]: previousIndex,
      } });
      assert.deepEqual(JSON.parse(await readFile(join(dir, index), 'utf8')), lifecycle);
    }
    assert.equal(lifecycle.overview.length, 3);
    assert.equal(lifecycle.archive.length, 2);
    const entries = [...lifecycle.overview, ...lifecycle.archive];
    assert.equal(new Set(entries.map(item => item.id)).size, 5);
    for (const item of entries) {
      assert.deepEqual(JSON.parse(await readFile(join(dir, 'data/' + item.archivePath), 'utf8')), item);
    }
    assert.deepEqual(await recoverNewsLifecycle(dir), { recovered: false });
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

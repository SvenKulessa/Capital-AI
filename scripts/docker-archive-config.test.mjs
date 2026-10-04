import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archiveConfigDigest } from './docker-archive-config.mjs';

const bytes = Buffer.from(JSON.stringify({ os: 'linux', architecture: 'amd64', rootfs: { type: 'layers', diff_ids: [] } }));
const hash = createHash('sha256').update(bytes).digest('hex');

test('classic and containerd exports bind actual configuration bytes', () => {
  const dir = mkdtempSync(join(tmpdir(), 'capital-config-'));
  try {
    for (const member of [hash + '.json', 'blobs/sha256/' + hash]) {
      mkdirSync(join(dir, 'blobs/sha256'), { recursive: true });
      writeFileSync(join(dir, member), bytes);
      writeFileSync(join(dir, 'manifest.json'), JSON.stringify([{ Config: member }]));
      const archive = join(dir, 'image.tar');
      execFileSync('tar', ['-cf', archive, '-C', dir, 'manifest.json', member]);
      assert.equal(archiveConfigDigest(archive), 'sha256:' + hash);
    }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('tampered bytes cannot inherit a declared configuration digest', () => {
  assert.throws(() => archiveConfigDigest('unused', member => member === 'manifest.json'
    ? Buffer.from(JSON.stringify([{ Config: hash + '.json' }])) : Buffer.from('{}')), /do not match/);
});

test('ambiguous exports and unsafe config paths fail closed', () => {
  for (const manifest of [[], [{ Config: hash + '.json' }, { Config: hash + '.json' }], [{ Config: '../secret' }]]) {
    assert.throws(() => archiveConfigDigest('unused', () => Buffer.from(JSON.stringify(manifest))));
  }
});

test('an arm64 configuration cannot be promoted as amd64', () => {
  const arm = Buffer.from(JSON.stringify({ os: 'linux', architecture: 'arm64', rootfs: { type: 'layers' } }));
  const digest = createHash('sha256').update(arm).digest('hex');
  assert.throws(() => archiveConfigDigest('unused', member => member === 'manifest.json'
    ? Buffer.from(JSON.stringify([{ Config: digest + '.json' }])) : arm), /linux\/amd64/);
});

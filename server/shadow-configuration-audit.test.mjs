import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, chmod, open, mkdir, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { FileShadowConfigurationAuditStore } from './shadow-configuration-audit.mjs';
import { SHADOW_SCORE_CONFIG_V1 } from '../src/config/shadowScoreConfig.ts';

const ownerId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const config = () => structuredClone(SHADOW_SCORE_CONFIG_V1);

async function sandbox(fn) {
  const root = await mkdtemp(join(tmpdir(), 'capital-market-audit-'));
  try { return await fn(root); }
  finally { await rm(root, { recursive: true, force: true }); }
}
const storeAt = (root, ownerUserId = ownerId) => new FileShadowConfigurationAuditStore({ root, ownerUserId });
const rowPath = (root, number = 1, userId = ownerId) =>
  join(root, userId, 'revision-' + String(number).padStart(8, '0') + '.json');

test('offline admin revision is immutable, versioned, SHA-bound and reloaded across a new process-style instance', async () =>
  sandbox(async root => {
    const first = storeAt(root), firstConfig = config();
    const one = await first.append({ actorUserId: ownerId, config: firstConfig, expectedHead: null });
    assert.match(one.eventId, /^AUD-[a-f0-9]{64}$/);
    assert.equal(one.record.productionEligible, false);
    assert.equal(one.record.config.modelVersion, '1.0.0');
    assert.equal(one.record.config.weightVersion, '1.0.0');
    assert.equal(one.record.config.productionApproved, false);
    firstConfig.profiles[0].weights.momentum = 0;
    const reloaded = storeAt(root);
    assert.equal((await reloaded.history())[0].record.config.profiles[0].weights.momentum, .25);
    const next = config();
    next.version = '1.0.1';
    next.maxRiskScore = 65;
    const two = await reloaded.append({ actorUserId: ownerId, config: next, expectedHead: one.eventId });
    assert.equal(two.record.previousEventId, one.eventId);
    assert.equal(two.record.configFingerprint.length, 64);
    assert.deepEqual((await storeAt(root).history()).map(v => v.eventId), [one.eventId, two.eventId]);
    assert.equal((await readFile(rowPath(root), 'utf8')).includes('OWNER_OFFLINE_SHADOW'), true);
  }));

test('wrong owner and tenant access do not cross a scoped directory', async () =>
  sandbox(async root => {
    const owner = storeAt(root);
    await assert.rejects(owner.append({ actorUserId: otherId, config: config(), expectedHead: null }),
      /AUDIT_OWNER_IDENTITY_MISMATCH/);
    const one = await owner.append({ actorUserId: ownerId, config: config(), expectedHead: null });
    assert.equal((await storeAt(root, otherId).history()).length, 0);
    assert.equal((await storeAt(root).history())[0].eventId, one.eventId);
    assert.throws(() => storeAt(root, '../other'), /AUDIT_OWNER_OR_ROOT_INVALID/);
  }));

test('concurrent writes, stale CAS and reused semantic versions fail closed', async () =>
  sandbox(async root => {
    const a = storeAt(root), b = storeAt(root);
    const results = await Promise.allSettled([
      a.append({ actorUserId: ownerId, config: config(), expectedHead: null }),
      b.append({ actorUserId: ownerId, config: config(), expectedHead: null }),
    ]);
    assert.equal(results.filter(v => v.status === 'fulfilled').length, 1);
    assert.equal(results.filter(v => v.status === 'rejected').length, 1);
    const history = await a.history();
    assert.equal(history.length, 1);
    await assert.rejects(a.append({ actorUserId: ownerId, config: { ...config(), version: '1.0.1' },
      expectedHead: null }), /AUDIT_CAS_MISMATCH/);
    await assert.rejects(a.append({ actorUserId: ownerId, config: config(),
      expectedHead: history[0].eventId }), /AUDIT_CONFIG_VERSION_NOT_MONOTONIC/);
    assert.equal((await b.history()).length, 1);
  }));

test('manual lock and corrupted records cannot be bypassed by racing writers', async () =>
  sandbox(async root => {
    const store = storeAt(root);
    await store.history();
    const lock = await open(join(root, ownerId, '.append.lock'), 'wx', 0o600);
    try {
      await assert.rejects(store.append({ actorUserId: ownerId, config: config(), expectedHead: null }),
        /AUDIT_CONCURRENT_WRITER/);
    } finally {
      await lock.close();
      await rm(join(root, ownerId, '.append.lock'));
    }
    const valid = await store.append({ actorUserId: ownerId, config: config(), expectedHead: null });
    const path = rowPath(root);
    const record = JSON.parse(await readFile(path, 'utf8'));
    record.record.config.maxRiskScore = 1;
    await writeFile(path, JSON.stringify(record), { mode: 0o600 });
    await assert.rejects(store.history(), /AUDIT_RECORD_HASH_MISMATCH/);
    await assert.rejects(store.append({ actorUserId: ownerId, config: { ...config(), version: '1.0.1' },
      expectedHead: valid.eventId }), /AUDIT_RECORD_HASH_MISMATCH/);
  }));

test('world-readable data, symlinked files, missing history and malformed versions are rejected', async () =>
  sandbox(async root => {
    const store = storeAt(root), one = await store.append({
      actorUserId: ownerId, config: config(), expectedHead: null,
    });
    const path = rowPath(root);
    await chmod(path, 0o644);
    await assert.rejects(store.history(), /AUDIT_STORAGE_PERMISSIONS_INVALID/);
    await chmod(path, 0o600);
    const outside = join(root, 'outside');
    await writeFile(outside, await readFile(path), { mode: 0o600 });
    await rm(path);
    await symlink(outside, path);
    await assert.rejects(store.history(), /ELOOP|AUDIT_STORAGE_PERMISSIONS_INVALID/);
    await rm(path);
    await assert.rejects(store.append({
      actorUserId: ownerId, config: { ...config(), version: '1.0.1' },
      expectedHead: one.eventId,
    }), /AUDIT_CAS_MISMATCH/);
    await assert.rejects(store.append({
      actorUserId: ownerId, config: { ...config(), mode: 'production' },
      expectedHead: null,
    }));
  }));

test('no user input can turn a persisted shadow revision into production admission', async () =>
  sandbox(async root => {
    const store = storeAt(root);
    for (const change of [
      { mode: 'production' }, { productionApproved: true },
      { minimumConfidence: .1 }, { version: 'not-semver' },
      { providerSecret: 'SHOULD_NEVER_BE_PERSISTED' },
    ]) {
      await assert.rejects(store.append({
        actorUserId: ownerId, config: { ...config(), ...change }, expectedHead: null,
      }));
    }
    assert.deepEqual(await store.history(), []);
    assert.equal((await readFile(join(root, ownerId, '.append.lock'), 'utf8').catch(() => null)), null);
  }));

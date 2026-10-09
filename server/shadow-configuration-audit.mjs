/**
 * Offline server-side shadow configuration audit.
 * No HTTP endpoint, Render mount, production promotion or authentication authority.
 * A verified owner identity must be supplied by a future server-side auth boundary.
 */
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, readdir, lstat, open, link, unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { ShadowPipelineConfigSchema } from '../src/contracts/pipelineExecution.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVENT_ID = /^AUD-[a-f0-9]{64}$/;
const ENTRY = /^revision-([0-9]{8})\.json$/;
const MAX_REVISIONS = 100;
const MAX_RECORD_BYTES = 1024 * 1024;

function canonical(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean')
    return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return '{' + Object.keys(value).sort()
      .map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  throw new Error('AUDIT_NON_CANONICAL_INPUT');
}
const digest = x => createHash('sha256').update(x).digest('hex');
function versionTuple(version) { return version.split('.').map(Number); }
function newer(next, old) {
  const a = versionTuple(next), b = versionTuple(old);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return false;
}
function privateMode(stat, directory) {
  if ((directory ? !stat.isDirectory() : !stat.isFile()) || stat.isSymbolicLink() ||
      (stat.mode & 0o077) !== 0) throw new Error('AUDIT_STORAGE_PERMISSIONS_INVALID');
}
function recordFilename(index) { return 'revision-' + String(index).padStart(8, '0') + '.json'; }

export class FileShadowConfigurationAuditStore {
  constructor({ root, ownerUserId }) {
    if (typeof root !== 'string' || !root.trim() || !UUID.test(ownerUserId ?? ''))
      throw new Error('AUDIT_OWNER_OR_ROOT_INVALID');
    this.root = resolve(root);
    this.ownerUserId = ownerUserId.toLowerCase();
    this.directory = join(this.root, this.ownerUserId);
  }

  async ensureDirectory() {
    await mkdir(this.directory, { recursive: true, mode: 0o700 });
    privateMode(await lstat(this.root), true);
    privateMode(await lstat(this.directory), true);
  }

  async readEntry(path) {
    const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
    try {
      const info = await file.stat();
      privateMode(info, false);
      if (info.size <= 0 || info.size > MAX_RECORD_BYTES) throw new Error('AUDIT_RECORD_SIZE_INVALID');
      const raw = await file.readFile('utf8');
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) ||
          Object.keys(parsed).sort().join(',') !== 'eventId,record' ||
          !EVENT_ID.test(parsed.eventId ?? '')) throw new Error('AUDIT_RECORD_CONTRACT_INVALID');
      const body = canonical(parsed.record);
      if ('AUD-' + digest(body) !== parsed.eventId) throw new Error('AUDIT_RECORD_HASH_MISMATCH');
      return parsed;
    } finally { await file.close(); }
  }

  async history() {
    await this.ensureDirectory();
    const names = (await readdir(this.directory)).filter(name => ENTRY.test(name)).sort();
    if (names.length > MAX_REVISIONS) throw new Error('AUDIT_REVISION_LIMIT');
    const revisions = [];
    let previousEventId = null, previousAt = 0;
    const versions = new Map();
    for (let n = 0; n < names.length; n++) {
      if (names[n] !== recordFilename(n + 1)) throw new Error('AUDIT_REVISION_SEQUENCE_INVALID');
      const { eventId, record } = await this.readEntry(join(this.directory, names[n]));
      if (!record || record.schemaVersion !== 'CAPITAL_AI_SHADOW_CONFIG_AUDIT@1' ||
          record.scope !== 'OWNER_OFFLINE_SHADOW' ||
          record.ownerUserId !== this.ownerUserId || record.actorUserId !== this.ownerUserId ||
          record.revisionNumber !== n + 1 || record.previousEventId !== previousEventId ||
          !Number.isSafeInteger(record.recordedAt) || record.recordedAt <= 0 ||
          record.recordedAt < previousAt || record.recordedAt > Date.now() ||
          record.productionEligible !== false) throw new Error('AUDIT_CHAIN_INVALID');
      const config = ShadowPipelineConfigSchema.parse(record.config);
      if (digest(canonical(config)) !== record.configFingerprint)
        throw new Error('AUDIT_CONFIG_FINGERPRINT_MISMATCH');
      const key = config.configId, old = versions.get(key);
      if (old && !newer(config.version, old)) throw new Error('AUDIT_CONFIG_VERSION_NOT_MONOTONIC');
      versions.set(key, config.version);
      previousAt = record.recordedAt;
      previousEventId = eventId;
      revisions.push({ eventId, record });
    }
    return structuredClone(revisions);
  }

  /**
   * An explicit compare-and-swap plus an exclusive filesystem lock prevents
   * two concurrent writers from silently forking the same revision chain.
   */
  async append({ actorUserId, config, expectedHead, recordedAt = Date.now() }) {
    if (typeof actorUserId !== 'string' || actorUserId.toLowerCase() !== this.ownerUserId)
      throw new Error('AUDIT_OWNER_IDENTITY_MISMATCH');
    if (expectedHead !== null && !EVENT_ID.test(expectedHead ?? ''))
      throw new Error('AUDIT_EXPECTED_HEAD_INVALID');
    if (!Number.isSafeInteger(recordedAt) || recordedAt <= 0 || recordedAt > Date.now())
      throw new Error('AUDIT_TIMESTAMP_INVALID');
    const parsed = ShadowPipelineConfigSchema.parse(config);
    await this.ensureDirectory();
    const lockPath = join(this.directory, '.append.lock');
    let lock;
    try { lock = await open(lockPath, 'wx', 0o600); }
    catch (error) {
      if (error?.code === 'EEXIST') throw new Error('AUDIT_CONCURRENT_WRITER');
      throw error;
    }
    let temporary = null;
    try {
      const entries = await this.history(), last = entries.at(-1) ?? null;
      if ((last?.eventId ?? null) !== expectedHead) throw new Error('AUDIT_CAS_MISMATCH');
      if (entries.length >= MAX_REVISIONS) throw new Error('AUDIT_REVISION_LIMIT');
      const previous = entries.filter(v => v.record.config.configId === parsed.configId).at(-1);
      if (previous && !newer(parsed.version, previous.record.config.version))
        throw new Error('AUDIT_CONFIG_VERSION_NOT_MONOTONIC');
      if (last && recordedAt < last.record.recordedAt) throw new Error('AUDIT_TIMESTAMP_NOT_MONOTONIC');
      const record = {
        schemaVersion: 'CAPITAL_AI_SHADOW_CONFIG_AUDIT@1',
        scope: 'OWNER_OFFLINE_SHADOW', ownerUserId: this.ownerUserId, actorUserId: this.ownerUserId,
        revisionNumber: entries.length + 1, previousEventId: expectedHead, recordedAt,
        configFingerprint: digest(canonical(parsed)), config: parsed,
        productionEligible: false,
      };
      const eventId = 'AUD-' + digest(canonical(record));
      const raw = canonical({ eventId, record });
      if (Buffer.byteLength(raw) > MAX_RECORD_BYTES) throw new Error('AUDIT_RECORD_SIZE_INVALID');
      temporary = join(this.directory, '.pending-' + randomUUID());
      const file = await open(temporary, 'wx', 0o600);
      try { await file.writeFile(raw, 'utf8'); await file.sync(); }
      finally { await file.close(); }
      // Hard link is an exclusive create, not a rename-overwrite.
      await link(temporary, join(this.directory, recordFilename(record.revisionNumber)));
      const dir = await open(this.directory, 'r');
      try { await dir.sync(); } finally { await dir.close(); }
      const verified = await this.history();
      if (verified.at(-1)?.eventId !== eventId) throw new Error('AUDIT_READBACK_FAILED');
      return structuredClone({ eventId, record });
    } finally {
      if (temporary) await unlink(temporary).catch(() => {});
      await lock.close();
      await unlink(lockPath);
    }
  }
}

/** DOCSYNC-02 synthetic-only pagination, optimistic delta planning and crash-safe private state. */
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { buildPlan, validateMapping } from './drive-sync-plan.mjs';

const PAGES_SCHEMA = 'capital-ai.doc-tree-pages.v1';
const STATE_SCHEMA = 'capital-ai.doc-tree-state.v1';
const SHA40 = /^[0-9a-f]{40}$/;
const SHA64 = /^[0-9a-f]{64}$/;
const SOURCE_ID = /^caid-[0-9a-f]{64}$/;
const TOKEN = /^[A-Za-z0-9_-]{1,128}$/;
const ETAG = /^[A-Za-z0-9_:."-]{1,128}$/;
const ACTIONS = ['PLAN_CREATE', 'PLAN_UPDATE', 'SKIP', 'CONFLICT', 'BLOCKED'];
const digest = (data) => createHash('sha256').update(data).digest('hex');

function fail(code) { throw new Error(code); }
function validName(s) { return typeof s === 'string' && s.length > 0 && s.length <= 256 && !/[\\/\0]/.test(s) && s !== '.' && s !== '..'; }
function validId(s) { return typeof s === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(s); }
function validRemoteFile(f) {
  return f && validId(f.id) && validId(f.parentId) && validName(f.name) && SOURCE_ID.test(f.syncKey)
    && typeof f.sha256 === 'string' && SHA64.test(f.sha256)
    && typeof f.revision === 'string' && /^[1-9][0-9]{0,15}$/.test(f.revision)
    && typeof f.etag === 'string' && ETAG.test(f.etag);
}

/** Verifies a complete, ordered, bounded synthetic listing; no provider calls. */
export function collectPages(input, mapping) {
  validateMapping(mapping);
  if (!input || input.schemaVersion !== PAGES_SCHEMA || input.rootKey !== mapping.targetRootKey || !validId(input.rootId)
      || !Array.isArray(input.pages) || !input.pages.length || input.pages.length > 100) fail('INVALID_PAGED_SNAPSHOT');
  let expected = null;
  const seenTokens = new Set();
  const folders = [], files = [];
  for (const [index, page] of input.pages.entries()) {
    if (!page || page.pageToken !== expected || !Array.isArray(page.folders) || !Array.isArray(page.files)
        || page.folders.length > 200 || page.files.length > 200) fail('PAGINATION_INCOMPLETE_OR_INVALID');
    if (page.nextPageToken !== null && (typeof page.nextPageToken !== 'string' || !TOKEN.test(page.nextPageToken)
        || page.nextPageToken === expected || seenTokens.has(page.nextPageToken))) fail('PAGINATION_CYCLE_OR_INVALID_TOKEN');
    if (page.nextPageToken === null && index !== input.pages.length - 1) fail('PAGINATION_EARLY_TERMINATION');
    if (page.nextPageToken !== null && index === input.pages.length - 1) fail('PAGINATION_INCOMPLETE_OR_INVALID');
    if (expected !== null) seenTokens.add(expected);
    for (const f of page.files) if (!validRemoteFile(f)) fail('UNSAFE_REMOTE_REVISION_OR_FILE');
    folders.push(...page.folders);
    files.push(...page.files);
    expected = page.nextPageToken;
  }
  return { schemaVersion: 'capital-ai.doc-tree-inventory.v1', rootKey: input.rootKey, rootId: input.rootId, folders, files };
}

export function validateState(state, rootId) {
  if (!state || state.schemaVersion !== STATE_SCHEMA || state.sourceRepository !== 'SvenKulessa/Capital-AI'
      || !SHA40.test(state.sourceSha) || state.rootId !== rootId || !Array.isArray(state.entries)) fail('INVALID_PRIVATE_STATE');
  const bySource = new Map(), ids = new Set();
  for (const e of state.entries) {
    if (!e || !SOURCE_ID.test(e.sourceId) || !validId(e.driveId) || !validId(e.parentId)
        || !SHA64.test(e.sha256) || typeof e.revision !== 'string' || !/^[1-9][0-9]{0,15}$/.test(e.revision)
        || typeof e.etag !== 'string' || !ETAG.test(e.etag)) fail('CORRUPT_PRIVATE_STATE_ENTRY');
    if (bySource.has(e.sourceId) || ids.has(e.driveId)) fail('DUPLICATE_PRIVATE_STATE_ID');
    bySource.set(e.sourceId, e); ids.add(e.driveId);
  }
  return bySource;
}

/** Do not advance private state to proposed (unapplied) uploads or updates. */
export function buildDeltaPlan({ mapping, docsRoot, pages, state = null, sourceSha }) {
  if (typeof sourceSha !== 'string' || !SHA40.test(sourceSha)) fail('INVALID_SOURCE_SHA');
  const snapshot = collectPages(pages, mapping);
  const past = state === null ? new Map() : validateState(state, snapshot.rootId);
  const base = buildPlan({ mapping, docsRoot, inventory: snapshot });
  const remoteBySource = new Map(snapshot.files.map((f) => [f.syncKey, f]));
  const resultRows = base.rows.map((raw) => {
    const row = { ...raw };
    const prior = past.get(row.sourceId);
    const remote = remoteBySource.get(row.sourceId);
    if (row.action === 'BLOCKED' || row.action === 'CONFLICT') return row;
    if (prior && !remote) { row.action = 'CONFLICT'; row.reason = 'TRACKED_REMOTE_MISSING'; }
    else if (remote && prior && (remote.id !== prior.driveId || remote.parentId !== prior.parentId)) {
      row.action = 'CONFLICT'; row.reason = 'REMOTE_IDENTITY_CHANGED';
    } else if (remote && prior && (remote.revision !== prior.revision || remote.etag !== prior.etag || remote.sha256 !== prior.sha256)) {
      row.action = 'CONFLICT'; row.reason = 'STALE_REMOTE_REVISION';
    } else if (remote && !prior && ['PLAN_UPDATE', 'SKIP'].includes(row.action)) {
      row.action = 'CONFLICT'; row.reason = 'UNTRACKED_REMOTE_OBJECT';
    } else if (prior && !remote && row.action === 'PLAN_CREATE') {
      row.action = 'CONFLICT'; row.reason = 'TRACKED_REMOTE_MISSING';
    }
    if (row.action === 'PLAN_UPDATE' && remote) {
      row.expectedRevision = remote.revision;
      row.expectedEtag = remote.etag;
      row.targetIdDigest = digest(remote.id);
    }
    return row;
  });
  // Never silently forget a previously tracked document removed from the local source.
  const localSources = new Set(base.rows.map((row) => row.sourceId));
  for (const [sourceId] of past) {
    if (!localSources.has(sourceId)) {
      resultRows.push({ sourceId, classification: 'UNRESOLVED', targetKey: null,
        action: 'CONFLICT', reason: 'TRACKED_LOCAL_MISSING' });
    }
  }
  // State is a confirmation of identical remote content, not a claim that proposed writes happened.
  const confirmed = resultRows.filter((r) => r.action === 'SKIP').map((r) => {
    const remote = remoteBySource.get(r.sourceId);
    return { sourceId: r.sourceId, driveId: remote.id, parentId: remote.parentId,
      sha256: remote.sha256, revision: remote.revision, etag: remote.etag };
  }).sort((a, b) => a.sourceId.localeCompare(b.sourceId));
  const audit = resultRows.map(({ sourceId, action, reason, classification, targetKey, sha256, expectedRevision, expectedEtag, targetIdDigest }) =>
    ({ sourceId, action, reason, classification, targetKey, sha256, expectedRevision, expectedEtag, targetIdDigest }));
  return {
    schemaVersion: 'capital-ai.doc-tree-delta-plan.v1', sourceRepository: mapping.sourceRepository,
    sourceSha, sourceOfTruth: 'GITHUB', mode: 'DRY_RUN_ONLY', writes: 0, networkRequests: 0,
    inventoryPages: pages.pages.length,
    summary: Object.fromEntries(ACTIONS.map((action) => [action, resultRows.filter((r) => r.action === action).length])),
    audit,
    confirmedState: { schemaVersion: STATE_SCHEMA, sourceRepository: mapping.sourceRepository,
      sourceSha, rootId: snapshot.rootId, entries: confirmed }
  };
}

function readNoFollow(filepath) {
  let st;
  try { st = fs.lstatSync(filepath); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
  if (!st.isFile() || st.isSymbolicLink()) fail('INVALID_STATE_FILE');
  const fd = fs.openSync(filepath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    if (!fs.fstatSync(fd).isFile()) fail('INVALID_STATE_FILE');
    return fs.readFileSync(fd);
  } finally { fs.closeSync(fd); }
}

export function readPrivateState(filePath, rootId) {
  const data = readNoFollow(filePath);
  if (data === null) return null;
  let state;
  try { state = JSON.parse(data.toString('utf8')); } catch { fail('CORRUPT_PRIVATE_STATE_JSON'); }
  validateState(state, rootId);
  return { state, sha256: digest(data) };
}

/** Explicit local-only write; lock, 0600 temp, fsync, atomic rename. No Drive writes. */
export function savePrivateStateAtomic(filePath, state, { expectedPreviousSha256 = null, simulateCrash = false } = {}) {
  validateState(state, state.rootId);
  if (typeof filePath !== 'string' || path.extname(filePath) !== '.json') fail('INVALID_STATE_PATH');
  const parent = path.dirname(path.resolve(filePath));
  if (!fs.lstatSync(parent).isDirectory() || fs.lstatSync(parent).isSymbolicLink()) fail('INVALID_STATE_PARENT');
  const target = path.resolve(filePath), lock = `${target}.lock`;
  let lockFd, temp;
  try {
    lockFd = fs.openSync(lock, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
    const previous = readNoFollow(target);
    if ((previous === null ? null : digest(previous)) !== expectedPreviousSha256) fail('STALE_LOCAL_STATE');
    if (previous !== null) readPrivateState(target, state.rootId);
    temp = `${target}.tmp-${randomBytes(8).toString('hex')}`;
    const fd = fs.openSync(temp, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_NOFOLLOW, 0o600);
    try { fs.writeFileSync(fd, `${JSON.stringify(state, null, 2)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    if (simulateCrash) fail('SIMULATED_BEFORE_RENAME');
    fs.renameSync(temp, target); temp = undefined;
    const directoryFd = fs.openSync(parent, fs.constants.O_RDONLY);
    try { fs.fsyncSync(directoryFd); } finally { fs.closeSync(directoryFd); }
    return digest(fs.readFileSync(target));
  } finally {
    if (temp) try { fs.rmSync(temp, { force: true }); } catch { /* best effort */ }
    if (lockFd !== undefined) {
      fs.closeSync(lockFd);
      fs.rmSync(lock, { force: true });
    }
  }
}

function cli(args) {
  const allowed = new Set(['--mapping','--docs-root','--pages','--state','--source-sha']);
  const argv = {};
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (!allowed.has(key) || !args[i+1] || args[i+1].startsWith('--') || argv[key]) fail('UNSUPPORTED_CLI_ARGUMENT');
    argv[key] = args[++i];
  }
  if (!argv['--mapping'] || !argv['--docs-root'] || !argv['--pages'] || !argv['--source-sha']) fail('MISSING_REQUIRED_ARGUMENT');
  const mapping = JSON.parse(fs.readFileSync(argv['--mapping'], 'utf8'));
  const pages = JSON.parse(fs.readFileSync(argv['--pages'], 'utf8'));
  const state = argv['--state'] ? readPrivateState(argv['--state'], pages.rootId)?.state ?? null : null;
  const result = buildDeltaPlan({ mapping, docsRoot: argv['--docs-root'], pages, state, sourceSha: argv['--source-sha'] });
  // Exclude confirmedState identifiers from printed audit. Never write state implicitly.
  const { confirmedState, ...safe } = result;
  process.stdout.write(JSON.stringify(safe, null, 2) + '\n');
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { cli(process.argv.slice(2)); } catch (e) { process.stderr.write(`DOCSYNC_DELTA_BLOCKED: ${e.message}\n`); process.exitCode = 1; }
}

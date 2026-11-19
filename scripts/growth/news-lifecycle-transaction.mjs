/** Offline, single-host crash-recoverable write-ahead transaction for reviewed news snapshots.
 * No publishing or licensing authority. Consumers must not read the derived files while
 * a transaction is pending: a multi-path filesystem update is not a live atomic read.
 */
import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, open, readFile, rename, rm, unlink } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';

const PRIVATE = '.news-lifecycle-private';
const PENDING = 'pending';
const JOURNAL = 'manifest.json';
const COMMITTED = 'committed.json';
const MAX_TRANSACTION_BYTES = 16 * 1024 * 1024;
const FILE_ALLOWED = /^(?:src\/features\/home\/homeEditorialEdition\.json|src\/features\/analysis\/newsLifecycleIndex\.json|data\/news-archive\/[a-z]+\/\d{4}\/\d{2}\/\d{2}\/[a-z0-9]+(?:-[a-z0-9]+)*\.json)$/;

const hash = value => createHash('sha256').update(value).digest('hex');
function target(root, relative) {
  if (typeof relative !== 'string' || !FILE_ALLOWED.test(relative)) throw Error('NEWS_TX_PATH_INVALID');
  const full = resolve(root, relative);
  if (!full.startsWith(root + sep)) throw Error('NEWS_TX_TRAVERSAL');
  return full;
}
async function statOrNull(file) {
  try { return await lstat(file); }
  catch (error) { if (error?.code === 'ENOENT') return null; throw error; }
}
async function safePath(root, full) {
  if (full !== root && !full.startsWith(root + sep)) throw Error('NEWS_TX_TRAVERSAL');
  let cursor = full;
  while (cursor !== root) {
    const stat = await statOrNull(cursor);
    if (stat && (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory()))) {
      throw Error('NEWS_TX_UNSAFE_PATH');
    }
    cursor = dirname(cursor);
  }
  if ((await statOrNull(root))?.isSymbolicLink()) throw Error('NEWS_TX_UNSAFE_ROOT');
}
async function syncDir(dir) {
  const h = await open(dir, 'r');
  try { await h.sync(); } finally { await h.close(); }
}
async function durableFile(path, text) {
  const h = await open(path, 'wx', 0o600);
  try { await h.writeFile(text, 'utf8'); await h.sync(); }
  finally { await h.close(); }
  await syncDir(dirname(path));
}
async function replaceFile(root, relative, content, token) {
  const dest = target(root, relative);
  await safePath(root, dest);
  await mkdir(dirname(dest), { recursive: true });
  await safePath(root, dest);
  const temp = dest + '.news-tmp-' + token;
  if (await statOrNull(temp)) throw Error('NEWS_TX_TEMP_EXISTS');
  await durableFile(temp, content);
  await rename(temp, dest);
  await syncDir(dirname(dest));
}
async function removeFile(root, relative, token) {
  const dest = target(root, relative);
  const temp = dest + '.news-tmp-' + token;
  await safePath(root, dest);
  await safePath(root, temp);
  if (await statOrNull(temp)) {
    await unlink(temp);
    await syncDir(dirname(temp));
  }
  if (await statOrNull(dest)) {
    await unlink(dest);
    await syncDir(dirname(dest));
  }
}
async function readCurrent(root, relative) {
  const dest = target(root, relative);
  await safePath(root, dest);
  const stat = await statOrNull(dest);
  if (!stat) return null;
  if (!stat.isFile()) throw Error('NEWS_TX_UNSAFE_PATH');
  return readFile(dest, 'utf8');
}
function validJournal(journal) {
  if (!journal || journal.version !== 1 || !/^[0-9a-f]{32}$/.test(journal.id ?? '') ||
      !Number.isSafeInteger(journal.ownerPid) || journal.ownerPid < 1 || !Array.isArray(journal.entries) ||
      !journal.entries.length) throw Error('NEWS_TX_JOURNAL_INVALID');
  const names = new Set();
  let bytes = 0;
  for (const entry of journal.entries) {
    if (typeof entry.path !== 'string' || !FILE_ALLOWED.test(entry.path) || names.has(entry.path) ||
        typeof entry.after !== 'string' || !(entry.before === null || typeof entry.before === 'string') ||
        entry.beforeHash !== (entry.before === null ? null : hash(entry.before)) ||
        entry.afterHash !== hash(entry.after)) throw Error('NEWS_TX_JOURNAL_INVALID');
    names.add(entry.path);
    bytes += Buffer.byteLength(entry.after) + (entry.before === null ? 0 : Buffer.byteLength(entry.before));
    if (bytes > MAX_TRANSACTION_BYTES) throw Error('NEWS_TX_SIZE_LIMIT');
  }
  return journal;
}
async function readJournal(pending) {
  const stat = await statOrNull(join(pending, JOURNAL));
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) throw Error('NEWS_TX_JOURNAL_MISSING');
  return validJournal(JSON.parse(await readFile(join(pending, JOURNAL), 'utf8')));
}
function isAlive(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { if (error?.code === 'ESRCH') return false; return true; }
}
async function privatePaths(root) {
  const dir = resolve(root);
  await safePath(dir, dir);
  const hidden = join(dir, PRIVATE);
  await safePath(dir, hidden);
  await mkdir(hidden, { recursive: true, mode: 0o700 });
  const stat = await lstat(hidden);
  if (!stat.isDirectory() || stat.mode & 0o077) throw Error('NEWS_TX_PRIVATE_PERMISSIONS');
  return { root: dir, hidden, pending: join(hidden, PENDING) };
}
async function rollbackPrepared(paths, journal) {
  // Do not destroy files modified by an unrelated process after the journal was written.
  for (const e of journal.entries) {
    const current = await readCurrent(paths.root, e.path);
    if (current !== e.before && current !== e.after) throw Error('NEWS_TX_RECOVERY_CONFLICT');
  }
  for (const e of journal.entries.slice().reverse()) {
    const dangling = target(paths.root, e.path) + '.news-tmp-' + journal.id;
    await safePath(paths.root, dangling);
    if (await statOrNull(dangling)) await unlink(dangling);
    if (e.before === null) await removeFile(paths.root, e.path, journal.id);
    else {
      const current = await readCurrent(paths.root, e.path);
      if (current !== e.before) await replaceFile(paths.root, e.path, e.before, journal.id);
    }
  }
}
async function finishCommitted(paths, journal) {
  for (const e of journal.entries) {
    if ((await readCurrent(paths.root, e.path)) !== e.after) throw Error('NEWS_TX_COMMIT_CONFLICT');
  }
  for (const e of journal.entries) {
    const dangling = target(paths.root, e.path) + '.news-tmp-' + journal.id;
    await safePath(paths.root, dangling);
    if (await statOrNull(dangling)) await unlink(dangling);
  }
}
async function settle(paths, journal) {
  const marker = await statOrNull(join(paths.pending, COMMITTED));
  if (marker) {
    if (!marker.isFile() || marker.isSymbolicLink()) throw Error('NEWS_TX_MARKER_INVALID');
    const commit = JSON.parse(await readFile(join(paths.pending, COMMITTED), 'utf8'));
    if (commit.journalSha256 !== hash(JSON.stringify(journal))) throw Error('NEWS_TX_MARKER_INVALID');
    await finishCommitted(paths, journal);
  } else await rollbackPrepared(paths, journal);
  // Tombstone the complete journal atomically before removing its directory.
  // A crash during recursive cleanup cannot leave an unreadable 'pending' lock.
  const settled = join(paths.hidden, 'settled-' + journal.id);
  if (await statOrNull(settled)) throw Error('NEWS_TX_SETTLED_EXISTS');
  await rename(paths.pending, settled);
  await syncDir(paths.hidden);
  await rm(settled, { recursive: true });
  await syncDir(paths.hidden);
}

/** Recover PREPARED => old state, COMMITTED => new state; fail closed on foreign edits. */
export async function recoverNewsLifecycle(root) {
  const privateDir = join(resolve(root), PRIVATE);
  if (!await statOrNull(privateDir)) return { recovered: false };
  const paths = await privatePaths(root);
  if (!await statOrNull(paths.pending)) return { recovered: false };
  const journal = await readJournal(paths.pending);
  if (isAlive(journal.ownerPid)) throw Error('NEWS_TX_LOCKED');
  // The pending directory is an exclusive single-host writer lock. Recovery is
  // single-operator by contract; do not start it concurrently from a scheduler.
  const committed = Boolean(await statOrNull(join(paths.pending, COMMITTED)));
  await settle(paths, journal);
  return { recovered: true, outcome: committed ? 'COMMITTED' : 'ROLLED_BACK' };
}

/** Internal filesystem primitive. Only the reviewed writer may call this for real repo files. */
export async function persistNewsFiles(files, root, { expected = {}, hooks = {} } = {}) {
  const paths = await privatePaths(root);
  if (await statOrNull(paths.pending)) throw Error('NEWS_TX_LOCKED_OR_RECOVERY_REQUIRED');
  if (!Array.isArray(files) || !files.length) throw Error('NEWS_TX_EMPTY');
  const seen = new Set(), entries = [];
  for (const item of files) {
    const relative = item.path;
    target(paths.root, relative);
    if (seen.has(relative)) throw Error('NEWS_TX_DUPLICATE');
    seen.add(relative);
    if (typeof item.content !== 'string') throw Error('NEWS_TX_INVALID_DATA');
    const before = await readCurrent(paths.root, relative);
    if (Object.hasOwn(expected, relative) && before !== expected[relative]) throw Error('NEWS_TX_STALE_BASELINE');
    if (before !== item.content) entries.push({ path: relative, before, beforeHash: before === null ? null : hash(before),
      after: item.content, afterHash: hash(item.content) });
  }
  if (!entries.length) return files.map(item => target(paths.root, item.path));
  const id = randomUUID().replaceAll('-', '');
  const journal = validJournal({ version: 1, id, ownerPid: process.pid, entries });
  const stage = join(paths.hidden, 'stage-' + id);
  await mkdir(stage, { mode: 0o700 });
  try {
    await durableFile(join(stage, JOURNAL), JSON.stringify(journal));
    await rename(stage, paths.pending); // atomic ownership claim; journal is already durable
    await syncDir(paths.hidden);
  } catch (error) {
    await rm(stage, { recursive: true, force: true });
    if (error?.code === 'EEXIST' || error?.code === 'ENOTEMPTY') throw Error('NEWS_TX_LOCKED');
    throw error;
  }
  let committed = false;
  try {
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      await replaceFile(paths.root, entry.path, entry.after, id);
      await hooks.afterWrite?.(i + 1); // Tests can terminate their isolated child process here.
    }
    await durableFile(join(paths.pending, COMMITTED), JSON.stringify({ journalSha256: hash(JSON.stringify(journal)) }));
    committed = true;
    await hooks.afterCommit?.(); // Tests can terminate after the durable commit marker.
    await settle(paths, journal);
  } catch (error) {
    if (!committed) {
      try { await settle(paths, journal); }
      catch { /* Keep the journal for a later explicit recovery; never delete evidence. */ }
    }
    throw error;
  }
  return files.map(item => target(paths.root, item.path));
}

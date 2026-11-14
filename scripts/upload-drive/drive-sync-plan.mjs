/**
 * CAPITAL-AI Docs-as-Code admission planner (DOCSYNC-01 / DOCSYNC-03).
 * Offline only. No network, OAuth, Drive client, destructive operation, or write API.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

const CLASSIFICATIONS = new Set(['PUBLIC', 'INTERNAL', 'RESTRICTED', 'SECRET']);
const APPROVED_CLASSES = new Set(['PUBLIC', 'INTERNAL']);
const ALWAYS_RESTRICTED_PREFIXES = ['docs/security/', 'docs/compliance/', 'docs/evidence/', 'docs/licenses/'];
const SCHEMA = 'capital-ai.doc-tree-map.v1';
const SNAPSHOT_SCHEMA = 'capital-ai.doc-tree-inventory.v1';
const secretSignature = /-----BEGIN (?:[A-Z ]*PRIVATE KEY|OPENSSH PRIVATE KEY)-----|\b(?:gh[pousr]_|xox[baprs]-|sk-proj-|AIza[0-9A-Za-z_-]{20})[A-Za-z0-9_-]{8,}/;

export function assertRepoPath(value, { directory = false } = {}) {
  if (typeof value !== 'string' || !value || value.includes('\\') || value.includes('\0') || path.posix.isAbsolute(value) || /^[A-Za-z]:/.test(value)) {
    throw new Error('INVALID_REPO_PATH');
  }
  if (value.split('/').some((part) => !part || part === '.' || part === '..')) {
    // A directory rule may terminate with exactly one slash.
    if (!(directory && value.endsWith('/') && value.slice(0, -1).split('/').every((part) => part && part !== '.' && part !== '..'))) {
      throw new Error('INVALID_REPO_PATH');
    }
  }
  if (directory && !value.endsWith('/')) throw new Error('INVALID_RULE_PREFIX');
  if (!directory && value.endsWith('/')) throw new Error('INVALID_REPO_PATH');
  return value;
}

function assertUnique(values, code) {
  if (new Set(values).size !== values.length) throw new Error(code);
}

export function validateMapping(mapping) {
  if (!mapping || mapping.schemaVersion !== SCHEMA || mapping.sourceRepository !== 'SvenKulessa/Capital-AI' || mapping.sourceRoot !== 'docs' || mapping.targetRootKey !== 'CAPITAL-AI' || mapping.mode !== 'DRY_RUN_ONLY') {
    throw new Error('INVALID_MAPPING_CONTRACT');
  }
  if (!mapping.auth || mapping.auth.mode !== 'NONE' || mapping.auth.remoteAccess !== false || mapping.auth.credentialFilesAllowed !== false) {
    throw new Error('AUTH_MUST_BE_DISABLED');
  }
  if (!Array.isArray(mapping.allowedExtensions) || mapping.allowedExtensions.length !== 1 || mapping.allowedExtensions[0] !== '.md') throw new Error('UNSAFE_EXTENSION_ALLOWLIST');
  if (!Number.isSafeInteger(mapping.maxFileBytes) || mapping.maxFileBytes < 1 || mapping.maxFileBytes > 2097152) throw new Error('UNSAFE_SIZE_LIMIT');
  if (!Array.isArray(mapping.folders) || mapping.folders.length < 1) throw new Error('INVALID_FOLDER_MAP');
  const keys = mapping.folders.map((f) => f.key);
  if (mapping.folders.some((f) => typeof f.key !== 'string' || !/^[A-Za-z][A-Za-z-]{1,50}$/.test(f.key) || f.parentKey !== 'CAPITAL-AI' || f.name !== f.key || f.key === mapping.targetRootKey)) throw new Error('INVALID_FOLDER_MAP');
  assertUnique(keys.map((k) => k.toLocaleLowerCase('en-US')), 'DUPLICATE_FOLDER_MAPPING');
  if (!Array.isArray(mapping.pathRules) || !Array.isArray(mapping.fileRules) || !Array.isArray(mapping.approvedFiles)) throw new Error('INVALID_RULES');
  for (const rule of mapping.pathRules) {
    assertRepoPath(rule.prefix, { directory: true });
    if (!rule.prefix.startsWith('docs/') || !keys.includes(rule.folderKey) || !CLASSIFICATIONS.has(rule.classification)) throw new Error('INVALID_PATH_RULE');
  }
  for (const rule of mapping.fileRules) {
    assertRepoPath(rule.path);
    if (!rule.path.startsWith('docs/') || !keys.includes(rule.folderKey) || !CLASSIFICATIONS.has(rule.classification)) throw new Error('INVALID_FILE_RULE');
  }
  for (const file of mapping.approvedFiles) {
    assertRepoPath(file);
    if (!file.startsWith('docs/') || !file.endsWith('.md')) throw new Error('INVALID_APPROVED_PATH');
  }
  assertUnique(mapping.pathRules.map((r) => r.prefix.toLowerCase()), 'DUPLICATE_PATH_RULE');
  assertUnique(mapping.fileRules.map((r) => r.path.toLowerCase()), 'DUPLICATE_FILE_RULE');
  assertUnique(mapping.approvedFiles.map((p) => p.toLowerCase()), 'DUPLICATE_APPROVED_PATH');
  for (const k of ['denySegments', 'denyNames', 'denyExtensions', 'denyNameFragments']) {
    if (!Array.isArray(mapping[k]) || mapping[k].length === 0 || mapping[k].some((v) => typeof v !== 'string' || !v || v !== v.toLowerCase())) throw new Error('INVALID_DENY_RULES');
  }
  return mapping;
}

export function stableSourceId(repoPath) {
  assertRepoPath(repoPath);
  if (!repoPath.startsWith('docs/')) throw new Error('OUTSIDE_DOCS_ROOT');
  return `caid-${createHash('sha256').update(`capital-ai/doc:v1:${repoPath}`).digest('hex')}`;
}

export function classifyPath(repoPath, mapping) {
  assertRepoPath(repoPath);
  if (!repoPath.startsWith('docs/')) throw new Error('OUTSIDE_DOCS_ROOT');
  const parts = repoPath.toLowerCase().split('/');
  const name = parts.at(-1);
  if (mapping.denyNames.includes(name) || mapping.denyExtensions.some((ext) => name.endsWith(ext)) || mapping.denyNameFragments.some((fragment) => name.includes(fragment)) || name.startsWith('.env')) {
    return { classification: 'SECRET', folderKey: null, allowed: false, reason: 'SENSITIVE_FILENAME' };
  }
  if (parts.some((part) => mapping.denySegments.includes(part))) {
    return { classification: 'RESTRICTED', folderKey: null, allowed: false, reason: 'DENIED_DIRECTORY' };
  }
  // An explicit rule must never downgrade a protected area into an uploadable class.
  if (ALWAYS_RESTRICTED_PREFIXES.some((prefix) => repoPath.startsWith(prefix))) {
    return { classification: 'RESTRICTED', folderKey: null, allowed: false, reason: 'RESTRICTED_CLASS' };
  }
  const exact = mapping.fileRules.find((r) => r.path === repoPath);
  const prefixes = mapping.pathRules.filter((r) => repoPath.startsWith(r.prefix)).sort((a, b) => b.prefix.length - a.prefix.length);
  const rule = exact || prefixes[0];
  if (!rule) return { classification: 'RESTRICTED', folderKey: null, allowed: false, reason: 'UNCLASSIFIED_PATH' };
  const allowed = APPROVED_CLASSES.has(rule.classification) && mapping.approvedFiles.includes(repoPath);
  return { classification: rule.classification, folderKey: rule.folderKey, allowed, reason: !APPROVED_CLASSES.has(rule.classification) ? 'RESTRICTED_CLASS' : allowed ? null : 'NOT_APPROVED' };
}

export function walkDocs(root) {
  const rootAbs = path.resolve(root);
  if (!fs.lstatSync(rootAbs).isDirectory() || fs.lstatSync(rootAbs).isSymbolicLink()) throw new Error('INVALID_LOCAL_ROOT');
  const entries = [];
  function visit(dir) {
    for (const name of fs.readdirSync(dir).sort()) {
      const absolute = path.join(dir, name);
      const relative = path.relative(rootAbs, absolute).split(path.sep).join('/');
      if (!relative || relative === '..' || relative.startsWith('../') || path.isAbsolute(relative)) throw new Error('PATH_ESCAPE');
      const stat = fs.lstatSync(absolute);
      if (stat.isSymbolicLink()) {
        entries.push({ repoPath: `docs/${relative}`, kind: 'SYMLINK', absolute });
      } else if (stat.isDirectory()) {
        visit(absolute);
      } else if (stat.isFile()) {
        entries.push({ repoPath: `docs/${relative}`, kind: 'FILE', absolute, size: stat.size });
      } else {
        entries.push({ repoPath: `docs/${relative}`, kind: 'UNSUPPORTED', absolute });
      }
    }
  }
  visit(rootAbs);
  assertUnique(entries.map((e) => e.repoPath.toLowerCase()), 'LOCAL_CASEFOLD_DUPLICATE');
  return entries;
}

function validateInventory(inventory, mapping) {
  if (inventory === null) return null;
  if (!inventory || inventory.schemaVersion !== SNAPSHOT_SCHEMA || inventory.rootKey !== mapping.targetRootKey || typeof inventory.rootId !== 'string' || !inventory.rootId || !Array.isArray(inventory.folders) || !Array.isArray(inventory.files)) throw new Error('INVALID_REMOTE_INVENTORY');
  const byKey = new Map();
  const known = new Map(mapping.folders.map((f) => [f.key, f]));
  assertUnique(inventory.folders.map((f) => f.key.toLowerCase()), 'DUPLICATE_REMOTE_FOLDER_KEY');
  assertUnique([inventory.rootId, ...inventory.folders.map((f) => f.id)].map(String), 'DUPLICATE_REMOTE_FOLDER_ID');
  for (const f of inventory.folders) {
    const rule = known.get(f.key);
    if (!rule || typeof f.id !== 'string' || !f.id || f.parentId !== inventory.rootId || f.name !== rule.name) throw new Error('CROSS_FOLDER_TARGET');
    byKey.set(f.key, f);
  }
  const seenIds = new Set();
  const seenParentsAndNames = new Set();
  const byStable = new Map();
  const byName = new Map();
  for (const file of inventory.files) {
    if (!file || typeof file.id !== 'string' || !file.id || typeof file.name !== 'string' || !file.name || typeof file.parentId !== 'string' || !file.parentId || typeof file.syncKey !== 'string' || !/^caid-[0-9a-f]{64}$/.test(file.syncKey) || (file.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(file.sha256))) throw new Error('INVALID_REMOTE_FILE');
    if (file.name === '.' || file.name === '..' || file.name.includes('/') || file.name.includes('\\') || file.name.includes('\0')) throw new Error('INVALID_REMOTE_NAME');
    if (!Array.from(byKey.values()).some((f) => f.id === file.parentId)) throw new Error('CROSS_FOLDER_FILE');
    const nameKey = `${file.parentId}/${file.name.toLowerCase()}`;
    if (seenIds.has(file.id)) throw new Error('DUPLICATE_REMOTE_FILE_ID');
    if (seenParentsAndNames.has(nameKey)) throw new Error('DUPLICATE_REMOTE_NAME');
    if (byStable.has(file.syncKey)) throw new Error('DUPLICATE_REMOTE_SOURCE_ID');
    seenIds.add(file.id);
    seenParentsAndNames.add(nameKey);
    byStable.set(file.syncKey, file);
    byName.set(nameKey, file);
  }
  return { byKey, byStable, byName };
}

/** Plan output intentionally never includes file content, credentials, or blocked filenames. */
export function buildPlan({ mapping, docsRoot, inventory = null }) {
  validateMapping(mapping);
  const remote = validateInventory(inventory, mapping);
  const rows = [];
  for (const entry of walkDocs(docsRoot)) {
    const identity = stableSourceId(entry.repoPath);
    const check = classifyPath(entry.repoPath, mapping);
    const row = { sourceId: identity, classification: check.classification, targetKey: check.folderKey, action: 'BLOCKED', reason: check.reason };
    if (entry.kind !== 'FILE') row.reason = entry.kind === 'SYMLINK' ? 'SYMLINK_DENIED' : 'UNSUPPORTED_LOCAL_FILE';
    else if (check.allowed && !mapping.allowedExtensions.includes(path.extname(entry.repoPath).toLowerCase())) row.reason = 'EXTENSION_DENIED';
    else if (check.allowed && entry.size > mapping.maxFileBytes) row.reason = 'FILE_TOO_LARGE';
    else if (check.allowed) {
      // Avoid a symlink swap between the earlier lstat and content read.
      const noFollow = fs.constants.O_NOFOLLOW;
      if (typeof noFollow !== 'number') throw new Error('NOFOLLOW_UNAVAILABLE');
      const fd = fs.openSync(entry.absolute, fs.constants.O_RDONLY | noFollow);
      let buffer;
      try {
        const opened = fs.fstatSync(fd);
        if (!opened.isFile() || opened.nlink !== 1 || opened.size > mapping.maxFileBytes || opened.size !== entry.size) {
          row.reason = 'FILE_CHANGED_OR_HARDLINK_DENIED';
        } else {
          buffer = fs.readFileSync(fd);
        }
      } finally { fs.closeSync(fd); }
      if (row.reason === 'FILE_CHANGED_OR_HARDLINK_DENIED') { /* fail closed */ }
      else if (buffer.length !== entry.size) row.reason = 'FILE_CHANGED_DURING_READ';
      else if (secretSignature.test(buffer.toString('utf8'))) row.reason = 'CONTENT_SECRET_SIGNATURE';
      else {
        row.sha256 = createHash('sha256').update(buffer).digest('hex');
        if (!remote) row.reason = 'REMOTE_INVENTORY_REQUIRED';
        else {
          const folder = remote.byKey.get(check.folderKey);
          if (!folder) row.reason = 'TARGET_FOLDER_UNRESOLVED';
          else {
            const found = remote.byStable.get(identity);
            const name = path.posix.basename(entry.repoPath);
            const collision = remote.byName.get(`${folder.id}/${name.toLowerCase()}`);
            if (found && (found.parentId !== folder.id || found.name !== name)) { row.action = 'CONFLICT'; row.reason = 'CROSS_FOLDER_OR_RENAME'; }
            else if (collision && collision.syncKey !== identity) { row.action = 'CONFLICT'; row.reason = 'NAME_COLLISION'; }
            else if (!found) { row.action = 'PLAN_CREATE'; row.reason = null; }
            else if (found.sha256 === row.sha256) { row.action = 'SKIP'; row.reason = null; }
            else { row.action = 'PLAN_UPDATE'; row.reason = 'REMOTE_HASH_DIFFERS'; }
          }
        }
      }
    }
    if (row.action !== 'BLOCKED') {
      row.sourcePath = entry.repoPath;
      row.targetName = path.posix.basename(entry.repoPath);
    }
    rows.push(row);
  }
  // Distinct source paths can flatten to the same Drive folder/name.
  // Fail closed before future create operations can produce ambiguous duplicates.
  const targets = new Map();
  for (const row of rows) {
    if (!['PLAN_CREATE', 'PLAN_UPDATE', 'SKIP', 'CONFLICT'].includes(row.action)) continue;
    const key = `${row.targetKey}/${row.targetName.toLocaleLowerCase('en-US')}`;
    const list = targets.get(key) || [];
    list.push(row);
    targets.set(key, list);
  }
  for (const group of targets.values()) {
    if (group.length < 2) continue;
    for (const row of group) {
      row.action = 'CONFLICT';
      row.reason = 'LOCAL_TARGET_NAME_COLLISION';
    }
  }
  return {
    schemaVersion: 'capital-ai.doc-tree-plan.v1',
    sourceRepository: mapping.sourceRepository,
    sourceOfTruth: 'GITHUB',
    mode: 'DRY_RUN_ONLY',
    networkRequests: 0,
    writes: 0,
    summary: Object.fromEntries(['PLAN_CREATE', 'PLAN_UPDATE', 'SKIP', 'CONFLICT', 'BLOCKED'].map((key) => [key, rows.filter((r) => r.action === key).length])),
    rows
  };
}

function cliMain(argv) {
  const allowedArgs = new Set(['--mapping', '--docs-root', '--inventory', '--help']);
  const options = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help') {
      process.stdout.write('Usage: node scripts/upload-drive/drive-sync-plan.mjs --mapping scripts/upload-drive/mapping.v1.json --docs-root docs [--inventory PRIVATE_READ_ONLY_SNAPSHOT.json]\nDry run only; no Drive access.\n');
      return 0;
    }
    if (!allowedArgs.has(arg) || i + 1 >= argv.length || argv[i+1].startsWith('--') || options[arg]) throw new Error('UNSUPPORTED_CLI_ARGUMENT');
    options[arg] = argv[++i];
  }
  if (!options['--mapping'] || !options['--docs-root']) throw new Error('MISSING_REQUIRED_ARGUMENT');
  const mapping = JSON.parse(fs.readFileSync(options['--mapping'], 'utf8'));
  const inventory = options['--inventory'] ? JSON.parse(fs.readFileSync(options['--inventory'], 'utf8')) : null;
  process.stdout.write(`${JSON.stringify(buildPlan({mapping, docsRoot:options['--docs-root'], inventory}), null, 2)}\n`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = cliMain(process.argv.slice(2)); }
  catch (error) {
    process.stderr.write(`DOCSYNC_PLAN_BLOCKED: ${error.message}\n`);
    process.exitCode = 1;
  }
}

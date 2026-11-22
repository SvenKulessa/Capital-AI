import { openSync, closeSync, readSync, statSync, existsSync, realpathSync, readdirSync, lstatSync } from 'node:fs';
import { resolve, join, sep, basename } from 'node:path';

// A narrowly scoped inventory of possible optional UnRAR library copies,
// including libraries not owned by APK. It is NOT a whole-filesystem audit.
const SCAN_ROOTS = ['/usr/lib', '/lib', '/usr/local/lib', '/app/node_modules', '/opt/ga4-mcp/lib'];
const LIBRARY_NAME = /^(?:libclamunrar(?:_iface)?|libunrar)(?:[.-][a-zA-Z0-9_.-]+)?$/i;
const LOADER_MARKER = Buffer.from('libclamunrar_iface');
const MAX_ENTRIES = 100000, MAX_DEPTH = 18, MAX_CANDIDATES = 60;

function within(root, path) {
  return path === root || path.startsWith(root === sep ? sep : root + sep);
}
function readMarker(file, actualRoot) {
  if (typeof file !== 'string' || !file.startsWith('/')) return 'NOT_PROVEN';
  const location = resolve(actualRoot, '.' + file);
  if (!within(actualRoot, location) || !existsSync(location)) return 'NOT_PROVEN';
  const actual = realpathSync(location);
  if (!within(actualRoot, actual)) throw new Error('Unrar marker escapes image root');
  const st = statSync(actual);
  if (!st.isFile() || st.size > 64 * 1024 * 1024) return 'NOT_PROVEN';
  const fd = openSync(actual, 'r');
  try {
    const step = 128 * 1024;
    let offset = 0;
    let carry = Buffer.alloc(0);
    while (offset < st.size) {
      const block = Buffer.alloc(Math.min(step, st.size - offset));
      const read = readSync(fd, block, 0, block.length, offset);
      if (read !== block.length) return 'NOT_PROVEN';
      if (Buffer.concat([carry, block]).includes(LOADER_MARKER)) return 'LOADER_LITERAL_BYTES_OBSERVED';
      offset += read;
      carry = block.subarray(Math.max(0, block.length - LOADER_MARKER.length + 1));
    }
    return 'LOADER_LITERAL_NOT_FOUND';
  } finally { closeSync(fd); }
}

export function inspectOptionalUnrarFiles(root = '/', libclamavPath = '/usr/lib/libclamav.so.12') {
  const actualRoot = realpathSync(resolve(root));
  const matchingPaths = new Set();
  const inspected = [];
  const skipped = [];
  let entries = 0, symlinkDirectoriesSkipped = 0;

  for (const dir of SCAN_ROOTS) {
    const absolute = resolve(actualRoot, '.' + dir);
    if (!within(actualRoot, absolute)) throw new Error('Unrar scan root escape');
    if (!existsSync(absolute)) { skipped.push(dir); continue; }
    const real = realpathSync(absolute);
    if (!within(actualRoot, real) || !statSync(real).isDirectory()) {
      throw new Error('Unsafe/unexpected UnRAR search root');
    }
    inspected.push(dir);
    const queue = [{ dir: real, depth: 0 }];
    while (queue.length) {
      const item = queue.shift();
      if (item.depth > MAX_DEPTH) throw new Error('UnRAR scan depth exceeds limit');
      for (const entry of readdirSync(item.dir, { withFileTypes: true })) {
        if (++entries > MAX_ENTRIES) throw new Error('UnRAR scan entry limit exceeded');
        const file = join(item.dir, entry.name);
        const relative = '/' + file.slice(actualRoot.length).split(sep).filter(Boolean).join('/');
        if (LIBRARY_NAME.test(entry.name)) {
          if (!/^[a-zA-Z0-9_+./@-]+$/.test(relative)) throw new Error('Unsafe UnRAR library path');
          matchingPaths.add(relative);
          if (matchingPaths.size > MAX_CANDIDATES) throw new Error('UnRAR library candidate limit exceeded');
        }
        if (entry.isDirectory()) {
          queue.push({ dir: file, depth: item.depth + 1 });
        } else if (entry.isSymbolicLink()) {
          // Do not traverse symlinked subdirectories. Record skipped coverage.
          const resolved = realpathSync(file);
          if (!within(actualRoot, resolved)) throw new Error('Symlink escapes image root');
          if (statSync(resolved).isDirectory()) symlinkDirectoriesSkipped++;
        } else if (!entry.isFile()) {
          // Unusual file types do not supply absence evidence.
          throw new Error('Unsupported filesystem entry in library scan');
        }
      }
    }
  }
  return {
    schema: 'CAPITAL_AI_UNRAR_RUNTIME_FILE_BOUNDARY@1',
    status: 'COMPLETE_IN_LISTED_SEARCH_ROOTS_ONLY',
    scannedRoots: inspected,
    missingRoots: skipped,
    entriesVisited: entries,
    symlinkDirectoriesSkipped,
    namedLibraryCandidates: [...matchingPaths].sort(),
    libclamavOptionalLoaderMarker: readMarker(libclamavPath, actualRoot),
    staticUnrarInclusion: 'NOT_PROVEN',
    lateRuntimeLoading: 'NOT_PROVEN',
    wholeImageAbsence: 'NOT_PROVEN',
    redistributionApproved: false,
  };
}

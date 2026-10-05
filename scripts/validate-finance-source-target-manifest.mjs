import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const MANIFEST_PATH = new URL('../CAPITAL-AI-GROWTH/finance-social-market-source-target-manifest.json', import.meta.url);

function fail(message) {
  throw new Error(`[FINANCE-SOURCE-TARGET-MANIFEST] ${message}`);
}

function gitBlobSha(path) {
  const body = readFileSync(path);
  const header = Buffer.from(`blob ${body.length}\0`, 'utf8');
  return createHash('sha1').update(header).update(body).digest('hex');
}

export function validateFinanceSourceTargetManifest(raw) {
  if (!raw || raw.schemaVersion !== 'FINANCE_SOURCE_TARGET_MANIFEST@1') fail('schemaVersion mismatch');
  if (raw.source?.repository !== 'SvenKulessa/Finance') fail('source repository mismatch');
  if (!/^[0-9a-f]{40}$/.test(raw.source?.commit || '')) fail('source commit must be an immutable SHA');
  if (raw.target?.repository !== 'SvenKulessa/Capital-AI') fail('target repository mismatch');
  if (!/^[0-9a-f]{40}$/.test(raw.target?.currentMain || '')) fail('target currentMain must be an immutable SHA');
  if (raw.target?.policy !== 'TARGET_CURRENT_MAIN_CONTRACTS_WIN') fail('target-current-main policy missing');

  const actions = new Set(raw.actions || []);
  const authorityIds = new Set();
  for (const authority of raw.targetAuthorities || []) {
    if (!authority.id || authorityIds.has(authority.id)) fail(`duplicate/empty target authority id: ${authority.id}`);
    authorityIds.add(authority.id);
    if (!/^[0-9a-f]{40}$/.test(authority.blobSha || '')) fail(`invalid target blob SHA for ${authority.id}`);
    const actual = gitBlobSha(new URL(`../${authority.path}`, import.meta.url));
    if (actual !== authority.blobSha) fail(`target authority drift: ${authority.path} expected=${authority.blobSha} actual=${actual}`);
  }

  const sourcePaths = new Set();
  const entryIds = new Set();
  for (const entry of raw.entries || []) {
    if (!entry.id || entryIds.has(entry.id)) fail(`duplicate/empty entry id: ${entry.id}`);
    entryIds.add(entry.id);
    if (!entry.source?.path || sourcePaths.has(entry.source.path)) fail(`duplicate/empty source path: ${entry.source?.path}`);
    sourcePaths.add(entry.source.path);
    if (!/^[0-9a-f]{40}$/.test(entry.source?.blobSha || '')) fail(`invalid source blob SHA: ${entry.source.path}`);
    if (!actions.has(entry.action)) fail(`undeclared action ${entry.action} for ${entry.id}`);
    const state = entry.target?.state;
    if (!['PROPOSED_NEW_FILE','PROPOSED_REWRITE','EXISTING_AUTHORITY','NO_TARGET_FILE'].includes(state)) {
      fail(`invalid target state ${state} for ${entry.id}`);
    }
    if (state === 'NO_TARGET_FILE' && entry.target.path !== null) fail(`NO_TARGET_FILE must have null path: ${entry.id}`);
    if (state !== 'NO_TARGET_FILE' && !entry.target.path) fail(`target path required: ${entry.id}`);
    for (const ref of entry.target.authorityIds || []) {
      if (!authorityIds.has(ref)) fail(`unknown target authority ${ref} in ${entry.id}`);
    }
    if (state === 'EXISTING_AUTHORITY' && !(entry.target.authorityIds || []).length) {
      fail(`existing authority entry must reference target authority: ${entry.id}`);
    }
    if ((entry.action === 'DROP_NO_MIGRATION' || entry.action === 'DROP_REDESIGN_SCHEMA') && state !== 'NO_TARGET_FILE') {
      fail(`drop action cannot declare a target file: ${entry.id}`);
    }
  }

  if (raw.summary?.totalEntries !== raw.entries.length) fail('summary totalEntries drift');
  if (raw.summary?.socialEntries !== raw.entries.filter(e => e.domain === 'SOCIAL').length) fail('summary socialEntries drift');
  if (raw.summary?.marketEntries !== raw.entries.filter(e => e.domain === 'MARKET').length) fail('summary marketEntries drift');

  return {
    status: 'PASS',
    sourceCommit: raw.source.commit,
    targetMain: raw.target.currentMain,
    entries: raw.entries.length,
    targetAuthorities: raw.targetAuthorities.length,
  };
}

export function readAndValidateFinanceSourceTargetManifest() {
  const raw = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  return validateFinanceSourceTargetManifest(raw);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  process.stdout.write(JSON.stringify(readAndValidateFinanceSourceTargetManifest(), null, 2) + '\n');
}

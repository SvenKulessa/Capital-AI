#!/usr/bin/env node
/**
 * Safe local config management for the same SOLO2 contract used by the web form.
 * No network, token handling, remote rights grants, or agent execution.
 */
import { readFileSync, writeFileSync, renameSync, unlinkSync, lstatSync, statSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import {
  createSolo2Profile, validateSolo2Profile, solo2ConfigReadiness,
  SOLO2_RESOURCES, SOLO2_PIPELINES,
} from '../shared/solo2-config.mjs';

const USAGE = [
  'SOLO2 local profile (never an execution grant)',
  '  node scripts/solo2-config.mjs init --file PATH --source-sha MAIN_SHA',
  '  node scripts/solo2-config.mjs show --file PATH',
  '  node scripts/solo2-config.mjs validate --file PATH',
  '  node scripts/solo2-config.mjs set --file PATH --key FIELD --value VALUE',
  'Settable fields: mode, tenantRef, domains, skills, online.ciPollSeconds,',
  'limits.maxRepairAttempts, resources.ID.{selected,owner,requestedRight,licenseEvidence,rightsEvidence},',
  'pipelines.ID.selected. No keys, tokens or URLs are accepted.',
].join('\n');

function parseArgs(argv) {
  const [verb, ...args] = argv;
  if (!['init', 'show', 'validate', 'set'].includes(verb)) throw Error('UNKNOWN_ACTION');
  const options = {};
  while (args.length) {
    const key = args.shift();
    if (!['--file', '--source-sha', '--key', '--value'].includes(key)
      || key in options || !args.length) throw Error('INVALID_ARGUMENT');
    options[key] = args.shift();
  }
  if (!options['--file'] || !options['--file'].trim()) throw Error('FILE_REQUIRED');
  return { verb, options };
}
function privateDirectory(file) {
  const dir = statSync(dirname(file));
  if (!dir.isDirectory() || (dir.mode & 0o077)) throw Error('PRIVATE_DIRECTORY_REQUIRED');
}
function readProfile(file) {
  privateDirectory(file);
  const s = lstatSync(file);
  if (!s.isFile() || s.isSymbolicLink() || (s.mode & 0o077)) throw Error('PRIVATE_FILE_REQUIRED');
  return validateSolo2Profile(JSON.parse(readFileSync(file, 'utf8')));
}
function saveProfile(file, input, isNew) {
  const config = validateSolo2Profile(input);
  privateDirectory(file);
  if (!isNew) readProfile(file);
  if (isNew) {
    writeFileSync(file, JSON.stringify(config, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  } else {
    const temp = file + '.' + randomUUID() + '.tmp';
    try {
      writeFileSync(temp, JSON.stringify(config, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      renameSync(temp, file);
    } finally {
      try { unlinkSync(temp); } catch { /* File already renamed, or no tempfile */ }
    }
  }
  return config;
}
function bool(raw) {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  throw Error('BOOLEAN_REQUIRED');
}
function setValue(profile, key, value) {
  if (key === 'mode' || key === 'tenantRef') profile[key] = value;
  else if (key === 'domains' || key === 'skills') profile[key] = value.split(',').filter(Boolean);
  else if (key === 'online.ciPollSeconds') profile.online.ciPollSeconds = Number(value);
  else if (key === 'limits.maxRepairAttempts') profile.limits.maxRepairAttempts = Number(value);
  else {
    const parts = key.split('.');
    if (parts.length !== 3) throw Error('FIELD_NOT_ALLOWED');
    const [group, id, field] = parts;
    if (group === 'resources' && SOLO2_RESOURCES.some(r => r.id === id)
        && ['selected', 'owner', 'requestedRight', 'licenseEvidence', 'rightsEvidence'].includes(field)) {
      const resource = profile.resources.find(r => r.id === id);
      resource[field] = field === 'selected' ? bool(value) : value;
    } else if (group === 'pipelines' && SOLO2_PIPELINES.includes(id) && field === 'selected') {
      profile.pipelines.find(p => p.id === id).selected = bool(value);
    } else throw Error('FIELD_NOT_ALLOWED');
  }
  return validateSolo2Profile(profile);
}
export function runCli(argv) {
  const { verb, options } = parseArgs(argv);
  const file = options['--file'];
  if (verb === 'init') {
    if (!options['--source-sha']) throw Error('SOURCE_SHA_REQUIRED');
    const profile = saveProfile(file, createSolo2Profile(options['--source-sha']), true);
    return solo2ConfigReadiness(profile);
  }
  const current = readProfile(file);
  if (verb === 'show') return current;
  if (verb === 'validate') return solo2ConfigReadiness(current);
  if (!options['--key'] || options['--value'] === undefined) throw Error('KEY_AND_VALUE_REQUIRED');
  const profile = saveProfile(file, setValue(current, options['--key'], options['--value']), false);
  return solo2ConfigReadiness(profile);
}
if (process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href) {
  try {
    process.stdout.write(JSON.stringify(runCli(process.argv.slice(2)), null, 2) + '\n');
  } catch (error) {
    // Never echo untrusted values, paths, sensitive payloads, or stack traces.
    process.stderr.write('SOLO2_CONFIG_BLOCKED: ' +
      (/^[A-Z_]+$/.test(error?.message || '') ? error.message : 'VALIDATION_FAILED') + '\n');
    process.exitCode = 1;
  }
}

// CAPITAL_AI_ACODE_SHARED_DELIVERY@1: static name/path validation only.
// No network, filesystem writes, Drive synchronization or script execution.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const contract = Object.freeze(JSON.parse(
  readFileSync(new URL('../../.agents/contracts/acode-shared-delivery.json', import.meta.url), 'utf8'),
));

export function checkAcodeArtifactName(filename) {
  if (typeof filename !== 'string' || filename.length > 180 || filename.includes('/') || filename.includes('\\')) {
    return { status: 'BLOCKED', reason: 'INVALID_BASENAME' };
  }
  const matched = /^(\d{4}-\d{2}-\d{2})_([A-Z]+)_([A-Z]+)_([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*)_v([1-9][0-9]*)\.([a-z0-9]+)$/.exec(filename);
  if (!matched) return { status: 'BLOCKED', reason: 'INVALID_NAMING_CONVENTION' };
  const [, day, domain, origin, , , ext] = matched;
  const parsed = new Date(day + 'T00:00:00Z');
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== day) {
    return { status: 'BLOCKED', reason: 'INVALID_UTC_DATE' };
  }
  if (!contract.allowedDomains.includes(domain) || origin !== contract.generatedBy ||
      !contract.allowedExtensions.includes(ext)) {
    return { status: 'BLOCKED', reason: 'INVALID_DOMAIN_OR_ORIGIN_OR_EXTENSION' };
  }
  return {
    status: 'VERIFIED',
    filename,
    driveFolderId: contract.driveFolderId,
    androidPath: contract.androidFolder + '/' + filename,
    driveUpload: 'NOT_PROVEN',
    deviceSync: 'NOT_PROVEN',
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const checked = checkAcodeArtifactName(process.argv[2]);
  console.log('ACODE_NAME=' + checked.status);
  if (checked.reason) console.log('REASON=' + checked.reason);
  if (checked.androidPath) console.log('ACODE_TARGET=' + checked.androidPath);
  console.log('DRIVE_UPLOAD=NOT_PROVEN');
  console.log('ACODE_SYNC=NOT_PROVEN');
  process.exitCode = checked.status === 'VERIFIED' ? 0 : 2;
}

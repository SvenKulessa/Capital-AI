import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkAcodeArtifactName, contract } from './acode-shared-delivery.mjs';

test('canonical shared target matches owner-approved Drive and Android paths', () => {
  assert.equal(contract.schema, 'CAPITAL_AI_ACODE_SHARED_DELIVERY@1');
  assert.equal(contract.driveFolderId, '1j3VADFmrFfBuPVv9lFGpRsWM5ygAfusv');
  assert.equal(contract.androidFolder, '/public/CAPITAL-AI-ACODE-CHATGPT-EXCHANGE/shared');
  assert.equal(contract.delivery.forbidOverwrite, true);
  assert.equal(contract.delivery.forbidSecrets, true);
  assert.equal(contract.delivery.forbidAutoExecution, true);
  assert.equal(contract.delivery.forbidSecondSync, true);
  assert.equal(contract.delivery.initialStatus, 'NOT_PROVEN');
});

test('valid dates, versions, areas and supported script formats are accepted', () => {
  for (const name of [
    '2026-11-20_PLATFORM_CHATGPT_ACODE_BACKUP_PREFLIGHT_v1.sh',
    '2026-11-19_PLATFORM_CHATGPT_P1_V2_OPERATIONS_HEALTH_v1.py',
    '2024-02-29_TRUST_CHATGPT_TLS_CA_READBACK_v23.mjs',
    '2026-11-20_SECURITY_CHATGPT_LOCAL_SCAN_v1.js',
    '2026-11-20_PRODUCT_CHATGPT_UI_QA_v1.sh',
    '2026-11-20_GROWTH_CHATGPT_MARKETING_QA_v2.sh',
    '2026-11-20_MARKET_CHATGPT_MARKETDATA_v1.py',
  ]) {
    const outcome = checkAcodeArtifactName(name);
    assert.equal(outcome.status, 'VERIFIED', name);
    assert.equal(outcome.driveUpload, 'NOT_PROVEN');
    assert.equal(outcome.deviceSync, 'NOT_PROVEN');
    assert.equal(outcome.androidPath, contract.androidFolder + '/' + name);
  }
});

test('fail closed on traversal, malformed names, dates, origins and formats', () => {
  for (const name of [
    undefined, '', '../evil.sh', 'x/evil.sh', 'x\\evil.sh',
    '2026-11-20_PLATFORM_CHATGPT_X_v0.sh',
    '2026-11-20_PLATFORM_CHATGPT_X_v1.exe',
    '2026-11-20_PLATFORM_CHATGPT_X_v1.sql',
    '2026-11-20_PLATFORM_ACODE_X_v1.sh',
    '2026-11-20_SALES_CHATGPT_X_v1.sh',
    '2026-02-30_PLATFORM_CHATGPT_X_v1.sh',
    '2025-02-29_PLATFORM_CHATGPT_X_v1.sh',
    '2026-11-20_PLATFORM_CHATGPT_X v1.sh',
    '.sh',
  ]) assert.equal(checkAcodeArtifactName(name).status, 'BLOCKED', String(name));
});

test('CLI never claims a Drive upload or Acode execution', () => {
  const file = fileURLToPath(new URL('./acode-shared-delivery.mjs', import.meta.url));
  const valid = spawnSync(process.execPath, [file, '2026-11-20_PLATFORM_CHATGPT_ACODE_PREFLIGHT_v1.sh'], { encoding: 'utf8' });
  assert.equal(valid.status, 0, valid.stderr);
  assert.match(valid.stdout, /ACODE_NAME=VERIFIED/);
  assert.match(valid.stdout, /DRIVE_UPLOAD=NOT_PROVEN/);
  assert.match(valid.stdout, /ACODE_SYNC=NOT_PROVEN/);
  const invalid = spawnSync(process.execPath, [file, '../private-key.txt'], { encoding: 'utf8' });
  assert.equal(invalid.status, 2);
  assert.match(invalid.stdout, /ACODE_NAME=BLOCKED/);
});

test('sole-authority root policy references exact shared contract without a new gate', () => {
  const root = readFileSync(new URL('../../AGENTS.md', import.meta.url), 'utf8');
  assert.match(root, /CAPITAL_AI_ACODE_SHARED_DELIVERY@1/);
  assert.match(root, /1j3VADFmrFfBuPVv9lFGpRsWM5ygAfusv/);
  assert.match(root, /YYYY-MM-DD_BEREICH_URSPRUNG_THEMA_vN\.erweiterung/);
  assert.match(root, /keine neue globale Review-/);
});

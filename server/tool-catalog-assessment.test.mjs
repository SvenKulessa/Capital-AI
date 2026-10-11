import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  parseDeclaredComponentInventory, classifyDeclaredLicense,
  assessCatalogEntries, summarizeCatalog,
} from './tool-catalog-assessment.mjs';

const inventory = fs.readFileSync(new URL('../src/data/externalComponentInventory.ts', import.meta.url), 'utf8');

test('curated first-party registry supplies declared alternatives and SPDX claims, not runtime proof', () => {
  const parsed = parseDeclaredComponentInventory(inventory);
  assert.ok(parsed.size >= 25, 'first-party inventory must not silently disappear');
  assert.equal(parsed.get('zitadel').licenseDeclared, 'Apache-2.0 core');
  assert.ok(parsed.get('zitadel').alternatives.some(x => x.name === 'Keycloak'));
  assert.ok(parsed.get('supabase').alternatives.some(x => x.name === 'PocketBase'));
  assert.ok(!parsed.has('some-unlisted-api'));
});

test('permissive software licenses never imply automatic distribution or API rights', () => {
  const mit = classifyDeclaredLicense('MIT', 'package-lock');
  assert.equal(mit.commercial, 'GENERALLY_ALLOWED_WITH_CONDITIONS');
  assert.equal(mit.approval, 'REVIEW_REQUIRED');
  const gpl = classifyDeclaredLicense('GPL-3.0', 'some manifest');
  assert.equal(gpl.commercial, 'CONDITIONAL_COPYLEFT');
  assert.equal(gpl.redistribution, 'REVIEW_REQUIRED');
  const unknown = classifyDeclaredLicense('Proprietary service', 'inventory');
  assert.equal(unknown.commercial, 'NOT_PROVEN');
  assert.equal(classifyDeclaredLicense(null, null).approval, 'NOT_PROVEN');
});

test('direct locked npm license remains declaration and daily measured use is unknown', () => {
  const entries = assessCatalogEntries([
    { id: 'npm:react', kind: 'NPM_RUNTIME', name: 'react', path: 'package.json → package-lock.json', version: '19.3.0', domain: 'PRODUCT' },
    { id: 'integration:zitadel', kind: 'EXTERNER_DIENST', name: 'ZITADEL', path: 'server/auth.mjs', version: null, domain: 'TRUST' },
  ], { inventorySource: inventory, lock: { packages: { 'node_modules/react': { license: 'MIT' } } } });
  assert.equal(entries[0].license.declared, 'MIT');
  assert.equal(entries[0].commercialServiceRights, 'NOT_PROVEN');
  assert.equal(entries[0].use.actualCallsPerDay, null);
  assert.equal(entries[1].license.declared, 'Apache-2.0 core');
  assert.equal(entries[1].license.commercial, 'GENERALLY_ALLOWED_WITH_CONDITIONS');
  assert.equal(entries[1].use.state, 'DECLARED_ACTIVE_NOT_RUNTIME_VERIFIED');
  assert.ok(entries[1].alternatives.length >= 2);
  assert.equal(entries[1].priceModel, 'PROVIDER_TARIFF_NOT_PROVEN');
});

test('cron proves scheduled frequency but not production execution or API consumption', () => {
  const rows = assessCatalogEntries([
    { id: 'file:.github/workflows/daily-dependency-security-watch.yml', kind: 'GITHUB_ACTION',
      path: '.github/workflows/daily-dependency-security-watch.yml', name: 'Daily Watch', domain: 'TRUST' },
    { id: 'file:.github/workflows/manual.yml', kind: 'GITHUB_ACTION',
      path: '.github/workflows/manual.yml', name: 'Manual', domain: 'TRUST' },
    { id: 'file:.github/workflows/weekly.yml', kind: 'GITHUB_ACTION',
      path: '.github/workflows/weekly.yml', name: 'Weekly', domain: 'TRUST' },
  ], { supplementary: {
    '.github/workflows/daily-dependency-security-watch.yml': 'on:\n  schedule:\n    - cron: "15 4 * * *"\n',
    '.github/workflows/manual.yml': 'on: workflow_dispatch\n',
    '.github/workflows/weekly.yml': '  - cron: "0 6 * * 1"\n',
  } });
  assert.equal(rows[0].use.scheduledRunsPerDay, 1);
  assert.deepEqual(rows[0].use.scheduledCrons, ['15 4 * * *']);
  assert.equal(rows[1].use.scheduledRunsPerDay, null);
  assert.equal(rows[2].use.scheduledRunsPerDay, null);
  assert.ok(rows.every(row => row.use.actualCallsPerDay === null));
  assert.equal(summarizeCatalog(rows).runtimeConsumptionVerified, 0);
  assert.equal(summarizeCatalog(rows).byKind.GITHUB_ACTION, 3);
});

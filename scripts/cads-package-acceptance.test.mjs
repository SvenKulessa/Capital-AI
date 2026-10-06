import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BENCHMARK_TIERS } from '../packages/benchmark-core/index.mjs';

const productLicense = readFileSync(
  new URL('../docs/licenses/CADS-PRODUCT-LICENSE.md', import.meta.url),
  'utf8',
);
const notices = readFileSync(
  new URL('../docs/licenses/CADS-THIRD-PARTY-NOTICES.md', import.meta.url),
  'utf8',
);
const install = readFileSync(
  new URL('../docs/product/CADS-MARKETPLACE-INSTALLATION.md', import.meta.url),
  'utf8',
);
const acceptance = readFileSync(
  new URL('../docs/security/CADS-PACKAGE-ACCEPTANCE.md', import.meta.url),
  'utf8',
);
const plans = JSON.parse(readFileSync(
  new URL('../apps/cads-github-app/marketplace-plans.production.json', import.meta.url),
  'utf8',
));

test('CADS export has an explicit first-party proprietary license boundary', () => {
  assert.match(productLicense, /LicenseRef-CAPITAL-AI-CADS-PROPRIETARY-1\.0/);
  assert.match(productLicense, /Sven Michael Kulessa \/ CAPITAL-AI/);
  assert.match(productLicense, /No public open-source grant/i);
  assert.match(productLicense, /third-party/i);
});

test('third-party notice covers actual service/runtime boundaries without relicensing them', () => {
  for (const name of ['Node.js', 'GitHub', 'Supabase', 'PostgreSQL']) {
    assert.match(notices, new RegExp(name.replace('.', '\\.'), 'i'));
  }
  assert.match(notices, /not.*relicensed/i);
  assert.match(notices, /SBOM/i);
});

test('B2B installation guide contains required Marketplace and secret handoff steps', () => {
  for (const required of [
    'Verified Publisher',
    '100',
    'Financial Onboarding',
    '(monthly|monatlich)',
    '(annual|yearly|jährlich)',
    'CADS_GITHUB_APP_PRIVATE_KEY',
    'CADS_GITHUB_MARKETPLACE_WEBHOOK_SECRET',
    'CADS_GITHUB_MARKETPLACE_STARTER_PLAN_ID',
    'SUPABASE_SECRET_KEY',
    'marketplace_purchase',
    'purchased',
    'changed',
    'cancelled',
  ]) {
    assert.match(install, new RegExp(required, 'i'));
  }
  assert.match(install, /nicht durch Repository-Tests ersetzt/i);
});

test('Marketplace plan manifest exactly matches canonical benchmark capabilities', () => {
  assert.deepEqual(plans.plans.map(plan => plan.id), ['starter','pro','enterprise']);
  for (const plan of plans.plans) {
    assert.deepEqual(plan.capabilities, BENCHMARK_TIERS[plan.id].capabilities);
    assert.deepEqual(plan.billing, ['monthly','yearly']);
  }
  assert.equal(plans.currency, 'USD');
  assert.equal(plans.freePlanEnabled, false);
});

test('acceptance policy keeps technical PASS separate from release authorities', () => {
  assert.match(acceptance, /Security.*separat/i);
  assert.match(acceptance, /(Lizenz|License).*separat/i);
  assert.match(acceptance, /Marketplace.*separat/i);
  assert.match(acceptance, /Production.*separat/i);
});

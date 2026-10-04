import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePlan, validateCommercialEvidence } from './validate-oss-multi-asset-plan.mjs';
import { OPEN_SOURCE_STACK, EXCLUDED_MARKET_INGRESS } from '../src/data/openSourceStack.ts';

const plan = JSON.parse(readFileSync(new URL('../docs/benchmarks/oss-market-pipelines-sim/live-benchmark-plan.json', import.meta.url)));
const evidence = JSON.parse(readFileSync(new URL(`../${plan.commercialEvidence}`, import.meta.url)));

test('current plan and commercial review agree without authorizing production', () => {
  assert.equal(validatePlan(plan).decisionEligible, false);
  assert.equal(validateCommercialEvidence(plan, evidence).commercialProductionAllowed, false);
});

for (const [name, mutate] of [
  ['redistributed owner targets', p => {
    [p.targets.crypto, p.targets.stocks] = [p.targets.stocks, p.targets.crypto];
    for (const stage of p.stages) [stage.counts.crypto, stage.counts.stocks] = [stage.counts.stocks, stage.counts.crypto];
  }],
  ['negative weights with sum 100', p => { p.scoreProfile.weights.securityTrust = -25; p.scoreProfile.weights.functionalCoverage = 70; }],
  ['security dimension replaced by unrelated weight', p => { delete p.scoreProfile.weights.securityTrust; p.scoreProfile.weights.unrelated = 25; }],
  ['missing original licence review', p => { delete p.candidates[0].softwareLicenceAudit; }],
  ['unverified stable release presented as reviewed', p => { p.candidates[0].stableRelease = 'unchecked'; }],
  ['social rights silently promoted', p => { p.monetization.products.find(row => row.id === 'social').state = 'VERIFIED'; }],
  ['sentiment scope omitted', p => { p.monetization.products = p.monetization.products.filter(row => row.id !== 'sentiment-api'); }],
  ['duplicate product scope', p => { p.monetization.products.push(p.monetization.products[0]); }],
  ['arbitrary commercial evidence path', p => { p.commercialEvidence = '../../untrusted.json'; }],
]) {
  test(`plan rejects ${name}`, () => {
    const modified = structuredClone(plan);
    mutate(modified);
    assert.throws(() => validatePlan(modified));
  });
}

for (const [name, mutate] of [
  ['unrelated source SHA', e => { e.candidates[0].sourceSha = '0'.repeat(40); }],
  ['different licence blob', e => { e.candidates[0].licenceBlobSha = '0'.repeat(40); }],
  ['different licence interpretation', e => { e.candidates[0].softwareLicence = 'unverified'; }],
  ['commercial admission', e => { e.candidates[0].productAdmission = 'PASS'; }],
  ['invented data rights', e => { e.candidates[0].commercialDataRights = 'VERIFIED'; }],
  ['duplicate candidate', e => { e.candidates[1] = structuredClone(e.candidates[0]); }],
  ['invented winner', e => { e.benchmark.winner = 'ccxt'; }],
  ['production permission', e => { e.commercialProductionAllowed = true; }],
]) {
  test(`commercial review rejects ${name}`, () => {
    const modified = structuredClone(evidence);
    mutate(modified);
    assert.throws(() => validateCommercialEvidence(plan, modified));
  });
}

test('public catalogue keeps Cryptofeed blocked and fdnpy excluded from active ingress', () => {
  const cryptofeed = OPEN_SOURCE_STACK.find(row => row.id === 'cryptofeed');
  assert.ok(cryptofeed);
  assert.match(cryptofeed.license, /AGPL-3\.0-or-later/);
  assert.match(cryptofeed.license, new RegExp(evidence.candidates.find(row => row.id === 'cryptofeed').sourceSha));
  assert.match(cryptofeed.notes, /commercially BLOCKED/);

  assert.equal(OPEN_SOURCE_STACK.some(row => row.id === 'fdnpy'), false);
  const fdnpy = EXCLUDED_MARKET_INGRESS.find(row => row.id === 'fdnpy');
  assert.ok(fdnpy);
  assert.equal(fdnpy.reason, 'OPEN_SOURCE_LICENSE_NOT_VERIFIED_AND_PROPRIETARY_DATA_PATH');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { evaluateOpenSourceMarketAdmission } from '../server/open-source-market-policy.mjs';
import { ECB_REFERENCE_RATE_INSTRUMENTS } from '../server/ecb-reference-rates.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const blobSha = content => createHash('sha1')
  .update(`blob ${Buffer.byteLength(content, 'utf8')}\0`)
  .update(content)
  .digest('hex');

test('ECB adapter source and MIT license are hash-bound to runtime admission evidence', () => {
  const evidence = JSON.parse(read('docs/market-data/evidence/source-admission-ecb-reference-rates-20261006.json'));
  assert.equal(blobSha(read('server/ecb-reference-rates.mjs')), evidence.softwareSourceSha);
  assert.equal(blobSha(read('server/ecb-reference-rates.LICENSE.txt')), evidence.softwareLicenseBlobSha);
  assert.equal(evidence.softwareLicense, 'MIT');
  assert.deepEqual(evidence.softwareImplementation.externalRuntimeDependencies, []);
  const decision = evaluateOpenSourceMarketAdmission(evidence);
  assert.equal(decision.decision, 'OPEN_SOURCE_OPEN_DATA_ADMITTED');
  assert.equal(decision.eligible, true);
  assert.deepEqual(decision.reasons, []);
});

test('ECB runtime mapping matches exactly the 20 manifest reference-rate instruments', () => {
  const document = JSON.parse(read('docs/market-data/evidence/instrument-manifest-20261005.json'));
  const instruments = Array.isArray(document) ? document : document.instruments;
  assert.ok(Array.isArray(instruments));
  const manifest = instruments
    .filter(item => item.provider === 'European Central Bank')
    .map(item => ({
      instrumentId:item.instrumentId,
      symbol:item.symbol,
      providerInstrumentId:item.providerInstrumentId,
      baseCurrency:item.baseCurrency,
      quoteCurrency:item.quoteCurrency,
      venue:item.venue,
      instrumentType:item.instrumentType,
      tradingStatus:item.tradingStatus,
    }))
    .sort((a,b)=>a.instrumentId.localeCompare(b.instrumentId));
  const adapter = ECB_REFERENCE_RATE_INSTRUMENTS
    .map(item => ({
      instrumentId:item.instrumentId,
      symbol:item.symbol,
      providerInstrumentId:item.providerInstrumentId,
      baseCurrency:item.baseCurrency,
      quoteCurrency:item.quoteCurrency,
      venue:item.venue,
      instrumentType:item.instrumentType,
      tradingStatus:item.tradingStatus,
    }))
    .sort((a,b)=>a.instrumentId.localeCompare(b.instrumentId));
  assert.equal(manifest.length, 20);
  assert.deepEqual(adapter, manifest);
});

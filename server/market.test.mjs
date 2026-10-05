import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
let instance = 0;
const isolated = async () => import(`./market.mjs?test=${++instance}`);
import { infrastructure } from './infrastructure.mjs';
import { MARKET_SOURCE_POLICY, admittedMarketSourcesFor, evaluateOpenSourceMarketAdmission, isAdmittedMarketSource } from './open-source-market-policy.mjs';
import { fetchOssAdapterHealth, getOssAdapterInventory } from './oss-provider-adapters.mjs';

const original = { status: infrastructure.status, read: infrastructure.read, persist: infrastructure.persist };
before(() => {
  infrastructure.status = () => ({ status: 'connected' });
  infrastructure.read = async () => null;
  infrastructure.persist = async fact => fact;
});
after(() => Object.assign(infrastructure, original));

test('unsupported symbols are rejected before source admission', async () => {
  const {quote} = await isolated();
  const [status, body] = await quote('https://attacker.example');
  assert.equal(status, 400);
  assert.equal(body.error, 'unsupported_symbol');
});

test('asset values remain fail-closed without an admitted quote source', async () => {
  const {assetValues} = await isolated();
  const [status, body] = await assetValues();
  assert.equal(status, 503);
  assert.equal(body.schema, 'CAPITAL_AI_ASSET_VALUES@1');
  assert.equal(body.status, 'BLOCKED');
  assert.equal(body.reason, 'NO_ADMITTED_MARKET_QUOTE_SOURCE');
  assert.deepEqual(body.values, []);
});

test('allowed symbols perform no external provider request without admitted open data', async () => {
  const {quote} = await isolated();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('network must not be reached'); };
  try {
    const [status, body] = await quote('AAPL');
    assert.equal(status, 503);
    assert.equal(body.error, 'open_data_source_not_configured');
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('legacy proprietary cache entries are not served', async () => {
  const {quote} = await isolated();
  const previousRead = infrastructure.read;
  infrastructure.read = async () => ({provider:'kraken',symbol:'BTCUSD',price:100});
  try {
    const [status, body] = await quote('BTCUSD');
    assert.equal(status, 503);
    assert.equal(body.error, 'open_data_source_not_configured');
  } finally { infrastructure.read = previousRead; }
});

test('stream startup performs no legacy websocket connection', async () => {
  const previous = globalThis.WebSocket;
  let calls = 0;
  globalThis.WebSocket = class { constructor(){ calls++; } };
  try {
    const {startStreams} = await isolated();
    const stop = startStreams();
    stop();
    assert.equal(calls, 0);
  } finally {
    if(previous === undefined) delete globalThis.WebSocket;
    else globalThis.WebSocket = previous;
  }
});

test('health exposes fail-closed Open-Source and Open-Data policy', async () => {
  const {health} = await isolated();
  const state = health();
  assert.equal(state.ingress, 'fail_closed');
  assert.equal(state.sourcePolicy, 'OPEN_SOURCE_AND_OPEN_DATA_ONLY');
  assert.equal(state.admittedSources, 1);
  assert.equal(state.quoteAdmittedSources, 0);
  assert.equal(state.scoringAdmittedSources, 0);
  assert.equal(state.scoreDisplayEnabled, false);
  assert.equal(state.quotesEnabled, false);
});


test('Open-Source plus qualifying Open-Data evidence is required', () => {
  const useCases = Object.fromEntries([
    'commercialWebDisplay',
    'commercialMobileDisplay',
    'derivedScoringRankingsAnalytics',
    'normalization',
    'cacheHotState',
    'jetStreamPublication',
    'replay',
    'retention',
    'backupRestore',
    'auditEvidence',
    'internalProcessing',
  ].map(key => [key, {allowed:true,evidenceReference:`https://example.invalid/rights/${key}`}]));
  const valid = {
    softwareLicense:'MIT',
    softwareSourceSha:'1'.repeat(40),
    softwareLicenseBlobSha:'2'.repeat(40),
    softwareEvidenceReference:'https://example.invalid/software-license',
    softwarePackagingCompatible:true,
    dataLicense:'CC-BY-4.0',
    dataLicenseEvidenceReference:'https://example.invalid/data-license',
    provenanceReference:'https://example.invalid/provenance',
    datasetId:'example-dataset',
    datasetVersionOrSnapshot:'2026-10-04',
    attributionObligationsReviewed:true,
    attributionEvidenceReference:'https://example.invalid/attribution',
    useCases,
    instrumentEligibilityVerified:true,
    instrumentManifestReference:'docs/market-data/evidence/example.json',
  };
  assert.equal(evaluateOpenSourceMarketAdmission(valid).decision, 'OPEN_SOURCE_OPEN_DATA_ADMITTED');
  assert.equal(evaluateOpenSourceMarketAdmission(valid).eligible, true);
  assert.equal(evaluateOpenSourceMarketAdmission({...valid,dataLicense:'CC-BY-NC-4.0'}).eligible, false);
  assert.equal(evaluateOpenSourceMarketAdmission({...valid,softwareLicense:'UNVERIFIED'}).eligible, false);
  const missingMobile = structuredClone(valid);
  missingMobile.useCases.commercialMobileDisplay.allowed = false;
  missingMobile.manualOverride = true;
  assert.equal(evaluateOpenSourceMarketAdmission(missingMobile).eligible, false);
});

test('runtime OSS adapter inventory excludes non-admitted proprietary data paths', async () => {
  const inventory=getOssAdapterInventory();
  const ids=inventory.map(x=>x.id);
  assert.deepEqual([...ids].sort(), ['ccxt','cryptofeed','hummingbot','openbb'].sort());
  assert.ok(inventory.every(x=>x.openDataAdmissionRequired===true));
  assert.equal(MARKET_SOURCE_POLICY.admittedSources.length,1);
  assert.equal(isAdmittedMarketSource('wikidata-reference'),true);
  assert.equal(isAdmittedMarketSource('wikidata-reference','referenceMetadata'),true);
  assert.equal(isAdmittedMarketSource('wikidata-reference','marketQuotes'),false);
  assert.equal(admittedMarketSourcesFor('marketQuotes').length,0);
  assert.equal(admittedMarketSourcesFor('scoringPriceInput').length,0);
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('must not reach network');};
  try{
    const result=await fetchOssAdapterHealth('ccxt');
    assert.equal(result.reason,'OPEN_DATA_ADMISSION_REQUIRED');
    assert.equal(calls,0);
  }finally{globalThis.fetch=originalFetch;}
});


test('reference-only admission cannot create a quote fact', async () => {
  const {observation} = await isolated();
  const fact = observation('AAPL', 'wikidata-reference', 123, Date.now(), 'USD', 'live', {value:123});
  assert.equal(fact, null);
});

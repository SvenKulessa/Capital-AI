import { test, before, after } from 'node:test';
import { strict as assert } from 'node:assert';
let instance = 0;
const isolated = async () => import(`./market.mjs?test=${++instance}`);
import { infrastructure } from './infrastructure.mjs';
import { MARKET_SOURCE_POLICY, admittedMarketSourcesFor, evaluateOpenDataRightsAdmission, evaluateOpenSourceMarketAdmission, isAdmittedMarketSource, isMarketSourceRightsAdmitted, rightsAdmittedMarketSourcesFor } from './open-source-market-policy.mjs';
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

test('asset values remain fail-closed while the admitted reference adapter is disabled', async () => {
  const {assetValues} = await isolated();
  const [status, body] = await assetValues();
  assert.equal(status, 503);
  assert.equal(body.schema, 'CAPITAL_AI_ASSET_VALUES@1');
  assert.equal(body.status, 'BLOCKED');
  assert.equal(body.reason, 'MARKET_QUOTES_DISABLED');
  assert.deepEqual(body.values, []);
});

test('disabled market pipeline performs no external provider request despite source admission', async () => {
  const {quote} = await isolated();
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('network must not be reached'); };
  try {
    const [status, body] = await quote('AAPL');
    assert.equal(status, 503);
    assert.equal(body.error, 'pipeline_disabled');
    assert.equal(calls, 0);
  } finally { globalThis.fetch = originalFetch; }
});

test('legacy proprietary cache entries are not served while pipeline is disabled', async () => {
  const {quote} = await isolated();
  const previousRead = infrastructure.read;
  let reads = 0;
  infrastructure.read = async () => { reads++; return {provider:'kraken',symbol:'BTCUSD',price:100}; };
  try {
    const [status, body] = await quote('BTCUSD');
    assert.equal(status, 503);
    assert.equal(body.error, 'pipeline_disabled');
    assert.equal(reads, 0);
  } finally { infrastructure.read = previousRead; }
});

test('ECB adapter performs no fetch while runtime flags are disabled', async () => {
  const previousFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('network must remain disabled'); };
  try {
    const {startStreams} = await isolated();
    const stop = startStreams();
    await new Promise(resolve => setImmediate(resolve));
    stop();
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = previousFetch;
  }
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
  assert.equal(state.admittedSources, 2);
  assert.equal(state.quoteAdmittedSources, 1);
  assert.equal(state.scoringAdmittedSources, 1);
  assert.equal(state.scoreDisplayEnabled, false);
  assert.equal(state.scoringGate, 'FEATURE_DQ_SCORING_GATES_OPEN');
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



test('ECB reference-rate source is runtime-admitted without becoming realtime or actionable', () => {
  const rightsSource = MARKET_SOURCE_POLICY.rightsAdmittedSources.find(
    source => source.providerId === 'ecb-reference-rates',
  );
  const runtimeSource = MARKET_SOURCE_POLICY.admittedSources.find(
    source => source.providerId === 'ecb-reference-rates',
  );
  assert.ok(rightsSource);
  assert.ok(runtimeSource);
  assert.equal(rightsSource.runtimeEligible, true);
  assert.equal(runtimeSource.decision, 'OPEN_SOURCE_OPEN_DATA_ADMITTED');
  assert.equal(runtimeSource.capabilities.marketQuotes, true);
  assert.equal(runtimeSource.capabilities.scoringPriceInput, true);
  assert.equal(runtimeSource.capabilities.realtime, false);
  assert.equal(runtimeSource.capabilities.executionPrice, false);
  assert.equal(runtimeSource.capabilities.decisionEligible, false);
  assert.equal(rightsAdmittedMarketSourcesFor('marketQuotes').length, 1);
  assert.equal(rightsAdmittedMarketSourcesFor('scoringPriceInput').length, 1);
  assert.equal(isMarketSourceRightsAdmitted('ecb-reference-rates', 'marketQuotes'), true);
  assert.equal(isAdmittedMarketSource('ecb-reference-rates', 'marketQuotes'), true);
  assert.equal(isAdmittedMarketSource('ecb-reference-rates', 'scoringPriceInput'), true);
  assert.equal(admittedMarketSourcesFor('marketQuotes').length, 1);
  assert.equal(admittedMarketSourcesFor('scoringPriceInput').length, 1);
});

test('runtime OSS adapter inventory excludes non-admitted proprietary data paths', async () => {
  const inventory=getOssAdapterInventory();
  const ids=inventory.map(x=>x.id);
  assert.deepEqual([...ids].sort(), ['ccxt','cryptofeed','hummingbot','openbb'].sort());
  assert.ok(inventory.every(x=>x.openDataAdmissionRequired===true));
  assert.equal(MARKET_SOURCE_POLICY.rightsAdmittedSources.length,1);
  assert.equal(MARKET_SOURCE_POLICY.admittedSources.length,2);
  assert.equal(isAdmittedMarketSource('wikidata-reference'),true);
  assert.equal(isAdmittedMarketSource('wikidata-reference','referenceMetadata'),true);
  assert.equal(isAdmittedMarketSource('wikidata-reference','marketQuotes'),false);
  assert.equal(isAdmittedMarketSource('ecb-reference-rates','marketQuotes'),true);
  assert.equal(isAdmittedMarketSource('ecb-reference-rates','scoringPriceInput'),true);
  assert.equal(admittedMarketSourcesFor('marketQuotes').length,1);
  assert.equal(admittedMarketSourcesFor('scoringPriceInput').length,1);
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

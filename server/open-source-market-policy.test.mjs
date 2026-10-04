import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MARKET_SOURCE_POLICY,
  evaluateOpenSourceMarketAdmission,
  isAdmittedMarketSource,
} from './open-source-market-policy.mjs';
import { fetchOssAdapterHealth, getOssAdapterInventory } from './oss-provider-adapters.mjs';

const valid = {
  softwareLicense:'MIT',
  softwareEvidenceReference:'https://example.invalid/software-license',
  dataLicense:'CC-BY-4.0',
  dataLicenseEvidenceReference:'https://example.invalid/data-license',
  provenanceReference:'https://example.invalid/provenance',
  commercialDisplayAllowed:true,
  commercialDerivedScoringAllowed:true,
  cacheStorageAllowed:true,
  jetStreamReplayRetentionAllowed:true,
};

test('Open-Source plus qualifying Open-Data evidence is required', () => {
  assert.equal(evaluateOpenSourceMarketAdmission(valid).eligible, true);
  assert.equal(evaluateOpenSourceMarketAdmission({...valid,dataLicense:'CC-BY-NC-4.0'}).eligible, false);
  assert.equal(evaluateOpenSourceMarketAdmission({...valid,softwareLicense:'UNVERIFIED'}).eligible, false);
  assert.equal(evaluateOpenSourceMarketAdmission({...valid,commercialDerivedScoringAllowed:false}).eligible, false);
});

test('no source is production-admitted by policy yet', () => {
  assert.equal(MARKET_SOURCE_POLICY.mode, 'OPEN_SOURCE_AND_OPEN_DATA_ONLY');
  assert.equal(MARKET_SOURCE_POLICY.admittedSources.length, 0);
  for (const id of MARKET_SOURCE_POLICY.blockedLegacyProviderPaths) assert.equal(isAdmittedMarketSource(id), false);
});

test('runtime OSS adapter inventory excludes non-admitted proprietary data paths', () => {
  const inventory=getOssAdapterInventory();
  const ids=inventory.map(x=>x.id);
  assert.deepEqual(ids.sort(), ['ccxt','cryptofeed','hummingbot','openbb'].sort());
  assert.ok(inventory.every(x=>x.openDataAdmissionRequired===true));
  for(const removed of ['fdnpy','yfinance','defillama']) assert.equal(ids.includes(removed),false);
});

test('adapter health cannot touch network before source admission', async () => {
  const originalFetch=globalThis.fetch;
  let calls=0;
  globalThis.fetch=async()=>{calls++;throw new Error('must not reach network');};
  try{
    const result=await fetchOssAdapterHealth('ccxt');
    assert.equal(result.ok,false);
    assert.equal(result.reason,'OPEN_DATA_ADMISSION_REQUIRED');
    assert.equal(calls,0);
  }finally{globalThis.fetch=originalFetch;}
});

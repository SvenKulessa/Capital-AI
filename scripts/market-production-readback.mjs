// Public-production readback; no API keys, no mutation, no trade/scoring operations.
// Intentionally fixed destination: do not turn CI into an arbitrary SSRF proxy.
import assert from 'node:assert/strict';

const ORIGIN = 'https://capital-ai-uvsl.onrender.com';
const EXPECTED_MAIN = process.env.MARKET_EXPECTED_SOURCE_SHA || '';
const MAX_BYTES = 256 * 1024;
const TARGETS = [
  'USD','JPY','CZK','DKK','GBP','HUF','PLN','RON','SEK','CHF',
  'ISK','NOK','TRY','AUD','BRL','CAD','CNY','HKD','IDR','ILS',
];
const symbols = new Set(TARGETS.map(q => 'EUR/' + q));

async function readJson(path) {
  const url = new URL(path, ORIGIN);
  if (url.origin !== ORIGIN || !url.pathname.startsWith('/api/market/')) throw new Error('INVALID_SMOKE_URL');
  const response = await fetch(url, {
    method:'GET', cache:'no-store', redirect:'error',
    signal:AbortSignal.timeout(15000),
    headers:{accept:'application/json'},
  });
  if (!response.ok) throw new Error('HTTP_'+response.status+':'+url.pathname);
  const body = await response.text();
  if (Buffer.byteLength(body,'utf8') > MAX_BYTES) throw new Error('RESPONSE_TOO_LARGE');
  return JSON.parse(body);
}

async function main() {
  const status = await readJson('/api/market/status');
  assert.equal(status.status,'ok');
  assert.equal(status.quotesEnabled,true);
  assert.equal(status.infrastructure.status,'connected');
  assert.equal(status.infrastructure.nats,'connected');
  assert.equal(status.infrastructure.redis,'connected');
  assert.equal(status.referenceDataState,'ready');
  assert.deepEqual(new Set(status.symbols),symbols);
  const catalog=await readJson('/api/market/assets');
  assert.equal(catalog.quotesEnabled,true);
  assert.equal(catalog.assets.length,20);
  assert.deepEqual(new Set(catalog.assets.map(x=>x.symbol)),symbols);
  assert.ok(catalog.assets.every(x=>x.provider==='ecb-reference-rates'&&
    x.runtimeEnabled===true&&x.timeSemantics==='reference'&&
    x.scoreEligible===false&&x.decisionEligible===false&&x.actionable===false));
  const payload=await readJson('/api/market/values');
  assert.equal(payload.schema,'CAPITAL_AI_ASSET_VALUES@1');
  assert.equal(payload.status,'READY');
  assert.equal(payload.values.length,20);
  assert.deepEqual(new Set(payload.values.map(x=>x.symbol)),symbols);
  assert.ok(payload.values.every(x=>x.sourceAdmission==='OPEN_SOURCE_OPEN_DATA_ADMITTED'&&
    x.replayVerified===true&&x.timeSemantics==='reference'&&
    x.provider==='ecb-reference-rates'&&x.value>0&&
    x.scoreEligible===false&&x.decisionEligible===false&&
    /^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/.test(x.evidenceId)));
  for(const value of payload.values){
    const proof=await readJson('/api/market/evidence?id='+encodeURIComponent(value.evidenceId));
    assert.equal(proof.evidenceId,value.evidenceId);
    assert.equal(proof.hashVerified,true);
    assert.equal(proof.fact.symbol,value.symbol);
    assert.equal(proof.fact.price,value.value);
    assert.equal(proof.fact.referenceDate,value.referenceDate);
    assert.equal(proof.fact.timeSemantics,'reference');
  }
  // SourceSha is validated by Render's native deployment record, not by this API's unexposed fields.
  console.log(JSON.stringify({schema:'CAPITAL_AI_PUBLIC_MARKET_READBACK@1',
    result:'PASS',assetCount:payload.values.length,replaysVerified:20,
    nats:status.infrastructure.nats,valkey:status.infrastructure.redis,
    referenceDate:payload.values[0].referenceDate,releaseScope:'READ_ONLY',
    expectedMain:EXPECTED_MAIN||'NOT_CONFIGURED'}));
}
main().catch(error=>{console.error(JSON.stringify({schema:'CAPITAL_AI_PUBLIC_MARKET_READBACK@1',
  result:'FAIL',error:String(error.message).slice(0,180)}));process.exitCode=1;});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { createUniswapTrading } from './uniswap-trading.mjs';

function request(method, body = null, origin = 'https://capital-ai.online') {
  const stream = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body), 'utf8')]);
  stream.method = method;
  stream.headers = { origin, 'content-type': 'application/json' };
  return stream;
}
function responseHarness() {
  return { setHeader(){}, writeHead(){}, end(){} };
}
async function invoke(handler, method, body, path, origin) {
  let status=0, payload;
  await handler.handle(
    request(method,body,origin),
    responseHarness(),
    new URL('https://capital-ai.online'+path),
    (_res,nextStatus,nextPayload)=>{status=nextStatus; payload=nextPayload;},
  );
  return {status,payload};
}
const auth={
  sameOrigin:req=>req.headers.origin==='https://capital-ai.online',
  verify:async()=>({userId:'00000000-0000-4000-8000-000000000001'}),
};

test('Uniswap readiness never exposes the API key and execution stays blocked', async()=>{
  const handler=createUniswapTrading({env:{UNISWAP_API_KEY:'uniswap-secret-test',UNISWAP_QUOTE_ENABLED:'true'},auth});
  const result=await invoke(handler,'GET',null,'/api/market/arbitrage/uniswap/readiness');
  assert.equal(result.status,200);
  assert.equal(result.payload.quoteEnabled,true);
  assert.equal(result.payload.executionEnabled,false);
  assert.equal(result.payload.walletSignatureRequired,true);
  assert.doesNotMatch(JSON.stringify(result.payload),/uniswap-secret-test/);
});

test('Uniswap quote is same-origin and authenticated before upstream I/O', async()=>{
  let calls=0;
  const handler=createUniswapTrading({
    env:{UNISWAP_API_KEY:'uniswap-secret-test',UNISWAP_QUOTE_ENABLED:'true'},
    fetchImpl:async()=>{calls++; throw new Error('must not call');},
    auth:{sameOrigin:()=>false,verify:async()=>({userId:'u'})},
  });
  const result=await invoke(handler,'POST',{},'/api/market/arbitrage/uniswap/quote','https://evil.example');
  assert.equal(result.status,403);
  assert.equal(calls,0);
});

test('Uniswap quote forwards bounded inputs and never enables swap execution', async()=>{
  let observed;
  const handler=createUniswapTrading({
    env:{UNISWAP_API_KEY:'uniswap-secret-test',UNISWAP_QUOTE_ENABLED:'true'},
    auth,
    fetchImpl:async(url,options)=>{
      observed={url:String(url),headers:options.headers,body:JSON.parse(String(options.body))};
      return Response.json({
        requestId:'req_quote_1',
        routing:'CLASSIC',
        quote:{
          quoteId:'quote_1',
          input:{amount:'1000000000000000000',token:'0x1111111111111111111111111111111111111111',maximumAmount:'1000000000000000000'},
          output:{amount:'12345',token:'0x2222222222222222222222222222222222222222',minimumAmount:'12000',recipient:'0x3333333333333333333333333333333333333333'},
          slippageTolerance:0.5,
          priceImpact:0.14,
          classicGasUseEstimateUSD:'1.23',
          gasUseEstimate:'180350',
          encodedOrder:'0xdeadbeef',
          orderInfo:{nonce:'secret-execution-shape'},
        },
        swapTransaction:{to:'0x4444444444444444444444444444444444444444',data:'0xdeadbeef'},
        permitTransaction:{data:'0xcafe'},
        permitData:{values:{amount:'100'}},
      });
    },
  });
  const body={
    tokenIn:'0x1111111111111111111111111111111111111111',
    tokenOut:'0x2222222222222222222222222222222222222222',
    tokenInChainId:1,
    tokenOutChainId:1,
    amount:'1000000000000000000',
    swapper:'0x3333333333333333333333333333333333333333',
    slippageTolerance:0.5,
    malicious:'ignored',
    analysis:{
      notionalUsd:1000,
      expectedGrossProfitUsd:50,
      maxLossUsd:20,
    },
  };
  const result=await invoke(handler,'POST',body,'/api/market/arbitrage/uniswap/quote');
  assert.equal(result.status,200);
  assert.equal(observed.url,'https://trade-api.gateway.uniswap.org/v1/quote');
  assert.equal(observed.headers['x-api-key'],'uniswap-secret-test');
  assert.equal(observed.body.type,'EXACT_INPUT');
  assert.equal('malicious' in observed.body,false);
  assert.equal(result.payload.executionEnabled,false);
  assert.equal(result.payload.walletSignatureRequired,true);
  assert.equal(result.payload.arbitrageExecutionEligible,false);
  assert.equal(result.payload.executionPayloadStripped,true);
  assert.equal(result.payload.routing,'CLASSIC');
  assert.equal(result.payload.quote.output.amount,'12345');
  assert.equal(result.payload.quote.output.minimumAmount,'12000');
  assert.equal(result.payload.quote.gasFeeUsd,'1.23');
  assert.equal(result.payload.quote.gasUseEstimate,'180350');
  assert.equal(result.payload.quote.slippagePercent,0.5);
  assert.equal(result.payload.quote.priceImpactPercent,0.14);
  assert.equal('analysis' in observed.body,false);
  assert.equal(result.payload.risk.checks.slippage.pass,true);
  assert.equal(result.payload.risk.checks.priceImpact.pass,true);
  assert.equal(result.payload.risk.checks.gas.pass,true);
  assert.equal(result.payload.risk.checks.lossLimit.pass,true);
  assert.equal(result.payload.risk.executionEligible,false);
  assert.equal(result.payload.walletPrivateKeyServerSide,false);
  assert.equal(result.payload.signatureAuthority,'USER_WALLET');
  assert.doesNotMatch(JSON.stringify(result.payload),/swapTransaction|permitTransaction|permitData|encodedOrder|orderInfo|deadbeef|secret-execution-shape/);
  assert.doesNotMatch(JSON.stringify(result.payload),/uniswap-secret-test/);
});

test('Uniswap arbitrage risk remains blocked without price-impact and loss evidence', async()=>{
  const handler=createUniswapTrading({
    env:{UNISWAP_API_KEY:'uniswap-secret-test',UNISWAP_QUOTE_ENABLED:'true'},
    auth,
    fetchImpl:async()=>Response.json({
      requestId:'req_quote_2',
      routing:'CLASSIC',
      quote:{
        input:{amount:'1000000',token:'0x1111111111111111111111111111111111111111'},
        output:{amount:'990000',token:'0x2222222222222222222222222222222222222222'},
        slippageTolerance:0.5,
        classicGasUseEstimateUSD:'2.00',
      },
    }),
  });
  const result=await invoke(handler,'POST',{
    tokenIn:'0x1111111111111111111111111111111111111111',
    tokenOut:'0x2222222222222222222222222222222222222222',
    tokenInChainId:1,
    tokenOutChainId:1,
    amount:'1000000',
    swapper:'0x3333333333333333333333333333333333333333',
    slippageTolerance:0.5,
  },'/api/market/arbitrage/uniswap/quote');
  assert.equal(result.status,200);
  assert.equal(result.payload.arbitrageAnalysisEligible,false);
  assert.equal(result.payload.arbitrageExecutionEligible,false);
  assert.equal(result.payload.risk.checks.priceImpact.pass,false);
  assert.equal(result.payload.risk.checks.lossLimit.pass,false);
});

test('invalid Uniswap quote is rejected before upstream I/O', async()=>{
  let calls=0;
  const handler=createUniswapTrading({
    env:{UNISWAP_API_KEY:'uniswap-secret-test',UNISWAP_QUOTE_ENABLED:'true'},
    auth,
    fetchImpl:async()=>{calls++; throw new Error('must not call');},
  });
  const result=await invoke(handler,'POST',{tokenIn:'ETH',tokenOut:'USDC'},'/api/market/arbitrage/uniswap/quote');
  assert.equal(result.status,400);
  assert.equal(calls,0);
});

test('trading capability contract advertises order types but no live execution', async()=>{
  const handler=createUniswapTrading({env:{},auth});
  const result=await invoke(handler,'GET',null,'/api/market/trading/capabilities');
  assert.equal(result.status,200);
  assert.deepEqual(result.payload.venues.krakenSpot.orderTypes,['market','limit']);
  assert.deepEqual(result.payload.venues.krakenFutures.orderTypes,['market','limit']);
  assert.equal(result.payload.venues.krakenSpot.executionEnabled,false);
  assert.equal(result.payload.venues.krakenFutures.executionEnabled,false);
  assert.equal(result.payload.venues.uniswap.executionEnabled,false);
});

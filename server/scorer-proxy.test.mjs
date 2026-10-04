import test from 'node:test';
import assert from 'node:assert/strict';
import { createScorerProxy } from './scorer-proxy.mjs';
import { createApp } from './index.mjs';

function request({ method='POST', headers={}, body='{}' }={}) {
  return {
    method,
    headers,
    async *[Symbol.asyncIterator]() { if (body !== null) yield Buffer.from(body); },
  };
}
function response() {
  const headers = new Map();
  return {
    status: null,
    body: null,
    setHeader(k,v){ headers.set(k.toLowerCase(), String(v)); },
    getHeader(k){ return headers.get(k.toLowerCase()); },
    writeHead(status){ this.status=status; },
    end(payload){ this.body=payload; },
  };
}
function json(res,status,body){ res.status=status; res.body=body; }

const admittedPolicy = {
  admittedSources:[{ providerId:'open-data-test', eligible:true, decision:'OPEN_SOURCE_OPEN_DATA_ADMITTED' }],
};

test('fails closed without admitted MARKET source and performs no network call', async () => {
  let calls=0;
  const proxy=createScorerProxy({
    env:{ CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN:'http://finance-ab12:10000' },
    fetchImpl:async()=>{ calls++; throw new Error('must not call'); },
    sourcePolicy:{ admittedSources:[] },
  });
  const res=response();
  assert.equal(await proxy.handle(request({headers:{'content-type':'application/json'}}),res,new URL('http://local/api/crypto/score'),json,'req-1'),true);
  assert.equal(res.status,503);
  assert.equal(res.body.error,'market_source_not_admitted');
  assert.equal(calls,0);
});

test('rejects public or malformed upstream origins', () => {
  assert.equal(createScorerProxy({env:{CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN:'https://finance.example.com'},sourcePolicy:admittedPolicy}).configured,false);
  assert.equal(createScorerProxy({env:{CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN:'http://finance-ab12:9999'},sourcePolicy:admittedPolicy}).configured,false);
  assert.equal(createScorerProxy({env:{CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN:'http://finance-ab12:10000'},sourcePolicy:admittedPolicy}).configured,true);
});

test('proxies only bounded JSON and forwards only a strict bearer credential', async () => {
  let captured=null;
  const proxy=createScorerProxy({
    env:{ CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN:'http://finance-ab12:10000' },
    sourcePolicy:admittedPolicy,
    fetchImpl:async(url,options)=>{
      captured={url:String(url),options};
      return new Response(JSON.stringify({status:'SOURCE_UNAVAILABLE',score:null}),{
        status:422,
        headers:{'content-type':'application/json','x-correlation-id':'finance:123'},
      });
    },
  });
  const res=response();
  const req=request({
    headers:{
      'content-type':'application/json; charset=utf-8',
      authorization:'Bearer abc.def',
      cookie:'should-not-forward=1',
    },
    body:JSON.stringify({symbol:'BTC',asset_name:'Bitcoin'}),
  });
  await proxy.handle(req,res,new URL('http://local/api/crypto/score'),json,'request-123');
  assert.equal(res.status,422);
  assert.equal(res.body.status,'SOURCE_UNAVAILABLE');
  assert.equal(captured.url,'http://finance-ab12:10000/api/crypto/score');
  assert.equal(captured.options.headers.Authorization,'Bearer abc.def');
  assert.equal(captured.options.headers.cookie,undefined);
  assert.equal(captured.options.headers['x-capital-ai-scorer-proxy-hop'],'1');
  assert.equal(captured.options.headers['x-correlation-id'],'request-123');
  assert.equal(res.getHeader('x-correlation-id'),'finance:123');
});

test('blocks proxy loops before upstream access', async () => {
  let calls=0;
  const proxy=createScorerProxy({
    env:{ CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN:'http://finance-ab12:10000' },
    sourcePolicy:admittedPolicy,
    fetchImpl:async()=>{ calls++; return new Response('{}',{headers:{'content-type':'application/json'}}); },
  });
  const res=response();
  await proxy.handle(
    request({headers:{'content-type':'application/json','x-capital-ai-scorer-proxy-hop':'1'}}),
    res,
    new URL('http://local/api/crypto/score'),
    json,
  );
  assert.equal(res.status,502);
  assert.equal(res.body.error,'scorer_proxy_loop_detected');
  assert.equal(calls,0);
});


test('public POST /api/crypto/score reaches reverse proxy instead of global GET-only fallback', async () => {
  const server=createApp('/tmp/capital-ai-nonexistent', {
    env:{ CAPITAL_AI_FINANCE_SCORER_PRIVATE_ORIGIN:'http://finance-ab12:10000' },
    sourcePolicy:admittedPolicy,
    fetchImpl:async()=>new Response(JSON.stringify({correlationId:'test',error:'"symbol" and "asset_name" are required in payload.'}),{
      status:400,
      headers:{'content-type':'application/json'},
    }),
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  try{
    const address=server.address();
    const response=await fetch(`http://127.0.0.1:${address.port}/api/crypto/score`,{
      method:'POST',
      headers:{'content-type':'application/json'},
      body:'{}',
    });
    assert.equal(response.status,400);
    const body=await response.json();
    assert.match(body.error,/symbol/);
  }finally{
    await new Promise(resolve=>server.close(resolve));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { runTwentyReadback } from './owner-readback.mjs';

const tenant='11111111-2222-3333-4444-555555555555';
const product='22222222-3333-4444-5555-666666666666';
const secret='synthetic-token-for-offline-test';
const base={TWENTY_READBACK_ENABLED:'true',TWENTY_API_KEY:secret};
function setup(env=base,fail=false) {
  const lines=[],errors=[],requests=[];
  return {lines,errors,requests,
    opts:{env,output:x=>lines.push(x),errorOutput:x=>errors.push(x),
      fetchImpl:async(url,options)=>{
        requests.push({url,options});
        assert.equal(options.headers.Authorization,'Bearer '+secret);
        assert.equal(options.method,'POST');
        assert.equal(options.redirect,'error');
        if(fail) throw Error('provider exception: '+secret);
        const query=JSON.parse(options.body).query;
        const body=query.includes('currentWorkspace')
          ? {data:{currentWorkspace:{id:tenant,workspaceUrls:{subdomainUrl:'https://capital-ai.twenty.com',customUrl:null}}}}
          : {data:{objects:{edges:[{node:{id:product,nameSingular:'product',namePlural:'products'}}]}}};
        return {status:200,ok:true,text:async()=>JSON.stringify(body)};
      }},
  };
}
test('disabled never reads provider or outputs credentials',async()=>{
  const s=setup({...base,TWENTY_READBACK_ENABLED:'false'});
  assert.equal(await runTwentyReadback(s.opts),2);
  assert.equal(s.requests.length,0);
  assert.deepEqual(s.errors,['TWENTY_READBACK_DISABLED']);
});
test('missing token never reads provider',async()=>{
  const s=setup({TWENTY_READBACK_ENABLED:'true'});
  assert.equal(await runTwentyReadback(s.opts),2);
  assert.equal(s.requests.length,0);
  assert.deepEqual(s.errors,['TWENTY_AUTH_NOT_CONNECTED']);
});
test('authorized metadata-only readback returns bounded sanitized evidence',async()=>{
  const s=setup();
  assert.equal(await runTwentyReadback(s.opts),0);
  assert.equal(s.requests.length,2);
  assert.ok(s.requests.every(x=>x.url==='https://api.twenty.com/metadata'));
  assert.ok(s.requests.every(x=>!/mutation/i.test(x.options.body)));
  const result=JSON.parse(s.lines[0]);
  assert.equal(result.workspaceId,tenant);
  assert.equal(result.objectId,product);
  assert.equal(result.writeAllowed,false);
  assert.equal(result.record,'NOT_READ');
  assert.equal(result.role,'NOT_PROVEN');
  assert.ok(!JSON.stringify(s.lines).includes(secret));
});
test('provider failure redacts tokens and exception text',async()=>{
  const s=setup(base,true);
  assert.equal(await runTwentyReadback(s.opts),1);
  assert.deepEqual(s.errors,['TWENTY_READBACK_FAILED']);
  assert.equal(s.lines.length,0);
  assert.ok(!JSON.stringify(s.errors).includes(secret));
});

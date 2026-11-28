import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileProviderAvatar } from './profile-provider-avatar.mjs';

const TRUSTED = 'https://lh3.googleusercontent.com/a/example';
const PNG = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,73,69,78,68,0,0,0,0]);
function setup({url=TRUSTED,authenticated=true,fetchImpl}={}){
  let accessed=0;
  const auth={
    verify:async()=>authenticated?{userId:'11111111-1111-4111-8111-111111111111'}:null,
    verifiedProviderAvatarUrl:async()=>url
  };
  const loader=async(uri,options)=>{accessed++;return fetchImpl?fetchImpl(uri,options):new Response(PNG,{headers:{'content-type':'image/png'}});};
  const proxy=createProfileProviderAvatar({auth,fetchImpl:loader});
  const call=async(method='GET')=>{
    let code=null,body=null;
    const res={headers:{},setHeader(k,v){this.headers[k]=v;},writeHead(status){code=status;},
      end(buf){body=buf;}};
    await proxy.handle({method},res,new URL('https://capital-ai.online/api/profile/avatar/provider'),
      (_,status,result)=>{code=status;body=result;});
    return {code,body,headers:res.headers};
  };
  return {call,accessed:()=>accessed};
}
test('only authenticated account may request avatar',async()=>{
  const app=setup({authenticated:false});assert.equal((await app.call()).code,401);assert.equal(app.accessed(),0);
});
test('untrusted URL never crosses network boundary',async()=>{
  const app=setup({url:'http://127.0.0.1/internal'});
  assert.equal((await app.call()).code,404);assert.equal(app.accessed(),0);
});
test('valid image uses same-origin stream, no redirect, no user URL',async()=>{
  const app=setup({fetchImpl:async(uri,options)=>{
    assert.equal(uri,TRUSTED);assert.equal(options.redirect,'error');
    return new Response(PNG,{headers:{'content-type':'image/png'}});
  }});
  const result=await app.call();
  assert.equal(result.code,200);
  assert.equal(result.body.equals(PNG),true);
  assert.equal(result.headers['Cache-Control'],'private, no-store, max-age=0');
});
test('oversize, SVG, wrong file signatures are blocked',async()=>{
  const svg=setup({fetchImpl:async()=>new Response('<svg/>',{headers:{'content-type':'image/svg+xml'}})});
  assert.equal((await svg.call()).code,415);
  const spoof=setup({fetchImpl:async()=>new Response('not a PNG',{headers:{'content-type':'image/png'}})});
  assert.equal((await spoof.call()).code,415);
  const large=setup({fetchImpl:async()=>new Response(Buffer.alloc(524289),{headers:{'content-type':'image/png'}})});
  assert.equal((await large.call()).code,413);
});

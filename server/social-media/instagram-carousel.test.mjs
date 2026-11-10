import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import {
  prepareInstagramCarousel, createInstagramCarouselAdapter,
  INSTAGRAM_CAROUSEL_ADAPTER_VERSION,
} from './instagram-carousel.mjs';

const USER='d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
const OTHER='8c6682a7-e203-473c-897b-389e55cd58a0';
const ACCOUNT='f683ecba-1fab-45f7-8c6a-a35418750771';
const SOURCE='3c26d10db4675ac95d036943e9c25f3f100d442e';
const NOW=Date.parse('2026-11-10T10:00:00Z');
const env={
  SOCIAL_MEDIA_ASSET_HOST_ALLOWLIST:'assets.capital-ai.online',
  SOCIAL_META_GRAPH_API_VERSION:'v26.0',
  SOCIAL_INSTAGRAM_ACCOUNT_ID:'17841400000000001',
};
const enabledEnv={...env,SOCIAL_PROVIDER_PUBLISH_ENABLED:'true',
  SOCIAL_INSTAGRAM_PUBLISH_ENABLED:'true',SOCIAL_INSTAGRAM_CAROUSEL_ENABLED:'true'};

// Tests use a synthetic SOF JPEG byte stream, never a licensed market-data image.
function jpeg() {
  return Buffer.from([
    0xff,0xd8,0xff,0xc0,0,17,8,0x05,0x46,0x04,0x38,3,
    1,0x11,0,2,0x11,0,3,0x11,0,0xff,0xd9,
  ]);
}
const bytes=jpeg();
const HASH=createHash('sha256').update(bytes).digest('hex');
const assetIds=['etf-1-jpeg','etf-2-jpeg','etf-3-jpeg'];
const shaList=assetIds.map(() => HASH);
function fixture() {
  const contentId='content',campaignId='campaign';
  const manifest={
    contractVersion:'CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1',
    publicationAuthority:'SOCIAL_MEDIA_ENGINE_ONLY',
    campaignId,contentId,sourceSha:SOURCE,canonicalUrl:'https://capital-ai.online/learning',
    assets:assetIds.map(assetId=>({
      assetId,contentId,sourceSha:SOURCE,sha256:HASH,kind:'IMAGE',mimeType:'image/jpeg',
    })),
    approvals:assetIds.map(assetId=>({
      approvalRef:'approved-'+assetId,assetId,assetSha256:HASH,
      approvedChannels:['INSTAGRAM'],publicPublishAllowed:true,
    })),
  };
  const handoffs=assetIds.map(assetId=>({
    contractVersion:'CAPITAL_AI_CONTENT_SOCIAL_PUBLISHER_ADAPTER@1',
    campaignId,contentId,sourceSha:SOURCE,canonicalUrl:'https://capital-ai.online/learning',
    assetId,assetSha256:HASH,approvalRef:'approved-'+assetId,
    channel:'INSTAGRAM',deliveryKey:campaignId+':'+contentId+':'+assetId+':INSTAGRAM',
  }));
  const media=assetIds.map(assetId=>({
    assetId,mediaUrl:'https://assets.capital-ai.online/instagram/'+assetId+'/'+HASH+'.jpg',
    altText:'Synthetic educational image for '+assetId,
  }));
  const approvalRows=assetIds.map(assetId=>({
    id:'approved-'+assetId,user_id:USER,status:'approved',platforms:['instagram'],
    decided_by:'owner-evidence',asset_id:assetId,asset_sha256:HASH,
  }));
  const reservations=handoffs.map((handoff,i)=>({
    id:'b405dbb2-c918-4541-a0e1-840f9f5bca8'+i,
    user_id:USER,delivery_key:handoff.deliveryKey,asset_sha256:HASH,
    approval_ref:handoff.approvalRef,status:'CLAIMED',
    expires_at:'2026-11-10T11:00:00Z',
  }));
  const digest=value=>createHash('sha256').update(value).digest('hex');
  const caption='Alle Zahlen synthetisch. Keine Anlageberatung.';
  const editorialFingerprint=digest(JSON.stringify([
    campaignId,contentId,SOURCE,digest(caption),
    media.map(x=>[HASH,digest(x.altText)]),
  ]));
  const groupDigest=editorialFingerprint;
  const deliveryKey=[campaignId,contentId,'INSTAGRAM','CAROUSEL',groupDigest].join(':');
  const groupReservation={
    id:'group-claim',user_id:USER,account_id:ACCOUNT,delivery_key:deliveryKey,
    status:'CLAIMED',expires_at:'2026-11-10T11:00:00Z',
    asset_sha256s:shaList,approval_refs:handoffs.map(x=>x.approvalRef),
  };
  return {
    manifest,handoffs,media,approvalRows,reservations,groupReservation,
    caption,
    userId:USER,now:NOW,env,
    loadEditorialReview:async()=>({
      status:'APPROVED',userId:USER,contentId,sourceSha:SOURCE,
      editorialFingerprint,evidenceRef:'test://review-exact-caption-alt-text',
    }),
    accountRow:{id:ACCOUNT,user_id:USER,platform:'instagram',
      status:'connected',external_account_id:env.SOCIAL_INSTAGRAM_ACCOUNT_ID,
      token_expires_at:'2026-11-11T11:00:00Z',
      scopes:['pages_show_list','instagram_basic','instagram_content_publish','pages_read_engagement'],
      access_token_encrypted:'ENCRYPTED'},
    capability:{channel:'INSTAGRAM',status:'VERIFIED',
      evidenceRef:'trusted://meta-scopes',scopesVerified:true,publishRightsVerified:true,
      loginMethod:'FACEBOOK_LOGIN',apiHost:'graph.facebook.com'},
    loadImmutableBytes:async ({assetId,contentId,sourceSha})=>({
      assetId,contentId,sourceSha,bytes,
    }),
    loadRightsEvidence:async ({assetId,contentId,sourceSha,assetSha256})=>({
      assetId,contentId,sourceSha,assetSha256,rightsVerified:true,
      evidenceRef:'trusted://commercial-rights-evidence',
    }),
    loadHostedBytes:async ({mediaUrl})=>({mediaUrl,bytes}),
  };
}
function runtime(plan,{fetchImpl, tokenResolver, beginAttempt, noteUnknown,envOverride}={}) {
  return createInstagramCarouselAdapter({
    env:envOverride||enabledEnv,
    tokenResolver:tokenResolver|| (async ()=>({
      userId:USER,accountId:ACCOUNT,channel:'INSTAGRAM',platform:'instagram',
      accessToken:'secret-token-12345',externalAccountId:env.SOCIAL_INSTAGRAM_ACCOUNT_ID,
      loginMethod:'FACEBOOK_LOGIN',
    })),
    beginAttempt:beginAttempt|| (async()=>({
      id:plan.reservationId,user_id:USER,account_id:ACCOUNT,
      delivery_key:plan.deliveryKey,status:'SUBMITTING',
    })),
    noteUnknown:noteUnknown|| (async()=>{}),
    fetchImpl:fetchImpl|| (async()=>{throw Error('Unexpected provider request');}),
  });
}
function response(payload,status=200){return new Response(JSON.stringify(payload),{status});}
test('three JPEG assets require private rights, immutable SHA, hosted SHA and atomic group claim',async()=>{
  const p=await prepareInstagramCarousel(fixture());
  assert.equal(p.contractVersion,INSTAGRAM_CAROUSEL_ADAPTER_VERSION);
  assert.equal(p.items.length,3);
  assert.ok(p.items.every(x=>x.sha256===HASH && x.mediaUrl.includes(HASH)));
  assert.doesNotMatch(JSON.stringify(p),/ENCRYPTED|secret-token/);
  assert.equal(p.caption,'Alle Zahlen synthetisch. Keine Anlageberatung.');
  let calls=0;
  await assert.rejects(runtime(p,{envOverride:env,fetchImpl:async()=>{calls++;}}).submit(p),
    /SOCIAL_CAROUSEL_PUBLISH_DISABLED/);
  assert.equal(calls,0);
});
test('all missing rights, forged approval, cross-user, stale claim and wrong channel fail before provider calls',async()=>{
  const bad=[
    [x=>{x.manifest.approvals=[];}, /SOCIAL_PROVIDER_MANIFEST_APPROVAL_MISMATCH/],
    [x=>{x.approvalRows[0].asset_sha256='f'.repeat(64);}, /SOCIAL_PROVIDER_DURABLE_HASH_APPROVAL_REQUIRED/],
    [x=>{x.accountRow.user_id=OTHER;}, /SOCIAL_PROVIDER_ACCOUNT_OWNER_MISMATCH/],
    [x=>{x.groupReservation.expires_at='2026-11-09T11:00:00Z';}, /SOCIAL_CAROUSEL_ATOMIC_GROUP_RESERVATION_REQUIRED/],
    [x=>{x.groupReservation.status='DRAFT';}, /SOCIAL_CAROUSEL_ATOMIC_GROUP_RESERVATION_REQUIRED/],
    [x=>{x.handoffs[0].channel='YOUTUBE';}, /SOCIAL_CAROUSEL_ASSET_ORDER_INVALID/],
    [x=>{x.accountRow.scopes=['pages_read_engagement'];}, /SOCIAL_CAROUSEL_FACEBOOK_LOGIN_SCOPE_REQUIRED/],
    [x=>{x.accountRow.scopes=['instagram_business_basic','instagram_business_content_publish'];}, /SOCIAL_CAROUSEL_FACEBOOK_LOGIN_SCOPE_REQUIRED/],
    [x=>{x.capability.loginMethod='INSTAGRAM_LOGIN';}, /SOCIAL_CAROUSEL_FACEBOOK_LOGIN_SCOPE_REQUIRED/],
    [x=>{x.capability.apiHost='graph.instagram.com';}, /SOCIAL_CAROUSEL_FACEBOOK_LOGIN_SCOPE_REQUIRED/],
    [x=>{x.manifest.assets[1].mimeType='image/png';}, /SOCIAL_CAROUSEL_JPEG_MANIFEST_REQUIRED/],
    [x=>{x.media[0].altText='';}, /SOCIAL_CAROUSEL_ALT_TEXT_REQUIRED/],
    [x=>{x.media[0].mediaUrl='https://evil.example/'+HASH+'.jpg';}, /SOCIAL_CAROUSEL_MEDIA_URL_DENIED/],
    [x=>{x.media[0].mediaUrl='https://assets.capital-ai.online/'+HASH+'.jpg?sig=token';}, /SOCIAL_CAROUSEL_MEDIA_URL_DENIED/],
    [x=>{x.handoffs[1].assetId=x.handoffs[0].assetId;}, /SOCIAL_CAROUSEL_ASSET_ORDER_INVALID/],
    [x=>{x.reservations[0].user_id=OTHER;}, /SOCIAL_PROVIDER_ATOMIC_RESERVATION_REQUIRED/],
    [x=>{x.capability.publishRightsVerified=false;}, /SOCIAL_PROVIDER_CAPABILITY_NOT_VERIFIED/],
  ];
  for(const [change,pattern] of bad) {
    const x=fixture();change(x);
    await assert.rejects(prepareInstagramCarousel(x),pattern);
  }
});
test('modified private JPEG, modified hosted JPEG, missing rights and wrong dimensions fail closed',async()=>{
  let x=fixture();x.loadImmutableBytes=async ({assetId,contentId,sourceSha})=>({
    assetId,contentId,sourceSha,bytes:Buffer.from('tamper'),
  });
  await assert.rejects(prepareInstagramCarousel(x),/SOCIAL_ASSET_BYTES_HASH_MISMATCH/);
  // Same-size modified hosted bytes must hit SHA mismatch, not the new length guard.
  const changedHostedBytes=Buffer.from(bytes);changedHostedBytes[12]^=1;
  x=fixture();x.loadHostedBytes=async ({mediaUrl})=>({mediaUrl,bytes:changedHostedBytes});
  await assert.rejects(prepareInstagramCarousel(x),/SOCIAL_CAROUSEL_HOSTED_JPEG_HASH_MISMATCH/);
  // Truncated/unbounded bodies are rejected before hashing.
  x=fixture();x.loadHostedBytes=async ({mediaUrl})=>({mediaUrl,bytes:Buffer.from('tamper')});
  await assert.rejects(prepareInstagramCarousel(x),/SOCIAL_CAROUSEL_HOSTED_READBACK_MISMATCH/);
  x=fixture();x.loadRightsEvidence=async ({assetId,contentId,sourceSha,assetSha256})=>({
    assetId,contentId,sourceSha,assetSha256,rightsVerified:false,evidenceRef:'none',
  });
  await assert.rejects(prepareInstagramCarousel(x),/SOCIAL_ASSET_RIGHTS_UNVERIFIED/);
  // Header-valid SOF reporting wrong dimensions must not be accepted.
  const badBytes=Buffer.from(bytes);badBytes[8]=0x04;
  x=fixture();x.manifest.assets.forEach(a=>a.sha256=createHash('sha256').update(badBytes).digest('hex'));
  x.manifest.approvals.forEach(a=>a.assetSha256=x.manifest.assets[0].sha256);
  x.handoffs.forEach(h=>h.assetSha256=x.manifest.assets[0].sha256);
  x.approvalRows.forEach(a=>a.asset_sha256=x.manifest.assets[0].sha256);
  x.reservations.forEach(a=>a.asset_sha256=x.manifest.assets[0].sha256);
  x.groupReservation.asset_sha256s=x.manifest.assets.map(a=>a.sha256);
  const digest=createHash('sha256')
    .update(JSON.stringify(['campaign','content',x.groupReservation.asset_sha256s])).digest('hex');
  x.groupReservation.delivery_key=['campaign','content','INSTAGRAM','CAROUSEL',digest].join(':');
  x.media.forEach(m=>m.mediaUrl='https://assets.capital-ai.online/'+m.assetId+'/'+x.manifest.assets[0].sha256+'.jpg');
  x.loadImmutableBytes=async({assetId,contentId,sourceSha})=>({assetId,contentId,sourceSha,bytes:badBytes});
  x.loadHostedBytes=async({mediaUrl})=>({mediaUrl,bytes:badBytes});
  await assert.rejects(prepareInstagramCarousel(x),/SOCIAL_CAROUSEL_JPEG_DIMENSION_MISMATCH/);
});
test('no provider call on forged plan, cross-tenant token or missing CAS; no blind retries',async()=>{
  let calls=0;
  const x=fixture(),p=await prepareInstagramCarousel(x);
  await assert.rejects(runtime(p,{fetchImpl:async()=>{calls++;}}).submit({...p}),
    /SOCIAL_CAROUSEL_PREPARED_PLAN_REQUIRED/);
  await assert.rejects(runtime(p,{
    tokenResolver:async()=>({userId:OTHER,accountId:ACCOUNT,channel:'INSTAGRAM',platform:'instagram',accessToken:'secret-token-12345'}),
    fetchImpl:async()=>{calls++;},
  }).submit(p),/SOCIAL_CAROUSEL_TOKEN_TENANT_MISMATCH/);
  await assert.rejects(runtime(p,{
    tokenResolver:async()=>({userId:USER,accountId:ACCOUNT,channel:'INSTAGRAM',platform:'instagram',
      loginMethod:'INSTAGRAM_LOGIN',externalAccountId:env.SOCIAL_INSTAGRAM_ACCOUNT_ID,
      accessToken:'secret-token-12345'}),
    fetchImpl:async()=>{calls++;},
  }).submit(p),/SOCIAL_CAROUSEL_TOKEN_TENANT_MISMATCH/);
  await assert.rejects(runtime(p,{
    beginAttempt:async()=>({id:p.reservationId,user_id:USER,account_id:ACCOUNT,delivery_key:p.deliveryKey,status:'CLAIMED'}),
    fetchImpl:async()=>{calls++;},
  }).submit(p),/SOCIAL_CAROUSEL_ATOMIC_CLAIM_REQUIRED/);
  assert.equal(calls,0);
});
test('mock Meta 3 children, carousel parent and publish preserves ordered alt text; receipt stays UNKNOWN',async()=>{
  const p=await prepareInstagramCarousel(fixture());
  const calls=[],unknown=[];
  let next=100;
  const adapter=runtime(p,{
    noteUnknown:async row=>unknown.push(row),
    fetchImpl:async (url,init)=>{
      const u=String(url);
      calls.push({url:u,method:init.method,body:init.body?JSON.parse(init.body):null});
      if(init.method==='GET')return response({status_code:'FINISHED'});
      return response({id:String(next++)});
    },
  });
  const result=await adapter.submit(p);
  assert.equal(result.deliveryState,'UNKNOWN');
  assert.equal(result.stage,'SUBMITTED_AWAITING_READBACK');
  assert.equal(calls.length,9); // 3 child POST+GET, parent POST+GET, publish POST
  const posts=calls.filter(c=>c.method==='POST');
  assert.equal(posts.length,5);
  for(let i=0;i<3;i++){
    assert.equal(posts[i].body.image_url,p.items[i].mediaUrl);
    assert.equal(posts[i].body.alt_text,p.items[i].altText);
    assert.equal(posts[i].body.is_carousel_item,true);
    assert.equal('caption' in posts[i].body,false);
  }
  assert.equal(posts[3].body.media_type,'CAROUSEL');
  assert.equal(posts[3].body.children,'100,101,102');
  assert.equal(posts[3].body.caption,p.caption);
  assert.equal(posts[4].body.creation_id,'103');
  assert.equal(unknown.length,1);
  assert.equal(unknown[0].status,'UNKNOWN');
  await assert.rejects(adapter.submit(p),/SOCIAL_CAROUSEL_PREPARED_PLAN_REQUIRED/);
  assert.doesNotMatch(JSON.stringify(result),/secret-token/);
});
test('unready child stops before parent and persists UNKNOWN; timeout never blindly retries',async()=>{
  let p=await prepareInstagramCarousel(fixture());
  let calls=0;const unknown=[];
  const adapter=runtime(p,{
    noteUnknown:async row=>unknown.push(row),
    fetchImpl:async (_url,init)=>{calls++;return init.method==='POST'?response({id:'100'}):response({status_code:'IN_PROGRESS'});},
  });
  const result=await adapter.submit(p);
  assert.equal(result.deliveryState,'UNKNOWN');
  assert.equal(result.stage,'CHILD_NOT_READY');
  assert.equal(calls,2);
  assert.equal(unknown[0].status,'UNKNOWN');
  p=await prepareInstagramCarousel(fixture());calls=0;
  const network=runtime(p,{
    noteUnknown:async row=>unknown.push(row),
    fetchImpl:async()=>{calls++;throw new Error('private network details');},
  });
  const ambiguous=await network.submit(p);
  assert.equal(ambiguous.deliveryState,'UNKNOWN');
  assert.equal(ambiguous.stage,'AMBIGUOUS_CHILD');
  assert.equal(calls,1);
  assert.doesNotMatch(JSON.stringify(ambiguous),/private network details/);
});

test('caption or alt-text tampering invalidates exact editorial SHA approval',async()=>{
  for(const mutation of [
    x=>{x.caption='Unauthorisierte Umsatzgarantie';},
    x=>{x.media[0].altText='Manipulierter Alternativtext fuer den falschen Inhalt';},
    x=>{x.loadEditorialReview=async()=>null;},
  ]){
    const x=fixture(); mutation(x);
    await assert.rejects(prepareInstagramCarousel(x),
      /SOCIAL_CAROUSEL_EDITORIAL_APPROVAL_REQUIRED/);
  }
});
test('editorial readback is compulsory and fails closed on private store errors',async()=>{
  const x=fixture();delete x.loadEditorialReview;
  await assert.rejects(prepareInstagramCarousel(x),
    /SOCIAL_CAROUSEL_PRIVATE_READBACK_REQUIRED/);
  const y=fixture();y.loadEditorialReview=async()=>{throw Error('private reviewer details')};
  await assert.rejects(prepareInstagramCarousel(y),
    /SOCIAL_CAROUSEL_EDITORIAL_READBACK_UNAVAILABLE/);
});

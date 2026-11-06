import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { uploadVerification, CHANNEL } from './youtube-verification-upload.mjs';
const media=Buffer.from('0000ftyp000000000000');
const opts={media,sha256:createHash('sha256').update(media).digest('hex'),clientId:'synthetic-client-id',clientSecret:'synthetic-client-secret',refreshToken:'synthetic-refresh-token'};
const reply=d=>({ok:true,text:async()=>JSON.stringify(d)});
function mock({channel=CHANNEL,privacy='unlisted',failUpload=false,badLocation=false}={}) {
 const calls=[]; const receipts=[];
 const fetchImpl=async(url,init)=>{calls.push({url,init});
 if(url==='https://oauth2.googleapis.com/token')return reply({access_token:'synthetic-access-token',token_type:'Bearer'});
 if(url.includes('/channels?'))return reply({items:[{id:channel}]});
 if(init.method==='POST')return {ok:true,headers:new Headers({location:badLocation?'https://evil.example/upload?upload_id=secret':'https://www.googleapis.com/upload/youtube/v3/videos?upload_id=synthetic'})};
 if(init.method==='PUT'){if(failUpload)throw Error('private provider data');return reply({id:'abcdefghijk'});}
 return reply({items:[{id:'abcdefghijk',snippet:{channelId:CHANNEL},status:{privacyStatus:privacy,uploadStatus:'processed'}}]});};
 return {calls,receipts,fetchImpl,checkpoint:async r=>receipts.push(r)};
}
test('hash and configuration fail before any network request',async()=>{
 const m=mock();await assert.rejects(()=>uploadVerification({...opts,...m,sha256:'0'.repeat(64)}),/HASH_MISMATCH/);assert.equal(m.calls.length,0);
 await assert.rejects(()=>uploadVerification({...opts,...m,refreshToken:''}),/OAUTH_NOT_CONFIGURED/);assert.equal(m.calls.length,0);
});
test('wrong owner channel prevents upload initiation',async()=>{
 const m=mock({channel:'UCwrong'});await assert.rejects(()=>uploadVerification({...opts,...m}),/WRONG_CHANNEL/);assert.equal(m.calls.length,2);
});
test('uploads unlisted, persists receipt before readback, never submits review',async()=>{
 const m=mock();const result=await uploadVerification({...opts,...m});assert.equal(result.status,'VERIFIED_UNLISTED');assert.equal(result.reviewSubmitted,false);
 assert.equal(m.receipts[1].status,'UPLOADED_READBACK_PENDING');
 assert.equal(JSON.parse(m.calls[2].init.body).status.privacyStatus,'unlisted');
 assert.ok(m.calls.every(c=>c.init.redirect==='error'));assert.equal(m.calls.filter(c=>c.init.method==='PUT').length,1);
});
test('provider visibility override is recorded, never called unlisted',async()=>{
 const m=mock({privacy:'private'});assert.equal((await uploadVerification({...opts,...m})).status,'VISIBILITY_REVIEW_REQUIRED');
});
test('ambiguous upload stops without retry and leaves started checkpoint',async()=>{
 const m=mock({failUpload:true});await assert.rejects(()=>uploadVerification({...opts,...m}));assert.equal(m.calls.filter(c=>c.init.method==='PUT').length,1);assert.equal(m.receipts.at(-1).status,'INSERT_STARTED');
});
test('resumable redirect cannot send bearer token to foreign origin',async()=>{
 const m=mock({badLocation:true});await assert.rejects(()=>uploadVerification({...opts,...m}),/UPLOAD_SESSION_INVALID/);assert.equal(m.calls.length,3);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {createB2BLeadIntake} from './b2b-evidence-leads.mjs';
const payload={tenantId:'tenant-a',organization:'Example GmbH',email:'buyer@example.com',repository:'org/repo',consent:true,privacyVersion:'2026-11-19',purpose:'b2b_evidence_audit_contact'};
const make=(opts={})=>{const rows=[];return {rows,submit:createB2BLeadIntake({resolveTenant:async p=>p?.tenant,persist:async r=>rows.push(r),...opts})}};
const req=(body=payload,principal={tenant:'tenant-a'},ip='198.51.100.1')=>({body,principal,ip});
test('valid lead is tenant bound and consent recorded',async()=>{const {submit,rows}=make();assert.equal((await submit(req())).status,202);assert.equal(rows[0].tenantId,'tenant-a');assert.equal(rows[0].consent.purpose,payload.purpose)});
test('anonymous denied',async()=>{const {submit,rows}=make();assert.equal((await submit(req(payload,null))).status,401);assert.equal(rows.length,0)});
test('cross tenant denied',async()=>{const {submit,rows}=make();assert.equal((await submit(req({...payload,tenantId:'tenant-b'}))).status,403);assert.equal(rows.length,0)});
test('missing consent denied',async()=>{const {submit}=make();assert.equal((await submit(req({...payload,consent:false}))).status,422)});
test('outdated privacy version denied',async()=>{const {submit}=make();assert.equal((await submit(req({...payload,privacyVersion:'old'}))).status,422)});
test('unexpected fields and prototype-like payload denied',async()=>{const {submit}=make();assert.equal((await submit(req({...payload,admin:true}))).status,400)});
test('invalid repository denied',async()=>{
  const {submit,rows}=make();
  for (const repository of ['../private','./private','org/..','org/.','org//repo','org/repo/extra','org/%2e%2e','org\\repo']) {
    assert.equal((await submit(req({...payload,repository}))).status,400,repository);
  }
  assert.equal(rows.length,0);
});
test('request ids cannot persist log-injection controls or silently truncated identities',async()=>{
  const {submit,rows}=make();
  for (const requestId of ['', ' lead ', 'X'+String.fromCharCode(10)+'FAKE', 'X'+String.fromCharCode(13,10)+'FAKE', 'X'+String.fromCharCode(0x202e)+'Y', 'a'.repeat(81), 'x'+String.fromCharCode(92)+'y', 42, true, {id:'spoof'}, ['x']]) {
    const r=await submit({...req(),requestId});
    assert.equal(r.status,400,JSON.stringify(requestId));
    assert.equal(r.code,'INVALID_REQUEST_ID');
  }
  assert.equal(rows.length,0);
  const requestId='CAI:821-2026.11_request';
  assert.equal((await submit({...req(),requestId})).status,202);
  assert.equal(rows[0].requestId,requestId);
});

test('rate limit tenant and IP scoped',async()=>{const {submit,rows}=make({limit:2});assert.equal((await submit(req())).status,202);assert.equal((await submit(req())).status,202);assert.equal((await submit(req())).status,429);assert.equal(rows.length,2)});
test('failed persistence cannot claim success',async()=>{const submit=createB2BLeadIntake({resolveTenant:async()=> 'tenant-a',persist:async()=>{throw Error('db unavailable')}});await assert.rejects(submit(req()),/db unavailable/)});
test('tenant cannot be supplied by unauthenticated body',async()=>{const {submit}=make();assert.equal((await submit(req({...payload,tenantId:'tenant-a'},{tenant:'tenant-b'}))).status,403)});

test('email contact rejects control, HTML delimiters and bidi spoofing without persistence',async()=>{
  const {submit,rows}=make();
  const invalid=[
    'buyer<script>@example.com',
    'buyer'+String.fromCharCode(0x202e)+'@example.com',
    'buyer'+String.fromCharCode(0x2066)+'@example.com',
    'buyer'+String.fromCharCode(0)+'@example.com',
    'buyer'+String.fromCharCode(0x7f)+'@example.com',
    'buyer'+String.fromCharCode(0x85)+'@example.com',
  ];
  for(const email of invalid){
    const result=await submit(req({...payload,email}));
    assert.equal(result.status,400,JSON.stringify(email));
    assert.equal(result.code,'INVALID_INPUT');
  }
  assert.equal(rows.length,0);
  const accepted=await submit(req({...payload,email:'buyer+news@example.co'}));
  assert.equal(accepted.status,202);
  assert.equal(rows[0].email,'buyer+news@example.co');
});

test('organization is validated after normalization and cannot store blank or control text',async()=>{
  const {submit,rows}=make();
  for(const organization of ['  ',' A ','Acme\\nInjected','\\u0000A','A\\u202eB','A\\u2066B']) {
    const input=organization.replaceAll('\\n','\n').replaceAll('\\u0000','\u0000').replaceAll('\\u202e','\u202e').replaceAll('\\u2066','\u2066');
    assert.equal((await submit(req({...payload,organization:input}))).status,400,JSON.stringify(input));
  }
  assert.equal(rows.length,0);
  assert.equal((await submit(req({...payload,organization:'  Example GmbH  '}))).status,202);
  assert.equal(rows[0].organization,'Example GmbH');
});

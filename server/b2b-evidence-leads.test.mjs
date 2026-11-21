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
test('rate limit tenant and IP scoped',async()=>{const {submit,rows}=make({limit:2});assert.equal((await submit(req())).status,202);assert.equal((await submit(req())).status,202);assert.equal((await submit(req())).status,429);assert.equal(rows.length,2)});
test('failed persistence cannot claim success',async()=>{const submit=createB2BLeadIntake({resolveTenant:async()=> 'tenant-a',persist:async()=>{throw Error('db unavailable')}});await assert.rejects(submit(req()),/db unavailable/)});
test('tenant cannot be supplied by unauthenticated body',async()=>{const {submit}=make();assert.equal((await submit(req({...payload,tenantId:'tenant-a'},{tenant:'tenant-b'}))).status,403)});

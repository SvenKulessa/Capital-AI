import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { planTwentyProductActivation, computeTwentyActivationKey } from './product-activation-plan.mjs';

const sha = b => createHash('sha256').update(b).digest('hex');
const tenant='11111111-2222-3333-4444-555555555555';
const obj='aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const record='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const sourceBytes=Buffer.from('offline source fixture');
const assetBytes=Buffer.from('offline graphic fixture');
function fixture() {
  const base = {
    workspaceOrigin:'https://capital-ai.twenty.com',apiOrigin:'https://api.twenty.com',
    workspaceId:tenant,productObjectId:obj,productRecordId:record,
    productRecordReadback:{id:record,workspaceId:tenant,objectMetadataId:obj,projectId:'CAPITAL_AI',state:'DRAFT'},
    fieldInventory:[{objectMetadataId:obj,name:'state',type:'SELECT',isActive:true,writeAllowed:true,allowedValues:['DRAFT','ACTIVE']}],
    activationField:'state',activationValue:'ACTIVE',
    sourceBytes,assetBytes,sourceSha256:sha(sourceBytes),assetSha256:sha(assetBytes),
    ownerApprovalRef:'synthetic:owner-approval',roleEvidenceRef:'synthetic:role-evidence',
    schemaEvidenceRef:'synthetic:schema-evidence',workspaceEvidenceRef:'synthetic:workspace-evidence',
    rollbackEvidenceRef:'synthetic:rollback-rehearsal',rollbackRehearsed:true,
    expectedRecordVersion:'version-1',currentRecordVersion:'version-1',
  };
  const idempotencyKey=computeTwentyActivationKey(base);
  return {...base,idempotencyKey,idempotencyReceipt:{status:'UNUSED',key:idempotencyKey,workspaceId:tenant}};
}
test('offline activation plan cannot execute or authorize provider writes',()=>{
  const plan=planTwentyProductActivation(fixture());
  assert.equal(plan.method,'PATCH');
  assert.equal(plan.path,'/rest/products/'+record);
  assert.deepEqual(plan.body,{state:'ACTIVE'});
  assert.deepEqual(plan.rollback,{state:'DRAFT'});
  assert.equal(plan.status,'DRY_RUN_ONLY');
  assert.equal(plan.writeAllowed,false);
  assert.equal(plan.executeAllowed,false);
  assert.equal(plan.commercialRelease,'HOLD');
  assert.equal(JSON.stringify(plan).includes('synthetic:owner-approval'),false);
});
test('foreign tenant, wrong product, cross-project and unverified field reject',()=>{
  const good=fixture();
  for(const change of [
    {workspaceOrigin:'https://evil.example'},
    {apiOrigin:'https://capital-ai.twenty.com'},
    {workspaceId:'cccccccc-cccc-cccc-cccc-cccccccccccc'},
    {productRecordId:'cccccccc-cccc-cccc-cccc-cccccccccccc'},
    {productRecordReadback:{...good.productRecordReadback,projectId:'DEVICE_CARE_KI'}},
    {fieldInventory:[{...good.fieldInventory[0],objectMetadataId:'cccccccc-cccc-cccc-cccc-cccccccccccc'}]},
    {activationValue:'UNREVIEWED'},
    // A plain string 'INACTIVE' contains the substring 'ACTIVE' but is not an allowed-value list.
    {fieldInventory:[{...good.fieldInventory[0],allowedValues:'INACTIVE'}]},
    // A forged includes method must not substitute for real workspace field metadata.
    {fieldInventory:[{...good.fieldInventory[0],allowedValues:{includes:()=>true}}]},
    {fieldInventory:[{...good.fieldInventory[0],writeAllowed:false}]},
  ]) assert.throws(()=>planTwentyProductActivation({...good,...change}),/TWENTY_/);
});
test('digest tampering, stale version, missing rollback and reused idempotency reject',()=>{
  const good=fixture();
  for(const change of [
    {sourceBytes:Buffer.from('tampered')},
    {assetBytes:Buffer.from('tampered')},
    {sourceSha256:'f'.repeat(64)},
    {expectedRecordVersion:'stale'},
    {rollbackRehearsed:false},
    {rollbackEvidenceRef:null},
    {idempotencyKey:'0'.repeat(64)},
    {idempotencyReceipt:{...good.idempotencyReceipt,status:'USED'}},
    {idempotencyReceipt:{...good.idempotencyReceipt,workspaceId:'cccccccc-cccc-cccc-cccc-cccccccccccc'}},
    {roleEvidenceRef:null},
  ]) assert.throws(()=>planTwentyProductActivation({...good,...change}),/TWENTY_/);
});
test('readback already activated fails closed rather than writing again',()=>{
  const good=fixture();
  assert.throws(()=>planTwentyProductActivation({...good,productRecordReadback:{...good.productRecordReadback,state:'ACTIVE'}}),/ROLLBACK_NOT_PROVEN/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createOperationsPublicTemplateSvg, createOperationsVisualDraft,
  OWNER_OPERATIONS_VISUAL_KIT,
  OWNER_OPERATIONS_VISUAL_KIT_ID,
} from '../Editing/OwnerOperationsVisualKit';

test('social operations visual is a draft-only first-party template with existing renderer', () => {
  const kit=OWNER_OPERATIONS_VISUAL_KIT;
  assert.equal(kit.schema,OWNER_OPERATIONS_VISUAL_KIT_ID);
  assert.equal(kit.publicationState,'DRAFT_ONLY');
  assert.equal(kit.publicPublishAllowed,false);
  assert.equal(kit.renderer,'EXISTING_RESVG_WASM_2_6_2');
  assert.deepEqual(kit.channelsApproved,[]);
  assert.equal(new Set(Object.values(kit.palette)).size,7);
});
test('static public SVG contains no owner data, live metrics, token or claim of rights',()=>{
  const svg=createOperationsPublicTemplateSvg();
  assert.match(svg,/xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg,/KEINE LIVE-DATEN/);
  assert.match(svg,/NOT_PROVEN/);
  assert.doesNotMatch(svg,/\/api\/profile|ownerId|tenantId|RENDER_API_KEY|GITHUB_TOKEN|Bearer|Sven|12\.847|142|87%|stripe_secret/i);
});
test('draft does not self-authorize channels, approvals, source or payment evidence',()=>{
  const draft=createOperationsVisualDraft();
  assert.equal(draft.publicPublishAllowed,false);
  assert.equal(draft.mediaApproval,null);
  assert.equal(draft.assetSha256,null);
  assert.equal(draft.deliveryReceipt,null);
  assert.equal(draft.commercialRights,'NOT_PROVEN');
  assert.equal(draft.sourceRights,'REVIEW_REQUIRED');
});

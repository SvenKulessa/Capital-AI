import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Twenty product activation planning ONLY. This module never sends HTTP requests.
 * A plan is not authorization to execute a REST mutation.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA = /^[a-f0-9]{64}$/;
const API_ORIGIN = 'https://api.twenty.com';
const WORKSPACE = 'https://capital-ai.twenty.com';

function requireMatch(condition, code) { if (!condition) throw Error(code); }
function digest(value) { return createHash('sha256').update(value).digest('hex'); }
function constantTimeHexEqual(a,b) {
  return SHA.test(a ?? '') && SHA.test(b ?? '') &&
    timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
}

/**
 * Creates an inspectable, immutable dry-run intent with no network transport.
 * Fields are taken from an already authenticated, independently approved field
 * inventory. No guessed Twenty product field, status value or record ID.
 */
export function planTwentyProductActivation(input) {
  requireMatch(input && typeof input === 'object', 'TWENTY_ACTIVATION_INPUT_REQUIRED');
  const { workspaceOrigin, apiOrigin, workspaceId, productObjectId, productRecordId,
    productRecordReadback, fieldInventory, activationField, activationValue,
    sourceBytes, sourceSha256, assetBytes, assetSha256, ownerApprovalRef,
    roleEvidenceRef, schemaEvidenceRef, workspaceEvidenceRef, rollbackEvidenceRef,
    rollbackRehearsed, expectedRecordVersion, currentRecordVersion,
    idempotencyReceipt, idempotencyKey } = input;
  requireMatch(workspaceOrigin === WORKSPACE && apiOrigin === API_ORIGIN
    && UUID.test(workspaceId ?? '') && UUID.test(productObjectId ?? '')
    && UUID.test(productRecordId ?? ''), 'TWENTY_IDENTITY_NOT_PROVEN');
  requireMatch(typeof workspaceEvidenceRef === 'string' && workspaceEvidenceRef.length > 10
    && typeof schemaEvidenceRef === 'string' && schemaEvidenceRef.length > 10
    && typeof roleEvidenceRef === 'string' && roleEvidenceRef.length > 10
    && typeof ownerApprovalRef === 'string' && ownerApprovalRef.length > 10,
  'TWENTY_APPROVAL_EVIDENCE_MISSING');
  requireMatch(productRecordReadback && productRecordReadback.id === productRecordId
    && productRecordReadback.workspaceId === workspaceId
    && productRecordReadback.objectMetadataId === productObjectId
    && productRecordReadback.projectId === 'CAPITAL_AI',
  'TWENTY_PRODUCT_IDENTITY_NOT_PROVEN');
  requireMatch(Array.isArray(fieldInventory) && fieldInventory.length > 0
    && fieldInventory.every(f => f && f.objectMetadataId === productObjectId
      && typeof f.name === 'string' && typeof f.type === 'string'
      && f.isActive === true && f.writeAllowed === true),
  'TWENTY_FIELDS_NOT_PROVEN');
  const selected = fieldInventory.filter(f => f.name === activationField);
  requireMatch(selected.length === 1 && selected[0].allowedValues?.includes(activationValue)
    && typeof activationValue === 'string' && activationValue.length > 0,
  'TWENTY_ACTIVATION_FIELD_NOT_PROVEN');
  requireMatch(Buffer.isBuffer(sourceBytes) && Buffer.isBuffer(assetBytes)
    && constantTimeHexEqual(digest(sourceBytes), sourceSha256)
    && constantTimeHexEqual(digest(assetBytes), assetSha256),
  'TWENTY_DIGEST_MISMATCH');
  requireMatch(typeof expectedRecordVersion === 'string' && expectedRecordVersion.length > 0
    && expectedRecordVersion === currentRecordVersion,
  'TWENTY_RECORD_VERSION_CONFLICT');
  requireMatch(productRecordReadback[activationField] !== undefined
    && productRecordReadback[activationField] !== activationValue
    && rollbackRehearsed === true
    && typeof rollbackEvidenceRef === 'string' && rollbackEvidenceRef.length > 10,
  'TWENTY_ROLLBACK_NOT_PROVEN');
  const key = digest(JSON.stringify([
    workspaceId, productObjectId, productRecordId, activationField, activationValue,
    sourceSha256, assetSha256, expectedRecordVersion,
  ]));
  requireMatch(constantTimeHexEqual(key, idempotencyKey)
    && idempotencyReceipt?.status === 'UNUSED'
    && idempotencyReceipt?.key === key
    && idempotencyReceipt?.workspaceId === workspaceId,
  'TWENTY_IDEMPOTENCY_NOT_PROVEN');
  const body = Object.freeze({ [activationField]: activationValue });
  const rollback = Object.freeze({ [activationField]: productRecordReadback[activationField] });
  return Object.freeze({
    contract: 'TWENTY_PRODUCT_ACTIVATION_DRY_RUN@1',
    method: 'PATCH', apiOrigin: API_ORIGIN, path: '/rest/products/' + productRecordId,
    workspaceId, productObjectId, productRecordId, idempotencyKey: key,
    expectedRecordVersion, body, rollback,
    sourceSha256, assetSha256,
    status: 'DRY_RUN_ONLY', writeAllowed: false, executeAllowed: false,
    requiresLiveReadback: true, requiresAtomicIdempotency: true,
    requiresRollbackRecheck: true, commercialRelease: 'HOLD',
  });
}

/** Deterministic key calculation for external ledger preflight. No provider access. */
export function computeTwentyActivationKey({ workspaceId, productObjectId, productRecordId,
  activationField, activationValue, sourceSha256, assetSha256, expectedRecordVersion }) {
  return digest(JSON.stringify([workspaceId,productObjectId,productRecordId,
    activationField,activationValue,sourceSha256,assetSha256,expectedRecordVersion]));
}

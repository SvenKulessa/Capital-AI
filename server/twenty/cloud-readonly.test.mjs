import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  TwentyCloudMetadataReadonlyClient, TWENTY_API_ORIGIN,
  TWENTY_WORKSPACE_ORIGIN, validateTwentyOrigin,
  validateProductsFieldSchema, validateProductEvidence,
} from './cloud-readonly.mjs';

const accessToken = 'synthetic-secret-token-not-real';
const tenantId = '11111111-2222-3333-4444-555555555555';
const productObjectId = '12345678-1234-1234-1234-123456789abc';
const otherObjectId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const fields = [
  { id: 'a1111111-1111-1111-1111-111111111111', objectMetadataId: productObjectId, name: 'name', type: 'TEXT', isActive: true },
  { id: 'a2222222-2222-2222-2222-222222222222', objectMetadataId: productObjectId, name: 'projectId', type: 'TEXT', isActive: true },
  { id: 'a3333333-3333-3333-3333-333333333333', objectMetadataId: productObjectId, name: 'sourceSha256', type: 'TEXT', isActive: true },
];
const expected = { name: 'TEXT', projectId: 'TEXT', sourceSha256: 'TEXT' };
function fixture({
  workspaceId = tenantId, workspaceUrl = TWENTY_WORKSPACE_ORIGIN, objects = [
    { node: { id: productObjectId, nameSingular: 'product', namePlural: 'products' } },
  ], fieldList = fields, pagination = { hasNextPage: false }, status = 200,
  graphqlErrors = null, fieldBody = null, workspaceBody = null,
} = {}) {
  const calls = [];
  const client = new TwentyCloudMetadataReadonlyClient({
    workspaceUrl: TWENTY_WORKSPACE_ORIGIN, accessToken,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      assert.ok(url.startsWith(TWENTY_API_ORIGIN + '/'), 'never call workspace UI or other domain');
      assert.equal(options.redirect, 'error');
      assert.equal(options.headers.Authorization, 'Bearer ' + accessToken);
      assert.equal(options.cache, 'no-store');
      assert.equal(options.method === 'POST' || options.method === 'GET', true);
      const query = options.body && JSON.parse(options.body).query;
      if (query) assert.doesNotMatch(query, /mutation|create[A-Z]|update[A-Z]|delete[A-Z]/i);
      let body;
      if (url.endsWith('/metadata') && query?.includes('currentWorkspace')) {
        body = workspaceBody ?? { data: { currentWorkspace: {
          id: workspaceId, workspaceUrls: { subdomainUrl: workspaceUrl, customUrl: null },
        } } };
      } else if (url.endsWith('/metadata') && query?.includes('objects(')) {
        body = graphqlErrors ? { errors: [{ message: 'not permitted' }] } : { data: { objects: { edges: objects } } };
      } else if (url.endsWith('/rest/metadata/fields?limit=200')) {
        body = fieldBody ?? { fields: fieldList, pageInfo: pagination };
      } else throw Error('unexpected request URL or query');
      return { status, ok: status === 200, text: async () => JSON.stringify(body) };
    },
  });
  return { client, calls };
}

test('fixed UI origin rejects spoofing, path, query, port and embedded credentials', () => {
  assert.equal(validateTwentyOrigin(TWENTY_WORKSPACE_ORIGIN), TWENTY_WORKSPACE_ORIGIN);
  for (const url of [
    'http://capital-ai.twenty.com', 'https://capital-ai.twenty.com.evil.test',
    'https://capital-ai.twenty.com:444', 'https://user:pass@capital-ai.twenty.com',
    'https://capital-ai.twenty.com/settings', 'https://capital-ai.twenty.com/?x=1',
    'https://capital-ai.twenty.com/#fields', 'https://api.twenty.com',
  ]) assert.throws(() => validateTwentyOrigin(url), /BLOCKED/);
});

test('metadata-only readback binds workspace identity and Products object; no field or role approval', async () => {
  const { client, calls } = fixture();
  const result = await client.readProductsObject();
  assert.equal(result.workspaceId, tenantId);
  assert.equal(result.objectId, productObjectId);
  assert.equal(result.workspaceOrigin, TWENTY_WORKSPACE_ORIGIN);
  assert.equal(result.apiOrigin, TWENTY_API_ORIGIN);
  assert.equal(result.fieldsStatus, 'NOT_PROVEN');
  assert.equal(result.roleReadOnlyStatus, 'NOT_PROVEN');
  assert.equal(result.writeAllowed, false);
  assert.equal(result.publicationAllowed, false);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(x => x.url === TWENTY_API_ORIGIN + '/metadata' && x.options.method === 'POST'));
  assert.ok(calls.every(x => !JSON.stringify(x.options.body).includes('/graphql')));
  assert.ok(!JSON.stringify(result).includes(accessToken));
});

test('live-like readback of schema validates types and preserves no-publication', async () => {
  const { client, calls } = fixture();
  const { readback, schema } = await client.readProductsFieldSchema(expected);
  assert.equal(readback.workspaceId, tenantId);
  assert.equal(schema.status, 'SCHEMA_SHAPE_MATCHED_NOT_PERMISSION_PROOF');
  assert.match(schema.fieldsSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(schema.requiredNames, ['name', 'projectId', 'sourceSha256']);
  assert.equal(calls.length, 3);
  assert.equal(calls[2].url, TWENTY_API_ORIGIN + '/rest/metadata/fields?limit=200');
  assert.equal(calls[2].options.method, 'GET');
  assert.ok(calls.every(c => !/\/graphql|\/rest\/(people|companies|products)/.test(c.url)));
  const assetText = 'Originaler Test-Content nur offline';
  const digest = createHash('sha256').update(assetText).digest('hex');
  const source = 'a'.repeat(64);
  const binding = { readback, fieldSchemaEvidence: schema, expectedWorkspaceOrigin: TWENTY_WORKSPACE_ORIGIN,
    expectedObjectId: productObjectId, expectedTenantId: tenantId, projectId: 'CAPITAL_AI',
    assetText, expectedDigest: digest, sourceSha256: source, packageSourceSha256: source };
  const matched = validateProductEvidence(binding);
  assert.equal(matched.status, 'INTERNAL_METADATA_AND_DIGEST_MATCH_ONLY');
  assert.equal(matched.writeAllowed, false);
  assert.equal(matched.commercialRelease, 'HOLD');
  // Readback is in-process authenticated, not a serializable permission or release token.
  for (const [change, failure] of [
    [{ readback: structuredClone(readback) }, /PROVIDER_EVIDENCE_NOT_PROVEN/],
    [{ fieldSchemaEvidence: structuredClone(schema) }, /PROVIDER_EVIDENCE_NOT_PROVEN/],
    [{ expectedWorkspaceOrigin: 'https://evil.example' }, /ORIGIN_BLOCKED/],
    [{ expectedObjectId: otherObjectId }, /OBJECT_ID_MISMATCH/],
    [{ expectedTenantId: otherObjectId }, /TENANT_MISMATCH/],
    [{ expectedTenantId: 'tenant-A' }, /TENANT_MISMATCH/],
    [{ projectId: 'DEVICE_CARE_KI' }, /PROJECT_ISOLATION/],
    [{ expectedDigest: 'f'.repeat(64) }, /DIGEST_MISMATCH/],
    [{ assetText: assetText + ' tampered' }, /DIGEST_MISMATCH/],
    [{ packageSourceSha256: 'b'.repeat(64) }, /DIGEST_MISMATCH/],
  ]) assert.throws(() => validateProductEvidence({ ...binding, ...change }), failure);
});

test('malformed, missing, duplicate, inactive, wrong-object and type-drift fields fail closed', () => {
  const specimen = { objectId: productObjectId, fields, requiredFields: expected };
  for (const change of [
    { fields: [...fields, { ...fields[0], id: otherObjectId }] },
    { fields: fields.map(f => ({ ...f, isActive: false })) },
    { fields: fields.map(f => ({ ...f, objectMetadataId: otherObjectId })) },
    { fields: fields.slice(1) },
    { fields: [{ ...fields[0], type: 'NUMBER' }, ...fields.slice(1)] },
    { requiredFields: { name: 'NUMBER' } },
    { requiredFields: { sourceSha256: 'TEXT', impossible: 'TEXT' } },
    { requiredFields: {} },
    { fields: [] },
  ]) assert.throws(() => validateProductsFieldSchema({ ...specimen, ...change }), /NOT_PROVEN/);
});

test('workspace mismatch, invalid tenant, ambiguous object and incomplete object list fail before field read', async () => {
  for (const change of [
    { workspaceUrl: 'https://capital-ai.twenty.com.attacker.net' },
    { workspaceId: 'not-uuid' },
    { objects: [] },
    { objects: Array(100).fill({ node: { id: otherObjectId, nameSingular: 'other', namePlural: 'others' } }) },
    { objects: Array(2).fill({ node: { id: productObjectId, nameSingular: 'product', namePlural: 'products' } }) },
    { objects: [{ node: { id: 'bad-uuid', nameSingular: 'product', namePlural: 'products' } }] },
    { graphqlErrors: true },
    { status: 403 },
  ]) {
    const { client, calls } = fixture(change);
    await assert.rejects(() => client.readProductsObject(), /TWENTY_/);
    assert.ok(calls.length <= 2);
  }
});

test('field response pagination, invalid payload and foreign-only fields fail closed', async () => {
  for (const change of [
    { pagination: { hasNextPage: true } },
    { pagination: null },
    { fieldBody: { data: { fields } } }, // legacy wrapper is NOT new REST format
    { fieldBody: { fields, pageInfo: {} } },
    { fieldList: fields.map(f => ({ ...f, objectMetadataId: otherObjectId })) },
  ]) {
    const { client } = fixture(change);
    await assert.rejects(() => client.readProductsFieldSchema(expected), /TWENTY_FIELDS_NOT_PROVEN/);
  }
});

test('HTTP failures, GraphQL errors and UTF-8 payload overflow are rejected without leaking secrets', async () => {
  const rejectToken = fixture({ status: 401 });
  await assert.rejects(() => rejectToken.client.readProductsObject(), /HTTP_DENIED/);
  const { client } = new (class {
    constructor() {
      this.client = new TwentyCloudMetadataReadonlyClient({
        workspaceUrl: TWENTY_WORKSPACE_ORIGIN, accessToken,
        fetchImpl: async () => ({ status: 200, ok: true, text: async () => JSON.stringify({ payload: '€'.repeat(90000) }) }),
      });
    }
  })();
  await assert.rejects(() => client.readProductsObject(), /RESPONSE_TOO_LARGE/);
});

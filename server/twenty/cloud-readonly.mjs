import { createHash } from 'node:crypto';

/** Fixed Twenty Cloud metadata-only bridge. No Core API record access or writes. */
export const TWENTY_READBACK_VERSION = 'TWENTY_CLOUD_METADATA_READBACK@2';
export const TWENTY_WORKSPACE_ORIGIN = 'https://capital-ai.twenty.com';
export const TWENTY_API_ORIGIN = 'https://api.twenty.com';
const MAX_BYTES = 262144;
const MAX_OBJECTS = 100;
const MAX_FIELDS = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SHA256 = /^[0-9a-f]{64}$/i;
const READBACKS = new WeakSet();
const SCHEMAS = new WeakMap();

// Twenty official MetadataApiClient example uses objects(filter:{},paging:{first:N}).
// GraphQL POST is a query; no mutations, record endpoints or arbitrary input.
const WORKSPACE_QUERY = 'query CapitalAiWorkspaceIdentity { currentWorkspace { id workspaceUrls { subdomainUrl customUrl } } }';
const OBJECTS_QUERY = 'query CapitalAiProductsMetadata { objects(filter: {}, paging: { first: 100 }) { edges { node { id nameSingular namePlural labelSingular isCustom } } } }';

export function validateTwentyOrigin(input) {
  if (typeof input !== 'string') throw Error('TWENTY_ORIGIN_REQUIRED');
  let url;
  try { url = new URL(input); } catch { throw Error('TWENTY_ORIGIN_INVALID'); }
  if (url.origin !== TWENTY_WORKSPACE_ORIGIN || url.href !== TWENTY_WORKSPACE_ORIGIN + '/'
    || url.username || url.password || url.port) throw Error('TWENTY_ORIGIN_BLOCKED');
  return url.origin;
}

function workspaceMatches(raw) {
  // Workspace URL must be read from the authenticated metadata response.
  if (!raw || !UUID.test(raw.id ?? '') || !raw.workspaceUrls
    || typeof raw.workspaceUrls !== 'object' || Array.isArray(raw.workspaceUrls)) {
    throw Error('TWENTY_WORKSPACE_IDENTITY_NOT_PROVEN');
  }
  const urls = [raw.workspaceUrls.subdomainUrl, raw.workspaceUrls.customUrl]
    .filter(value => typeof value === 'string');
  if (!urls.some(value => {
    try { return validateTwentyOrigin(value) === TWENTY_WORKSPACE_ORIGIN; }
    catch { return false; }
  })) throw Error('TWENTY_WORKSPACE_MISMATCH');
  return raw.id;
}

export function validateProductsFieldSchema({ objectId, fields, requiredFields }) {
  if (!UUID.test(objectId ?? '') || !Array.isArray(fields)
    || fields.length === 0 || fields.length >= MAX_FIELDS
    || !requiredFields || typeof requiredFields !== 'object'
    || Array.isArray(requiredFields) || Object.keys(requiredFields).length === 0) {
    throw Error('TWENTY_FIELDS_NOT_PROVEN');
  }
  const required = Object.entries(requiredFields);
  if (required.length > 12 || required.some(([name, type]) =>
    !/^[a-z][a-zA-Z0-9]{0,79}$/.test(name)
    || !/^[A-Z][A-Z0-9_]{0,39}$/.test(type))) {
    throw Error('TWENTY_FIELD_EXPECTATIONS_INVALID');
  }
  const seenIds = new Set();
  const seenNames = new Set();
  const valid = [];
  for (const field of fields) {
    if (!field || !UUID.test(field.id ?? '') || field.objectMetadataId !== objectId
      || !/^[a-z][a-zA-Z0-9]{0,79}$/.test(field.name ?? '')
      || !/^[A-Z][A-Z0-9_]{0,39}$/.test(field.type ?? '')
      || field.isActive !== true
      || seenIds.has(field.id) || seenNames.has(field.name)) {
      throw Error('TWENTY_FIELDS_NOT_PROVEN');
    }
    seenIds.add(field.id);
    seenNames.add(field.name);
    valid.push({ name: field.name, type: field.type, id: field.id });
  }
  for (const [name, type] of required) {
    if (!valid.some(field => field.name === name && field.type === type)) {
      throw Error('TWENTY_FIELD_MAPPING_NOT_PROVEN');
    }
  }
  const canonical = JSON.stringify(valid.sort((a,b) => a.name.localeCompare(b.name)));
  return Object.freeze({
    status: 'SCHEMA_SHAPE_MATCHED_NOT_PERMISSION_PROOF',
    objectId,
    fieldsSha256: createHash('sha256').update(canonical).digest('hex'),
    requiredNames: Object.freeze(required.map(([name]) => name).sort()),
    writeAllowed: false, publicationAllowed: false, commercialRelease: 'HOLD',
  });
}

/** Consumer may only bind to an in-process readback and its corresponding field inventory. */
export function validateProductEvidence({
  readback, fieldSchemaEvidence, expectedWorkspaceOrigin, expectedObjectId,
  expectedTenantId, projectId, assetText, expectedDigest, sourceSha256, packageSourceSha256,
}) {
  if (!READBACKS.has(readback) || !SCHEMAS.has(fieldSchemaEvidence)
    || SCHEMAS.get(fieldSchemaEvidence) !== readback) throw Error('TWENTY_PROVIDER_EVIDENCE_NOT_PROVEN');
  if (validateTwentyOrigin(expectedWorkspaceOrigin) !== readback.workspaceOrigin) {
    throw Error('TWENTY_WORKSPACE_MISMATCH');
  }
  if (!UUID.test(expectedObjectId ?? '') || expectedObjectId !== readback.objectId
    || expectedObjectId !== fieldSchemaEvidence.objectId) throw Error('TWENTY_OBJECT_ID_MISMATCH');
  if (!UUID.test(expectedTenantId ?? '') || expectedTenantId !== readback.workspaceId) {
    throw Error('TWENTY_TENANT_MISMATCH');
  }
  // This bridge may not grant foreign projects a shared CRM identity or authority.
  if (projectId !== 'CAPITAL_AI') throw Error('TWENTY_PROJECT_ISOLATION');
  if (typeof assetText !== 'string' || assetText.length === 0
    || Buffer.byteLength(assetText, 'utf8') > MAX_BYTES
    || !SHA256.test(expectedDigest ?? '')
    || createHash('sha256').update(assetText, 'utf8').digest('hex') !== expectedDigest.toLowerCase()
    || !SHA256.test(sourceSha256 ?? '') || sourceSha256 !== packageSourceSha256) {
    throw Error('TWENTY_DIGEST_MISMATCH');
  }
  return Object.freeze({
    status: 'INTERNAL_METADATA_AND_DIGEST_MATCH_ONLY', tenantId: readback.workspaceId,
    productObjectId: readback.objectId, fieldsSha256: fieldSchemaEvidence.fieldsSha256,
    writeAllowed: false, publicationAllowed: false, commercialRelease: 'HOLD',
  });
}

export class TwentyCloudMetadataReadonlyClient {
  #token; #fetch; #origin;
  constructor({ workspaceUrl, accessToken, fetchImpl = fetch }) {
    this.#origin = validateTwentyOrigin(workspaceUrl);
    if (typeof accessToken !== 'string' || accessToken.length < 12 || accessToken.length > 4096) throw Error('TWENTY_AUTH_NOT_CONNECTED');
    if (typeof fetchImpl !== 'function') throw Error('TWENTY_TRANSPORT_INVALID');
    this.#token = accessToken;
    this.#fetch = fetchImpl;
  }
  async #read(path, query) {
    let response;
    try {
      response = await this.#fetch(TWENTY_API_ORIGIN + path, {
        method: query ? 'POST' : 'GET', redirect: 'error', cache: 'no-store',
        headers: {
          Authorization: 'Bearer ' + this.#token,
          Accept: 'application/json',
          ...(query ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(query ? { body: JSON.stringify({ query }) } : {}),
        signal: AbortSignal.timeout(10000),
      });
    } catch { throw Error('TWENTY_TRANSPORT_FAILED'); }
    if (!response || response.status !== 200 || response.ok !== true) throw Error('TWENTY_HTTP_DENIED');
    // Bound provider bytes while streaming; response.text() would allocate the entire
    // untrusted response before MAX_BYTES can be enforced.
    let body;
    try {
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (!(value instanceof Uint8Array)) throw Error('TWENTY_BODY_FAILED');
            size += value.byteLength;
            if (size > MAX_BYTES) throw Error('TWENTY_RESPONSE_TOO_LARGE');
            chunks.push(Buffer.from(value));
          }
          body = Buffer.concat(chunks, size).toString('utf8');
        } catch (error) {
          try { await reader.cancel(); } catch {}
          throw error;
        } finally {
          reader.releaseLock();
        }
      } else {
        // Synthetic provider fixtures may expose only text(); retain compatibility.
        body = await response.text();
      }
    } catch (error) {
      if (error?.message === 'TWENTY_RESPONSE_TOO_LARGE') throw error;
      throw Error('TWENTY_BODY_FAILED');
    }
    if (typeof body !== 'string' || Buffer.byteLength(body, 'utf8') > MAX_BYTES) throw Error('TWENTY_RESPONSE_TOO_LARGE');
    let parsed;
    try { parsed = JSON.parse(body); } catch { throw Error('TWENTY_JSON_INVALID'); }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)
      || (Array.isArray(parsed.errors) && parsed.errors.length > 0)) throw Error('TWENTY_METADATA_NOT_PROVEN');
    return parsed;
  }
  async readProductsObject() {
    const workspace = await this.#read('/metadata', WORKSPACE_QUERY);
    const workspaceId = workspaceMatches(workspace.data?.currentWorkspace);
    const objects = await this.#read('/metadata', OBJECTS_QUERY);
    const edges = objects.data?.objects?.edges;
    if (!Array.isArray(edges) || edges.length >= MAX_OBJECTS) throw Error('TWENTY_METADATA_INCOMPLETE');
    const matches = edges.filter(e => e?.node?.namePlural === 'products' && e.node.nameSingular === 'product');
    if (matches.length !== 1 || !UUID.test(matches[0].node.id ?? '')) throw Error('TWENTY_PRODUCTS_NOT_PROVEN');
    const result = Object.freeze({
      contractVersion: TWENTY_READBACK_VERSION, workspaceOrigin: this.#origin, apiOrigin: TWENTY_API_ORIGIN,
      workspaceId, objectId: matches[0].node.id, objectName: 'products', objectMetadata: 'DISCOVERED',
      fieldsStatus: 'NOT_PROVEN', recordsStatus: 'NOT_READ', mappingStatus: 'BLOCKED',
      roleReadOnlyStatus: 'NOT_PROVEN', writeAllowed: false, publicationAllowed: false, commercialRelease: 'HOLD',
    });
    READBACKS.add(result);
    return result;
  }
  async readProductsFieldSchema(requiredFields) {
    // Metadata REST format is workspace/version-dependent. Unsupported shapes fail closed.
    const readback = await this.readProductsObject();
    const raw = await this.#read('/rest/metadata/fields?limit=200');
    if (raw.pageInfo?.hasNextPage !== false || !Array.isArray(raw.fields)
      || raw.fields.length >= MAX_FIELDS) throw Error('TWENTY_FIELDS_NOT_PROVEN');
    // The API can return metadata for all objects; isolate the one proven Products object.
    const fields = raw.fields.filter(f => f?.objectMetadataId === readback.objectId);
    const schema = validateProductsFieldSchema({ objectId: readback.objectId, fields, requiredFields });
    SCHEMAS.set(schema, readback);
    return Object.freeze({ readback, schema });
  }
}

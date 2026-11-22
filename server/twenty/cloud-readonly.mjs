/** Twenty Cloud metadata-only readback. No CRM record reads or writes. */
export const TWENTY_READBACK_VERSION = 'TWENTY_CLOUD_METADATA_READBACK@1';
export const TWENTY_WORKSPACE_ORIGIN = 'https://capital-ai.twenty.com';
const MAX_BYTES = 262144;
const OBJECTS_QUERY = 'query CapitalAiProductsMetadata { objects(filter: {}, paging: { first: 100 }) { edges { node { id nameSingular namePlural labelSingular isCustom } } } }';
export function validateTwentyOrigin(input) {
  if (typeof input !== 'string') throw Error('TWENTY_ORIGIN_REQUIRED');
  let url;
  try { url = new URL(input); } catch { throw Error('TWENTY_ORIGIN_INVALID'); }
  if (url.origin !== TWENTY_WORKSPACE_ORIGIN || url.href !== TWENTY_WORKSPACE_ORIGIN + '/'
    || url.username || url.password || url.port) throw Error('TWENTY_ORIGIN_BLOCKED');
  return url.origin;
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
  async readProductsObject() {
    let response;
    try {
      response = await this.#fetch(this.#origin + '/metadata', {
        method: 'POST', redirect: 'error', cache: 'no-store',
        headers: { Authorization: 'Bearer ' + this.#token, Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: OBJECTS_QUERY }), signal: AbortSignal.timeout(10000),
      });
    } catch { throw Error('TWENTY_TRANSPORT_FAILED'); }
    if (!response || response.status !== 200 || response.ok !== true) throw Error('TWENTY_HTTP_DENIED');
    let body;
    try { body = await response.text(); } catch { throw Error('TWENTY_BODY_FAILED'); }
    if (typeof body !== 'string' || Buffer.byteLength(body, 'utf8') > MAX_BYTES) throw Error('TWENTY_RESPONSE_TOO_LARGE');
    let parsed;
    try { parsed = JSON.parse(body); } catch { throw Error('TWENTY_JSON_INVALID'); }
    if (!parsed || typeof parsed !== 'object' || (Array.isArray(parsed.errors) && parsed.errors.length)
      || !Array.isArray(parsed.data?.objects?.edges)) throw Error('TWENTY_METADATA_NOT_PROVEN');
    const edges = parsed.data.objects.edges;
    if (edges.length > 100) throw Error('TWENTY_METADATA_INCOMPLETE');
    const matches = edges.filter(e => e?.node?.namePlural === 'products' && e.node.nameSingular === 'product');
    if (matches.length !== 1 || typeof matches[0].node.id !== 'string'
      || !/^[0-9a-f-]{36}$/i.test(matches[0].node.id)) throw Error('TWENTY_PRODUCTS_NOT_PROVEN');
    return Object.freeze({
      contractVersion: TWENTY_READBACK_VERSION, workspaceOrigin: this.#origin,
      objectId: matches[0].node.id, objectName: 'products', objectMetadata: 'DISCOVERED',
      fieldsStatus: 'NOT_PROVEN', recordsStatus: 'NOT_READ', mappingStatus: 'BLOCKED',
      writeAllowed: false, publicationAllowed: false, commercialRelease: 'HOLD',
    });
  }
}

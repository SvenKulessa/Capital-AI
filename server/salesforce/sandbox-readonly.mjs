import { createHash } from 'node:crypto';

/** Strictly read-only Salesforce sandbox Product2/PricebookEntry adapter. */
export const SALESFORCE_SANDBOX_READBACK_VERSION = 'SALESFORCE_SANDBOX_PRODUCT_READBACK@1';
const MAX_RESPONSE_BYTES = 2_000_000;
const ID_RE = /^[a-zA-Z0-9]{15}(?:[a-zA-Z0-9]{3})?$/;
const SANDBOX_HOST_RE = /^[a-z0-9-]+--[a-z0-9-]+\.sandbox\.my\.salesforce\.com$/;
const VERIFIED_READ = Symbol('in-process-provider-readback');

export function validateSandboxInstanceUrl(raw) {
  if (typeof raw !== 'string') throw Error('SALESFORCE_SANDBOX_URL_REQUIRED');
  let url;
  try { url = new URL(raw); } catch { throw Error('SALESFORCE_SANDBOX_URL_INVALID'); }
  if (url.protocol !== 'https:' || !SANDBOX_HOST_RE.test(url.hostname)
      || url.port || url.username || url.password || url.pathname !== '/'
      || url.search || url.hash) {
    throw Error('SALESFORCE_SANDBOX_ORIGIN_BLOCKED');
  }
  return url.origin;
}

export function salesforceProductCode(projectId, productId) {
  if (!['CAPITAL_AI', 'DEVICE_CARE_KI'].includes(projectId)
      || typeof productId !== 'string'
      || !/^[a-z0-9][a-z0-9-]{2,79}$/.test(productId)) {
    throw Error('SALESFORCE_PRODUCT_IDENTITY_INVALID');
  }
  return projectId + ':' + productId;
}

function checkQueryPage(raw, maxRecords) {
  if (!raw || typeof raw !== 'object' || raw.done !== true || !Array.isArray(raw.records)
      || raw.records.length > maxRecords) throw Error('SALESFORCE_READBACK_INCOMPLETE');
  return raw.records;
}

function validateDescribe(raw, objectName, needed, filterField = null) {
  if (!raw || raw.name !== objectName || raw.queryable !== true || !Array.isArray(raw.fields)) {
    throw Error('SALESFORCE_FIELD_DESCRIBE_UNAVAILABLE');
  }
  const fields = new Map(raw.fields.filter(f => f && typeof f.name === 'string').map(f => [f.name, f]));
  if (needed.some(f => !fields.has(f)) || (filterField && fields.get(filterField)?.filterable !== true)) {
    throw Error('SALESFORCE_REQUIRED_FIELD_MISSING');
  }
  return {
    object: objectName, queryable: true, readFields: needed, filterableBy: filterField,
    availableOptionalFields: ['CurrencyIsoCode'].filter(f => fields.has(f)),
    writeAllowed: false,
  };
}

function safeId(value) {
  if (typeof value !== 'string' || !ID_RE.test(value)) throw Error('SALESFORCE_RECORD_ID_INVALID');
  return value;
}

export class SalesforceSandboxReadonlyClient {
  #origin;
  #apiVersion;
  #token;
  #fetch;

  constructor({ instanceUrl, apiVersion, accessToken, fetchImpl = fetch }) {
    this.#origin = validateSandboxInstanceUrl(instanceUrl);
    if (typeof apiVersion !== 'string' || !/^v[5-9][0-9]\.0$/.test(apiVersion)) {
      throw Error('SALESFORCE_API_VERSION_INVALID');
    }
    if (typeof accessToken !== 'string' || accessToken.length < 10 || accessToken.length > 4096) {
      throw Error('SALESFORCE_AUTH_NOT_CONNECTED');
    }
    if (typeof fetchImpl !== 'function') throw Error('SALESFORCE_TRANSPORT_INVALID');
    this.#apiVersion = apiVersion;
    this.#token = accessToken;
    this.#fetch = fetchImpl;
  }

  async #read(path) {
    const url = this.#origin + '/services/data/' + this.#apiVersion + path;
    let response;
    try {
      response = await this.#fetch(url, {
        method: 'GET', redirect: 'error', cache: 'no-store',
        headers: { Accept: 'application/json', Authorization: 'Bearer ' + this.#token },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw Error('SALESFORCE_READBACK_TRANSPORT_FAILED');
    }
    if (!response || !response.ok || response.status !== 200) {
      throw Error('SALESFORCE_READBACK_HTTP_DENIED');
    }
    let raw;
    try { raw = await response.text(); } catch { throw Error('SALESFORCE_READBACK_BODY_FAILED'); }
    if (typeof raw !== 'string' || raw.length > MAX_RESPONSE_BYTES) throw Error('SALESFORCE_READBACK_TOO_LARGE');
    try { return JSON.parse(raw); } catch { throw Error('SALESFORCE_READBACK_JSON_INVALID'); }
  }

  #query(soql) {
    // No public arbitrary SOQL interface; only internally constructed SELECTs.
    return this.#read('/query?q=' + encodeURIComponent(soql));
  }

  async readProduct({ projectId, productId, productName }) {
    const expectedCode = salesforceProductCode(projectId, productId);
    if (typeof productName !== 'string' || productName.length < 3 || productName.length > 120) {
      throw Error('SALESFORCE_PRODUCT_NAME_INVALID');
    }

    // The host alone is insufficient: prove Organization.IsSandbox=true.
    const orgs = checkQueryPage(await this.#query('SELECT Id, IsSandbox FROM Organization LIMIT 2'), 2);
    if (orgs.length !== 1 || orgs[0]?.IsSandbox !== true) throw Error('SALESFORCE_ORG_NOT_VERIFIED_SANDBOX');
    const orgId = safeId(orgs[0].Id);

    const productFields = ['Id', 'Name', 'ProductCode', 'IsActive'];
    const productMapping = validateDescribe(
      await this.#read('/sobjects/Product2/describe'), 'Product2', productFields, 'ProductCode',
    );
    const productRows = checkQueryPage(await this.#query(
      'SELECT ' + productFields.join(', ') + ' FROM Product2 WHERE ProductCode = \'' + expectedCode + '\' LIMIT 2',
    ), 2);
    if (productRows.length > 1) throw Error('SALESFORCE_PRODUCT_CODE_AMBIGUOUS');
    if (productRows.length === 0) {
      return Object.freeze({
        contractVersion: SALESFORCE_SANDBOX_READBACK_VERSION,
        scope: 'SANDBOX_ONLY', source: 'LIVE_SANDBOX_GET', status: 'NOT_FOUND',
        organizationId: orgId, projectId, productId, expectedCode, product: null,
        fieldMapping: [productMapping], pricebookEntries: [], pricebookStatus: 'NOT_PROVEN',
        writeAllowed: false, [VERIFIED_READ]: true,
      });
    }
    const record = productRows[0];
    const crmId = safeId(record.Id);
    if (record.ProductCode !== expectedCode || typeof record.Name !== 'string'
        || typeof record.IsActive !== 'boolean') {
      throw Error('SALESFORCE_PRODUCT_IDENTITY_MISMATCH');
    }
    const identityStatus = record.Name === productName && record.IsActive === true
      ? 'MATCHED' : 'REVIEW_REQUIRED';

    const priceFields = ['Id', 'Product2Id', 'Pricebook2Id', 'UnitPrice', 'IsActive'];
    const priceMapping = validateDescribe(
      await this.#read('/sobjects/PricebookEntry/describe'), 'PricebookEntry', priceFields, 'Product2Id',
    );
    if (priceMapping.availableOptionalFields.includes('CurrencyIsoCode')) priceFields.push('CurrencyIsoCode');
    const priceRows = checkQueryPage(await this.#query(
      'SELECT ' + priceFields.join(', ') + ' FROM PricebookEntry WHERE Product2Id = \'' + crmId + '\' LIMIT 25',
    ), 25);
    const entries = priceRows.map(entry => {
      if (entry.Product2Id !== crmId || typeof entry.IsActive !== 'boolean'
          || typeof entry.UnitPrice !== 'number' || !Number.isFinite(entry.UnitPrice) || entry.UnitPrice < 0) {
        throw Error('SALESFORCE_PRICEBOOK_IDENTITY_INVALID');
      }
      return {
        id: safeId(entry.Id), pricebookId: safeId(entry.Pricebook2Id),
        unitPrice: entry.UnitPrice,
        currencyIsoCode: typeof entry.CurrencyIsoCode === 'string' ? entry.CurrencyIsoCode : null,
        isActive: entry.IsActive,
      };
    });
    const digest = createHash('sha256').update(JSON.stringify({
      orgId, crmId, code: expectedCode, name: record.Name, active: record.IsActive, entries,
    })).digest('hex');
    return Object.freeze({
      contractVersion: SALESFORCE_SANDBOX_READBACK_VERSION,
      scope: 'SANDBOX_ONLY', source: 'LIVE_SANDBOX_GET', status: identityStatus,
      organizationId: orgId, projectId, productId, expectedCode,
      product: { id: crmId, name: record.Name, productCode: record.ProductCode, isActive: record.IsActive },
      fieldMapping: [productMapping, priceMapping], pricebookEntries: entries,
      pricebookStatus: entries.length ? 'READBACK_PRESENT' : 'EMPTY',
      providerReadbackSha256: digest, writeAllowed: false, [VERIFIED_READ]: true,
    });
  }
}

/** An internal in-memory join only; does not write Salesforce or grant publication rights. */
export function mapApprovedSalesContentToSandboxProduct(bundle, readback) {
  if (!readback || readback[VERIFIED_READ] !== true || readback.status !== 'MATCHED'
      || readback.scope !== 'SANDBOX_ONLY' || readback.writeAllowed !== false) {
    throw Error('SALESFORCE_VERIFIED_SANDBOX_MATCH_REQUIRED');
  }
  const product = bundle?.crmDraft?.product;
  if (!product || product.projectId !== readback.projectId || product.productId !== readback.productId
      || product.name !== readback.product?.name || readback.product?.productCode !== readback.expectedCode
      || bundle.crmDraft.writeAllowed !== false || bundle.commercialRelease !== 'HOLD') {
    throw Error('SALESFORCE_CONTENT_PRODUCT_IDENTITY_MISMATCH');
  }
  const asset = bundle.asset;
  if (!asset || !/^[a-f0-9]{64}$/.test(asset.sha256)
      || createHash('sha256').update(asset.text, 'utf8').digest('hex') !== asset.sha256
      || !bundle.socialPackage || bundle.socialPackage.assets.length !== 1
      || bundle.socialPackage.assets[0].sha256 !== asset.sha256
      || bundle.socialPackage.sourceSha !== bundle.sourceSha256) {
    throw Error('SALESFORCE_CONTENT_ASSET_DIGEST_MISMATCH');
  }
  const approval = bundle.socialPackage.approvals.find(a =>
    a.assetId === bundle.socialPackage.assets[0].assetId
    && a.assetSha256 === asset.sha256 && a.publicPublishAllowed === true
  );
  const internalLinkAllowed = bundle.rights.status === 'VERIFIED'
    && typeof bundle.rights.evidenceRef === 'string' && Boolean(approval);
  return {
    schema: 'CRM_CONTENT_PRODUCT_BINDING@1',
    status: internalLinkAllowed ? 'APPROVED_INTERNAL_DRAFT_LINK' : 'HOLD_EDITORIAL_OR_RIGHTS',
    projectId: readback.projectId, productId: readback.productId,
    salesforce: {
      environment: 'SANDBOX', orgId: readback.organizationId, product2Id: readback.product.id,
      productCode: readback.expectedCode, readbackSha256: readback.providerReadbackSha256,
    },
    asset: {
      contentId: asset.contentId, textSha256: asset.sha256, sourceSha256: bundle.sourceSha256,
    },
    binding: internalLinkAllowed ? {
      product2Id: readback.product.id, contentId: asset.contentId,
      assetSha256: asset.sha256, rightsEvidenceRef: bundle.rights.evidenceRef,
      approvalRef: approval.approvalRef,
    } : null,
    writeAllowed: false, publicationAllowed: false, commercialRelease: 'HOLD',
  };
}

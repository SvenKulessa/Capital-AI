import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import {
  SalesforceSandboxReadonlyClient, salesforceProductCode,
  validateSandboxInstanceUrl, mapApprovedSalesContentToSandboxProduct,
} from './sandbox-readonly.mjs';

const host = 'https://owner--dev.sandbox.my.salesforce.com';
const orgId = '00D123456789012AAA';
const product2Id = '01t123456789012AAA';
const pricebookId = '01s123456789012AAA';
const entryId = '01u123456789012AAA';
const productCode = 'CAPITAL_AI:crm-bridge-product';
const fields = names => names.map(name => ({ name, filterable: true }));
const page = records => ({ done: true, records, totalSize: records.length });

function transport({ isSandbox = true, products = null, responseStatus = 200, incomplete = false } = {}) {
  const calls = [];
  const productsReturned = products ?? [{
    Id: product2Id, ProductCode: productCode, Name: 'CRM Bridge Product', IsActive: true,
  }];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    let body;
    if (url.includes('/sobjects/Product2/describe')) {
      body = { name: 'Product2', queryable: true, fields: fields(['Id','Name','ProductCode','IsActive']) };
    } else if (url.includes('/sobjects/PricebookEntry/describe')) {
      body = { name: 'PricebookEntry', queryable: true,
        fields: fields(['Id','Product2Id','Pricebook2Id','UnitPrice','IsActive','CurrencyIsoCode']) };
    } else if (url.includes('/query')) {
      const soql = new URL(url).searchParams.get('q');
      if (soql.includes('FROM Organization')) body = page([{ Id: orgId, IsSandbox: isSandbox }]);
      else if (soql.includes('FROM Product2')) body = { ...page(productsReturned), done: !incomplete };
      else if (soql.includes('FROM PricebookEntry')) body = page([{
        Id: entryId, Product2Id: product2Id, Pricebook2Id: pricebookId,
        UnitPrice: 25.5, CurrencyIsoCode: 'EUR', IsActive: true,
      }]);
      else throw Error('unexpected SOQL');
    } else throw Error('unexpected path');
    return { status: responseStatus, ok: responseStatus === 200,
      text: async () => JSON.stringify(body) };
  };
  return { calls, fetchImpl };
}

const credentials = {
  instanceUrl: host, apiVersion: 'v66.0', accessToken: 'synthetic-fixture-not-a-token',
};
const product = {
  projectId:'CAPITAL_AI', productId:'crm-bridge-product', productName:'CRM Bridge Product',
};

test('blocks production, malicious host, URL credentials and arbitrary product codes', () => {
  assert.equal(validateSandboxInstanceUrl(host + '/'), host);
  for (const url of [
    'https://login.salesforce.com/', 'https://test.salesforce.com/',
    'https://owner.my.salesforce.com/',
    'https://owner--dev.sandbox.my.salesforce.com.evil.test/',
    'https://owner--dev.sandbox.my.salesforce.com:8080/',
    'https://user:pass@owner--dev.sandbox.my.salesforce.com/',
    'https://owner--dev.sandbox.my.salesforce.com/?token=abc',
    'http://owner--dev.sandbox.my.salesforce.com/',
  ]) assert.throws(() => validateSandboxInstanceUrl(url), /BLOCKED/);
  assert.throws(() => salesforceProductCode('OTHER', 'product'), /IDENTITY/);
  assert.throws(() => salesforceProductCode('CAPITAL_AI', "a' OR 1=1"), /IDENTITY/);
});

test('GET-only sandbox readback proves org, field mapping and exact ProductCode', async () => {
  const mock = transport();
  const client = new SalesforceSandboxReadonlyClient({ ...credentials, fetchImpl: mock.fetchImpl });
  const result = await client.readProduct(product);
  assert.equal(result.status, 'MATCHED');
  assert.equal(result.scope, 'SANDBOX_ONLY');
  assert.equal(result.product.id, product2Id);
  assert.equal(result.pricebookEntries[0].unitPrice, 25.5);
  assert.equal(result.fieldMapping[0].filterableBy, 'ProductCode');
  assert.equal(result.writeAllowed, false);
  assert.equal(mock.calls.length, 5);
  assert.ok(new URL(mock.calls[0].url).searchParams.get('q').includes('FROM Organization'));
  assert.ok(mock.calls.every(x => x.options.method === 'GET' && x.options.redirect === 'error'));
  assert.ok(mock.calls.every(x => x.url.startsWith(host + '/services/data/v66.0/')));
  const qs = mock.calls.map(x => new URL(x.url).searchParams.get('q')).filter(Boolean);
  assert.ok(qs.find(s => s.includes("ProductCode = 'CAPITAL_AI:crm-bridge-product'")));
  assert.ok(!qs.some(s => /Account|Contact|Lead|Opportunity/.test(s)));
});

test('production org, duplicates, incomplete pages and unauthorized HTTP fail closed', async () => {
  const wrongOrg = transport({ isSandbox:false });
  await assert.rejects(() => new SalesforceSandboxReadonlyClient({
    ...credentials, fetchImpl: wrongOrg.fetchImpl,
  }).readProduct(product), /ORG_NOT_VERIFIED/);
  assert.equal(wrongOrg.calls.length, 1);
  const duplicates = transport({ products:[
    { Id: product2Id, ProductCode: productCode, Name:'CRM Bridge Product', IsActive:true },
    { Id:'01t123456789013AAA', ProductCode: productCode, Name:'CRM Bridge Product', IsActive:true },
  ] });
  await assert.rejects(() => new SalesforceSandboxReadonlyClient({
    ...credentials, fetchImpl: duplicates.fetchImpl,
  }).readProduct(product), /AMBIGUOUS/);
  const incomplete = transport({ incomplete:true });
  await assert.rejects(() => new SalesforceSandboxReadonlyClient({
    ...credentials, fetchImpl: incomplete.fetchImpl,
  }).readProduct(product), /INCOMPLETE/);
  const noProduct = transport({ products:[] });
  const missing = await new SalesforceSandboxReadonlyClient({
    ...credentials, fetchImpl: noProduct.fetchImpl,
  }).readProduct(product);
  assert.equal(missing.status,'NOT_FOUND');
  assert.equal(missing.product,null);
  const failed = transport({ responseStatus:403 });
  await assert.rejects(() => new SalesforceSandboxReadonlyClient({
    ...credentials, fetchImpl:failed.fetchImpl,
  }).readProduct(product), /HTTP_DENIED/);
});

test('no synthetic approval: forged readback and tampered asset hashes are blocked', async () => {
  const mock = transport();
  const readback = await new SalesforceSandboxReadonlyClient({
    ...credentials, fetchImpl:mock.fetchImpl,
  }).readProduct(product);
  const assetText = 'Verifizierter Produkttext (nur Testfixture)';
  const sha = createHash('sha256').update(assetText).digest('hex');
  const makeBundle = ({rightsStatus='NOT_PROVEN', approvals=[]} = {}) => ({
    sourceSha256:'c'.repeat(64),
    rights: { status:rightsStatus, evidenceRef:rightsStatus === 'VERIFIED'?'synthetic:rights':null },
    crmDraft: {
      writeAllowed:false,
      product:{ projectId:product.projectId, productId:product.productId, name:product.productName },
    },
    asset: { contentId:'crm-bridge-product-sales-draft',sha256:sha,text:assetText },
    socialPackage: {
      sourceSha:'c'.repeat(64),assets:[{assetId:'asset1',sha256:sha}],approvals,
    },
    commercialRelease: 'HOLD',
  });
  const waiting = mapApprovedSalesContentToSandboxProduct(makeBundle(), readback);
  assert.equal(waiting.status,'HOLD_EDITORIAL_OR_RIGHTS');
  assert.equal(waiting.binding,null);
  const approved = mapApprovedSalesContentToSandboxProduct(makeBundle({
    rightsStatus:'VERIFIED', approvals:[{
      assetId:'asset1', assetSha256:sha,
      approvalRef:'synthetic:approval', publicPublishAllowed:true,
    }],
  }),readback);
  assert.equal(approved.status,'APPROVED_INTERNAL_DRAFT_LINK');
  assert.equal(approved.binding.product2Id,product2Id);
  assert.equal(approved.writeAllowed,false);
  assert.equal(approved.publicationAllowed,false);
  assert.equal(approved.commercialRelease,'HOLD');
  assert.throws(() => mapApprovedSalesContentToSandboxProduct(
    makeBundle(), JSON.parse(JSON.stringify(readback)),
  ), /VERIFIED_SANDBOX_MATCH/);
  const corrupted = makeBundle({rightsStatus:'VERIFIED'});
  corrupted.asset.sha256 = 'f'.repeat(64);
  assert.throws(() => mapApprovedSalesContentToSandboxProduct(
    corrupted,readback,
  ), /DIGEST_MISMATCH/);
});

test('rejects multibyte UTF-8 Salesforce payloads exceeding byte limit', async () => {
  const payload = JSON.stringify({ records: ['€'.repeat(700_000)] });
  assert.ok(payload.length < 2_000_000);
  assert.ok(Buffer.byteLength(payload, 'utf8') > 2_000_000);
  const client = new SalesforceSandboxReadonlyClient({
    ...credentials,
    fetchImpl: async () => ({ status: 200, ok: true, text: async () => payload }),
  });
  await assert.rejects(() => client.readProduct(product), /READBACK_TOO_LARGE/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { createHash, createHmac } from 'node:crypto';
import { createBlueprintCommerce, verifyBlueprintWebhookSignature } from './blueprint-commerce.mjs';

const userId = '00000000-0000-4000-8000-000000000001';
const otherUserId = '00000000-0000-4000-8000-000000000002';
const sku = 'CAP-BP-001';
const priceId = 'price_1UPoyMPKr4joNbEcbHllSBQ5';
const productId = 'prod_VQPRXoyoJLA17V';
const body = { sku, licenseeName: 'Beispiel GmbH', licenseVersion: '1.0.0', licenseAccepted: true, immediateDeliveryConsent: true, withdrawalLossAcknowledged: true };
const env = { STRIPE_SECRET_KEY: 'sk_live_fixture', STRIPE_BLUEPRINT_WEBHOOK_SECRET: 'whsec_fixture_long_enough', STRIPE_BLUEPRINT_CHECKOUT_ENABLED: 'true', STRIPE_BLUEPRINT_TAX_ENABLED: 'true', SUPABASE_URL: 'https://fixture.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_fixture_long_enough_123456789', PUBLIC_BASE_URL: 'https://capital-ai.online', SMTP_HOST:'smtp.example.org', SMTP_USER:'billing@example.org', SMTP_PASSWORD:'fixture_not_a_real_password' };
const makeAuth = (id = userId, sameOrigin = true) => ({ verify: async () => id ? ({ userId: id, email: 'buyer@example.org', emailVerified: true }) : null, sameOrigin: () => sameOrigin });
const httpResponse = () => ({ statusCode: null, headers: {}, payload: null, data: null, setHeader(k, v) { this.headers[k] = v; }, writeHead(code, headers) { this.statusCode = code; Object.assign(this.headers, headers); }, end(data) { this.data = data; } });
const json = (res, status, data) => { res.statusCode = status; res.payload = data; };
const req = (method, data, headers = {}) => Object.assign(Readable.from(data === undefined ? [] : [Buffer.from(typeof data === 'string' ? data : JSON.stringify(data))]), { method, headers: { 'content-type': 'application/json', ...headers } });
const url = suffix => new URL(`https://capital-ai.online/api/billing/blueprints/${suffix}`);
const response = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
const item = { id: productId, active: true, default_price: priceId, tax_code: 'txcd_10503000', metadata: { license_version: '1.0.0' } };
const price = { id: priceId, active: true, currency: 'eur', unit_amount: 5000, product: productId, type: 'one_time', recurring: null, tax_behavior: 'exclusive' };
const session = { id: 'cs_live_fixture_12345678', client_reference_id: userId, metadata: {
  sku, user_id: userId, account_email: 'buyer@example.org', release_version: '1.0.0', license_version: '1.0.0', licensee_name: 'Beispiel GmbH', license_accepted: 'true', immediate_delivery_consent: 'true', withdrawal_loss_acknowledged: 'true',
}, status: 'complete', mode: 'payment', payment_status: 'paid', currency: 'eur', amount_subtotal: 5000, amount_total: 5950, total_details: { amount_tax: 950 }, livemode: true, payment_intent: 'pi_live_fixture_12345', automatic_tax: { enabled: true, status: 'complete' } };
const lineItems = { data: [{ quantity: 1, price }], has_more: false };
const captured = [];
const mailSent = [];
async function fakeMailer(mail) { mailSent.push(mail); return { accepted: [mail.to], rejected: [] }; }
function fixtureFetch(endpoint, options) {
  captured.push({ endpoint: String(endpoint), method: options?.method || 'GET', body: options?.body });
  if (String(endpoint).includes('/rest/v1/rpc/')) {
    const input = JSON.parse(options.body);
    if (input._action === 'readiness') return Promise.resolve(response({ ready: true, sha256: 'a'.repeat(64) }));
    if (input._action === 'access') return Promise.resolve(response([]));
    if (input._action === 'fulfill') return Promise.resolve(response({ granted: true, status: 'paid' }));
    if (input._action === 'confirmation_claim') return Promise.resolve(response({ claimed: true, alreadySent: false }));
    if (input._action === 'confirmation_sent') return Promise.resolve(response({ sent: true }));
    if (input._action === 'confirmation_release') return Promise.resolve(response({ released: true }));
    if (input._action === 'download') return Promise.resolve(response({ entitled: false }));
    if (input._action === 'revoke') return Promise.resolve(response({ revoked: 1 }));
  }
  if (String(endpoint).includes('/payment_intents/')) return Promise.resolve(response({ id: session.payment_intent, status: 'succeeded', currency: 'eur', amount_received: 5950, latest_charge: 'ch_live_12345' }));
  if (String(endpoint).includes('/prices/')) return Promise.resolve(response(price));
  if (String(endpoint).includes('/products/')) return Promise.resolve(response(item));
  if (String(endpoint).endsWith('/line_items?limit=2')) return Promise.resolve(response(lineItems));
  if (String(endpoint).includes('/checkout/sessions/') && (options?.method || 'GET') === 'GET') return Promise.resolve(response(session));
  if (String(endpoint).endsWith('/checkout/sessions')) return Promise.resolve(response({ id: session.id, mode: 'payment', livemode: true, url: 'https://checkout.stripe.com/c/pay/cs_live_fixture' }));
  if (String(endpoint).includes('/charges/')) return Promise.resolve(response({ payment_intent: session.payment_intent, paid: true, refunded: false, amount_refunded: 0, amount: 5950, disputed: false }));
  throw new Error(`unexpected_fixture_route: ${endpoint}`);
}
async function handle(suffix, method = 'GET', input, { config = env, auth = makeAuth(), fetchImpl = fixtureFetch, headers = {}, sendMailImpl = fakeMailer } = {}) {
  const service = createBlueprintCommerce({ env: config, auth, fetchImpl, sendMailImpl });
  const res = httpResponse();
  const wasHandled = await service.handle(req(method, input, headers), res, url(suffix), json);
  assert.equal(wasHandled, true);
  return res;
}

function sign(body, now = Date.now()) {
  const ts = Math.floor(now / 1000);
  const raw = Buffer.from(body);
  const sig = createHmac('sha256', env.STRIPE_BLUEPRINT_WEBHOOK_SECRET).update(`${ts}.`).update(raw).digest('hex');
  return `t=${ts},v1=${sig}`;
}

test('public offer is fail-closed when commerce is disabled', async () => {
  const r = await handle('offer', 'GET', undefined, { config: { ...env, STRIPE_BLUEPRINT_CHECKOUT_ENABLED: 'false' } });
  assert.equal(r.statusCode, 200);
  assert.equal(r.payload.checkoutEnabled, false);
  assert.equal(r.payload.products.length, 2);
  assert.equal(r.payload.products[0].taxBehavior, 'exclusive');
});
test('checkout requires authenticated same-origin, independent license and withdrawal acknowledgments', async () => {
  assert.equal((await handle('checkout', 'POST', body, { auth: makeAuth(userId, false) })).statusCode, 403);
  assert.equal((await handle('checkout', 'POST', body, { auth: makeAuth(null) })).statusCode, 401);
  assert.equal((await handle('checkout', 'POST', { ...body, withdrawalLossAcknowledged: false })).statusCode, 400);
  assert.equal((await handle('checkout', 'POST', { ...body, licenseAccepted: false })).statusCode, 400);
  assert.equal((await handle('checkout', 'POST', { ...body, licenseeName: '' })).statusCode, 400);
  assert.equal((await handle('checkout', 'POST', body, { config: { ...env, STRIPE_BLUEPRINT_TAX_ENABLED: 'false' } })).statusCode, 503);
});
test('checkout uses pinned Stripe price, tax calculation, and signed-in user identity', async () => {
  captured.length = 0;
  const r = await handle('checkout', 'POST', body);
  assert.equal(r.statusCode, 200);
  assert.ok(r.payload.checkoutUrl.startsWith('https://checkout.stripe.com/'));
  const stripeCreate = captured.find(x => x.endpoint.endsWith('/checkout/sessions') && x.method === 'POST');
  const form = new URLSearchParams(stripeCreate.body);
  assert.equal(form.get('line_items[0][price]'), priceId);
  assert.equal(form.get('automatic_tax[enabled]'), 'true');
  assert.equal(form.get('billing_address_collection'), 'required');
  assert.equal(form.get('client_reference_id'), userId);
  assert.equal(form.get('customer_email'), 'buyer@example.org');
  assert.equal(form.get('metadata[licensee_name]'), 'Beispiel GmbH');
});
test('checkout rejects stale inclusive/foreign/inactive Stripe prices before accepting money', async () => {
  const fetchImpl = (endpoint, options) => String(endpoint).includes('/prices/') ? Promise.resolve(response({ ...price, tax_behavior: 'inclusive' })) : fixtureFetch(endpoint, options);
  const r = await handle('checkout', 'POST', body, { fetchImpl });
  assert.equal(r.statusCode, 503);
  assert.equal(r.payload.error, 'checkout_not_ready');
});
test('unsigned, stale and forged webhook do not grant access', async () => {
  const raw = JSON.stringify({ id: 'evt_123', type: 'checkout.session.completed', livemode: true, data: { object: { id: session.id } } });
  assert.equal(verifyBlueprintWebhookSignature(Buffer.from(raw), 't=0,v1='+'0'.repeat(64), env.STRIPE_BLUEPRINT_WEBHOOK_SECRET), false);
  assert.equal(verifyBlueprintWebhookSignature(Buffer.from(raw), sign(raw), env.STRIPE_BLUEPRINT_WEBHOOK_SECRET), true);
  const res = await handle('webhook', 'POST', raw, { headers: { 'stripe-signature': 't=0,v1=bad' } });
  assert.equal(res.statusCode, 400);
});
test('paid webhook requires 1 exact Stripe line item and writes entitlement only after provider readback', async () => {
  const event = JSON.stringify({ id: 'evt_123456', type: 'checkout.session.completed', livemode: true, data: { object: { id: session.id } } });
  captured.length = 0;
  const res = await handle('webhook', 'POST', event, { headers: { 'stripe-signature': sign(event) } });
  assert.equal(res.statusCode, 200);
  const grant = captured.find(x => x.endpoint.includes('/rpc/') && JSON.parse(x.body)._action === 'fulfill');
  assert.ok(grant);
  assert.equal(JSON.parse(grant.body)._user_id, userId);
  const mismatched = (endpoint, options) => String(endpoint).endsWith('/line_items?limit=2') ? Promise.resolve(response({ data: [{quantity: 2,price}], has_more: false })) : fixtureFetch(endpoint,options);
  captured.length = 0;
  const negative = await handle('webhook', 'POST', event, { headers: { 'stripe-signature': sign(event) }, fetchImpl: mismatched });
  assert.equal(negative.statusCode, 200);
  assert.equal(negative.payload.ignored, true);
  assert.equal(captured.filter(x => x.endpoint.includes('/rpc/') && JSON.parse(x.body)._action === 'fulfill').length, 0);
});
test('refund and dispute events revoke, but not partial refund', async () => {
  const event = JSON.stringify({ id: 'evt_456789', type: 'charge.refunded', livemode: true, data: { object: { id: 'ch_live_12345' } } });
  const fullyRefunded = (endpoint,opts) => String(endpoint).includes('/charges/') ? Promise.resolve(response({payment_intent:session.payment_intent,paid:true,refunded:true,disputed:false,amount_refunded:5950,amount:5950})) : fixtureFetch(endpoint,opts);
  captured.length = 0;
  assert.equal((await handle('webhook','POST',event,{headers:{'stripe-signature':sign(event)},fetchImpl:fullyRefunded})).statusCode,200);
  assert.equal(captured.some(x => x.endpoint.includes('/rpc/') && JSON.parse(x.body)._action === 'revoke'),true);
  const partial = (endpoint,opts) => String(endpoint).includes('/charges/') ? Promise.resolve(response({payment_intent:session.payment_intent,refunded:false,amount_refunded:500,amount:5950})) : fixtureFetch(endpoint,opts);
  captured.length = 0;
  await handle('webhook','POST',event,{headers:{'stripe-signature':sign(event)},fetchImpl:partial});
  assert.equal(captured.some(x=>x.endpoint.includes('/rpc/') && JSON.parse(x.body)._action === 'revoke'),false);
});
test('download fails closed for unentitled user, corrupted content, or wrong identity', async () => {
  const noUser = await handle('download/CAP-BP-001','GET',undefined,{auth:makeAuth(null)});
  assert.equal(noUser.statusCode,401);
  const denied=await handle('download/CAP-BP-001');
  assert.equal(denied.statusCode,403);
  const forged = (endpoint, options) => String(endpoint).includes('/rpc/') ? Promise.resolve(response({entitled:true,sku,version:'1.0.0',dataBase64:Buffer.from('corrupted').toString('base64'),bytes:9,sha256:'0'.repeat(64),fileName:'CAP-BP-001-fixture.md'})) : fixtureFetch(endpoint,options);
  const broken=await handle('download/CAP-BP-001','GET',undefined,{fetchImpl:forged});
  assert.equal(broken.statusCode,503);
});
test('authorized download is byte-integrity-verified and never publicly cacheable', async () => {
  const contents=Buffer.from('# private fixture document\n');
  const hash=createHash('sha256').update(contents).digest('hex');
  const ok = (endpoint, options) => String(endpoint).includes('/rpc/') ? Promise.resolve(response({entitled:true,sku,version:'1.0.0',dataBase64:contents.toString('base64'),bytes:contents.length,sha256:hash,fileName:'CAP-BP-001-fixture.md'})) : fixtureFetch(endpoint,options);
  const r=await handle('download/CAP-BP-001','GET',undefined,{fetchImpl:ok});
  assert.equal(r.statusCode,200);
  assert.deepEqual(r.data,contents);
  assert.equal(r.headers['Cache-Control'],'private, no-store');
  assert.equal(r.headers['Content-Security-Policy'],'sandbox');
});

test('late payment webhook cannot restore refunded payment', async () => {
  const event = JSON.stringify({ id: 'evt_late_123', type: 'checkout.session.async_payment_succeeded', livemode: true, data: { object: { id: session.id } } });
  const previouslyRefunded = (endpoint,opts) => String(endpoint).includes('/charges/') ? Promise.resolve(response({payment_intent:session.payment_intent,paid:true,refunded:true,disputed:false,amount_refunded:5950,amount:5950})) : fixtureFetch(endpoint,opts);
  captured.length = 0;
  const r = await handle('webhook', 'POST', event, { headers: { 'stripe-signature': sign(event) }, fetchImpl: previouslyRefunded });
  assert.equal(r.statusCode, 200);
  assert.equal(r.payload.ignored, true);
  assert.equal(captured.filter(x => x.endpoint.includes('/rpc/') && JSON.parse(x.body)._action === 'fulfill').length, 0);
});


test('confirmation email attaches exact license, paid totals and account-bound reference', async () => {
  const event = JSON.stringify({ id: 'evt_contract_123', type: 'checkout.session.completed', livemode: true, data: { object: { id: session.id } } });
  captured.length = 0;
  mailSent.length = 0;
  const res = await handle('webhook', 'POST', event, { headers: { 'stripe-signature': sign(event) } });
  assert.equal(res.statusCode, 200);
  assert.equal(mailSent.length, 1);
  assert.equal(mailSent[0].to, 'buyer@example.org');
  assert.match(mailSent[0].text, /59,50/);
  assert.match(mailSent[0].text, /9,50/);
  assert.match(mailSent[0].text, /Beispiel GmbH/);
  assert.ok(mailSent[0].attachments[0].content.includes('Unternehmenslizenz'));
  const actions = captured.filter(x => x.endpoint.includes('/rest/v1/rpc/')).map(x => JSON.parse(x.body)._action);
  assert.deepEqual(actions.slice(-3), ['fulfill', 'confirmation_claim', 'confirmation_sent']);
});

test('already sent confirmation never sends a duplicate email', async () => {
  const event = JSON.stringify({ id: 'evt_contract_repeat', type: 'checkout.session.completed', livemode: true, data: { object: { id: session.id } } });
  mailSent.length = 0;
  const alreadySent = (endpoint, options) => {
    if (String(endpoint).includes('/rest/v1/rpc/') && JSON.parse(options.body)._action === 'confirmation_claim') {
      return Promise.resolve(response({ claimed: false, alreadySent: true }));
    }
    return fixtureFetch(endpoint, options);
  };
  const r = await handle('webhook', 'POST', event, { headers: { 'stripe-signature': sign(event) }, fetchImpl: alreadySent });
  assert.equal(r.statusCode, 200);
  assert.equal(mailSent.length, 0);
});

test('SMTP failure returns retryable 503 and releases receipt lease', async () => {
  const event = JSON.stringify({ id: 'evt_contract_error', type: 'checkout.session.completed', livemode: true, data: { object: { id: session.id } } });
  captured.length = 0;
  const r = await handle('webhook', 'POST', event, {
    headers: { 'stripe-signature': sign(event) },
    sendMailImpl: async () => { throw new Error('smtp_down'); },
  });
  assert.equal(r.statusCode, 503);
  assert.equal(r.payload.error, 'blueprint_fulfillment_unavailable');
  assert.ok(captured.some(x => x.endpoint.includes('/rest/v1/rpc/') && JSON.parse(x.body)._action === 'confirmation_release'));
});

test('checkout denies unverified buyer mail and missing SMTP', async () => {
  const unverified = await handle('checkout', 'POST', body, { auth: { sameOrigin:()=>true, verify:async()=>({userId,email:'buyer@example.org',emailVerified:false}) } });
  assert.equal(unverified.statusCode, 403);
  assert.equal(unverified.payload.error, 'verified_email_required');
  const missingSmtp = await handle('offer','GET',undefined,{config:{...env, SMTP_HOST:''}});
  assert.equal(missingSmtp.payload.checkoutEnabled, false);
});

test('unreleased public offer hides unreviewed net price; license uses digital-content BGB §356(6)', () => {
  const panel = readFileSync(new URL('../src/features/studio/BlueprintCommercePanel.tsx', import.meta.url), 'utf8');
  const license = readFileSync(new URL('../docs/licenses/CAPITAL-AI-BLUEPRINT-COMPANY-LICENSE-1.0.md', import.meta.url), 'utf8');
  assert.match(panel, /offers\?\.checkoutEnabled \? "50,00 €/);
  assert.match(panel, /Preis nach Freigabe verfügbar/);
  assert.match(license, /§ 356 Abs\. 6 BGB/);
  assert.doesNotMatch(license, /§ 356 Abs\. 5 BGB/);
});

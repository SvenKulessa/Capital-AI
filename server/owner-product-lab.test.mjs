import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { readFileSync } from 'node:fs';
import { createOwnerProductLab, SKUS } from './owner-product-lab.mjs';

const A = '00000000-0000-4000-8000-000000000001';
const B = '00000000-0000-4000-8000-000000000002';
const SESSION = 'cs_test_abcdef0123456789';
const env = {
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_' + 'a'.repeat(40),
  PUBLIC_BASE_URL: 'https://capital-ai.online',
  STRIPE_SECRET_KEY: 'sk_live_' + 'l'.repeat(40),
  STRIPE_TEST_SECRET_KEY: 'sk_test_' + 't'.repeat(40),
};
const price = (sku, id, livemode) => ({
  id, product: livemode ? sku.liveProductId : 'prod_testexample01',
  livemode, active: true, currency: 'eur', unit_amount: sku.id.startsWith('starter') ? 700 : 2900,
  billing_scheme: 'per_unit',
  type: sku.kind === 'subscription' ? 'recurring' : 'one_time',
  ...(sku.kind === 'subscription' ? { recurring: { interval: sku.interval } } : {}),
});
function fixture({ userId = A, owner = true, sameOrigin = true, config = env } = {}) {
  const db = new Map();
  const calls = [];
  const auth = {
    verify: async () => userId ? { userId } : null,
    authorizeIamRole: async () => owner,
    sameOrigin: () => sameOrigin,
  };
  let createdProduct = false;
  const fetchImpl = async (url, options = {}) => {
    const target = new URL(url);
    calls.push({ url: target.href, method: options.method, body: options.body, headers: options.headers });
    if (target.hostname === 'example.supabase.co') {
      assert.equal(target.pathname, '/rest/v1/capital_ai_owner_product_lab');
      if (options.method === 'POST') {
        const value = JSON.parse(options.body);
        db.set(value.owner_id, value);
        return Response.json([value]);
      }
      const requested = target.searchParams.get('owner_id')?.slice(3);
      return Response.json(db.has(requested) ? [db.get(requested)] : []);
    }
    assert.equal(target.hostname, 'api.stripe.com');
    const livemode = String(options.headers.Authorization).startsWith('Bearer sk_live_');
    if (target.pathname.startsWith('/v1/prices/')) {
      const id = target.pathname.split('/').at(-1);
      const sku = SKUS.find(p => p.livePriceId === id) || SKUS.find(p => ({
        'starter-monthly': 'price_1TnF2FPKr4joNbEczpUiGcAQ',
        'pro-monthly': 'price_1TnF4dPKr4joNbEcxVW7h7q9',
        'enterprise-monthly': 'price_1TnF3VPKr4joNbEcEzeQHxX1',
      })[p.id] === id) || SKUS.find(p => p.id === 'starter-annual');
      return Response.json(price(sku, id, livemode));
    }
    if (target.pathname === '/v1/products') {
      createdProduct = true;
      return Response.json({ id: 'prod_testexample01', livemode: false });
    }
    if (target.pathname === '/v1/prices') {
      assert.equal(createdProduct, true);
      const annual = SKUS.find(p => p.id === 'starter-annual');
      return Response.json(price(annual, 'price_testexample012345', false));
    }
    if (target.pathname === '/v1/checkout/sessions') {
      const form = new URLSearchParams(options.body);
      assert.equal(livemode, false);
      assert.equal(form.get('metadata[capital_ai_owner_testlab]'), 'true');
      assert.equal(form.get('client_reference_id'), A);
      assert.equal(form.get('mode'), 'subscription');
      return Response.json({ id: SESSION, livemode: false, url: 'https://checkout.stripe.com/c/pay/owner-test' });
    }
    if (target.pathname === '/v1/checkout/sessions/' + SESSION) {
      return Response.json({
        id: SESSION, livemode: false, client_reference_id: A,
        status: 'complete', payment_status: 'paid',
        metadata: { user_id: A, sku: 'pro-monthly', capital_ai_owner_testlab: 'true' },
      });
    }
    throw Error('unexpected upstream ' + target);
  };
  const handler = createOwnerProductLab({ auth, env: config, fetchImpl });
  const run = async (method, path = '', body = undefined) => {
    const req = Readable.from(body === undefined ? [] : [JSON.stringify(body)]);
    req.method = method;
    req.headers = { origin: 'https://capital-ai.online', 'content-type': 'application/json' };
    const res = { setHeader() {} };
    let output;
    const handled = await handler.handle(req, res,
      new URL('/api/owner/product-lab' + path, 'https://capital-ai.online'),
      (_r, status, payload) => { output = { status, payload }; });
    assert.equal(handled, true);
    return output;
  };
  return { run, db, calls };
}

test('anonymous, non-owner and spoofed-origin requests never access Stripe or storage', async () => {
  for (const opts of [{ userId: null }, { owner: false }]) {
    const { run, calls } = fixture(opts);
    assert.equal((await run('GET')).status, opts.userId === null ? 401 : 403);
    assert.equal(calls.length, 0);
  }
  const { run, calls } = fixture({ sameOrigin: false });
  assert.equal((await run('POST', '/configuration', { mode: 'test', selected: [] })).status, 403);
  assert.equal(calls.length, 0);
});

test('only allowlisted SKUs and exact owner mode are accepted', async () => {
  const { run, db } = fixture();
  assert.equal((await run('POST', '/configuration', { mode: 'test', selected: ['custom-price'] })).status, 400);
  assert.equal((await run('POST', '/configuration', { mode: 'live', selected: [] })).status, 400);
  assert.equal((await run('POST', '/configuration', { mode: 'test', selected: ['pro-monthly', 'pro-monthly'] })).status, 400);
  assert.equal(db.size, 0);
  const selection = await run('POST', '/configuration', { mode: 'test', selected: ['pro-monthly'] });
  assert.equal(selection.status, 200);
  assert.deepEqual(selection.payload.selected, ['pro-monthly']);
  assert.equal((await run('GET')).payload.mode, 'test');
  assert.equal(db.get(A).mode, 'test');
});

test('checkout strictly requires selected test mode, verified owner and both server-side keys', async () => {
  const { run, calls } = fixture();
  assert.equal((await run('POST', '/checkout', { sku: 'pro-monthly' })).status, 409);
  await run('POST', '/configuration', { mode: 'test', selected: ['starter-monthly'] });
  assert.equal((await run('POST', '/checkout', { sku: 'pro-monthly' })).status, 409);
  assert.equal(calls.filter(x => x.url.includes('api.stripe.com')).length, 0);
  await run('POST', '/configuration', { mode: 'test', selected: ['pro-monthly'] });
  const result = await run('POST', '/checkout', { sku: 'pro-monthly' });
  assert.equal(result.status, 200);
  assert.equal(result.payload.mode, 'test');
  const stripeCheckout = calls.find(x => x.url.endsWith('/v1/checkout/sessions'));
  assert.match(stripeCheckout.headers.Authorization, /^Bearer sk_test_/);
  assert.equal(new URLSearchParams(stripeCheckout.body).get('line_items[0][price]'), 'price_1TnF4dPKr4joNbEcxVW7h7q9');
  const missing = fixture({ config: { ...env, STRIPE_TEST_SECRET_KEY: '' } });
  await missing.run('POST', '/configuration', { mode: 'test', selected: ['pro-monthly'] });
  assert.equal((await missing.run('POST', '/checkout', { sku: 'pro-monthly' })).status, 503);
});

test('test Stripe checkout result cannot assert or modify production entitlements', async () => {
  const { run } = fixture();
  const r = await run('GET', '/checkout-result?session_id=' + SESSION);
  assert.equal(r.status, 200);
  assert.deepEqual(r.payload, {
    mode: 'test', sku: 'pro-monthly', completed: true,
    status: 'complete', productionEntitlementGranted: false,
  });
  assert.equal((await run('GET', '/checkout-result?session_id=cs_live_abcd')).status, 400);
});

test('missing annual test replica is provisioned only after selected owner action', async () => {
  const { run, calls, db } = fixture();
  assert.equal((await run('POST', '/replica', { sku: 'starter-annual' })).status, 409);
  await run('POST', '/configuration', { mode: 'test', selected: ['starter-annual'] });
  const r = await run('POST', '/replica', { sku: 'starter-annual' });
  assert.equal(r.status, 200);
  assert.equal(r.payload.products.find(p => p.id === 'starter-annual').replicaAvailable, true);
  assert.equal(db.get(A).replica_price_ids['starter-annual'], 'price_testexample012345');
  const newProducts = calls.filter(c => c.url === 'https://api.stripe.com/v1/products');
  assert.equal(newProducts.length, 1);
  assert.match(newProducts[0].headers.Authorization, /^Bearer sk_test_/);
  assert.ok(!calls.some(c => c.url.endsWith('/v1/checkout/sessions')));
});

test('schema denies client roles and grants only service role; all catalog items bounded', () => {
  assert.equal(SKUS.length, 7);
  const sql = readFileSync(new URL('../supabase/migrations/20261013110100_owner_product_lab_isolation.sql', import.meta.url), 'utf8');
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on public.capital_ai_owner_product_lab from public, anon, authenticated/i);
  assert.match(sql, /grant select, insert, update on public.capital_ai_owner_product_lab to service_role/i);
});

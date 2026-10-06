import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { createSubscriptionCheckout } from './subscription-checkout.mjs';

const env = {
  STRIPE_SECRET_KEY: 'sk_test_example',
  STRIPE_SUBSCRIPTION_CHECKOUT_ENABLED: 'true',
  PUBLIC_BASE_URL: 'https://capital-ai.online',
};

function req(body = {}, origin = 'https://capital-ai.online') {
  const stream = new EventEmitter();
  stream.method = 'POST';
  stream.headers = { origin };
  setImmediate(() => {
    stream.emit('data', Buffer.from(JSON.stringify(body)));
    stream.emit('end');
  });
  return stream;
}
function res() {
  return {
    status: 0,
    headers: new Map(),
    setHeader(k,v){ this.headers.set(String(k).toLowerCase(), String(v)); },
    writeHead(status){ this.status = status; },
    end(){},
  };
}
function json(response, status, body) {
  response.status = status;
  response.payload = body;
}
const auth = {
  sameOrigin(request){ return request.headers.origin === 'https://capital-ai.online'; },
  async verify(){ return { userId: '00000000-0000-4000-8000-000000000001' }; },
};

test('subscription checkout uses only server catalog price and binds user and plan metadata', async () => {
  let stripeForm;
  const fetchImpl = async (url, options) => {
    assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
    stripeForm = new URLSearchParams(String(options.body));
    return Response.json({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/test' });
  };
  const handler = createSubscriptionCheckout({ env, fetchImpl, auth });
  const response = res();
  await handler.handle(req({ tier: 'pro', cycle: 'annual' }), response, new URL('https://capital-ai.online/api/billing/subscriptions/checkout'), json);
  assert.equal(response.status, 200);
  assert.equal(stripeForm.get('mode'), 'subscription');
  assert.equal(stripeForm.get('line_items[0][price]'), 'price_1UMA50PKr4joNbEcrj0Lm79I');
  assert.equal(stripeForm.get('metadata[plan_id]'), 'PRO');
  assert.equal(stripeForm.get('subscription_data[metadata][plan_id]'), 'PRO');
  assert.equal(stripeForm.get('metadata[user_id]'), '00000000-0000-4000-8000-000000000001');
});

test('subscription checkout ignores caller-supplied priceId and uses server authority', async () => {
  let stripeForm;
  const fetchImpl = async (_url, options) => {
    stripeForm = new URLSearchParams(String(options.body));
    return Response.json({ id: 'cs_test_2', url: 'https://checkout.stripe.com/c/pay/test2' });
  };
  const handler = createSubscriptionCheckout({ env, fetchImpl, auth });
  const response = res();
  await handler.handle(req({ tier: 'enterprise', cycle: 'monthly', priceId: 'price_attacker' }), response, new URL('https://capital-ai.online/api/billing/subscriptions/checkout'), json);
  assert.equal(response.status, 200);
  assert.equal(stripeForm.get('line_items[0][price]'), 'price_1UMA51PKr4joNbEcbtWNCcCc');
  assert.notEqual(stripeForm.get('line_items[0][price]'), 'price_attacker');
});

test('subscription checkout rejects unknown tier or cycle before Stripe', async () => {
  const handler = createSubscriptionCheckout({ env, fetchImpl: async () => { throw new Error('must not call'); }, auth });
  const response = res();
  await handler.handle(req({ tier: 'owner', cycle: 'lifetime' }), response, new URL('https://capital-ai.online/api/billing/subscriptions/checkout'), json);
  assert.equal(response.status, 400);
  assert.equal(response.payload.error, 'invalid_subscription_selection');
});

test('subscription checkout fails closed when disabled or cross-origin', async () => {
  const disabled = createSubscriptionCheckout({ env: { ...env, STRIPE_SUBSCRIPTION_CHECKOUT_ENABLED: 'false' }, auth });
  const a = res();
  await disabled.handle(req({ tier: 'starter', cycle: 'monthly' }), a, new URL('https://capital-ai.online/api/billing/subscriptions/checkout'), json);
  assert.equal(a.status, 503);

  const enabled = createSubscriptionCheckout({ env, fetchImpl: async () => { throw new Error('must not call'); }, auth });
  const b = res();
  await enabled.handle(req({ tier: 'starter', cycle: 'monthly' }, 'https://evil.example'), b, new URL('https://capital-ai.online/api/billing/subscriptions/checkout'), json);
  assert.equal(b.status, 403);
});

test('subscription readiness is public but contains no secret values', async () => {
  const handler = createSubscriptionCheckout({ env, auth });
  const response = res();
  const request = req();
  request.method = 'GET';
  await handler.handle(request, response, new URL('https://capital-ai.online/api/billing/subscriptions/readiness'), json);
  assert.equal(response.status, 200);
  assert.equal(response.payload.enabled, true);
  assert.equal(JSON.stringify(response.payload).includes('sk_test_'), false);
});

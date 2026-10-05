import test from 'node:test';
import assert from 'node:assert/strict';
import { createProfileAccess } from './profile-access.mjs';

function responseHarness() {
  return {
    status: 0,
    payload: null,
    headers: new Map(),
    setHeader(name, value) { this.headers.set(String(name).toLowerCase(), value); },
  };
}

function json(res, status, payload) {
  res.status = status;
  res.payload = payload;
}

test('owner receives enterprise all-access without email-based authorization', async () => {
  const auth = {
    async credentials() {
      return {
        userId: 'owner-subject',
        accessToken: 'access-token',
        publishableKey: 'publishable',
        url: 'https://project.example',
      };
    },
  };
  const fetchImpl = async target => {
    const url = new URL(String(target));
    if (url.pathname.endsWith('/profiles')) {
      return new Response(JSON.stringify([{ iam_role: 'owner', role: 'enterprise' }]), { status: 200 });
    }
    if (url.pathname.endsWith('/subscriptions')) {
      return new Response(JSON.stringify([{ tier: 'Enterprise', status: 'active', current_period_end: '2026-12-01T00:00:00Z' }]), { status: 200 });
    }
    throw new Error('unexpected request');
  };
  const access = createProfileAccess({ env: {}, fetchImpl, auth });
  const res = responseHarness();
  const handled = await access.handle({ method: 'GET' }, res, new URL('https://capital.example/api/profile/access'), json);
  assert.equal(handled, true);
  assert.equal(res.status, 200);
  assert.equal(res.payload.owner, true);
  assert.equal(res.payload.allAccess, true);
  assert.equal(res.payload.tier, 'Enterprise');
  assert.deepEqual(res.payload.products, [{ id: 'market-vocabulary', label: 'Vocabulary', entitled: true, source: 'owner' }]);
});

test('normal user remains gated by active subscription', async () => {
  const auth = {
    async credentials() {
      return {
        userId: 'normal-subject',
        accessToken: 'access-token',
        publishableKey: 'publishable',
        url: 'https://project.example',
      };
    },
  };
  const fetchImpl = async target => {
    const url = new URL(String(target));
    if (url.pathname.endsWith('/profiles')) {
      return new Response(JSON.stringify([{ iam_role: 'user', role: 'free' }]), { status: 200 });
    }
    if (url.pathname.endsWith('/subscriptions')) {
      return new Response(JSON.stringify([{ tier: 'Starter', status: 'active', current_period_end: null }]), { status: 200 });
    }
    throw new Error('unexpected request');
  };
  const access = createProfileAccess({ env: {}, fetchImpl, auth });
  const res = responseHarness();
  await access.handle({ method: 'GET' }, res, new URL('https://capital.example/api/profile/access'), json);
  assert.equal(res.status, 200);
  assert.equal(res.payload.owner, false);
  assert.equal(res.payload.allAccess, false);
  assert.equal(res.payload.tier, 'Starter');
  assert.deepEqual(res.payload.products, []);
});

test('unauthenticated access fails closed', async () => {
  const access = createProfileAccess({ env: {}, fetchImpl: fetch, auth: { async credentials() { return null; } } });
  const res = responseHarness();
  await access.handle({ method: 'GET' }, res, new URL('https://capital.example/api/profile/access'), json);
  assert.equal(res.status, 401);
  assert.deepEqual(res.payload, { error: 'authentication_required' });
});

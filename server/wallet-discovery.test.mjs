import test from 'node:test';
import assert from 'node:assert/strict';
import { walletDiscoveryCapabilities, WALLET_DISCOVERY_CONTRACT } from './wallet-discovery.mjs';

test('wallet discovery is disabled by default', () => {
  const value = walletDiscoveryCapabilities({});
  assert.equal(value.contract, WALLET_DISCOVERY_CONTRACT);
  assert.equal(value.enabled, false);
  assert.equal(value.paymentStatus, 'BLOCKED');
  assert.deepEqual(value.chains.map(({ chain }) => chain), ['polygon', 'solana', 'xrpl']);
});

test('feature flag cannot enable payment or entitlement pathways', () => {
  const value = walletDiscoveryCapabilities({ CAPITAL_AI_WALLET_DISCOVERY_ENABLED: 'true' });
  assert.equal(value.enabled, true);
  for (const chain of value.chains) {
    for (const action of ['connect', 'quote', 'checkout', 'subscription', 'mainnet']) {
      assert.equal(chain[action], false);
    }
  }
  assert.equal(value.entitlementAuthority, 'existing-server-verified-commerce-only');
});

test('unexpected flag values fail closed and result is immutable', () => {
  for (const flag of ['TRUE', '1', 'yes', 'false', '']) {
    assert.equal(walletDiscoveryCapabilities({ CAPITAL_AI_WALLET_DISCOVERY_ENABLED: flag }).enabled, false);
  }
  assert.equal(Object.isFrozen(walletDiscoveryCapabilities({}).chains), true);
});

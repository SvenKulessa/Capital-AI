import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WalletDiscoveryPanel } from './WalletDiscoveryPanel';

test('wallet panel is inert and announces disabled payments', () => {
  const html = renderToStaticMarkup(createElement(WalletDiscoveryPanel));
  assert.match(html, /Krypto-Zahlungen sind derzeit deaktiviert/);
  assert.match(html, /aria-labelledby="wallet-discovery-heading"/);
  assert.doesNotMatch(html, /<button|<form|<input|<a /);
});

test('wallet panel is restricted to the authenticated dashboard and exact opt-in flag', () => {
  const source = readFileSync(new URL('./PrivateDashboardPage.tsx', import.meta.url), 'utf8');
  assert.match(source, /AccountPageShell/);
  assert.match(source, /session =>[\s\S]*VITE_WALLET_DISCOVERY_ENABLED === 'true' && <WalletDiscoveryPanel/);
  assert.doesNotMatch(source, /window\.ethereum|eth_sendTransaction|wallet_requestPermissions/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ECB_REFERENCE_RATE_SYMBOLS } from '../server/ecb-reference-rates.mjs';

const blueprint = await readFile(new URL('../render.yaml', import.meta.url), 'utf8');
const profile = JSON.parse(await readFile(new URL('../deploy/render-image-profile.json', import.meta.url), 'utf8'));

function renderValue(key) {
  const match = blueprint.match(new RegExp('^\\s*- key: ' + key + '\\s*\\n\\s*value: "?([^"\\n]+)"?', 'm'));
  return match?.[1] ?? null;
}

test('existing Web blueprint and immutable image profile agree on the admitted ECB universe', () => {
  const symbols = renderValue('MARKET_SYMBOLS')?.split(',');
  assert.deepEqual(symbols, ECB_REFERENCE_RATE_SYMBOLS);
  assert.equal(profile.marketSymbols, ECB_REFERENCE_RATE_SYMBOLS.join(','));
  assert.equal(new Set(symbols).size, 20);
});

test('quote ingress is limited to admitted daily data and private provider queries remain disabled', () => {
  assert.equal(renderValue('MARKET_QUOTES_ENABLED'), 'true');
  assert.equal(renderValue('MARKET_ECB_REFERENCE_RATES_ENABLED'), 'true');
  assert.equal(renderValue('PRIVATE_PROVIDER_BRIDGE_ENABLED'), 'false');
  assert.equal(renderValue('PRIVATE_PROVIDER_BRIDGE_PROBE_ENABLED'), 'false');
  assert.equal(renderValue('MARKET_PUBSUB_ENABLED'), 'true');
});

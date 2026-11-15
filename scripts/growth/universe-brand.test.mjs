import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const families = ['cyan', 'violet', 'gold', 'pink', 'rose', 'blue', 'green'];
const tokens = JSON.parse(readFileSync('public/branding/asset-pack/meta/social-render-tokens.json', 'utf8'));
const hub = readFileSync('shared/hub-branding.mjs', 'utf8');
const plan = readFileSync('src/contracts/contentEngine.ts', 'utf8');
const svg = readFileSync('scripts/growth/social-pipeline-graphic.mjs', 'utf8');

function validatePalette(palette) {
  assert.deepEqual(Object.keys(palette), families, 'exactly seven ordered colour families');
  const hues = families.map(name => palette[name]?.$value);
  assert.ok(hues.every(value => /^#[0-9A-Fa-f]{6}$/.test(value ?? '')), 'hex values required');
  assert.equal(new Set(hues.map(value => value.toLowerCase())).size, 7, 'seven distinct hues');
  return hues;
}

test('Universe renderer tokens exactly match first-party hub palette', () => {
  const hues = validatePalette(tokens.color.universe);
  for (const [index, name] of families.entries()) {
    assert.ok(hub.includes(name + ": '" + hues[index] + "'"), 'hub drift: ' + name);
  }
  assert.equal(tokens.universeDesign.version, 'CAPITAL_AI_UNIVERSE@1');
  assert.equal(tokens.universeDesign.franchiseAssets, 'NOT_PERMITTED');
  assert.equal(tokens.publishReady, false);
});

test('missing, invalid and repeated colours are rejected', () => {
  const invalid = structuredClone(tokens.color.universe);
  delete invalid.green;
  assert.throws(() => validatePalette(invalid));
  invalid.green = { $value: 'rgb(0,0,0)' };
  assert.throws(() => validatePalette(invalid));
  invalid.green = { $value: invalid.cyan.$value };
  assert.throws(() => validatePalette(invalid));
});

test('content plans and SVG renderer reference full spectrum without publishing', () => {
  for (const name of families) assert.ok(plan.includes("z.literal('" + name + "')"), 'plan missing ' + name);
  assert.ok(plan.includes('visualIdentity: CONTENT_ENGINE_UNIVERSE'));
  assert.ok(plan.includes("publication: 'DRAFT_ONLY'"));
  assert.ok(svg.includes('const hues = family.map'));
  assert.ok(svg.includes('const spectralBar = hues.map'));
  assert.ok(svg.includes("UNIVERSE_PALETTE_SEVEN_REQUIRED"));
});

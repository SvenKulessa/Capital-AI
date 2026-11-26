import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SCREENER_BADGE_VARIANTS, renderScreenerBlueprintBadge, renderHubIdentityIcon } from '../../src/platform/SocialMediaEngine/Branding/ScreenerBlueprintBadgeRenderer.mjs';
const tokens = JSON.parse(readFileSync('public/branding/asset-pack/meta/social-render-tokens.json','utf8'));
const manifest = JSON.parse(readFileSync('docs/licenses/screener-blueprint-badges.manifest.json','utf8'));
test('Three deterministic SVG badges using current offline SocialMediaEngine tokens', () => {
  assert.equal(manifest.publicationAuthority,false);
  assert.deepEqual(SCREENER_BADGE_VARIANTS,['data','scoring','bundle']);
  for (const v of SCREENER_BADGE_VARIANTS) {
    const rendered = renderScreenerBlueprintBadge(v, tokens);
    const path = `public/branding/badges/screener-${v}-blueprint.svg`;
    assert.equal(rendered, readFileSync(path, 'utf8'));
    assert.ok(rendered.includes('keine Zertifizierung'));
    for (const name of ['cyan','violet','gold','pink','rose','blue','green']) {
      assert.ok(rendered.includes(`fill="${tokens.color.universe[name].$value}"`), 'missing Universe accent: ' + name);
    }
    assert.equal(manifest.assets.find(item => item.variant===v)?.universeIdentity,'CAPITAL_AI_UNIVERSE@1');
    assert.ok(!/(<image|<script|foreignObject|(?:href|src)="https?:)/i.test(rendered));
    assert.equal(manifest.assets.find(item => item.variant===v)?.sha256, createHash('sha256').update(rendered).digest('hex'));
  }
});
test('rejects arbitrary badge variants and unsafe brand tokens', () => {
  assert.throws(()=>renderScreenerBlueprintBadge('owner',tokens), /BADGE_VARIANT_UNSUPPORTED/);
  assert.throws(()=>renderScreenerBlueprintBadge('bundle',{...tokens,color:{...tokens.color,background:{$value:'url(http://bad)'}}}), /INVALID_BRAND_COLOR/);
});

test('Seven-colour badge renderer fails closed on incomplete and duplicate palettes', () => {
  const withoutGreen = structuredClone(tokens);
  delete withoutGreen.color.universe.green;
  assert.throws(() => renderScreenerBlueprintBadge('data', withoutGreen), /UNIVERSE_PALETTE_SEVEN_REQUIRED/);
  const duplicate = structuredClone(tokens);
  duplicate.color.universe.green.$value = duplicate.color.universe.cyan.$value;
  assert.throws(() => renderScreenerBlueprintBadge('data', duplicate), /UNIVERSE_PALETTE_SEVEN_REQUIRED/);
  const extra = structuredClone(tokens);
  extra.color.universe.unknown = { $value: '#010203' };
  assert.throws(() => renderScreenerBlueprintBadge('data', extra), /UNIVERSE_PALETTE_SEVEN_REQUIRED/);
});

import { HUB_BRANDING } from '../../shared/hub-branding.mjs';
test('hub identity manifest fixes canonical colours and verifies generated icons', () => {
  const pack = JSON.parse(readFileSync('public/branding/asset-pack/meta/asset-manifest.json','utf8'));
  const hubs = JSON.parse(readFileSync(pack.hubIdentityManifest,'utf8'));
  assert.equal(hubs.publicationAuthority,false);
  for (const [id, brand] of Object.entries(HUB_BRANDING)) {
    assert.equal(hubs.hubs[id].name, brand.name);
    assert.equal(hubs.hubs[id].color, brand.color);
  }
  for (const id of ['learning','marketscreener']) {
    const entry = hubs.hubs[id].icon;
    const svg = renderHubIdentityIcon(id,tokens);
    assert.equal(entry.publicUrl,HUB_BRANDING[id].icon);
    assert.equal(svg,readFileSync(entry.repositoryPath,'utf8'));
    assert.equal(entry.sha256,createHash('sha256').update(svg).digest('hex'));
    assert.equal(entry.bytes,Buffer.byteLength(svg));
    assert.equal(entry.publishApproval,false);
    assert.doesNotMatch(svg, /<script|<image|foreignObject|(?:href|src)="https?:/i);
  }
  assert.throws(()=>renderHubIdentityIcon('unknown',tokens),/HUB_ICON_VARIANT_UNSUPPORTED/);
  const invalid=structuredClone(tokens);delete invalid.color.universe.green;
  assert.throws(()=>renderHubIdentityIcon('learning',invalid),/UNIVERSE_PALETTE_SEVEN_REQUIRED/);
});

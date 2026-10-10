import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { SCREENER_BADGE_VARIANTS, renderScreenerBlueprintBadge } from '../../src/platform/SocialMediaEngine/Branding/ScreenerBlueprintBadgeRenderer.mjs';
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
    assert.ok(!/(<image|<script|foreignObject|(?:href|src)="https?:)/i.test(rendered));
    assert.equal(manifest.assets.find(item => item.variant===v)?.sha256, createHash('sha256').update(rendered).digest('hex'));
  }
});
test('rejects arbitrary badge variants and unsafe brand tokens', () => {
  assert.throws(()=>renderScreenerBlueprintBadge('owner',tokens), /BADGE_VARIANT_UNSUPPORTED/);
  assert.throws(()=>renderScreenerBlueprintBadge('bundle',{...tokens,color:{...tokens.color,background:{$value:'url(http://bad)'}}}), /INVALID_BRAND_COLOR/);
});

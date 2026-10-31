import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const checks = {
  'hero-universe-desktop.webp': '9433f67916217a50ef5e3cff79e93559f45e48f3bfc244aace67d22227896bbc',
  'hero-universe-tablet.webp': 'eb7177ff4976c73c07025119e5711c6f282d1cb59550176579dbc4774e2ab189',
  'hero-universe-mobile.webp': '5e8f68fe961efb42120d95d5075f6d0a5060fbcd76c75c68132d78b74d815b82',
  'hero-universe-globe.webp': 'd510ac752e79314d69475a7645c554625b86ed676b0b04aabbc2869599de8eb4',
};

test('Universe raster assets are version-bound WebP', () => {
  for (const [name, sha] of Object.entries(checks)) {
    const bytes = read('public/branding/universe/' + name);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sha, name);
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
  }
});

test('vector identity uses authored orbits without external image dependencies', () => {
  const svg = read('public/branding/universe/hero-universe-orbit.svg').toString();
  assert.match(svg, /<title id="title">/);
  assert.match(svg, /class="orbit-rings"/);
  assert.match(svg, /prefers-reduced-motion/);
  assert.doesNotMatch(svg, /<script|<image|xlink:href|<foreignObject/i);
});

test('homepage uses shared 3D brand artwork with a static fallback and preserves CTA handlers', () => {
  const hero = read('src/components/Hero.tsx').toString();
  const globe = read('src/components/BrandGlobe.tsx').toString();
  assert.doesNotMatch(hero, /hero-universe-orbit.svg/);
  assert.match(hero, /<BrandGlobe paused=\{globePaused\}/);
  assert.match(globe, /src=\{BRAND_GLOBE.asset\}/);
  assert.match(globe, /reducedMotion !== false/);
  assert.match(hero, /onStartAnalysis/);
  assert.match(hero, /onExploreProduct/);
  assert.doesNotMatch(hero, /glowing_earth_nodes_1789997454893.jpg/);
});

test('Media Studio respects existing draft publishing boundary and points to new brand image', () => {
  const media = read('src/platform/SocialMediaEngine/Editing/MediaStudioTemplates.ts').toString();
  assert.match(media, /CAPITAL_AI_UNIVERSE_BRAND_ASSETS/);
  assert.match(media, /reference: `public\$\{BRAND_GLOBE.asset\}`/);
  assert.match(media, /sha256: BRAND_GLOBE.assetSha256/);
  assert.match(media, /mimeType: 'image\/webp'/);
  assert.match(media, /publishReady: false/);
});

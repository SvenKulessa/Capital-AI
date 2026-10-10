import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const index = readFileSync(resolve(root, 'index.html'), 'utf8');
const assetRoot = resolve(root, 'public/branding/asset-pack');

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('website metadata references only materialized CAPITAL-AI branding assets', () => {
  const required = [
    '/branding/asset-pack/favicon/favicon.svg',
    '/branding/asset-pack/favicon/favicon-32x32.png',
    '/branding/asset-pack/favicon/favicon.ico',
    '/branding/asset-pack/favicon/apple-touch-icon-180x180.png',
    '/branding/asset-pack/favicon/site.webmanifest',
    '/branding/asset-pack/social/open-graph-1200x630.jpg',
    '/branding/asset-pack/avatars/capital-ai-avatar-512x512.png',
  ];
  for (const webPath of required) {
    assert.ok(index.includes(webPath), 'index.html does not reference ' + webPath);
    const repositoryPath = resolve(root, 'public', webPath.replace(/^\//, ''));
    assert.ok(existsSync(repositoryPath), 'referenced branding asset is missing: ' + webPath);
  }
  assert.match(index, /og:image:width" content="1200"/);
  assert.match(index, /og:image:height" content="630"/);
  assert.doesNotMatch(index, /og:image" content="https:\/\/capital-ai\.online\/branding\/capital-ai-logo\.jpg"/);
  assert.doesNotMatch(index, /twitter:image" content="https:\/\/capital-ai\.online\/branding\/capital-ai-logo\.jpg"/);
});

test('PWA manifest references existing any and maskable icons', () => {
  const manifestPath = resolve(assetRoot, 'favicon/site.webmanifest');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  assert.equal(manifest.name, 'CAPITAL-AI.ONLINE');
  assert.equal(manifest.theme_color, '#030F18');
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 4);
  for (const icon of manifest.icons) {
    const target = resolve(manifestPath, '..', icon.src);
    assert.ok(existsSync(target), 'PWA icon is missing: ' + icon.src);
  }
  assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
  assert.ok(manifest.icons.some(icon => icon.purpose === 'any'));
});

test('asset manifest is rights-bound, non-publishing and byte-consistent for all records', () => {
  const manifest = JSON.parse(readFileSync(resolve(assetRoot, 'meta/asset-manifest.json'), 'utf8'));
  const report = JSON.parse(readFileSync(resolve(assetRoot, 'meta/validation-report.json'), 'utf8'));
  assert.equal(manifest.publishReady, false);
  assert.equal(manifest.source.rightsReference, 'docs/licenses/Capital-AI-BRANDING.md');
  assert.equal(manifest.source.sha256, '6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3');
  assert.equal(manifest.derivation.thirdPartyVisualAssetsAdded, false);
  assert.equal(manifest.derivation.nativeVectorTraceClaimed, false);
  assert.equal(manifest.assets.length, 67);
  assert.equal(report.validation.length, 5);
  assert.ok(report.validation.every(item => item.status === 'PASS'));
  for (const asset of manifest.assets) {
    const path = resolve(assetRoot, asset.path);
    assert.ok(existsSync(path), 'manifest asset missing: ' + asset.path);
    assert.equal(sha256(path), asset.sha256, 'SHA-256 mismatch: ' + asset.path);
  }
});


test('social brand icons are local and provenance-bound', () => {
  const socialRoot = resolve(root, 'public/branding/social');
  const provenance = readFileSync(resolve(root, 'docs/licenses/SOCIAL-BRAND-ICONS-SIMPLE-ICONS-16.33.0.md'), 'utf8');
  const upstreamLicense = readFileSync(resolve(root, 'docs/licenses/SIMPLE-ICONS-16.33.0-CC0-1.0.md'), 'utf8');

  for (const name of ['github', 'tiktok', 'threads', 'youtube', 'x']) {
    const svg = readFileSync(resolve(socialRoot, name + '.svg'), 'utf8');
    assert.match(svg, /viewBox="0 0 24 24"/);
    assert.match(svg, /<title>[^<]+<\/title>/);
    assert.doesNotMatch(svg, /(?:href|src)\s*=\s*["']https?:\/\//i);
    assert.doesNotMatch(svg, /<(?:script|image|use)\b[^>]*(?:href|src)=/i);
  }

  assert.match(provenance, /Simple Icons/);
  assert.match(provenance, /16\.33\.0/);
  assert.match(provenance, /CC0-1\.0/);
  assert.match(provenance, /Marken/);
  assert.match(upstreamLicense, /CC0 1\.0 Universal/);
  assert.match(upstreamLicense, /No trademark or patent rights/);
});

test('JaJa avatar is available to Vite inside the production Docker build', () => {
  const relativeAsset = 'public/assets/jaja-avatar-transparent.webp';
  const avatarPath = resolve(root, relativeAsset);
  assert.ok(existsSync(avatarPath), 'approved JaJa avatar is missing');
  const avatar = readFileSync(avatarPath);
  assert.equal(avatar.toString('ascii', 0, 4), 'RIFF');
  assert.equal(avatar.toString('ascii', 8, 12), 'WEBP');

  const dockerignore = readFileSync(resolve(root, '.dockerignore'), 'utf8');
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  const buddy = readFileSync(resolve(root, 'src/components/HeroBuddy.tsx'), 'utf8');
  assert.ok(dockerignore.includes('!public/assets/'));
  assert.ok(dockerignore.includes('!public/assets/jaja-avatar-transparent.webp'));
  assert.ok(dockerfile.includes('COPY public/assets/jaja-avatar-transparent.webp ./public/assets/jaja-avatar-transparent.webp'));
  assert.ok(buddy.includes('/assets/jaja-avatar-transparent.webp'));
});

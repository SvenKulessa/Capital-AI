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

test('subscription and role badges are shipped into the Docker build context', () => {
  for (const name of ['starter.svg', 'pro.svg', 'enterprise.svg', 'free-user.svg', 'vault.svg', 'owner.svg']) {
    assert.ok(existsSync(resolve(root, 'public/branding/badges', name)), 'account badge missing: ' + name);
  }
  const dockerfile = readFileSync(resolve(root, 'Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY public\/branding\/badges \.\/public\/branding\/badges/);
});

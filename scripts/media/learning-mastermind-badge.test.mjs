import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {
  renderLearningMastermindCard,
  LEARNING_MASTERMIND_CARD_SIZES,
  LEARNING_MASTERMIND_STATUSES,
} from '../../src/platform/SocialMediaEngine/Branding/LearningMastermindCardRenderer.mjs';

const tokens = JSON.parse(readFileSync('public/branding/asset-pack/meta/social-render-tokens.json', 'utf8'));
const spectral = Object.values(tokens.color.universe).map(({ $value }) => $value);
const assets = JSON.parse(readFileSync('docs/licenses/capital-ai-badges.manifest.json', 'utf8'));
const asset = assets.assets.find(entry => entry.id === 'capital-ai-badge-learning-mastermind');

test('existing licensed square asset remains the canonical entitlement badge', () => {
  assert.equal(asset.path, 'public/branding/badges/learning-mastermind.svg');
  assert.equal(asset.width, 256);
  assert.equal(asset.height, 256);
  const svg = readFileSync(asset.path, 'utf8');
  assert.equal(createHash('sha256').update(svg).digest('hex'), asset.sha256);
  assert.doesNotMatch(svg, /<script|<foreignObject|<image/i);
});

// 3 sizes x 2 states x 11 glow settings = 66 separately reported tests.
// These are deterministic structural/security tests, not invented pixel-match evidence.
for (const size of Object.keys(LEARNING_MASTERMIND_CARD_SIZES)) {
  for (const status of LEARNING_MASTERMIND_STATUSES) {
    for (let glowLevel = 0; glowLevel <= 10; glowLevel++) {
      test(`mastermind preview size=${size}, status=${status}, glow=${glowLevel}`, () => {
        const options = { size, status, glowLevel };
        const svg = renderLearningMastermindCard(options, tokens);
        assert.equal(svg, renderLearningMastermindCard(options, tokens), 'output must be deterministic');
        assert.match(svg, new RegExp(`width="${LEARNING_MASTERMIND_CARD_SIZES[size][0]}" height="${LEARNING_MASTERMIND_CARD_SIZES[size][1]}"`));
        assert.ok(svg.includes(status === 'aktiv' ? 'Lernzugang aktiv' : 'Lernzugang inaktiv'));
        for (const value of spectral) assert.ok(svg.includes(`fill="${value}"`), 'missing Universe hue ' + value);
        assert.match(svg, /publicationAuthority=false/);
        assert.match(svg, /Vorschau/);
        assert.doesNotMatch(svg, /<script|<foreignObject|<image|\bonload\s*=|(?:href|src)=["']https?:/i);
        assert.match(createHash('sha256').update(svg).digest('hex'), /^[a-f0-9]{64}$/);
      });
    }
  }
}

test('untrusted status, size and glow options fail closed', () => {
  for (const options of [
    { size: 'owner', status: 'aktiv', glowLevel: 1 },
    { size: 'small', status: '<script>', glowLevel: 1 },
    { size: 'small', status: 'aktiv', glowLevel: -1 },
    { size: 'small', status: 'aktiv', glowLevel: 11 },
    { size: 'small', status: 'aktiv', glowLevel: 1.5 },
    { size: 'small', status: 'aktiv', glowLevel: '10' },
  ]) assert.throws(() => renderLearningMastermindCard(options, tokens));
});

test('unapproved, incomplete or duplicated seven-color palettes fail closed', () => {
  const altered = structuredClone(tokens);
  altered.publishReady = true;
  assert.throws(() => renderLearningMastermindCard({size:'medium',status:'aktiv',glowLevel:0}, altered), /BRAND_TOKENS_NOT_ADMITTED/);
  altered.publishReady = false;
  altered.color.universe.green.$value = altered.color.universe.cyan.$value;
  assert.throws(() => renderLearningMastermindCard({size:'medium',status:'aktiv',glowLevel:0}, altered), /UNIVERSE_PALETTE_SEVEN_REQUIRED/);
  delete altered.color.universe.rose;
  assert.throws(() => renderLearningMastermindCard({size:'medium',status:'aktiv',glowLevel:0}, altered), /UNIVERSE_PALETTE_SEVEN_REQUIRED/);
  altered.color.universe.rose = {$value:'url(https://evil.test)'};
  assert.throws(() => renderLearningMastermindCard({size:'medium',status:'aktiv',glowLevel:0}, altered), /INVALID_BRAND_COLOR/);
});

test('renderer does not turn a generated graphic into an entitlement or publication permission', () => {
  const svg = renderLearningMastermindCard({size:'medium',status:'aktiv',glowLevel:10}, tokens);
  assert.match(svg, /preview only/);
  assert.match(svg, /keine eigenständige Rechteprüfung/);
  assert.match(svg, /not an external certification/);
});

/** Run on demand: node scripts/media/render-screener-blueprint-badges.mjs */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { SCREENER_BADGE_VARIANTS, renderScreenerBlueprintBadge } from '../../src/platform/SocialMediaEngine/Branding/ScreenerBlueprintBadgeRenderer.mjs';
const tokenPath = 'public/branding/asset-pack/meta/social-render-tokens.json';
const tokens = JSON.parse(readFileSync(resolve(tokenPath), 'utf8'));
if (tokens.publishReady !== false || tokens.schemaVersion !== 'CAPITAL_AI_SOCIAL_RENDER_TOKENS@1') throw new Error('BRANDING_TOKENS_NOT_ADMITTED');
const assets = SCREENER_BADGE_VARIANTS.map(variant => {
  const path = `public/branding/badges/screener-${variant}-blueprint.svg`;
  const svg = renderScreenerBlueprintBadge(variant, tokens);
  const target = resolve(path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, svg);
  return { variant, path, sha256: createHash('sha256').update(svg).digest('hex'), width: 256, height: 256, license: 'LicenseRef-CAPITAL-AI-SCREENER-BLUEPRINT-BADGE-PREVIEW-1.0', publishReady: false };
});
const manifest = { schemaVersion: 'SCREENER_BADGE_ASSET_SET@1', brandTokens: tokenPath, renderAuthority: 'src/platform/SocialMediaEngine/Branding/ScreenerBlueprintBadgeRenderer.mjs', generator: 'scripts/media/render-screener-blueprint-badges.mjs', publicationAuthority: false, assets };
writeFileSync(resolve('docs/licenses/screener-blueprint-badges.manifest.json'), JSON.stringify(manifest, null, 2)+'\n');
console.log(JSON.stringify(manifest));

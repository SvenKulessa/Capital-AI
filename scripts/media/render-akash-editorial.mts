import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { planContentCampaign } from '../../src/contracts/contentEngine.ts';
import { buildDraftContentSocialPackage } from '../../src/contracts/contentSocialPackage.ts';
import { ORIGINAL_GRAPHIC_LICENSE_VERSION, type OriginalGraphicAsset, type OriginalGraphicOwnerGrant } from '../../src/contracts/originalGraphicLicense.ts';
import { renderEditorialStatusGraphic, EDITORIAL_STATUS_RENDERER_VERSION } from '../../src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs';

// On-demand, offline recipe. It cannot ingest remote graphics or publish an edition.
const directory = resolve('docs/growth/drafts/akash-20261120');
const sourceSha = process.env.CAPITAL_RENDER_SOURCE_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceSha)) throw new Error('RENDER_SOURCE_SHA_INVALID');
const sourceDigest = 'a22788395b6a52862e0bb8bd976679615e0c8eaf1d4a68fc635ae4e7d4e3ac75';
const reviewedStoryDigest = '3b476e900a75e32ef9a5daba6ea3fecb93cdf03588677dcb2fb16a18f6394b31';
const contentId = 'akash-compute-forwards-design';
const sourceUrl = 'https://solana.com/news/day-2-at-breakpoint-2026-ai-compute-and-britains-tokenisation-push';
const sha = (bytes: string | Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const recipe = {
  eyebrow: 'AKASH COMPUTE FORWARDS',
  title: 'Künftige GPU-Rechenstunden',
  subtitle: 'Akash stellt einen Marktentwurf auf Solana vor.',
  rows: [
    { title: 'Entwurf', lines: ['Laut Solana', 'veröffentlicht'] },
    { title: 'Pilot', lines: ['Vorgesehen,', 'Voraussetzungen offen'] },
    { title: 'Rechenlieferung', lines: ['Geplant', 'Verfügbarkeit offen'] },
  ],
  note: 'Pilotstart abhängig von offenen Prüfungen und Voraussetzungen.',
  sourceLabel: 'Quelle: Solana · 19.11.2026 · Gegenprüfung: Akash',
  altText: 'Akash Compute Forwards. Ein Entwurf für künftige GPU-Rechenstunden auf Solana ist veröffentlicht. Ein Pilot ist vorgesehen und an offene Voraussetzungen gebunden. Rechenlieferungen sind geplant. Allgemeine Verfügbarkeit ist nicht nachgewiesen.',
};
// The rendered labels are part of the identity; the earlier HTML draft hash alone is insufficient.
const contentDigest = sha(JSON.stringify({ contentId, reviewedStoryDigest, sourceUrl, sourceDigest, recipe }));
const authorizationEvidenceRef = 'docs/licenses/CAPITAL-AI-ORIGINAL-GRAPHIC-LICENSE-1.0.md';
const licenseDocumentSha256 = sha(await readFile(authorizationEvidenceRef));
const generatedAt = new Date().toISOString();
const assets: OriginalGraphicAsset[] = [];
const grants: OriginalGraphicOwnerGrant[] = [];
await mkdir(directory, { recursive: true });
for (const format of ['landscape', 'portrait'] as const) {
  const rendered = await renderEditorialStatusGraphic({ ...recipe, format });
  const name = `akash-${format}`;
  await writeFile(resolve(directory, name + '.svg'), rendered.svg);
  await writeFile(resolve(directory, name + '.png'), rendered.png);
  const asset: OriginalGraphicAsset = {
    assetId: name, contentId, sourceSha, sourceDigest, contentDigest,
    sha256: sha(rendered.png), mimeType: 'image/png', origin: 'FIRST_PARTY_TEMPLATE',
    creationMethod: 'AI_ASSISTED', renderer: { id: 'EditorialStatusGraphicRenderer', version: EDITORIAL_STATUS_RENDERER_VERSION },
    thirdPartyAssets: false,
  };
  assets.push(asset);
  grants.push({
    contractVersion: ORIGINAL_GRAPHIC_LICENSE_VERSION, grantId: `owner-akash-${format}-20261120`,
    grantedBy: 'OWNER', ownerName: 'Sven Michael Kulessa', authorizationEvidenceRef,
    authorizedAt: generatedAt, decision: 'LICENSED', licenseId: 'LicenseRef-CapitalAI-Owned',
    asset, allowedChannels: ['WEBSITE', 'INSTAGRAM', 'X', 'LINKEDIN'], aiAssistanceDisclosed: true,
  });
}
const brief = {
  campaignId: 'akash-editorial-20261120', productId: 'capital-ai-learning-hub', sourceSha,
  canonicalUrl: 'https://capital-ai.online/', locale: 'de-DE' as const,
  objective: 'Akash Compute Forwards als Entwurf erklären und Pilot sowie Lieferstatus sachlich abgrenzen.',
  audience: ['FinTech-Lernende', 'KI-Infrastrukturentwickler'],
  channels: ['WEBSITE', 'INSTAGRAM', 'X', 'LINKEDIN'] as const,
  outputs: ['TEXT', 'IMAGE'] as const, sourceUrls: [sourceUrl],
};
const campaign = { ...brief, channels: [...brief.channels], outputs: [...brief.outputs] };
const plan = planContentCampaign(campaign, { originalGraphics: assets, graphicOwnerGrants: grants });
const socialPackage = buildDraftContentSocialPackage({ campaign, contentId, assets: assets.map(asset => ({
  assetId: asset.assetId, contentId, kind: 'IMAGE', sha256: asset.sha256, mimeType: asset.mimeType,
  sourceSha, evidenceRef: `docs/growth/drafts/akash-20261120/${asset.assetId}.png`, originalGraphic: asset,
})) });
const manifest = {
  generatedAt, sourceSha, sourceDigest, reviewedStoryDigest, contentDigest, licenseDocumentSha256,
  licenseId: 'LicenseRef-CapitalAI-Owned', authorizationEvidenceRef,
  dependencies: { font: 'public/fonts/PlusJakartaSans-Regular.ttf', fontLicense: 'public/fonts/OFL.txt',
    renderer: '@resvg/resvg-wasm', template: 'src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs' },
  sourceUrl, assets, graphicOwnerGrants: grants, plan, socialPackage,
  sourceRights: 'NOT_PROVEN', editorialReview: 'REVIEW_REQUIRED', publicPublishAllowed: false,
};
await writeFile(resolve(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

const html = `<!doctype html><html lang="de"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Akash – CAPITAL-AI Entwurf</title><style>body{margin:0;background:#070e1d;color:#f5f8ff;font:17px/1.6 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:24px}h1{font-size:clamp(26px,5vw,46px);line-height:1.15}figure{margin:24px 0}img{width:100%;height:auto;border-radius:20px}a{color:#a5effc}figcaption{font-size:14px;color:#bbc7d7}</style><main><p>CAPITAL-AI · Redaktioneller Entwurf</p><h1>Akash stellt Entwurf für künftige GPU-Rechenstunden vor</h1><p>Die Solana Foundation berichtet, dass Akash einen Entwurf für ein Orderbuch künftiger GPU-Rechenstunden auf Solana veröffentlicht hat. Ein Pilot und erste Rechenlieferungen sind angekündigt.</p><figure><picture><source media="(max-width:600px)" srcset="akash-portrait.png"><img src="akash-landscape.png" alt="${recipe.altText}" width="1440" height="960"></picture><figcaption>Eigene AI-assistierte Grafik · CAPITAL-AI · LicenseRef-CapitalAI-Owned · Grafiknutzung im autorisierten CAPITAL-AI-Kontext.</figcaption></figure><p>Der Entwurf verbindet Beschaffung von KI-Rechenleistung und Abwicklungsregeln. Allgemeine Verfügbarkeit und tatsächliche Lieferungen sind gesondert nachzuweisen.</p><p><a href="${sourceUrl}" rel="noopener noreferrer">Quelle: Solana Foundation · 19.11.2026</a></p></main></html>`;
await writeFile(resolve(directory, 'Akash-Vorschau.html'), html);
console.log(JSON.stringify({ directory, assets: assets.map(a => ({ id: a.assetId, sha256: a.sha256 })),
  contentDigest, graphicLicenses: plan.graphicLicenses?.map(p => [p.assetId, p.channel, p.state]), publicPublishAllowed: false }));

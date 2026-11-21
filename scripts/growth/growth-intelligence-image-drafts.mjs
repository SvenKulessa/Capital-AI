import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { buildGrowthIntelligenceContentDrafts } from '../../src/contracts/growthIntelligenceContent.ts';
import { planContentCampaign } from '../../src/contracts/contentEngine.ts';
import { buildDraftContentSocialPackage } from '../../src/contracts/contentSocialPackage.ts';
import { planOriginalGraphicLicense } from '../../src/contracts/originalGraphicLicense.ts';
import { buildSocialPublisherHandoff } from '../../src/contracts/socialPublisherAdapter.ts';
import { renderEditorialStatusGraphic, EDITORIAL_STATUS_RENDERER_VERSION } from '../../src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs';

// Source-bound, first-party, offline graphics. Never invokes a publisher or external provider.
export const SOURCE = 'CAPITAL-AI-GROWTH/growth-intelligence/content-plan-v1.json';
export const SOURCE_SHA256 = 'd08aa8e7f831dea7cb15010f46374f8fbdecaee1408619af1a4fb857460c1234';
export const OUTPUT = 'docs/growth/drafts/growth-intelligence-images-20261121';
const sha256 = input => createHash('sha256').update(input).digest('hex');

const RECIPES = Object.freeze([
  {
    id: 'CAP-GROW-005', channel: 'X', format: 'landscape', name: 'CAP-GROW-005-X',
    eyebrow: 'CAP-GROW-005 · X · METHODIK', title: 'Mehr Daten ≠ bessere Entscheidungen',
    subtitle: 'Qualität braucht Herkunft, Annahmen und Grenzen.',
    rows: [
      { title: 'QUELLE', lines: ['Datenherkunft', 'Zeitpunkt', 'Validierung'] },
      { title: 'ANNAHMEN', lines: ['Modelllogik', 'Parameter', 'Kontext'] },
      { title: 'GRENZEN', lines: ['Unsicherheit', 'Risikofilter', 'Einsatzgrenze'] },
    ],
    note: 'Methodik statt Renditeversprechen.',
    sourceLabel: 'Growth-Plan · CAP-GROW-005 · 20.11.2026',
    altText: 'Finanzanalyse mit drei Prüfbereichen: Quelle – Datenherkunft, Zeitpunkt, Validierung; Annahmen – Modelllogik, Parameter, Kontext; Grenzen – Unsicherheit, Risikofilter, Einsatzgrenze. Keine Prognose.',
  },
  {
    id: 'CAP-GROW-007', channel: 'INSTAGRAM', format: 'portrait', name: 'CAP-GROW-007-INSTAGRAM',
    eyebrow: 'CAP-GROW-007 · INSTAGRAM · LERNBEISPIEL', title: 'Risk-Veto vor Gesamtscore',
    subtitle: 'Synthetisches Beispiel, keine Handelsentscheidung.',
    rows: [
      { title: 'SIGNAL', lines: ['Hoher Score', 'Offenes Risiko', 'Nicht automatisch gut'] },
      { title: 'VETO', lines: ['Kritische Grenze', 'Stoppt die Freigabe', 'Keine Marktprognose'] },
      { title: 'KONTEXT', lines: ['Quelle prüfen', 'Annahmen erklären', 'Grenzen offenlegen'] },
    ],
    note: 'Synthetische Werte. Keine Anlageberatung.',
    sourceLabel: 'Growth-Plan · CAP-GROW-007 · 20.11.2026',
    altText: 'Synthetisches Risk-Veto: Ein hoher Score genügt nicht, ein kritisches Risiko stoppt die Bewertung; Quellen, Annahmen und Grenzen müssen geprüft werden. Keine echte Handelsentscheidung.',
  },
]);

export async function buildGrowthImageDrafts() {
  const sourceBytes = await readFile(new URL('../../' + SOURCE, import.meta.url));
  const sourceDigest = sha256(sourceBytes);
  if (sourceDigest !== SOURCE_SHA256) throw Error('GROWTH_IMAGE_SOURCE_CHANGED_REVALIDATE');
  const originals = buildGrowthIntelligenceContentDrafts(JSON.parse(sourceBytes.toString('utf8')));
  const drafts = [];
  for (const recipe of RECIPES) {
    const prior = originals.find(row => row.contentId === recipe.id);
    if (!prior || prior.channel !== recipe.channel) throw Error('GROWTH_IMAGE_CHANNEL_MISMATCH');
    const rendered = await renderEditorialStatusGraphic(recipe);
    const width = recipe.channel === 'X' ? 1440 : 1080;
    const height = recipe.channel === 'X' ? 960 : 1350;
    if (rendered.width !== width || rendered.height !== height ||
      rendered.png.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') {
      throw Error('GROWTH_IMAGE_RENDER_INVALID');
    }
    const assetSha = sha256(rendered.png);
    const sourceSha = prior.socialPackage.sourceSha;
    const contentDigest = sha256(JSON.stringify({ id: recipe.id, sourceDigest, sourceSha, recipe }));
    const originalGraphic = {
      assetId: recipe.id + '-draft-image', contentId: recipe.id, sha256: assetSha,
      mimeType: 'image/png', sourceSha, sourceDigest, contentDigest,
      origin: 'FIRST_PARTY_TEMPLATE', creationMethod: 'AI_ASSISTED',
      renderer: { id: 'EditorialStatusGraphicRenderer', version: EDITORIAL_STATUS_RENDERER_VERSION },
      thirdPartyAssets: false,
    };
    // Do not manufacture an Owner grant. Rights and publication remain unverified.
    const graphicRights = planOriginalGraphicLicense({ asset: originalGraphic, channel: recipe.channel });
    if (graphicRights.state !== 'REVIEW_REQUIRED' || graphicRights.graphicUseAllowed ||
        graphicRights.publicationAllowed) throw Error('GROWTH_IMAGE_RIGHTS_BOUNDARY');
    const campaign = { ...prior.contentPlan.campaign, outputs: ['TEXT', 'IMAGE', 'ANALYTICS'] };
    const contentPlan = planContentCampaign(campaign, { originalGraphics: [originalGraphic] });
    const path = OUTPUT + '/' + recipe.name + '.png';
    const socialPackage = buildDraftContentSocialPackage({ campaign, contentId: recipe.id, assets: [
      prior.socialPackage.assets[0],
      { assetId: originalGraphic.assetId, contentId: recipe.id, kind: 'IMAGE',
        sha256: assetSha, mimeType: originalGraphic.mimeType, sourceSha,
        evidenceRef: path, originalGraphic },
    ] });
    if (socialPackage.approvals.length || socialPackage.deliveries.length ||
        contentPlan.publication.publicPublishAllowed) throw Error('GROWTH_IMAGE_PUBLICATION_AUTHORITY');
    // This must fail with the existing real adapter state.
    try {
      buildSocialPublisherHandoff(socialPackage, recipe.channel, originalGraphic.assetId);
      throw Error('GROWTH_IMAGE_UNEXPECTED_PUBLISHER_READY');
    } catch (error) {
      if (error.message !== 'CONTENT_SOCIAL_PUBLISHER_NOT_READY') throw error;
    }
    drafts.push({
      contentId: recipe.id, channel: recipe.channel, width, height, altText: recipe.altText,
      png: rendered.png, svg: rendered.svg, assetPath: path,
      pngSha256: assetSha, svgSha256: sha256(rendered.svg),
      originalGraphic, graphicRights, contentPlan, socialPackage,
      rights: 'NOT_PROVEN', review: 'REVIEW_REQUIRED', publicPublishAllowed: false,
      providerCalls: 0, campaignSpend: 0,
    });
  }
  return { schemaVersion: 'CAPITAL_AI_GROWTH_IMAGE_DRAFTS@1', sourceDigest,
    publicationState: 'DRAFT_ONLY', publicPublishAllowed: false, providerCalls: 0,
    campaignSpend: 0, drafts };
}
const htmlEscape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");

export function growthImagePreviewHtml(drafts) {
  if (!Array.isArray(drafts) || drafts.length !== 2 ||
    drafts.some(d => !/^CAP-GROW-00[57]$/.test(d.contentId) || d.publicPublishAllowed ||
      d.graphicRights.graphicUseAllowed)) throw Error('GROWTH_IMAGE_PREVIEW_NOT_SAFE');
  const figures = drafts.map(d => {
    const name = d.assetPath.split('/').at(-1);
    return '<section><h2>' + htmlEscape(d.channel) + ' · ' + htmlEscape(d.contentId) +
      '</h2><figure><img src="' + htmlEscape(name) + '" alt="' + htmlEscape(d.altText) +
      '" width="' + d.width + '" height="' + d.height +
      '"><figcaption>Originalgrafik-Entwurf · SHA-256 ' + d.pngSha256 +
      ' · Rechte REVIEW_REQUIRED · Kein Publishing</figcaption></figure></section>';
  }).join('');
  return '<!doctype html><html lang="de"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>CAPITAL-AI Growth · Bild-Entwürfe</title>' +
    '<style>*{box-sizing:border-box}html{color-scheme:dark}body{margin:0;background:#02050e;color:#f8fafc;font:16px/1.5 system-ui,sans-serif}main{max-width:1100px;margin:auto;padding:16px}h1{font-size:clamp(1.5rem,5vw,2.5rem)}.gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:16px}figure{margin:0}section{min-width:0}img{display:block;width:100%;max-width:100%;height:auto;border-radius:12px}figcaption{overflow-wrap:anywhere;color:#d8e1ed;font-size:.875rem}a{color:#67e8f9}a:focus-visible{outline:3px solid #f9bf21;outline-offset:3px}@media(prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}</style>' +
    '</head><body><main id="start"><h1>Growth Intelligence · Bild-Entwürfe</h1>' +
    '<p>Offline-Vorschau. Redaktion, Nutzungsrechte und Providerfreigaben ausstehend.</p>' +
    '<div class="gallery">' + figures + '</div><p><a href="#start">Zum Anfang</a></p>' +
    '</main></body></html>\n';
}

export async function writeGrowthImageDrafts() {
  const bundle = await buildGrowthImageDrafts();
  const dir = resolve(OUTPUT);
  await mkdir(dir, { recursive: true });
  for (const draft of bundle.drafts) {
    const base = draft.assetPath.split('/').at(-1).replace(/\.png$/, '');
    await writeFile(resolve(dir, base + '.png'), draft.png, { flag: 'wx' });
    await writeFile(resolve(dir, base + '.svg'), draft.svg, { flag: 'wx' });
  }
  const report = { ...bundle, drafts: bundle.drafts.map(({ png, svg, ...metadata }) => metadata) };
  await writeFile(resolve(dir, 'manifest.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  await writeFile(resolve(dir, 'preview.html'), growthImagePreviewHtml(bundle.drafts), { flag: 'wx' });
  return report;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (process.argv.length !== 3 || process.argv[2] !== '--write') throw Error('GROWTH_IMAGE_ON_DEMAND_ONLY');
  const result = await writeGrowthImageDrafts();
  process.stdout.write(JSON.stringify({ output: OUTPUT,
    images: result.drafts.map(d => ({ id: d.contentId, channel: d.channel, sha256: d.pngSha256 })),
    publicationState: 'DRAFT_ONLY', providerCalls: 0 }) + '\n');
}

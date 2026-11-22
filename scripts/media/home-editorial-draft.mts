import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { ContentCampaignBriefSchema, planContentCampaign } from '../../src/contracts/contentEngine.ts';
import { buildDraftContentSocialPackage } from '../../src/contracts/contentSocialPackage';
import { ORIGINAL_GRAPHIC_LICENSE_ID } from '../../src/contracts/originalGraphicLicense';
import { homeEditorialPngPath, homeGraphicContentSnapshot, normalizeHomeStory } from '../../src/features/home/homeEditorialAdmission.mjs';
import { editorialSha256, verifyEditorialPng, type RenderedNewsGraphic } from '../../src/features/home/homeEditorialPng';
import {
  EDITORIAL_STATUS_RENDERER_VERSION, renderEditorialStatusGraphic,
} from '../../src/platform/SocialMediaEngine/Branding/EditorialStatusGraphicRenderer.mjs';

const utf8 = (value: string) => new TextEncoder().encode(value);
const font = new URL('../../public/fonts/PlusJakartaSans-Regular.ttf', import.meta.url);
const fontLicense = new URL('../../public/fonts/OFL.txt', import.meta.url);
const tokens = new URL('../../public/branding/asset-pack/meta/social-render-tokens.json', import.meta.url);

export async function buildHomeEditorialDraft(input: {
  candidate: unknown;
  sourceBytes: Uint8Array<ArrayBuffer>;
  sourceSha: string;
  asOf: string;
  observedAt: string;
  recipe: Parameters<typeof renderEditorialStatusGraphic>[0];
  layout: RenderedNewsGraphic['layout'];
}) {
  // The caller independently verifies that these are the bytes read from the candidate's primary source.
  if (!input.sourceBytes.length || !/^[a-f0-9]{40}$/.test(input.sourceSha) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(input.observedAt) ||
      !Number.isFinite(Date.parse(input.observedAt))) throw Error('HOME_DRAFT_PROVENANCE_INVALID');
  const base = normalizeHomeStory(input.candidate, input.asOf);
  const rendered = await renderEditorialStatusGraphic(input.recipe);
  const graphic = {
    kind: 'rendered-png', caption: base.graphic.caption, altText: rendered.altText, layout: input.layout,
    width: rendered.width, height: rendered.height,
  } as const;
  const sourceDigest = await editorialSha256(input.sourceBytes);
  const asset = {
    assetId: `home-${base.id}-png-v1`, contentId: base.id,
    sourceSha: input.sourceSha, sourceDigest,
    contentDigest: await editorialSha256(utf8(homeGraphicContentSnapshot({ ...base, graphic }))),
    sha256: await editorialSha256(new Uint8Array(rendered.png)),
    mimeType: 'image/png', origin: 'FIRST_PARTY_TEMPLATE', creationMethod: 'AI_ASSISTED',
    renderer: { id: 'EditorialStatusGraphicRenderer', version: EDITORIAL_STATUS_RENDERER_VERSION },
    thirdPartyAssets: false,
  } as const;
  const pending = { decision: 'REVIEW_REQUIRED', websiteAllowed: false, evidenceRef: null, reviewedAt: null };
  const story = normalizeHomeStory({ ...base, graphic: { ...graphic, asset },
    evidence: { ...base.evidence, graphic: { assetId: asset.assetId, mediaType: asset.mimeType },
      rights: { story: pending, source: pending, graphic: pending } } }, input.asOf);
  if (!await verifyEditorialPng(new Uint8Array(rendered.png), story.graphic)) throw Error('HOME_DRAFT_PNG_INVALID');
  const campaign = ContentCampaignBriefSchema.parse({
    campaignId: `home-draft-${story.id}`, productId: 'capital-ai-learning-hub', sourceSha: input.sourceSha,
    canonicalUrl: 'https://capital-ai.online/', objective: story.title, locale: 'de-DE',
    audience: ['FinTech-Lernende'], channels: ['WEBSITE'], outputs: ['TEXT', 'IMAGE'],
    sourceUrls: [story.source.url],
  });
  const text = [story.title, story.summary, story.context, `Quelle: ${story.source.name} · ${story.source.url}`].join('\n\n') + '\n';
  const textSha256 = await editorialSha256(utf8(text));
  const plan = planContentCampaign(campaign, { originalGraphics: [asset] });
  const socialPackage = buildDraftContentSocialPackage({ campaign, contentId: story.id, assets: [
    { assetId: story.id + '-text', contentId: story.id, sourceSha: input.sourceSha, kind: 'TEXT',
      mimeType: 'text/plain', sha256: textSha256, evidenceRef: 'article.txt' },
    { assetId: asset.assetId, contentId: story.id, sourceSha: input.sourceSha, kind: 'IMAGE',
      mimeType: asset.mimeType, sha256: asset.sha256, evidenceRef: 'graphic.png', originalGraphic: asset },
  ] });
  const provenance = {
    sourceUrl: story.source.url, observedAt: input.observedAt, sourceDigest,
    hashMethod: 'SHA-256 exact source response bytes', asset, recipe: input.recipe,
    inputs: await Promise.all([font, fontLicense, tokens].map(async file => ({
      repositoryPath: file.pathname.split('/public/').at(-1), sha256: await editorialSha256(new Uint8Array(await readFile(file))),
    }))),
  };
  const manifest = { story, provenance, textSha256, plan, socialPackage, targetPath: homeEditorialPngPath(asset.sha256),
    graphicOwnerReview: { state: 'REVIEW_REQUIRED', licenseId: ORIGINAL_GRAPHIC_LICENSE_ID,
      requestedChannel: 'WEBSITE', assetSha256: asset.sha256, sourceDigest, contentDigest: asset.contentDigest },
    publicPublishAllowed: false };
  return { manifest, text, png: rendered.png };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [inputPath, sourcePath, outputPath] = process.argv.slice(2);
  if (!inputPath || !sourcePath || !outputPath) throw Error('Usage: home-editorial-draft.mts request.json source-snapshot output-directory');
  const requested = resolve(outputPath);
  const root = join(await realpath(dirname(requested)), basename(requested));
  const projectPublic = await realpath(fileURLToPath(new URL('../../public/', import.meta.url)));
  if (root === projectPublic || root.startsWith(projectPublic + sep)) throw Error('HOME_DRAFT_PRIVATE_OUTPUT_REQUIRED');
  const input = JSON.parse(await readFile(inputPath, 'utf8'));
  const sourceSha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const draft = await buildHomeEditorialDraft({ ...input, sourceSha, sourceBytes: new Uint8Array(await readFile(sourcePath)) });
  await mkdir(root);
  await writeFile(join(root, 'manifest.json'), JSON.stringify(draft.manifest, null, 2) + '\n', { flag: 'wx' });
  await writeFile(join(root, 'article.txt'), draft.text, { flag: 'wx' });
  await writeFile(join(root, 'graphic.png'), draft.png, { flag: 'wx' });
}

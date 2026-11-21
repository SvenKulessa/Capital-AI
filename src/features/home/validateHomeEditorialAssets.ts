import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { planOriginalGraphicLicense, type OriginalGraphicOwnerGrant } from '../../contracts/originalGraphicLicense.ts';
import { homeEditorialPngPath, homeGraphicContentSnapshot, homeRightsAdmitted, normalizeHomeStory } from './homeEditorialAdmission.mjs';
import { homeReviewContentSnapshot } from './homeEditorialRightsLedger.mjs';
import { editorialSha256, verifyEditorialPng, type RenderedNewsGraphic } from './homeEditorialPng.ts';

export async function validateHomeEditorialAssets(
  stories: readonly unknown[], asOf: string, publicDir: string,
  reviews: readonly { kind: string; contentSnapshot: string; graphicGrantId?: string; evidenceRef?: string }[],
  grants: readonly OriginalGraphicOwnerGrant[],
) {
  const approvedFiles = new Set<string>();
  for (const input of stories) {
    const story = normalizeHomeStory(input, asOf);
    if (story.graphic.kind !== 'rendered-png') continue;
    const graphic = story.graphic as RenderedNewsGraphic;
    if (await editorialSha256(new TextEncoder().encode(homeGraphicContentSnapshot(story))) !== graphic.asset.contentDigest) {
      throw Error('HOME_EDITORIAL_PNG_CONTENT_MISMATCH');
    }
    const matchingReviews = reviews.filter(review => review.kind === 'graphic' &&
      review.contentSnapshot === homeReviewContentSnapshot(story) &&
      review.evidenceRef === story.evidence.rights.graphic.evidenceRef && review.graphicGrantId);
    const assetGrants = grants.filter(grant => grant.asset.assetId === graphic.asset.assetId);
    if (!homeRightsAdmitted(story, [...reviews]) || matchingReviews.length !== 1 || assetGrants.length !== 1 ||
        assetGrants[0].grantId !== matchingReviews[0].graphicGrantId ||
        !planOriginalGraphicLicense({asset: graphic.asset, channel: 'WEBSITE', asOf: asOf + 'T23:59:59Z'},
          assetGrants[0]).graphicUseAllowed) throw Error('HOME_EDITORIAL_PNG_OWNER_RIGHTS_REQUIRED');
    const path = homeEditorialPngPath(graphic.asset.sha256);
    if (!await verifyEditorialPng(new Uint8Array(await readFile(join(publicDir, path.slice(1)))), graphic)) {
      throw Error('HOME_EDITORIAL_PNG_BYTES_MISMATCH');
    }
    approvedFiles.add(path.split('/').at(-1)!);
  }
  const files = await readdir(join(publicDir, 'editorial/news')).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  if (files.some(file => !approvedFiles.has(file))) throw Error('HOME_EDITORIAL_UNAPPROVED_PUBLIC_ASSET');
}

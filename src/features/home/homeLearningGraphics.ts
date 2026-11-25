import type { PublicLearningArticle } from '../../data/learningArticles';
import { OriginalGraphicAssetSchema, planOriginalGraphicLicense, type OriginalGraphicOwnerGrant } from '../../contracts/originalGraphicLicense';
import type { RenderedNewsGraphic } from './homeEditorialPng';
import { HOME_GRAPHIC_OWNER_GRANTS } from './homeGraphicOwnerGrants';

export type HomeLearningGraphic = { articleId: string; graphic: RenderedNewsGraphic };

/** Only personally reviewed graphics enter this public inventory. Drafts stay private. */
export const HOME_LEARNING_GRAPHICS: readonly HomeLearningGraphic[] = Object.freeze([]);

export function learningGraphicArticleSnapshot(article: PublicLearningArticle) {
  const { id, title, body, hub, publishedAt, status } = article;
  return { id, title, body, hub, publishedAt, status };
}

export function learningGraphicContentSnapshot(article: PublicLearningArticle, graphic: RenderedNewsGraphic) {
  const { caption, altText, layout, width, height } = graphic;
  return JSON.stringify({ article: learningGraphicArticleSnapshot(article), graphic: { caption, altText, layout, width, height } });
}

export function getLicensedLearningGraphic(
  article: PublicLearningArticle,
  graphics: readonly HomeLearningGraphic[] = HOME_LEARNING_GRAPHICS,
  grants: readonly OriginalGraphicOwnerGrant[] = HOME_GRAPHIC_OWNER_GRANTS,
  asOf?: string,
) {
  if (article.status !== 'PUBLISHED') return undefined;
  const entries = graphics.filter(entry => entry.articleId === article.id);
  if (entries.length !== 1) return undefined;
  const graphic = entries[0].graphic;
  if (graphic.kind !== 'rendered-png' ||
      !OriginalGraphicAssetSchema.safeParse(graphic.asset).success ||
      graphic.asset.contentId !== article.id ||
      graphic.asset.assetId !== `home-learning-${article.id}-png-v1` ||
      graphic.asset.mimeType !== 'image/png' ||
      !((graphic.width === 1440 && graphic.height === 960) || (graphic.width === 1080 && graphic.height === 1350)) ||
      !graphic.caption.trim() || !graphic.altText.trim() ||
      !['hero','briefing','timeline','comparison'].includes(graphic.layout)) return undefined;
  const matches = grants.filter(grant => grant.asset.assetId === graphic.asset.assetId);
  if (matches.length !== 1) return undefined;
  return planOriginalGraphicLicense({ asset: graphic.asset, channel: 'WEBSITE', asOf }, matches[0]).graphicUseAllowed
    ? graphic : undefined;
}

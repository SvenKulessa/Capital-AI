// Structural editorial evidence gate for publicly indexed educational articles.
// This does not verify factual correctness, legal ownership, or human review.
const HTTPS = /^https:\/\//i;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const PLACEHOLDER = /(?:^|\b)(?:tbd|todo|lorem ipsum)(?:\b|$)/i;

function safePublicUrl(value) {
  if (typeof value !== 'string' || !HTTPS.test(value)) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password && !parsed.port &&
      !!parsed.hostname && !['localhost', '127.0.0.1'].includes(parsed.hostname);
  } catch { return false; }
}
function contentText(value, length = 16) {
  return typeof value === 'string' && value.trim().length >= length && !PLACEHOLDER.test(value);
}
export function auditPublicEditorialArticle(article) {
  const issues = [];
  if (!article || typeof article !== 'object' || Array.isArray(article)) return Object.freeze(['ARTICLE_MISSING']);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.id ?? '') ||
      article.path !== '/blog/' + article.id) issues.push('CANONICAL_IDENTITY');
  if (!contentText(article.title) || !contentText(article.description) || !contentText(article.intro, 50)) issues.push('EDITORIAL_CONTENT');
  if (!DATE.test(article.date ?? '') || !Number.isFinite(Date.parse((article.date ?? '') + 'T00:00:00Z')) ||
      new Date(article.date + 'T00:00:00Z').toISOString().slice(0, 10) !== article.date) issues.push('PUBLICATION_DATE');
  if (typeof article.image !== 'string' || !/^\/[a-z0-9/_-]+\.svg$/i.test(article.image) ||
      !contentText(article.imageAlt)) issues.push('ILLUSTRATION_AND_ALTERNATIVE_TEXT');
  if (!Array.isArray(article.sections) || article.sections.length < 2 ||
      article.sections.some(section => !contentText(section?.title, 4) || !contentText(section?.body, 50))) issues.push('EXPLANATORY_SECTIONS');
  if (!Array.isArray(article.sources) || article.sources.length < 1 ||
      article.sources.some(source => !contentText(source?.label, 4) || !safePublicUrl(source?.url))) issues.push('SOURCE_LINKS');
  // A explicitly blocked or draft article must never be projected as public.
  if (['DRAFT', 'BLOCKED', 'INTEGRATION_PENDING'].includes(article.status) ||
      article.publicationAuthority === 'BLOCKED' || article.publishReady === false) issues.push('NOT_PUBLICLY_APPROVED');
  return Object.freeze(issues);
}

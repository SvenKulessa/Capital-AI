import { blogArticleForPath } from './blog-articles.mjs';
import { seoContentForPath } from './seo-content-manifest.mjs';
import {
  VOCABULARY_PUBLIC_COUNT,
  vocabularyMetadataByPath,
} from './vocabulary-metadata.mjs';

export const SEO_SITE_ORIGIN = 'https://capital-ai.online';
export const SEO_SOCIAL_IMAGE = `${SEO_SITE_ORIGIN}/branding/asset-pack/social/open-graph-1200x630.jpg`;

function websiteSchema() {
  return {
    '@type': 'WebSite',
    '@id': `${SEO_SITE_ORIGIN}/#website`,
    url: `${SEO_SITE_ORIGIN}/`,
    name: 'Capital-AI',
    inLanguage: 'de',
    publisher: { '@id': `${SEO_SITE_ORIGIN}/#project` },
  };
}

function projectSchema() {
  return {
    '@type': 'Project',
    '@id': `${SEO_SITE_ORIGIN}/#project`,
    name: 'Capital-AI',
    description: 'Software-Plattform für Market Intelligence, BYOK-Providerzugänge und dokumentierte Daten- und Nutzungsrechte.',
    url: `${SEO_SITE_ORIGIN}/`,
    logo: `${SEO_SITE_ORIGIN}/branding/asset-pack/avatars/capital-ai-avatar-512x512.png`,
  };
}

function primarySchema(entry) {
  const common = {
    '@id': `${entry.canonical}#primary`,
    url: entry.canonical,
    name: entry.title,
    description: entry.description,
    inLanguage: entry.language,
  };

  if (entry.structuredDataType === 'BlogPosting') {
    const article = blogArticleForPath(entry.path);
    return { ...common, '@type': 'BlogPosting', headline: article.title, datePublished: article.date, dateModified: article.date, author: { '@type': 'Organization', name: 'CAPITAL AI' }, isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` } };
  }

  if (entry.structuredDataType === 'WebApplication') {
    return {
      ...common,
      '@type': 'WebApplication',
      applicationCategory: 'FinanceApplication',
      operatingSystem: 'Web',
      image: SEO_SOCIAL_IMAGE,
      isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
    };
  }

  if (entry.structuredDataType === 'DefinedTermSet') {
    return {
      ...common,
      '@type': 'DefinedTermSet',
      numberOfItems: VOCABULARY_PUBLIC_COUNT,
      isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
    };
  }

  if (entry.structuredDataType === 'DefinedTerm') {
    const term = vocabularyMetadataByPath.get(entry.path);
    return {
      ...common,
      '@type': 'DefinedTerm',
      alternateName: term?.thesaurus || [],
      termCode: term?.id || entry.slug,
      inDefinedTermSet: `${SEO_SITE_ORIGIN}/vocabulary`,
      isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
    };
  }

  return {
    ...common,
    '@type': 'WebPage',
    dateModified: entry.updatedAt,
    isPartOf: { '@id': `${SEO_SITE_ORIGIN}/#website` },
    about: { '@id': `${SEO_SITE_ORIGIN}/#project` },
  };
}

export function seoJsonLdForPath(pathname) {
  const entry = seoContentForPath(pathname);
  if (!entry) return null;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      websiteSchema(),
      projectSchema(),
      primarySchema(entry),
    ],
  };
}

export function seoMetadataForPath(pathname) {
  const entry = seoContentForPath(pathname);
  if (!entry) return null;

  return Object.freeze({
    title: entry.title,
    description: entry.description,
    canonical: entry.canonical,
    robots: entry.robots,
    language: entry.language,
    ogType: ['research', 'article'].includes(entry.contentType) ? 'article' : 'website',
    ogSiteName: 'Capital-AI',
    ogLocale: 'de_DE',
    ogImage: SEO_SOCIAL_IMAGE,
    ogImageAlt: 'Capital-AI.online — Globus in Blau und Gold',
    twitterCard: 'summary_large_image',
    twitterSite: '@CapitalAIOnline',
    jsonLd: seoJsonLdForPath(pathname),
  });
}

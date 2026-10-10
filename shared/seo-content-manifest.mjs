import {
  VOCABULARY_PUBLIC_COUNT,
  vocabularyDescription,
  vocabularyMetadata,
  vocabularyTitle,
} from './vocabulary-metadata.mjs';
import { QUANT_PRO_IDS } from './vocabulary-access-policy.mjs';
import {
  SEO_INDEXING_STATES,
  resolveSeoIndexingPolicy,
  seoIndexableStaticPaths,
} from './seo-indexing-policy.mjs';
import {
  SEO_PROVENANCE_GENERATED_AT_MAIN_SHA,
  seoSourceProvenance,
} from './seo-source-provenance.mjs';

export const SEO_CONTENT_MANIFEST_VERSION = '2026-10-05';
// Backward-compatible generation anchor. Per-route content identity is carried by
// sourceBlobSha/contentDigest/sourceBlobShas below.
export const SEO_CONTENT_SOURCE_SHA = SEO_PROVENANCE_GENERATED_AT_MAIN_SHA;

const DEFAULT_ROBOTS = 'index, follow, max-snippet:-1, max-image-preview:large';
const DEFAULT_LANGUAGE = 'de';
const DEFAULT_AUTHOR = 'CAPITAL-AI';
const DEFAULT_LICENSE = 'PROPRIETARY';

function canonicalFor(path) {
  return path === '/' ? 'https://capital-ai.online/' : `https://capital-ai.online${path}`;
}

function contentEntry({
  path,
  slug,
  title,
  description,
  contentType,
  domain,
  structuredDataType,
  socialEligible,
  aiSearchEligible,
  sourceRefs,
}) {
  const provenance = seoSourceProvenance(sourceRefs);
  if (!provenance) throw new Error(`Missing SEO source provenance for ${path}`);
  return Object.freeze({
    path,
    sourceBlobSha: provenance.sourceBlobSha,
    sourceBlobShas: provenance.sourceBlobShas,
    contentDigest: provenance.contentDigest,
    slug,
    title,
    description,
    canonical: canonicalFor(path),
    indexingState: SEO_INDEXING_STATES.INDEX,
    generatedAtMainSha: provenance.generatedAtMainSha,
    contentType,
    domain,
    language: DEFAULT_LANGUAGE,
    author: DEFAULT_AUTHOR,
    updatedAt: SEO_CONTENT_MANIFEST_VERSION,
    sourceSha: SEO_CONTENT_SOURCE_SHA,
    license: DEFAULT_LICENSE,
    robots: DEFAULT_ROBOTS,
    structuredDataType,
    searchEligible: true,
    socialEligible,
    aiSearchEligible,
    sourceRefs: Object.freeze([...sourceRefs]),
  });
}

const staticEntries = [
  contentEntry({
    path: '/',
    slug: 'home',
    title: 'Capital-AI | Market Intelligence & BYOK',
    description: 'Capital-AI verbindet eigene Providerzugänge mit nachvollziehbarer Marktanalyse, BYOK und überprüfbaren Datenrechten.',
    contentType: 'landing',
    domain: 'PRODUCT',
    structuredDataType: 'WebApplication',
    socialEligible: true,
    aiSearchEligible: true,
    sourceRefs: ['index.html', 'src/features/home/HomePage.tsx'],
  }),
  contentEntry({
    path: '/learning',
    slug: 'learning',
    title: 'Finanzwissen lernen: Glossar, Chartmuster & Quiz | Capital-AI',
    description: `Finanzbegriffe und Marktanalyse verständlich lernen: ${VOCABULARY_PUBLIC_COUNT} Fachbegriffe, Chartbeispiele und Quizzes. Lerninhalte entdecken und Learning-/Kursanfrage stellen.`,
    contentType: 'learning',
    domain: 'GROWTH',
    structuredDataType: 'DefinedTermSet',
    socialEligible: true,
    aiSearchEligible: true,
    sourceRefs: ['src/features/learning/LearningPortalPage.tsx', 'shared/vocabulary-metadata.mjs'],
  }),
  contentEntry({
    path: '/vocabulary',
    slug: 'vocabulary',
    title: `Capital-AI Vocabulary | ${VOCABULARY_PUBLIC_COUNT} Fachbegriffe & Thesaurus`,
    description: `${VOCABULARY_PUBLIC_COUNT} konsolidierte Capital-AI Fachbegriffe mit Definitionen und jeweils drei Thesaurus-Begriffen aus Marktanalyse, Scoring, Daten, Plattform, Security, Produkt, Governance und Mobile Runtime.`,
    contentType: 'vocabulary',
    domain: 'GROWTH',
    structuredDataType: 'DefinedTermSet',
    socialEligible: true,
    aiSearchEligible: true,
    sourceRefs: ['shared/vocabulary-metadata.mjs', 'src/features/learning/LearningPortalPage.tsx'],
  }),
  contentEntry({
    path: '/faq',
    slug: 'faq',
    title: 'Capital-AI | FAQ & Hilfe',
    description: 'Antworten zu Funktionen, Daten, Sicherheit, Konto und Nutzung von Capital-AI.',
    contentType: 'trust',
    domain: 'GROWTH',
    structuredDataType: 'WebPage',
    socialEligible: false,
    aiSearchEligible: true,
    sourceRefs: ['src/components/LegalAndFaqPages.tsx', 'src/content/publicLegalContent.ts'],
  }),
  contentEntry({
    path: '/lizenz',
    slug: 'lizenz',
    title: 'Capital-AI | Design & Bildherkunft',
    description: 'Herkunft des Capital-AI Designs, des Erdbilds und der Markenassets mit dokumentiertem Prüfstatus.',
    contentType: 'trust',
    domain: 'TRUST',
    structuredDataType: 'WebPage',
    socialEligible: false,
    aiSearchEligible: true,
    sourceRefs: ['shared/license-metadata.mjs', 'src/components/LicenseInformationPages.tsx'],
  }),
  contentEntry({
    path: '/datenprovider-lizenzen',
    slug: 'datenprovider-lizenzen',
    title: 'Capital-AI | Datenprovider-Lizenzen',
    description: 'Provider-Bedingungen und BYOK-Rechte und offene Nutzungsrechte für interne Analyse, Anzeige und Weitergabe.',
    contentType: 'trust',
    domain: 'TRUST',
    structuredDataType: 'WebPage',
    socialEligible: false,
    aiSearchEligible: true,
    sourceRefs: ['shared/license-metadata.mjs', 'src/data/providerLicenseReview.ts'],
  }),
  contentEntry({
    path: '/opensource-lizenzen',
    slug: 'opensource-lizenzen',
    title: 'Capital-AI | Open-Source-Lizenzen',
    description: 'Lizenzinventar für Anwendung, transitive Abhängigkeiten und Container mit getrenntem Prüfstatus.',
    contentType: 'trust',
    domain: 'TRUST',
    structuredDataType: 'WebPage',
    socialEligible: false,
    aiSearchEligible: true,
    sourceRefs: ['shared/license-metadata.mjs', 'OPEN_SOURCE_LICENSES.md'],
  }),
  contentEntry({
    path: '/impressum',
    slug: 'impressum',
    title: 'Capital-AI | Impressum',
    description: 'Anbieterkennzeichnung und öffentliche Kontaktinformationen für Capital-AI.',
    contentType: 'legal',
    domain: 'TRUST',
    structuredDataType: 'WebPage',
    socialEligible: false,
    aiSearchEligible: true,
    sourceRefs: ['src/components/LegalAndFaqPages.tsx', 'shared/legal-identity.mjs'],
  }),
  contentEntry({
    path: '/datenschutz',
    slug: 'datenschutz',
    title: 'Capital-AI | Datenschutz',
    description: 'Datenschutzhinweise zu Website, Anmeldung, Sitzungen, Provider-Vault und Datenschutzanfragen bei Capital-AI.',
    contentType: 'legal',
    domain: 'TRUST',
    structuredDataType: 'WebPage',
    socialEligible: false,
    aiSearchEligible: true,
    sourceRefs: ['src/components/LegalAndFaqPages.tsx', 'src/privacy/privacyPolicy.ts'],
  }),
  contentEntry({
    path: '/agb',
    slug: 'agb',
    title: 'Capital-AI | AGB & Nutzungsbedingungen',
    description: 'Öffentliche Nutzungsbedingungen und rechtliche Hinweise für Capital-AI.',
    contentType: 'legal',
    domain: 'TRUST',
    structuredDataType: 'WebPage',
    socialEligible: false,
    aiSearchEligible: true,
    sourceRefs: ['src/components/LegalAndFaqPages.tsx', 'src/content/legalDocumentVersions.ts'],
  }),
];

export const SEO_PUBLIC_VOCABULARY_ENTRIES = Object.freeze(
  vocabularyMetadata.filter((entry) => !QUANT_PRO_IDS.has(entry.id)),
);

const vocabularyEntries = SEO_PUBLIC_VOCABULARY_ENTRIES.map((entry) => contentEntry({
  path: entry.path,
  slug: `vocabulary-${entry.id}`,
  title: vocabularyTitle(entry),
  description: vocabularyDescription(entry),
  contentType: 'vocabulary-term',
  domain: 'GROWTH',
  structuredDataType: 'DefinedTerm',
  socialEligible: false,
  aiSearchEligible: true,
  sourceRefs: ['shared/vocabulary-metadata.mjs'],
}));

export const SEO_CONTENT_MANIFEST = Object.freeze([
  ...staticEntries,
  ...vocabularyEntries,
]);

export const SEO_CONTENT_BY_PATH = new Map(
  SEO_CONTENT_MANIFEST.map((entry) => [entry.path, entry]),
);

export function seoContentForPath(pathname) {
  return SEO_CONTENT_BY_PATH.get(pathname) || null;
}

export function validateSeoContentManifest() {
  const errors = [];
  const seenSlugs = new Set();
  const seenCanonicals = new Set();
  const seenTitles = new Set();
  const allowedDomains = new Set(['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH']);
  const expectedPaths = new Set([
    ...seoIndexableStaticPaths(),
    ...SEO_PUBLIC_VOCABULARY_ENTRIES.map((entry) => entry.path),
  ]);

  for (const entry of SEO_CONTENT_MANIFEST) {
    if (!expectedPaths.has(entry.path)) errors.push(`${entry.path}: path is not in the INDEX allowlist`);
    if (resolveSeoIndexingPolicy(entry.path).classification !== SEO_INDEXING_STATES.INDEX) {
      errors.push(`${entry.path}: policy is not INDEX`);
    }
    if (!entry.slug || seenSlugs.has(entry.slug)) errors.push(`${entry.path}: duplicate or missing slug`);
    if (!entry.canonical || seenCanonicals.has(entry.canonical)) errors.push(`${entry.path}: duplicate or missing canonical`);
    if (!entry.title || seenTitles.has(entry.title)) errors.push(`${entry.path}: duplicate or missing title`);
    if (!entry.description) errors.push(`${entry.path}: missing description`);
    if (!allowedDomains.has(entry.domain)) errors.push(`${entry.path}: invalid domain`);
    if (entry.language !== 'de') errors.push(`${entry.path}: unexpected language`);
    if (!/^[0-9a-f]{40}$/.test(entry.sourceSha)) errors.push(`${entry.path}: invalid sourceSha`);
    if (!/^[0-9a-f]{40}$/.test(entry.sourceBlobSha)) errors.push(`${entry.path}: invalid sourceBlobSha`);
    if (!/^sha256:[0-9a-f]{64}$/.test(entry.contentDigest)) errors.push(`${entry.path}: invalid contentDigest`);
    if (!/^[0-9a-f]{40}$/.test(entry.generatedAtMainSha)) errors.push(`${entry.path}: invalid generatedAtMainSha`);
    if (entry.indexingState !== SEO_INDEXING_STATES.INDEX) errors.push(`${entry.path}: invalid indexingState`);
    if (Object.keys(entry.sourceBlobShas).length !== entry.sourceRefs.length) errors.push(`${entry.path}: sourceBlobShas/sourceRefs mismatch`);
    if (entry.license !== 'PROPRIETARY') errors.push(`${entry.path}: unreviewed license marker`);
    if (entry.searchEligible !== true) errors.push(`${entry.path}: manifest entry must be searchEligible`);
    if (typeof entry.socialEligible !== 'boolean') errors.push(`${entry.path}: socialEligible must be boolean`);
    if (typeof entry.aiSearchEligible !== 'boolean') errors.push(`${entry.path}: aiSearchEligible must be boolean`);
    if (entry.structuredDataType === 'FinancialService') errors.push(`${entry.path}: FinancialService is not admitted`);
    if (!entry.canonical.startsWith('https://capital-ai.online/')) errors.push(`${entry.path}: non-canonical origin`);
    if (!entry.sourceRefs.length) errors.push(`${entry.path}: missing sourceRefs`);

    seenSlugs.add(entry.slug);
    seenCanonicals.add(entry.canonical);
    seenTitles.add(entry.title);
  }

  for (const path of expectedPaths) {
    if (!SEO_CONTENT_BY_PATH.has(path)) errors.push(`${path}: missing manifest entry`);
  }

  return errors;
}

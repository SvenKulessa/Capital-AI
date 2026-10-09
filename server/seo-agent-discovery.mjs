import { seoIndexableStaticPaths } from '../shared/seo-indexing-policy.mjs';

// Only these verified INDEX routes are eligible for public AI discovery.
// Do not include pricing state, account URLs, internal APIs or private evidence.
const PUBLIC_PAGE_LABELS = Object.freeze({
  '/': ['Capital-AI', 'Public product and project overview'],
  '/learning': ['Learning', 'Public education resources'],
  '/vocabulary': ['Market vocabulary', 'Public financial-market terminology'],
  '/faq': ['FAQ', 'Public answers and platform limitations'],
  '/lizenz': ['Asset licensing', 'Public asset and design licensing information'],
  '/datenprovider-lizenzen': ['Data-provider licensing', 'Public data-provider usage and licensing information'],
  '/opensource-lizenzen': ['Open-source licenses', 'Public open-source license inventory'],
  '/impressum': ['Legal notice', 'Legal publisher information'],
  '/datenschutz': ['Privacy policy', 'Public data-protection information'],
  '/agb': ['Terms', 'Public terms of use'],
});

const SITE_ORIGIN = 'https://capital-ai.online';

function publicLinks() {
  return seoIndexableStaticPaths()
    .filter((route) => Object.hasOwn(PUBLIC_PAGE_LABELS, route))
    .map((route) => {
      const [title, description] = PUBLIC_PAGE_LABELS[route];
      return `- [${title}](${SITE_ORIGIN}${route}): ${description}`;
    })
    .join('\n');
}

export function agentDiscoveryDocument(pathname) {
  if (pathname !== '/llms.txt' && pathname !== '/sitemap.md') return null;

  const body = pathname === '/llms.txt'
    ? `# CAPITAL-AI

> Multi-asset market-intelligence and educational platform. Feature availability, commercial terms and provider-data rights must be verified on the website. No investment outcomes are promised.

## Public resources

${publicLinks()}

## Optional

- [Public source repository](https://github.com/SvenKulessa/Capital-AI): Code and development evidence, not a guarantee of production readiness.
`
    : `# CAPITAL-AI public sitemap

> Human- and machine-readable navigation for the website's approved public content. For an exhaustive crawler sitemap, see [sitemap.xml](${SITE_ORIGIN}/sitemap.xml).

## Public pages

${publicLinks()}
`;

  return {
    body,
    contentType: pathname === '/llms.txt' ? 'text/plain; charset=utf-8' : 'text/markdown; charset=utf-8',
  };
}

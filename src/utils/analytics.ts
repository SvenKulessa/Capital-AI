/** Optional analytics is disabled until an accepted consent implementation exists. */
export const GA_MEASUREMENT_ID = '';
export function initGoogleAnalytics(_measurementId: string = GA_MEASUREMENT_ID) {}
export function trackEvent(_action: string, _params: Record<string, unknown> = {}) {}
export function trackPageView(_pagePath: string, _pageTitle: string) {}
export function trackLoginClick(_source: string = 'header') {}

/**
 * Updates dynamic SEO tags (title, description, canonical link, OpenGraph)
 */
export function updatePageSEO({
  title,
  description,
  canonicalPath = window.location.pathname,
}: {
  title: string;
  description: string;
  canonicalPath?: string;
}) {
  if (typeof document === 'undefined') return;

  // Title
  document.title = title;

  // Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', description);

  // OpenGraph Title & Description
  let ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle) ogTitle.setAttribute('content', title);

  let ogDesc = document.querySelector('meta[property="og:description"]');
  if (ogDesc) ogDesc.setAttribute('content', description);

  // Canonical URL
  const origin = window.location.origin || '';
  const fullCanonicalUrl = `${origin}${canonicalPath}`;
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', fullCanonicalUrl);
}

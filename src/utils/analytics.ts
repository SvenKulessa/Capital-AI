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
  canonicalPath,
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
  // Keep browser navigation aligned with the server's production canonical.
  // Preview hosts, campaigns and fragments must not create alternate identities.
  const canonicalOrigin = 'https://capital-ai.online';
  let pathname = '/';
  try {
    pathname = new URL(canonicalPath ?? window.location.pathname, canonicalOrigin).pathname;
  } catch {
    // Invalid route input safely falls back to the site's canonical home.
  }
  const fullCanonicalUrl = `${canonicalOrigin}${pathname}`;
  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', fullCanonicalUrl);

  let ogUrl = document.querySelector('meta[property="og:url"]');
  if (!ogUrl) {
    ogUrl = document.createElement('meta');
    ogUrl.setAttribute('property', 'og:url');
    document.head.appendChild(ogUrl);
  }
  ogUrl.setAttribute('content', fullCanonicalUrl);

  // Social previews must describe the current page after SPA navigation.
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
}

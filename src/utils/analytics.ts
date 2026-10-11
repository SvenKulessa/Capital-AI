import { isSeoIndexable, robotsDirectiveFor } from '../../shared/seo-indexing-policy.mjs';

type AnalyticsModule = typeof import('./consentedAnalytics.ts');
let modulePromise: Promise<AnalyticsModule> | null = null;
const analyticsModule = () => modulePromise ||= import('./consentedAnalytics.ts');
export const GA_MEASUREMENT_ID = '';
export function initGoogleAnalytics(_measurementId: string = GA_MEASUREMENT_ID) {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    void analyticsModule().then(module => module.startConsentedAnalytics());
  }
}
// Generic UI clicks and arbitrary event payloads are never forwarded.
export function trackEvent(_action: string, _params: Record<string, unknown> = {}) {}
export function trackPageView(_pagePath: string, _pageTitle: string) {
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    void analyticsModule().then(module => module.sendPageView(_pagePath));
  }
}
export function trackReceivedLearningInquiry(receipt: string) {
  if (typeof window !== 'undefined') void analyticsModule().then(module => module.trackReceivedLearningInquiry(receipt));
}
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
  // SPA transitions must not undo the server's fail-closed INDEX allowlist.
  // Never publish canonicals or URL-specific schema on private/NOINDEX routes.
  let robotsTag = document.querySelector('meta[name="robots"]');
  if (!robotsTag) {
    robotsTag = document.createElement('meta');
    robotsTag.setAttribute('name', 'robots');
    document.head.appendChild(robotsTag);
  }
  robotsTag.setAttribute('content', robotsDirectiveFor(pathname));

  if (!isSeoIndexable(pathname)) {
    document.querySelector('link[rel="canonical"]')?.remove();
    document.querySelector('meta[property="og:url"]')?.remove();
    document.getElementById('capital-ai-seo-jsonld')?.remove();
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
    return;
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

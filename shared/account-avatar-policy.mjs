/**
 * Presentation-only avatar URL policy shared by server and browser.
 * A picture never proves identity, ownership, entitlement or account rights.
 * Do not permit arbitrary remote hosts, credentials, ports, fragments, data or SVG URLs.
 */
export function safeAccountAvatarUrl(candidate) {
  if (typeof candidate !== 'string' || candidate.length > 2048) return null;
  if (candidate.startsWith('/api/profile/avatar/')) {
    return /^\/api\/profile\/avatar\/[A-Za-z0-9_-]{1,120}$/.test(candidate) ? candidate : null;
  }
  try {
    const value = new URL(candidate);
    if (value.protocol !== 'https:' || value.username || value.password || value.port || value.hash) return null;
    const host = value.hostname.toLowerCase();
    const trusted = host === 'lh3.googleusercontent.com' ||
      host.endsWith('.googleusercontent.com') ||
      host === 'pbs.twimg.com' ||
      host === 'images.notion.so' ||
      host === 'www.notion.so' ||
      host === 'secure.notion-static.com' ||
      host === 'prod-files-secure.s3.us-west-2.amazonaws.com';
    return trusted ? value.href : null;
  } catch {
    return null;
  }
}

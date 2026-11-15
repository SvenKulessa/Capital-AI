/**
 * Presentation-only identity picture. User metadata is untrusted and NEVER grants access.
 * Expose only HTTPS provider CDN URLs or same-origin public uploaded avatar paths.
 * Fail closed to the existing shield icon for every unsupported URL.
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
export function accountAvatarForVerifiedUser(authUser) {
  if (!authUser || typeof authUser !== 'object') return null;
  const meta = authUser.user_metadata || {};
  const identities = Array.isArray(authUser.identities) ? authUser.identities : [];
  const candidates = [
    meta.custom_avatar_url, meta.avatar_url, meta.picture,
    ...identities.flatMap(identity => [identity?.identity_data?.avatar_url, identity?.identity_data?.picture]),
  ];
  for (const value of candidates) {
    const safe = safeAccountAvatarUrl(value);
    if (safe) return safe;
  }
  return null;
}

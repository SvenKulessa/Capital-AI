import { safeAccountAvatarUrl } from '../shared/account-avatar-policy.mjs';
export { safeAccountAvatarUrl } from '../shared/account-avatar-policy.mjs';

/** Presentation only; a provider picture never grants entitlement or ownership. */
function providerOfUrl(url) {
  if (url.startsWith('/api/profile/avatar/')) return 'upload';
  const host = new URL(url).hostname;
  if (host === 'lh3.googleusercontent.com' || host.endsWith('.googleusercontent.com')) return 'google';
  if (host === 'pbs.twimg.com') return 'twitter';
  if (['images.notion.so', 'www.notion.so', 'secure.notion-static.com',
       'prod-files-secure.s3.us-west-2.amazonaws.com'].includes(host)) return 'notion';
  return null;
}
function normalizeProvider(provider) {
  if (typeof provider !== 'string') return null;
  const value = provider.toLowerCase();
  return value === 'x' ? 'twitter' : ['google', 'twitter', 'notion'].includes(value) ? value : null;
}
export function accountAvatarForVerifiedUser(authUser) {
  if (!authUser || typeof authUser !== 'object') return null;
  const meta = authUser.user_metadata || {};
  const uploaded = safeAccountAvatarUrl(meta.custom_avatar_url);
  if (uploaded?.startsWith('/api/profile/avatar/')) return uploaded;

  const identities = Array.isArray(authUser.identities) ? authUser.identities : [];
  const activeProvider = normalizeProvider(authUser.app_metadata?.provider);
  const providerPictures = identities.flatMap(identity => {
    const provider = normalizeProvider(identity?.provider);
    return [identity?.identity_data?.avatar_url, identity?.identity_data?.picture]
      .map(value => ({value, provider}));
  });
  if (activeProvider) {
    const candidates = [
      ...providerPictures.filter(item => item.provider === activeProvider).map(item => item.value),
      meta.avatar_url, meta.picture,
    ];
    for (const value of candidates) {
      const safe = safeAccountAvatarUrl(value);
      if (safe && providerOfUrl(safe) === activeProvider) return safe;
    }
    return null;
  }
  for (const value of [meta.avatar_url, meta.picture, ...providerPictures.map(item => item.value)]) {
    const safe = safeAccountAvatarUrl(value);
    if (safe && providerOfUrl(safe) !== 'upload') return safe;
  }
  return null;
}

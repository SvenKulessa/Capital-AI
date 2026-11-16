import { safeAccountAvatarUrl } from '../shared/account-avatar-policy.mjs';
export { safeAccountAvatarUrl } from '../shared/account-avatar-policy.mjs';

/** The auth provider has verified the identity; picture URLs are presentation-only. */
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

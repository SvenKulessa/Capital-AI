/** Display only: never used to grant server permissions or paid entitlements. */
export function accountDisplay(session) {
  if (session?.authenticated !== true) return null;
  if (session.account?.available !== true) return 'Kontostatus offen';
  if (session.account.iamRole === 'owner') return 'Owner';
  const tier = session.account.subscription?.tier;
  return ['Free', 'Starter', 'Pro', 'Enterprise'].includes(tier) ? tier : 'Kein Abo';
}
export function verifiedOwner(session) {
  return session?.authenticated === true && session.account?.available === true && session.account.iamRole === 'owner';
}

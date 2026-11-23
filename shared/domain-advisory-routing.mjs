export const ADVISORY_ROUTING_SCHEMA = 'CAPITAL_AI_ADVISORY_ROUTING@1';
const DOMAINS = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'];

export function advisoryTopology(registry) {
  const profiles = registry.advisoryRouting?.domains;
  if (registry.advisoryRouting?.schema !== ADVISORY_ROUTING_SCHEMA ||
      !profiles || Object.keys(profiles).length !== DOMAINS.length) {
    throw new TypeError('invalid advisory routing registry');
  }
  return DOMAINS.map(id => {
    const profile = profiles[id];
    const domain = registry.domains?.[id];
    const primarySkill = domain?.advisory;
    if (typeof primarySkill !== 'string' || typeof domain.scope !== 'string' ||
        typeof profile?.label !== 'string' || !profile.label.trim() ||
        !Array.isArray(profile.advisers) || profile.advisers.length < 2 ||
        profile.advisers[0]?.skill !== primarySkill ||
        new Set(profile.advisers.map(item => item?.skill)).size !== profile.advisers.length ||
        !profile.advisers.every(item => typeof item?.skill === 'string' &&
          Object.hasOwn(registry.skillGovernance, item.skill) &&
          typeof item.focus === 'string' && item.focus.trim()) ||
        !Array.isArray(profile.recommendedDomains) ||
        new Set(profile.recommendedDomains).size !== profile.recommendedDomains.length ||
        !profile.recommendedDomains.every(domain => domain !== id && DOMAINS.includes(domain)) ||
        !Array.isArray(profile.signals) || !profile.signals.length ||
        !profile.signals.every(signal => typeof signal === 'string' && signal.trim())) {
      throw new TypeError('invalid advisory routing profile: ' + id);
    }

    return {
      id, label: profile.label, scope: registry.domains[id].scope,
      advisers: profile.advisers.map(({ skill, focus }) => ({ skill, focus })),
      recommendedDomains: [...profile.recommendedDomains],
    };
  });
}

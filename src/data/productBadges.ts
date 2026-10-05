export type CapitalAiBadgeId =
  | 'starter'
  | 'pro'
  | 'enterprise'
  | 'vocabulary'
  | 'free-user'
  | 'vault'
  | 'owner';

export type BadgeOwnerType = 'subscription' | 'product' | 'feature' | 'role';

export interface CapitalAiBadge {
  id: CapitalAiBadgeId;
  label: string;
  src: string;
  ownerType: BadgeOwnerType;
  ownerKey: string;
  licenseRef: 'LicenseRef-CAPITAL-AI-PROPRIETARY-BADGE-1.0';
}

const LICENSE = 'LicenseRef-CAPITAL-AI-PROPRIETARY-BADGE-1.0' as const;

export const CAPITAL_AI_BADGES: Record<CapitalAiBadgeId, CapitalAiBadge> = {
  starter: {
    id: 'starter',
    label: 'Starter',
    src: '/branding/badges/starter.svg',
    ownerType: 'subscription',
    ownerKey: 'starter',
    licenseRef: LICENSE,
  },
  pro: {
    id: 'pro',
    label: 'Pro',
    src: '/branding/badges/pro.svg',
    ownerType: 'subscription',
    ownerKey: 'pro',
    licenseRef: LICENSE,
  },
  enterprise: {
    id: 'enterprise',
    label: 'Enterprise',
    src: '/branding/badges/enterprise.svg',
    ownerType: 'subscription',
    ownerKey: 'enterprise',
    licenseRef: LICENSE,
  },
  vocabulary: {
    id: 'vocabulary',
    label: 'Vocabulary',
    src: '/branding/badges/vocabulary.svg',
    ownerType: 'product',
    ownerKey: 'market-vocabulary',
    licenseRef: LICENSE,
  },
  'free-user': {
    id: 'free-user',
    label: 'Free User',
    src: '/branding/badges/free-user.svg',
    ownerType: 'role',
    ownerKey: 'free',
    licenseRef: LICENSE,
  },
  vault: {
    id: 'vault',
    label: 'Vault',
    src: '/branding/badges/vault.svg',
    ownerType: 'feature',
    ownerKey: 'personal-api-vault',
    licenseRef: LICENSE,
  },
  owner: {
    id: 'owner',
    label: 'Owner',
    src: '/branding/badges/owner.svg',
    ownerType: 'role',
    ownerKey: 'owner',
    licenseRef: LICENSE,
  },
};

export function badgeForSubscription(tier: string) {
  const normalized = tier.trim().toLowerCase();
  if (normalized === 'starter' || normalized === 'pro' || normalized === 'enterprise') {
    return CAPITAL_AI_BADGES[normalized];
  }
  return CAPITAL_AI_BADGES['free-user'];
}

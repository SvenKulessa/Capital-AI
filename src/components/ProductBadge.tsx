import React from 'react';
import { CAPITAL_AI_BADGES, type CapitalAiBadgeId } from '../data/productBadges';

const SIZE_CLASS = {
  sm: 'h-8 w-8',
  md: 'h-12 w-12',
  lg: 'h-16 w-16',
} as const;

export function ProductBadge({
  badge,
  size = 'md',
  className = '',
}: {
  badge: CapitalAiBadgeId;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
}) {
  const asset = CAPITAL_AI_BADGES[badge];
  return (
    <img
      src={asset.src}
      alt={`${asset.label} Badge`}
      title={asset.label}
      width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
      height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
      loading="lazy"
      decoding="async"
      className={`${SIZE_CLASS[size]} shrink-0 rounded-xl object-contain ${className}`}
      data-badge-owner-type={asset.ownerType}
      data-badge-owner-key={asset.ownerKey}
    />
  );
}

import React, { useState } from 'react';
import { UserRound } from 'lucide-react';
import { safeAccountAvatarUrl } from '../../../shared/account-avatar-policy.mjs';

type VerifiedProfileAvatarProps = {
  avatarUrl?: string | null;
  name?: string | null;
  size?: 'small' | 'large';
};

/** Presentation only: never infer permissions or a purchase from an avatar. */
export function VerifiedProfileAvatar({ avatarUrl, name, size = 'large' }: VerifiedProfileAvatarProps) {
  const verifiedUrl = safeAccountAvatarUrl(avatarUrl);
  // Bind failures to the exact URL: a failed remote image must never reappear on re-render.
  // A different verified URL remains eligible for a new load without a reset effect.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const failed = verifiedUrl !== null && failedUrl === verifiedUrl;
  const dimensions = size === 'small' ? 'h-9 w-9' : 'h-16 w-16';
  const commonClass = `${dimensions} shrink-0 rounded-xl border border-violet-400/30 bg-violet-500/10 object-cover`;

  if (!verifiedUrl || failed) {
    return <span className={`inline-flex items-center justify-center ${commonClass}`}
      role="img" aria-label={name ? `Profilbild von ${name} nicht verfügbar` : 'Profilbild nicht verfügbar'}>
      <UserRound aria-hidden="true" className="h-5 w-5 text-violet-200" />
    </span>;
  }

  return <img key={verifiedUrl} src={verifiedUrl} width={size === 'small' ? 36 : 64}
    height={size === 'small' ? 36 : 64} className={commonClass} referrerPolicy="no-referrer"
    loading="lazy" decoding="async" alt={name ? `Profilbild von ${name}` : 'Profilbild'}
    onError={() => setFailedUrl(verifiedUrl)} />;
}

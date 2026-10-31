/** Shared, local-only artwork recipe for the homepage and Content Studio. */
export const BRAND_GLOBE = Object.freeze({
  id: 'capital-ai-brand-globe-v1',
  asset: '/branding/universe/hero-universe-globe.webp',
  assetSha256: 'd510ac752e79314d69475a7645c554625b86ed676b0b04aabbc2869599de8eb4',
  ownerUploadSha256: 'e80996a5eb537504c7352c7668e1580bca8823b1a2c5acfd78bff056aebf2b70',
  revolutionSeconds: 90,
  // Project the branded front view onto both hemispheres, not an invented map
  // of the unseen Earth. The supplied illustration is not a geographic dataset.
  projection: { size: 1254, centerX: 645, centerY: 626, radius: 378 },
  orbitColors: [0xffc640, 0x37ddff, 0xcd29ff, 0xff283c, 0x3265ff, 0x23ef88],
});

export function brandGlobePose(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) throw new RangeError('Invalid globe time');
  const phase = seconds / BRAND_GLOBE.revolutionSeconds * Math.PI * 2;
  return { earthY: phase, orbitY: -phase * 2, tiltZ: -.12 };
}

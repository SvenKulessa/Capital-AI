import type { OriginalGraphicAsset } from '../../contracts/originalGraphicLicense';

export type RenderedNewsGraphic = {
  kind: 'rendered-png';
  caption: string;
  altText: string;
  layout: 'hero' | 'briefing' | 'timeline' | 'comparison';
  width: number;
  height: number;
  asset: OriginalGraphicAsset;
};

export async function editorialSha256(bytes: Uint8Array<ArrayBuffer>) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function verifyEditorialPng(bytes: Uint8Array<ArrayBuffer>, graphic: RenderedNewsGraphic) {
  if (bytes.length < 33 || bytes.length > 2_000_000 ||
      bytes.subarray(0, 8).join(',') !== '137,80,78,71,13,10,26,10') return false;
  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (header.getUint32(8) !== 13 || header.getUint32(12) !== 0x49484452 ||
      header.getUint32(16) !== graphic.width || header.getUint32(20) !== graphic.height) return false;
  return await editorialSha256(bytes) === graphic.asset.sha256;
}

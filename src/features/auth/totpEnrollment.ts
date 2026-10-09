/** QR rendering uses image URLs, never HTML injection or an external QR service. */
export function totpQrImage(value: unknown): string {
  if (typeof value !== 'string' || value.length > 900_000) return '';
  const raw = value.trim();
  if (/^data:image\/(svg\+xml|png)[;,]/i.test(raw)) return raw;
  const svg = raw.replace(/^<\?xml[^?]*\?>\s*/i, '').trim();
  if (/^<svg(?:\s|>)/i.test(svg) && /<\/svg>\s*$/i.test(svg)) {
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  return '';
}

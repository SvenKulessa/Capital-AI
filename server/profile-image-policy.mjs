/**
 * Fail-closed profile-image admission policy. No upload is made public here.
 * Upload bytes must be quarantined and scanned server-side before publication.
 */
export const PROFILE_IMAGE_LIMIT_BYTES = 2 * 1024 * 1024;
export const PROFILE_IMAGE_ALLOWED_MIME = Object.freeze([
  'image/png', 'image/jpeg', 'image/webp',
]);

export function validateProfileImageMetadata({ mime, size, filename }) {
  if (!PROFILE_IMAGE_ALLOWED_MIME.includes(mime)) return { ok: false, reason: 'unsupported_media_type' };
  if (!Number.isSafeInteger(size) || size <= 0 || size > PROFILE_IMAGE_LIMIT_BYTES) {
    return { ok: false, reason: 'invalid_file_size' };
  }
  if (typeof filename !== 'string' || filename.length < 1 || filename.length > 128 ||
      /[\\/\x00-\x1f]/.test(filename)) return { ok: false, reason: 'invalid_filename' };
  return { ok: true };
}

/** Only trusted server-side scan evidence may admit a quarantined upload. */
export function canPublishProfileImage({ metadata, magicMime, scan, sha256 }) {
  if (!metadata?.ok || !PROFILE_IMAGE_ALLOWED_MIME.includes(magicMime)) return false;
  if (!/^[a-f0-9]{64}$/.test(sha256 ?? '')) return false;
  if (!scan || scan.status !== 'clean' || scan.sha256 !== sha256 ||
      scan.engine !== 'clamav' || scan.signatureVersion == null) return false;
  return true;
}

/** Never infer the login provider from an arbitrary external URL. */
export function selectProfileAvatar({ approvedUpload, loginProvider, providerAvatars = {} }) {
  if (approvedUpload?.admitted === true && typeof approvedUpload.url === 'string' &&
      approvedUpload.url.startsWith('/api/profile/avatar/')) return approvedUpload.url;
  if (!['google', 'x', 'notion'].includes(loginProvider)) return null;
  const candidate = providerAvatars[loginProvider];
  if (typeof candidate !== 'string') return null;
  try {
    const parsed = new URL(candidate);
    const allowed = {
      google: ['lh3.googleusercontent.com'],
      x: ['pbs.twimg.com'],
      notion: ['www.notion.so', 's3.us-west-2.amazonaws.com'],
    };
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password &&
      allowed[loginProvider].includes(parsed.hostname) ? parsed.href : null;
  } catch { return null; }
}

export const DEFAULT_MAX_REQUEST_BYTES = 1024 * 1024;

export function contentLengthExceedsLimit(headers, maxBytes = DEFAULT_MAX_REQUEST_BYTES) {
  const raw = headers?.['content-length'];
  if (raw == null || raw === '') return false;
  const length = Number(raw);
  return Number.isFinite(length) && length >= 0 && length > maxBytes;
}

export async function readBoundedRequestBody(request, maxBytes = DEFAULT_MAX_REQUEST_BYTES) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) throw new TypeError('maxBytes must be a positive safe integer');

  let total = 0;
  const chunks = [];

  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += bytes.byteLength;
    if (total > maxBytes) {
      const error = new Error('request body exceeds configured limit');
      error.code = 'REQUEST_BODY_TOO_LARGE';
      error.status = 413;
      throw error;
    }
    chunks.push(bytes);
  }

  return Buffer.concat(chunks, total);
}

import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export const DEMO_OBJECT = 'youtube-verification/demo.mp4.enc';
const MAX_ENVELOPE_BYTES = 100 * 1024 * 1024 + 128;

export async function readDemoObject({ bucket, generation, token, fetchImpl = fetch }) {
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket ?? '') ||
      !/^[1-9][0-9]{0,19}$/.test(generation ?? '')) throw Error('STORAGE_INPUT_INVALID');
  if (typeof token !== 'string' || token.length < 9 || /[\s]/.test(token)) throw Error('STORAGE_AUTH_REQUIRED');
  const url = new URL('https://storage.googleapis.com/storage/v1/b/' + bucket + '/o/' + encodeURIComponent(DEMO_OBJECT));
  url.searchParams.set('alt', 'media');
  url.searchParams.set('generation', generation);
  const response = await fetchImpl(url.href, {
    headers: { Authorization: 'Bearer ' + token },
    redirect: 'error',
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok || !response.body) throw Error('STORAGE_READ_FAILED');

  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_ENVELOPE_BYTES) throw Error('STORAGE_OBJECT_TOO_LARGE');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  if (size === 0) throw Error('STORAGE_OBJECT_EMPTY');
  return Buffer.concat(chunks, size);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const envelope = await readDemoObject({
      bucket: process.env.YOUTUBE_DEMO_BUCKET,
      generation: process.env.DEMO_OBJECT_GENERATION,
      token: process.env.DEMO_STORAGE_ACCESS_TOKEN,
    });
    await mkdir('verification-media', { mode: 0o700 });
    await writeFile('verification-media/demo.mp4.enc', envelope, { flag: 'wx', mode: 0o600 });
    console.log('YOUTUBE_DEMO_STORAGE_READ_PASS');
  } catch {
    console.error('YOUTUBE_DEMO_STORAGE_READ_STOPPED');
    process.exitCode = 1;
  }
}

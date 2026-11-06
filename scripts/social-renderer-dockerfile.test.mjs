import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dockerfile = readFileSync(new URL('../deploy/social-media/Dockerfile.renderer', import.meta.url), 'utf8');

test('FFmpeg source builds with WORKDIR and checksum-preserving archive extraction', () => {
  const build = dockerfile.split(/\\nFROM \\S+ AS runtime\\b/)[0];
  assert.match(build, /ARG FFMPEG_VERSION\\b/);
  assert.match(build, /WORKDIR \\/tmp\\/ffmpeg-\\$\\{FFMPEG_VERSION\\}/);
  assert.match(build, /curl --proto '=https' --tlsv1\\.2/);
  assert.match(build, /ffmpeg-\\$\\{FFMPEG_VERSION\\}\\.tar\\.xz/);
  assert.match(build, /sha256sum -c -/);
  assert.match(build, /tar -xJf ffmpeg\\.tar\\.xz --strip-components=1/);
  assert.doesNotMatch(build, /\\bRUN\\s+cd\\s+|&&\\s*cd\\s+/);
  assert.doesNotMatch(build, /--enable-(gpl|nonfree|version3)/);
});

test('runtime remains a non-root short-lived renderer without an invented probe', () => {
  const runtime = dockerfile.split(/\\nFROM \\S+ AS runtime\\b/)[1];
  assert.ok(runtime, 'The renderer has a separate runtime stage');
  assert.match(runtime, /WORKDIR \\/work/);
  assert.match(runtime, /USER 10001:10001/);
  assert.match(runtime, /CMD \\[/);
  assert.doesNotMatch(runtime, /^HEALTHCHECK/m);
});

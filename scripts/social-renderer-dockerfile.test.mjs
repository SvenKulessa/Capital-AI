import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const dockerfile = readFileSync(new URL('../deploy/social-media/Dockerfile.renderer', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/social-renderer-worker-evidence.yml', import.meta.url), 'utf8');

test('FFmpeg source builds with WORKDIR and checksum-preserving archive extraction', () => {
  const build = dockerfile.split(/\nFROM \S+ AS runtime\b/)[0];
  assert.match(build, /ARG FFMPEG_VERSION\b/);
  assert.match(build, /WORKDIR \/tmp\/ffmpeg-\$\{FFMPEG_VERSION\}/);
  assert.match(build, /curl --proto '=https' --tlsv1\.2/);
  assert.match(build, /--retry 4 --retry-all-errors --retry-delay 2 --retry-max-time 90 --connect-timeout 15/);
  assert.match(build, /ffmpeg-\$\{FFMPEG_VERSION\}\.tar\.xz/);
  assert.match(build, /sha256sum -c -/);
  assert.match(build, /tar -xJf ffmpeg\.tar\.xz --strip-components=1/);
  assert.doesNotMatch(build, /\bRUN\s+cd\s+|&&\s*cd\s+/);
  assert.doesNotMatch(build, /--enable-(gpl|nonfree|version3)/);
});

test('worker streams only committed COPY inputs; archive and Docker failures remain fatal', () => {
  const archiveStart = workflow.indexOf('          git archive --format=tar');
  assert.notEqual(archiveStart, -1);
  const block = workflow.slice(archiveStart).split(/\n\s*\n/)[0]
    .split('\n').map(line => line.slice(10)).join('\n');
  const directory = mkdtempSync(join(tmpdir(), 'renderer-context-'));
  try {
    const git = (...args) => execFileSync('git', args, { cwd: directory, stdio: 'pipe' }).toString().trim();
    const put = (path, data, mode) => {
      mkdirSync(dirname(join(directory, path)), { recursive: true });
      writeFileSync(join(directory, path), data, { mode });
    };
    git('init', '-q');
    // Derive required local inputs from the actual Dockerfile, ignoring stage copies.
    const inputs = [...dockerfile.matchAll(/^COPY (?!-)(\S+) /gm)].map(match => match[1]);
    for (const path of ['deploy/social-media/Dockerfile.renderer', ...inputs]) {
      put(path === 'scripts/media' ? `${path}/worker.py` : path, `committed:${path}`);
    }
    put('unrelated.txt', 'tracked but outside the context allowlist');
    git('add', '.');
    git('-c', 'user.name=Context Test', '-c', 'user.email=context@example.invalid', 'commit', '-qm', 'fixture');
    const sha = git('rev-parse', 'HEAD');
    put('.env', 'synthetic untracked secret');
    put('scripts/media/untracked.txt', 'synthetic untracked output');
    put('scripts/media/worker.py', 'uncommitted modification');
    put('bin/docker', '#!/bin/bash\ncat > "$CAPTURE_CONTEXT"\nprintf "%s\\n" "$@" > "$CAPTURE_ARGS"\nexit "${DOCKER_EXIT:-0}"\n', 0o755);
    const env = {
      ...process.env, PATH: `${join(directory, 'bin')}:${process.env.PATH}`,
      GITHUB_SHA: sha, PYTHON_BASE: 'python@sha256:test', FFMPEG_VERSION: 'test', FFMPEG_SHA256: 'test',
      CAPTURE_CONTEXT: join(directory, 'context.tar'), CAPTURE_ARGS: join(directory, 'args'),
    };
    const run = extra => spawnSync('bash', ['-euo', 'pipefail', '-c', block], { cwd: directory, env: { ...env, ...extra }, encoding: 'utf8' });
    assert.equal(run().status, 0);
    const members = execFileSync('tar', ['-tf', env.CAPTURE_CONTEXT], { encoding: 'utf8' }).split('\n').filter(path => path && !path.endsWith('/'));
    assert.deepEqual(members.sort(), ['deploy/social-media/Dockerfile.renderer', ...inputs.map(path => path === 'scripts/media' ? `${path}/worker.py` : path)].sort());
    assert.equal(execFileSync('tar', ['-xOf', env.CAPTURE_CONTEXT, 'scripts/media/worker.py'], { encoding: 'utf8' }), 'committed:scripts/media');
    const args = readFileSync(env.CAPTURE_ARGS, 'utf8').trim().split('\n');
    assert.equal(args.at(-1), '-');
    assert.ok(args.includes(`capital-ai-social-renderer:${sha}`));
    assert.equal(run({ DOCKER_EXIT: '17' }).status, 17);
    assert.notEqual(run({ GITHUB_SHA: 'invalid-revision' }).status, 0);
    git('rm', 'deploy/social-media/renderer-requirements.txt');
    git('-c', 'user.name=Context Test', '-c', 'user.email=context@example.invalid', 'commit', '-qm', 'missing input');
    assert.notEqual(run({ GITHUB_SHA: git('rev-parse', 'HEAD') }).status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('runtime remains a non-root short-lived renderer without an invented probe', () => {
  const runtime = dockerfile.split(/\nFROM \S+ AS runtime\b/)[1];
  assert.ok(runtime, 'The renderer has a separate runtime stage');
  assert.match(runtime, /WORKDIR \/work/);
  assert.match(runtime, /USER 10001:10001/);
  assert.match(runtime, /['"]musl>=1\.2\.5-r13['"]/);
  assert.match(runtime, /['"]musl-utils>=1\.2\.5-r13['"]/);
  assert.match(runtime, /CMD \[/);
  assert.doesNotMatch(runtime, /^HEALTHCHECK/m);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const image = read('deploy/Dockerfile.nats');
const entrypoint = read('deploy/nats-entrypoint.sh');
const smoke = read('scripts/verify-nats-runtime.sh');
const ignores = read('deploy/trivy-bootstrap-exception.yaml');
const executable = entrypoint.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n');

test('NATS runtime is UID/GID 1000 with a preowned mode-0700 JetStream directory', () => {
  assert.match(image, /^USER 1000:1000$/m);
  assert.doesNotMatch(image, /^USER 0(?::0)?$/m);
  assert.match(image, /mkdir -p \/var\/data\/jetstream/);
  assert.match(image, /chown -R 1000:1000 \/var\/data/);
  assert.match(image, /chmod 0700 \/var\/data\/jetstream/);
  assert.doesNotMatch(image, /\bsu-exec\b/);
});
test('entrypoint refuses elevated identity, absent or insecure disks and bad credentials', () => {
  assert.match(executable, /\$\(id -u\).*1000/);
  assert.match(executable, /\$\(id -g\).*1000/);
  assert.match(executable, /NATS_ROOTLESS_ID_REQUIRED/);
  assert.match(executable, /NATS_STORE_PREPROVISION_REQUIRED/);
  assert.match(executable, /NATS_STORE_OWNERSHIP_REQUIRED/);
  assert.match(executable, /stat -c '%u:%g'/);
  assert.match(executable, /stat -c '%a'/);
  assert.match(executable, /umask 077/);
  assert.match(executable, /exec \/usr\/local\/bin\/nats-server/);
  assert.doesNotMatch(executable, /\b(chown|chmod|sudo|su-exec|adduser)\b/);
});
test('disposable Docker verification covers restart, recreation, bind mounts and denials', () => {
  for (const keyword of ['docker restart', 'docker volume create', '--cap-drop ALL',
    'no-new-privileges', 'CapEff:', 'missing directory', 'foreign owner',
    'unsafe permissions', 'symlink', 'root override',
    'missing bridge password', 'short executor password']) {
    assert.ok(smoke.includes(keyword), 'missing test evidence: ' + keyword);
  }
  assert.doesNotMatch(smoke, /--cap-add|docker run --privileged/);
});
test('no NATS root exception remains active or extended', () => {
  assert.match(ignores, /^misconfigurations: \[\]$/m);
  assert.doesNotMatch(ignores, /AVD-DS-0002|expired_at:/);
});

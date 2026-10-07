import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dockerfile = readFileSync(new URL('../deploy/Dockerfile.provider-bridge', import.meta.url), 'utf8');
const worker = readFileSync(new URL('../deploy/render-provider-bridge.yaml', import.meta.url), 'utf8');
const nats = readFileSync(new URL('../deploy/render-nats.yaml', import.meta.url), 'utf8');
const app = readFileSync(new URL('../render.yaml', import.meta.url), 'utf8');
const lock = readFileSync(new URL('../services/provider-bridge-rs/Cargo.lock', import.meta.url), 'utf8');

test('provider bridge build is lockfile-bound and base image digest-pinned', () => {
  assert.match(lock, /^version = 4$/m);
  assert.match(dockerfile, /^FROM rust:1\.99\.0-alpine3\.23@sha256:[a-f0-9]{64} AS build$/m);
  assert.match(dockerfile, /cargo test --locked/);
  assert.match(dockerfile, /cargo build --release --locked/);
  assert.match(dockerfile, /^FROM scratch$/m);
});

test('provider bridge runtime is non-root and healthchecks NATS with the bridge identity', () => {
  assert.match(dockerfile, /^USER 65532:65532$/m);
  assert.match(dockerfile, /HEALTHCHECK .*capital-ai-provider-bridge", "--healthcheck"/);
  assert.match(dockerfile, /^ENTRYPOINT \["\/usr\/local\/bin\/capital-ai-provider-bridge"\]$/m);
});

test('Render bridge is a background worker with deploy automation disabled', () => {
  assert.match(worker, /- type: worker/);
  assert.match(worker, /name: capital-ai-provider-bridge/);
  assert.match(worker, /region: frankfurt/);
  assert.match(worker, /plan: 0\.5c-512mb/);
  assert.match(worker, /autoDeployTrigger: 'off'/);
  assert.match(worker, /dockerfilePath: \.\/deploy\/Dockerfile\.provider-bridge/);
  assert.match(worker, /key: NATS_BRIDGE_USER[\s\S]*value: capital-ai-provider-bridge/);
  assert.match(worker, /key: NATS_BRIDGE_PASSWORD[\s\S]*sync: false/);
  assert.doesNotMatch(worker, /NATS_EXECUTOR_PASSWORD/);
  assert.doesNotMatch(worker, /PRIVATE_PROVIDER_QUERY_SIGNING_SECRET/);
});

test('NATS blueprint declares separated app bridge and executor identities', () => {
  for (const key of [
    'NATS_APP_USER',
    'NATS_APP_PASSWORD',
    'NATS_BRIDGE_USER',
    'NATS_BRIDGE_PASSWORD',
    'NATS_EXECUTOR_USER',
    'NATS_EXECUTOR_PASSWORD',
  ]) assert.match(nats, new RegExp(`key: ${key}`));
});

test('application blueprint has executor credentials but bridge stays fail-closed', () => {
  assert.match(app, /key: NATS_EXECUTOR_USER[\s\S]*value: capital-ai-provider-executor/);
  assert.match(app, /key: NATS_EXECUTOR_PASSWORD[\s\S]*sync: false/);
  assert.match(app, /key: PRIVATE_PROVIDER_QUERY_SIGNING_SECRET[\s\S]*sync: false/);
  assert.match(app, /key: PRIVATE_PROVIDER_BRIDGE_ENABLED[\s\S]*value: "false"/);
  assert.doesNotMatch(app, /key: NATS_BRIDGE_PASSWORD/);
});

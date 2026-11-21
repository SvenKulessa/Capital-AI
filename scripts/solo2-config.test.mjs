import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, chmodSync, statSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  createSolo2Profile, validateSolo2Profile, solo2ConfigReadiness,
  SOLO2_RESOURCES, SOLO2_SKILLS,
} from '../shared/solo2-config.mjs';
import { runCli } from './solo2-config.mjs';

const SHA = 'a'.repeat(40);
const clone = o => JSON.parse(JSON.stringify(o));
const profile = () => createSolo2Profile(SHA);
const reject = (mutate, match = /SOLO2_CONFIG_/) => {
  const value = profile();
  mutate(value);
  assert.throws(() => validateSolo2Profile(value), match);
};

test('registry skill IDs equal the canonical 26-skill source (no drift)', () => {
  const registry = JSON.parse(readFileSync(new URL('../.agents/skills/registry.json', import.meta.url)));
  const skills = Object.values(registry.domains).flatMap(domain => domain.ownedSkills);
  assert.deepEqual([...SOLO2_SKILLS].sort(), skills.sort());
});
test('default is an offline-only, source-bound, zero-cost declaration', () => {
  const draft = validateSolo2Profile(profile());
  assert.equal(draft.project, 'CAPITAL-AI');
  assert.equal(draft.mode, 'OFFLINE_LOCAL');
  assert.equal(draft.online.enabled, false);
  assert.equal(draft.online.maxExternalCalls, 0);
  assert.equal(draft.limits.maxPaidEur, 0);
  assert.equal(draft.safeguard.execution, 'DISABLED');
  assert.equal(draft.safeguard.publish, false);
  assert.equal(solo2ConfigReadiness(draft).state, 'CONFIGURED_NOT_ACTIVATED');
});
test('declared customer plugin and permission cannot activate an adapter', () => {
  const value = profile();
  value.mode = 'HYBRID_REVIEW';
  const tinyfish = value.resources.find(r => r.id === 'tinyfish');
  tinyfish.selected = true;
  tinyfish.requestedRight = 'EXECUTE_REQUESTED';
  tinyfish.owner = 'CUSTOMER_RESOURCE';
  const result = solo2ConfigReadiness(value);
  assert.equal(result.online, 'REQUESTED_NOT_CONNECTED');
  assert.deepEqual(result.selectedExternal, ['tinyfish']);
  assert.equal(value.safeguard.authority, 'NONE');
  assert.equal(value.online.enabled, false);
});
test('reject unknown fields, embedded secrets and fake evidence grants', () => {
  reject(o => { o.apiKey = 'sensitive'; }, /SECRET_FIELD_DENIED/);
  reject(o => { o.resources[0].token = 'sensitive'; }, /SECRET_FIELD_DENIED/);
  reject(o => { o.__proto__ = { privileged: true }; }, /TOP_LEVEL/);
  reject(o => { o.resources[0].licenseEvidence = 'VERIFIED'; });
  reject(o => { o.resources[0].rightsEvidence = 'VERIFIED'; });
  reject(o => { o.safeguard.licenseGrant = true; });
  reject(o => { o.safeguard.publish = true; });
  reject(o => { o.safeguard.authority = 'OWNER'; });
  reject(o => { o.online.enabled = true; });
  reject(o => { o.online.maxExternalCalls = 1; });
  reject(o => { o.limits.maxPaidEur = 1; });
});
test('reject crossing project, injected domain/skill, stale identifier and duplicate resources', () => {
  reject(o => { o.project = 'DeviceCare-KI'; });
  reject(o => { o.repository = 'SvenKulessa/Other-Repo'; });
  reject(o => { o.sourceSha = 'main'; });
  reject(o => { o.tenantRef = '../other-user'; });
  reject(o => { o.domains.push('ROOT'); });
  reject(o => { o.skills.push('new-unsafe-skill'); });
  reject(o => { o.domains = ['GROWTH']; }, /TRUST_REQUIRED/);
  reject(o => { o.resources[0].id = o.resources[1].id; });
  reject(o => { o.resources[0].kind = 'PLUGIN'; });
  reject(o => { o.pipelines[0].id = o.pipelines[1].id; });
  reject(o => { o.offline.rootAgent = 'n8n'; });
  reject(o => { o.online.ciPollSeconds = 1; });
});
test('CLI creates private JSON and allows bounded set without execution', () => {
  const dir = mkdtempSync(join(tmpdir(), 'solo2-config-'));
  const path = join(dir, 'profile.json');
  try {
    assert.equal(runCli(['init', '--file', path, '--source-sha', SHA]).state, 'CONFIGURED_NOT_ACTIVATED');
    assert.equal(statSync(path).mode & 0o077, 0);
    assert.equal(runCli(['set', '--file', path, '--key', 'mode', '--value', 'HYBRID_REVIEW']).online, 'REQUESTED_NOT_CONNECTED');
    runCli(['set', '--file', path, '--key', 'resources.n8n.selected', '--value', 'true']);
    runCli(['set', '--file', path, '--key', 'resources.n8n.requestedRight', '--value', 'EXECUTE_REQUESTED']);
    assert.ok(runCli(['show', '--file', path]).resources.find(r => r.id === 'n8n').selected);
    assert.deepEqual(runCli(['validate', '--file', path]).selectedExternal, ['n8n']);
    assert.throws(() => runCli(['set', '--file', path, '--key', 'safeguard.execution', '--value', 'ENABLED']));
    assert.throws(() => runCli(['set', '--file', path, '--key', 'resources.n8n.licenseEvidence', '--value', 'VERIFIED']));
    assert.equal(runCli(['show', '--file', path]).resources.find(r => r.id === 'n8n').licenseEvidence, 'NOT_PROVEN');
    const child = spawnSync(process.execPath, ['scripts/solo2-config.mjs', 'validate', '--file', path], { encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr);
    assert.match(child.stdout, /CONFIGURED_NOT_ACTIVATED/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('CLI refuses public files, public directories and secret-bearing imports', () => {
  const dir = mkdtempSync(join(tmpdir(), 'solo2-config-'));
  const path = join(dir, 'profile.json');
  try {
    runCli(['init', '--file', path, '--source-sha', SHA]);
    chmodSync(path, 0o644);
    assert.throws(() => runCli(['show', '--file', path]), /PRIVATE_FILE_REQUIRED/);
    chmodSync(path, 0o600);
    const bad = clone(profile());
    bad.resources[0].credentialRef = 'sensitive';
    writeFileSync(path, JSON.stringify(bad), { mode: 0o600 });
    assert.throws(() => runCli(['validate', '--file', path]), /SECRET_FIELD_DENIED/);
    chmodSync(dir, 0o755);
    assert.throws(() => runCli(['validate', '--file', path]), /PRIVATE_DIRECTORY_REQUIRED/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test('owner interface mounts same local draft contract, no network write surface', () => {
  const panel = readFileSync(new URL('../src/components/RoadmapSkillOrchestrationPanel.tsx', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/components/Solo2RuntimeConfigurator.tsx', import.meta.url), 'utf8');
  assert.match(panel, /<Solo2RuntimeConfigurator sourceSha=/);
  assert.match(ui, /createSolo2Profile/);
  assert.match(ui, /validateSolo2Profile/);
  assert.match(ui, /JSON für CLI exportieren/);
  assert.doesNotMatch(ui, /fetch\(|localStorage|sessionStorage|api\/internal\/.*(?:write|configure)/);
});

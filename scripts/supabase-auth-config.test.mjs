import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';

test('CAPITAL-AI auth email configuration validates locally without secrets or network', () => {
  const run = spawnSync(process.execPath, ['scripts/supabase-auth-config.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_ACCESS_TOKEN: '', SUPABASE_PROJECT_REF: '' },
  });
  assert.equal(run.status, 0, run.stderr);
  const report = JSON.parse(run.stdout);
  assert.equal(report.status, 'PASS');
  assert.equal(report.mode, 'local-check');
  assert.equal(report.templateCount, 13);
  assert.equal(report.passkey.rpId, 'capital-ai.online');
  assert.equal(report.mutation, false);
  assert.doesNotMatch(run.stdout, /sb_secret|access_token|refresh_token/i);
});

test('all Supabase email actions use first-party TokenHash verification routes', async () => {
  const templates = JSON.parse(await readFile('supabase/email-templates/templates.json', 'utf8'));
  for (const name of ['confirmation', 'invite', 'magic_link', 'recovery', 'email_change']) {
    assert.match(templates[name].actionUrl, /^\{\{ \.SiteURL \}\}\/api\/auth\/email\/verify\?token_hash=\{\{ \.TokenHash \}\}&type=/);
    assert.doesNotMatch(templates[name].actionUrl, /ConfirmationURL/);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { MAIL_BRAND, MAIL_SHELL, renderBrandedMail, renderSupportMail, renderLearningInquiryMail } from '../shared/mail-templates.mjs';

test('one Supabase layout shared by auth, support and learning inquiry', () => {
  assert.match(MAIL_SHELL, /%%NOTICE%%/);
  assert.ok(MAIL_SHELL.includes(MAIL_BRAND.logo));
  for (const type of ['reply', 'absence']) {
    const { html, subject, text } = renderSupportMail(type);
    assert.ok(subject && text.length > 50);
    assert.match(html, /capital-ai-avatar-120x120\.png/);
    assert.match(html, /#f9bf21/);
    assert.doesNotMatch(html, /%%[A-Z_]+%%|Konto- oder Sicherheitsvorgang/);
  }
  assert.match(renderSupportMail('signature').html, /<img[^>]+alt="CAPITAL-AI Logo"/);
  assert.equal(MAIL_BRAND.supportEmail, 'support@capital-ai.online');
});

test('untrusted input is escaped before it becomes email HTML', () => {
  const payload = '<img src=x onerror="alert(1)">& goodbye';
  const answer = renderSupportMail('reply', { name: payload, answer: payload, nextSteps: payload, subject: 'One\r\nBcc:foo' });
  assert.doesNotMatch(answer.subject, /[\r\n]/);
  assert.doesNotMatch(answer.html, /<img src=x/);
  assert.match(answer.html, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;&amp;/);
  const course = renderLearningInquiryMail(payload + ' lorem ipsum');
  assert.match(course.html, /&lt;img/);
  assert.ok(course.text.includes(payload));
  assert.throws(() => renderLearningInquiryMail('<bad>'), /INVALID/);
});

test('auth wording remains distinct and tokens are not resolved by mail renderer', () => {
  const html = renderBrandedMail({ title: 'Anmeldung', bodyHtml: '{{ .TokenHash }}', kind: 'auth' });
  assert.match(html, /Konto- oder Sicherheitsvorgang/);
  assert.match(html, /{{ \.TokenHash }}/);
  assert.doesNotMatch(html, /%%[A-Z_]+%%/);
  assert.throws(() => renderBrandedMail({ title: 'Test', bodyHtml: 'x', shell: '%%UNKNOWN%%' }), /UNRESOLVED/);
});

test('offline export writes three HTML/text pairs without sending mail', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'capital-mail-'));
  try {
    const proc = spawnSync(process.execPath, ['scripts/export-mail-templates.mjs', '--out-dir', dir], { cwd: process.cwd(), encoding: 'utf8' });
    assert.equal(proc.status, 0, proc.stderr);
    for (const file of ['signatur', 'antwortvorlage', 'abwesenheitsnotiz']) {
      assert.ok((await readFile(join(dir, file + '.html'), 'utf8')).length > 100);
      assert.ok((await readFile(join(dir, file + '.txt'), 'utf8')).length > 50);
    }
    assert.equal(JSON.parse(proc.stdout).sendsMail, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

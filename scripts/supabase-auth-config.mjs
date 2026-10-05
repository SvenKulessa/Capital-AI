import { readFile } from 'node:fs/promises';
import process from 'node:process';

const EXPECTED_PROJECT_REF = 'ryzywoktpmyhwzxmstyu';
const EXPECTED_SITE_ORIGIN = 'https://capital-ai.online';
const RP_ID = 'capital-ai.online';

const SECURITY_NOTIFICATION_KEYS = [
  'mailer_notifications_password_changed_enabled',
  'mailer_notifications_email_changed_enabled',
  'mailer_notifications_phone_changed_enabled',
  'mailer_notifications_identity_linked_enabled',
  'mailer_notifications_identity_unlinked_enabled',
  'mailer_notifications_mfa_factor_enrolled_enabled',
  'mailer_notifications_mfa_factor_unenrolled_enabled',
];

const TEMPLATE_KEYS = {
  confirmation: ['mailer_subjects_confirmation', 'mailer_templates_confirmation_content'],
  invite: ['mailer_subjects_invite', 'mailer_templates_invite_content'],
  magic_link: ['mailer_subjects_magic_link', 'mailer_templates_magic_link_content'],
  recovery: ['mailer_subjects_recovery', 'mailer_templates_recovery_content'],
  email_change: ['mailer_subjects_email_change', 'mailer_templates_email_change_content'],
  reauthentication: ['mailer_subjects_reauthentication', 'mailer_templates_reauthentication_content'],
  password_changed_notification: ['mailer_subjects_password_changed_notification', 'mailer_templates_password_changed_notification_content'],
  email_changed_notification: ['mailer_subjects_email_changed_notification', 'mailer_templates_email_changed_notification_content'],
  phone_changed_notification: ['mailer_subjects_phone_changed_notification', 'mailer_templates_phone_changed_notification_content'],
  identity_linked_notification: ['mailer_subjects_identity_linked_notification', 'mailer_templates_identity_linked_notification_content'],
  identity_unlinked_notification: ['mailer_subjects_identity_unlinked_notification', 'mailer_templates_identity_unlinked_notification_content'],
  mfa_factor_enrolled_notification: ['mailer_subjects_mfa_factor_enrolled_notification', 'mailer_templates_mfa_factor_enrolled_notification_content'],
  mfa_factor_unenrolled_notification: ['mailer_subjects_mfa_factor_unenrolled_notification', 'mailer_templates_mfa_factor_unenrolled_notification_content'],
};

function fail(message) {
  throw new Error(message);
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function actionMarkup(entry) {
  if (!entry.actionLabel || !entry.actionUrl) return '';
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:22px;">
      <tr>
        <td bgcolor="#f9bf21" style="border-radius:12px;">
          <a href="${escapeAttribute(entry.actionUrl)}" style="display:inline-block;padding:13px 20px;color:#02050e;text-decoration:none;font-size:14px;font-weight:900;">${entry.actionLabel}</a>
        </td>
      </tr>
    </table>`;
}

function detailMarkup(entry) {
  return entry.detail
    ? `<div style="margin-top:18px;font-size:13px;line-height:1.65;color:#cbd5e1;">${entry.detail}</div>`
    : '';
}

function render(shell, entry) {
  const rendered = shell
    .replaceAll('%%TITLE%%', entry.title)
    .replace('%%BODY%%', entry.body)
    .replace('%%ACTION%%', actionMarkup(entry))
    .replace('%%DETAIL%%', detailMarkup(entry));
  if (/%%[A-Z_]+%%/.test(rendered)) fail('MAIL_TEMPLATE_PLACEHOLDER_UNRESOLVED');
  return rendered;
}

function validateAbsoluteOrigins(html, name) {
  const absoluteUrls = html.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  for (const rawUrl of absoluteUrls) {
    let parsed;
    try {
      parsed = new URL(rawUrl);
    } catch {
      fail(`MAIL_TEMPLATE_INVALID_ABSOLUTE_URL:${name}`);
    }
    if (parsed.protocol !== 'https:' || parsed.origin !== EXPECTED_SITE_ORIGIN) {
      fail(`MAIL_TEMPLATE_EXTERNAL_ORIGIN:${name}`);
    }
  }
}

function validateTemplates(shell, templates) {
  const missing = Object.keys(TEMPLATE_KEYS).filter(key => !templates[key]);
  if (missing.length) fail(`MAIL_TEMPLATE_TYPES_MISSING:${missing.join(',')}`);

  for (const [name, entry] of Object.entries(templates)) {
    if (!TEMPLATE_KEYS[name]) fail(`MAIL_TEMPLATE_TYPE_UNSUPPORTED:${name}`);
    if (!entry.subject || !entry.title || !entry.body) fail(`MAIL_TEMPLATE_FIELDS_MISSING:${name}`);
    const html = render(shell, entry);
    if (!html.includes('CAPITAL-AI')) {
      fail(`MAIL_TEMPLATE_BRANDING_MISSING:${name}`);
    }
    validateAbsoluteOrigins(html, name);
  }

  for (const name of ['confirmation', 'invite', 'magic_link', 'recovery', 'email_change']) {
    const actionUrl = String(templates[name].actionUrl || '');
    if (!actionUrl.includes('{{ .TokenHash }}')) fail(`TOKEN_HASH_LINK_REQUIRED:${name}`);
    if (actionUrl.includes('{{ .ConfirmationURL }}')) fail(`CONFIRMATION_URL_FORBIDDEN:${name}`);
    if (!actionUrl.startsWith('{{ .SiteURL }}/api/auth/email/verify?')) fail(`FIRST_PARTY_VERIFY_ROUTE_REQUIRED:${name}`);
  }
}

function configPatch(shell, templates) {
  const patch = {
    mfa_totp_enroll_enabled: true,
    mfa_totp_verify_enabled: true,
    passkey_enabled: true,
    webauthn_rp_display_name: 'CAPITAL-AI',
    webauthn_rp_id: RP_ID,
    webauthn_rp_origins: EXPECTED_SITE_ORIGIN,
  };

  for (const key of SECURITY_NOTIFICATION_KEYS) patch[key] = true;

  for (const [name, [subjectKey, contentKey]] of Object.entries(TEMPLATE_KEYS)) {
    patch[subjectKey] = templates[name].subject;
    patch[contentKey] = render(shell, templates[name]);
  }

  return patch;
}

async function load() {
  const [shell, rawTemplates] = await Promise.all([
    readFile(new URL('../supabase/email-templates/capital-ai-auth-email-shell.html', import.meta.url), 'utf8'),
    readFile(new URL('../supabase/email-templates/templates.json', import.meta.url), 'utf8'),
  ]);
  const templates = JSON.parse(rawTemplates);
  validateTemplates(shell, templates);
  return { shell, templates, patch: configPatch(shell, templates) };
}

async function remoteConfig(projectRef, token) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) fail(`SUPABASE_AUTH_CONFIG_READ_${response.status}`);
  return response.json();
}

function compare(current, desired) {
  const mismatches = [];
  for (const [key, value] of Object.entries(desired)) {
    if (current?.[key] !== value) mismatches.push(key);
  }
  return mismatches;
}

async function apply(projectRef, token, patch) {
  const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(projectRef)}/config/auth`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) fail(`SUPABASE_AUTH_CONFIG_PATCH_${response.status}`);
  return response.json();
}

const args = new Set(process.argv.slice(2));
const wantsRemote = args.has('--remote') || args.has('--apply');
const wantsApply = args.has('--apply');
const projectRef = process.env.SUPABASE_PROJECT_REF || '';
const accessToken = process.env.SUPABASE_ACCESS_TOKEN || '';

const { templates, patch } = await load();

if (!wantsRemote) {
  console.log(JSON.stringify({
    status: 'PASS',
    mode: 'local-check',
    templateCount: Object.keys(templates).length,
    passkey: {
      enabled: true,
      rpId: RP_ID,
      rpOrigin: EXPECTED_SITE_ORIGIN,
      experimental: true,
    },
    totp: {
      enrollEnabled: true,
      verifyEnabled: true,
    },
    securityNotifications: {
      enabled: SECURITY_NOTIFICATION_KEYS,
    },
    checkedKeys: Object.keys(patch).sort(),
    mutation: false,
  }));
  process.exit(0);
}

if (projectRef !== EXPECTED_PROJECT_REF) fail('SUPABASE_PROJECT_REF_MISMATCH');
if (accessToken.length < 20) fail('SUPABASE_ACCESS_TOKEN_REQUIRED');

const before = await remoteConfig(projectRef, accessToken);
const mismatches = compare(before, patch);

if (!wantsApply) {
  console.log(JSON.stringify({
    status: mismatches.length ? 'DRIFT' : 'PASS',
    mode: 'remote-readonly',
    projectRef,
    checkedKeys: Object.keys(patch).sort(),
    mismatches,
    mutation: false,
  }));
  process.exit(mismatches.length ? 2 : 0);
}

if (process.env.CAPITAL_AI_AUTH_CONFIG_APPLY !== 'YES') {
  fail('EXPLICIT_APPLY_CONFIRMATION_REQUIRED');
}

await apply(projectRef, accessToken, patch);
const after = await remoteConfig(projectRef, accessToken);
const remaining = compare(after, patch);

console.log(JSON.stringify({
  status: remaining.length ? 'FAILED' : 'PASS',
  mode: 'remote-apply',
  projectRef,
  checkedKeys: Object.keys(patch).sort(),
  changedKeys: mismatches,
  remainingMismatches: remaining,
  mutation: true,
}));
if (remaining.length) process.exit(3);

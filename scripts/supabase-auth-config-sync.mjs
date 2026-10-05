import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EXPECTED_PROJECT_REF = 'ryzywoktpmyhwzxmstyu';
const EXPECTED_RP_ID = 'capital-ai.online';
const EXPECTED_ORIGIN = 'https://capital-ai.online';
const API_BASE = 'https://api.supabase.com/v1/projects';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SHELL_PATH = path.join(ROOT, 'supabase/email-templates/capital-ai-auth-email-shell.html');
const DEFINITIONS_PATH = path.join(ROOT, 'supabase/email-templates/templates.json');

function actionHtml(definition) {
  if (!definition.actionLabel || !definition.actionUrl) return '';
  return `
<div style="margin-top:24px;">
  <a href="${definition.actionUrl}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#f9bf21;color:#02050e;font-weight:900;text-decoration:none;">${definition.actionLabel}</a>
</div>`;
}

function detailHtml(definition) {
  return definition.detail
    ? `<div style="margin-top:18px;font-size:13px;line-height:1.6;color:#94a3b8;">${definition.detail}</div>`
    : '';
}

function render(shell, definition) {
  const html = shell
    .replaceAll('%%TITLE%%', definition.title)
    .replace('%%BODY%%', definition.body)
    .replace('%%ACTION%%', actionHtml(definition))
    .replace('%%DETAIL%%', detailHtml(definition));

  if (/%%[A-Z_]+%%/.test(html)) throw new Error('UNRESOLVED_EMAIL_SHELL_PLACEHOLDER');
  return html;
}

function requireDefinition(definitions, key) {
  const value = definitions[key];
  if (!value || typeof value.subject !== 'string' || typeof value.title !== 'string' || typeof value.body !== 'string') {
    throw new Error(`MISSING_TEMPLATE_DEFINITION:${key}`);
  }
  return value;
}

function buildPayload(shell, definitions) {
  const rendered = {};
  for (const key of [
    'confirmation',
    'invite',
    'magic_link',
    'recovery',
    'email_change',
    'reauthentication',
    'password_changed_notification',
    'email_changed_notification',
    'phone_changed_notification',
    'identity_linked_notification',
    'identity_unlinked_notification',
    'mfa_factor_enrolled_notification',
    'mfa_factor_unenrolled_notification',
  ]) {
    const definition = requireDefinition(definitions, key);
    rendered[key] = { subject: definition.subject, content: render(shell, definition) };
  }

  return {
    mailer_subjects_confirmation: rendered.confirmation.subject,
    mailer_templates_confirmation_content: rendered.confirmation.content,
    mailer_subjects_invite: rendered.invite.subject,
    mailer_templates_invite_content: rendered.invite.content,
    mailer_subjects_magic_link: rendered.magic_link.subject,
    mailer_templates_magic_link_content: rendered.magic_link.content,
    mailer_subjects_recovery: rendered.recovery.subject,
    mailer_templates_recovery_content: rendered.recovery.content,
    mailer_subjects_email_change: rendered.email_change.subject,
    mailer_templates_email_change_content: rendered.email_change.content,
    mailer_subjects_reauthentication: rendered.reauthentication.subject,
    mailer_templates_reauthentication_content: rendered.reauthentication.content,

    mailer_notifications_password_changed_enabled: true,
    mailer_subjects_password_changed_notification: rendered.password_changed_notification.subject,
    mailer_templates_password_changed_notification_content: rendered.password_changed_notification.content,

    mailer_notifications_email_changed_enabled: true,
    mailer_subjects_email_changed_notification: rendered.email_changed_notification.subject,
    mailer_templates_email_changed_notification_content: rendered.email_changed_notification.content,

    mailer_notifications_phone_changed_enabled: true,
    mailer_subjects_phone_changed_notification: rendered.phone_changed_notification.subject,
    mailer_templates_phone_changed_notification_content: rendered.phone_changed_notification.content,

    mailer_notifications_identity_linked_enabled: true,
    mailer_subjects_identity_linked_notification: rendered.identity_linked_notification.subject,
    mailer_templates_identity_linked_notification_content: rendered.identity_linked_notification.content,

    mailer_notifications_identity_unlinked_enabled: true,
    mailer_subjects_identity_unlinked_notification: rendered.identity_unlinked_notification.subject,
    mailer_templates_identity_unlinked_notification_content: rendered.identity_unlinked_notification.content,

    mailer_notifications_mfa_factor_enrolled_enabled: true,
    mailer_subjects_mfa_factor_enrolled_notification: rendered.mfa_factor_enrolled_notification.subject,
    mailer_templates_mfa_factor_enrolled_notification_content: rendered.mfa_factor_enrolled_notification.content,

    mailer_notifications_mfa_factor_unenrolled_enabled: true,
    mailer_subjects_mfa_factor_unenrolled_notification: rendered.mfa_factor_unenrolled_notification.subject,
    mailer_templates_mfa_factor_unenrolled_notification_content: rendered.mfa_factor_unenrolled_notification.content,

    passkey_enabled: true,
    webauthn_rp_display_name: 'CAPITAL-AI',
    webauthn_rp_id: EXPECTED_RP_ID,
    webauthn_rp_origins: EXPECTED_ORIGIN,
  };
}

function validatePayload(payload) {
  const serialized = JSON.stringify(payload);
  if (!serialized.includes('{{ .TokenHash }}')) throw new Error('TOKEN_HASH_LINKS_MISSING');
  if (!payload.mailer_templates_recovery_content.includes('type=recovery')) throw new Error('RECOVERY_LINK_INVALID');
  if (!payload.mailer_templates_confirmation_content.includes('type=signup')) throw new Error('CONFIRMATION_LINK_INVALID');
  if (serialized.includes('SUPABASE_ACCESS_TOKEN') || serialized.includes('smtp_pass') || serialized.includes('smtp_user')) {
    throw new Error('SECRET_MATERIAL_FORBIDDEN');
  }
  if (payload.webauthn_rp_id !== EXPECTED_RP_ID || payload.webauthn_rp_origins !== EXPECTED_ORIGIN) {
    throw new Error('WEBAUTHN_RP_MISMATCH');
  }
}

async function api(pathname, { method = 'GET', body } = {}) {
  const token = process.env.SUPABASE_ACCESS_TOKEN || '';
  if (token.length < 20) throw new Error('SUPABASE_ACCESS_TOKEN_REQUIRED_FOR_APPLY');
  const response = await fetch(`${API_BASE}/${EXPECTED_PROJECT_REF}${pathname}`, {
    method,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'error',
    signal: AbortSignal.timeout(10_000),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(`SUPABASE_MANAGEMENT_API_${response.status}`);
  return data;
}

async function main() {
  const mode = process.argv.includes('--apply') ? 'apply' : 'check';
  const projectRef = process.env.SUPABASE_PROJECT_REF || EXPECTED_PROJECT_REF;
  if (projectRef !== EXPECTED_PROJECT_REF) throw new Error('SUPABASE_PROJECT_REF_MISMATCH');

  const [shell, definitionsRaw] = await Promise.all([
    readFile(SHELL_PATH, 'utf8'),
    readFile(DEFINITIONS_PATH, 'utf8'),
  ]);
  const definitions = JSON.parse(definitionsRaw);
  const payload = buildPayload(shell, definitions);
  validatePayload(payload);

  if (mode === 'check') {
    process.stdout.write(JSON.stringify({
      status: 'PASS',
      mode,
      projectRef: EXPECTED_PROJECT_REF,
      templateCount: 13,
      passkey: {
        enabled: payload.passkey_enabled,
        rpId: payload.webauthn_rp_id,
        origins: payload.webauthn_rp_origins,
      },
      smtpCredentialsTouched: false,
    }) + '\n');
    return;
  }

  if (process.env.CAPITAL_AI_OWNER_APPROVED_AUTH_CONFIG !== 'true') {
    throw new Error('OWNER_APPROVAL_FLAG_REQUIRED');
  }

  const before = await api('/config/auth');
  const previousRpId = typeof before?.webauthn_rp_id === 'string' ? before.webauthn_rp_id : '';
  if (previousRpId && previousRpId !== EXPECTED_RP_ID && before?.passkey_enabled === true) {
    throw new Error('ACTIVE_PASSKEY_RP_ID_CHANGE_BLOCKED');
  }

  await api('/config/auth', { method: 'PATCH', body: payload });
  const after = await api('/config/auth');

  for (const [key, expected] of Object.entries(payload)) {
    if (after?.[key] !== expected) throw new Error(`SUPABASE_CONFIG_READBACK_MISMATCH:${key}`);
  }

  process.stdout.write(JSON.stringify({
    status: 'PASS',
    mode,
    projectRef: EXPECTED_PROJECT_REF,
    templateCount: 13,
    passkeyEnabled: after.passkey_enabled === true,
    rpId: after.webauthn_rp_id,
    smtpCredentialsTouched: false,
    readbackVerified: true,
  }) + '\n');
}

main().catch(error => {
  process.stderr.write(String(error?.message || error) + '\n');
  process.exitCode = 1;
});

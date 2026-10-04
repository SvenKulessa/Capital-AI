import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

export function evidenceHash(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

function retentionDaysForPlan(plan, env) {
  const name = plan === 'enterprise' ? 'LEGAL_POLICY_ENTERPRISE_RETENTION_DAYS' : 'LEGAL_POLICY_TEAM_RETENTION_DAYS';
  const days = Number(env[name]);
  if (!Number.isInteger(days) || days <= 0 || days > 3650) throw new Error(`Missing or invalid ${name}`);
  return days;
}

function storeConfig(env) {
  const baseUrl = String(env.LEGAL_POLICY_SUPABASE_URL ?? '').replace(/\/$/, '');
  const secretKey = env.LEGAL_POLICY_SUPABASE_SECRET_KEY;
  if (!baseUrl || !secretKey) throw new Error('LEGAL_POLICY evidence history requires Supabase URL and secret key');
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== 'https:') throw new Error('LEGAL_POLICY_SUPABASE_URL must use HTTPS');
  return {baseUrl, secretKey};
}

function headers(secretKey, extra = {}) {
  return { apikey: secretKey, authorization: `Bearer ${secretKey}`, accept: 'application/json', ...extra };
}

async function supabaseRequest(path, {env, method='GET', body, fetchImpl=fetch, prefer} = {}) {
  const {baseUrl, secretKey} = storeConfig(env);
  const response = await fetchImpl(`${baseUrl}/rest/v1/${path}`, {
    method,
    headers: headers(secretKey, {
      ...(body ? {'content-type':'application/json'} : {}),
      ...(prefer ? {prefer} : {}),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`LEGAL_POLICY evidence store ${method} failed with ${response.status}`);
    error.status = response.status;
    error.body = text || null;
    throw error;
  }
  return text ? JSON.parse(text) : null;
}

export function evidenceRecord({result, gateDecision, entitlement, installationId, accountId, repository, repositoryId, sourceSha, evidenceSource, sourceBound, now = new Date(), env}) {
  const retentionDays = retentionDaysForPlan(entitlement.plan, env);
  const evaluatedAt = result.evaluatedAt ?? now.toISOString();
  const expiresAt = new Date(now.getTime() + retentionDays * 86400000).toISOString();
  const summary = {
    counts: result.counts,
    evidenceSource,
    sourceBound: Boolean(sourceBound),
    componentEvidence: result.components.map((component) => ({
      component: component.component,
      exactVersion: component.exactVersion,
      artifactIdentity: component.artifactIdentity ?? null,
      licenseExpression: component.licenseExpression,
      usageClass: component.usageClass,
      legalStatus: component.legalStatus,
      obligations: component.obligations,
      outstandingObligations: component.outstandingObligations,
    })),
  };
  const hashSubject = {policyId:result.policyId, sourceSha, releaseDecision:result.releaseDecision, summary};
  return {
    id: randomUUID(),
    installation_id: String(installationId),
    account_id: String(accountId),
    repository_id: String(repositoryId),
    repository_full_name: repository,
    source_sha: sourceSha,
    policy_id: result.policyId,
    release_decision: result.releaseDecision,
    gate_decision: gateDecision ?? result.releaseDecision,
    evidence_hash: evidenceHash(hashSubject),
    summary,
    evaluated_at: evaluatedAt,
    expires_at: expiresAt,
  };
}

export async function persistEvidence(args, fetchImpl = fetch) {
  const record = evidenceRecord(args);
  await supabaseRequest('legal_policy_evidence', {env:args.env, method:'POST', body:record, fetchImpl, prefer:'return=minimal'});
  return {persisted:true, id:record.id, evidenceHash:record.evidence_hash, expiresAt:record.expires_at};
}

export async function deleteInstallationEvidence({installationId, env, fetchImpl = fetch}) {
  if (!installationId) throw new Error('installationId is required');
  await supabaseRequest(`legal_policy_evidence?installation_id=eq.${encodeURIComponent(String(installationId))}`, {env, method:'DELETE', fetchImpl, prefer:'return=minimal'});
  return {deleted:true, installationId:String(installationId)};
}

export async function deleteExpiredEvidence({env, now = new Date(), fetchImpl = fetch}) {
  await supabaseRequest(`legal_policy_evidence?expires_at=lt.${encodeURIComponent(now.toISOString())}`, {env, method:'DELETE', fetchImpl, prefer:'return=minimal'});
  return {deleted:true, before:now.toISOString()};
}

export function secureTokenEquals(actual, expected) {
  if (!actual || !expected) return false;
  const left = Buffer.from(String(actual));
  const right = Buffer.from(String(expected));
  return left.length === right.length && timingSafeEqual(left, right);
}

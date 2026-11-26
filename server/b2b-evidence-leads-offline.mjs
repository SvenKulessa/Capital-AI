/**
 * ISOLATED_OFFLINE_TEST only: ephemeral B2B intake, scoped to one verified
 * Supabase-style user UUID. No HTTP route, SQL, Stripe, secrets or live leads.
 */
import { createHash } from 'node:crypto';
import { createB2BLeadIntake } from './b2b-evidence-leads.mjs';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const REQUEST = /^[A-Za-z0-9_.:-]{1,80}$/;
const RECEIPT = 'CAPITAL_AI_B2B_CONSENT_FIXTURE@1';
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

export function createB2BEvidenceOfflineFixture({ mode, auth, now = () => Date.now() } = {}) {
  if (mode !== 'ISOLATED_OFFLINE_TEST' || typeof auth?.verify !== 'function' || typeof now !== 'function')
    throw new TypeError('offline fixture requires explicit test mode and injected auth verifier');

  const rows = new Map();
  const requests = new Map();
  async function resolveTenant(principal) {
    try {
      if (!principal?.req || !principal?.res) return null;
      const identity = await auth.verify(principal.req, principal.res);
      if (typeof identity?.userId !== 'string' || !UUID.test(identity.userId) || identity.subject !== identity.userId)
        return null;
      return identity.userId;
    } catch {
      return null; // no claims or credentials echoed on authentication failure
    }
  }
  async function persist(record) {
    // Reject real contacts: this adapter cannot persist anything except fixtures.
    if (!UUID.test(record.tenantId) || !REQUEST.test(record.requestId ?? '') ||
        !/^[a-z0-9._+-]{1,64}@fixture\.test$/i.test(record.email))
      throw new Error('B2B_FIXTURE_SCOPE_DENIED');
    const key = record.tenantId + '|' + record.requestId;
    if (requests.has(key)) throw new Error('B2B_FIXTURE_REPLAY_DENIED');
    const consent = Object.freeze({ ...record.consent });
    const evidence = Object.freeze({
      contract: RECEIPT,
      kind: 'SYNTHETIC_OFFLINE_ONLY',
      sha256: digest([RECEIPT, record.tenantId, record.id, record.repository, record.requestId, consent]),
    });
    // Synchronous map updates: no await between replay check and commit.
    rows.set(record.id, Object.freeze({ ...record, consent, evidence }));
    requests.set(key, record.id);
  }
  const newIntake = () => createB2BLeadIntake({ resolveTenant, persist, now });
  let intake = newIntake();
  return Object.freeze({
    async submit({ req, res, body, ip, requestId } = {}) {
      if (typeof requestId !== 'string' || !REQUEST.test(requestId))
        return { status: 400, code: 'FIXTURE_REQUEST_ID_REQUIRED' };
      try {
        return await intake({ principal: { req, res }, body, ip, requestId });
      } catch (error) {
        if (error?.message === 'B2B_FIXTURE_REPLAY_DENIED') return { status: 409, code: 'REPLAY_DENIED' };
        if (error?.message === 'B2B_FIXTURE_SCOPE_DENIED') return { status: 422, code: 'FIXTURE_SCOPE_DENIED' };
        throw error;
      }
    },
    async read({ req, res, leadId } = {}) {
      const tenant = await resolveTenant({ req, res });
      if (!tenant) return { status: 401, code: 'UNAUTHORIZED' };
      if (typeof leadId !== 'string' || !UUID.test(leadId)) return { status: 400, code: 'INVALID_LEAD_ID' };
      const row = rows.get(leadId);
      if (!row) return { status: 404, code: 'NOT_FOUND' };
      if (row.tenantId !== tenant) return { status: 403, code: 'TENANT_MISMATCH' };
      // Return evidence only, not any contact information.
      return { status: 200, leadId: row.id, tenantId: tenant, consent: { ...row.consent }, evidence: { ...row.evidence } };
    },
    reset() {
      rows.clear();
      requests.clear();
      intake = newIntake();
    },
  });
}

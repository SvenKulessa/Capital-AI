import { randomUUID, createHash, timingSafeEqual } from 'node:crypto';

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[A-Za-z]{2,}$/;
const REPO = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;
// A syntactically valid path can still contain dot-segment traversal (e.g. ../private).
const validRepository = value => REPO.test(value) && value.split('/').every(part => part !== '.' && part !== '..');
const allowed = new Set(['organization','email','repository','consent','privacyVersion','purpose','tenantId']);
const hash = x => createHash('sha256').update(x).digest('hex');
const eq = (a,b) => {
  const x=Buffer.from(String(a)); const y=Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x,y);
};
export function createB2BLeadIntake({resolveTenant, persist, now=()=>Date.now(), limit=5, windowMs=3600000, privacyVersion='2026-11-19', maxBuckets=10000}={}) {
  if (typeof resolveTenant!=='function' || typeof persist!=='function') throw new TypeError('trusted tenant resolver and persistence required');
  const buckets=new Map();
  return async function submit({principal, body, ip, requestId}={}) {
    const tenant=await resolveTenant(principal);
    if (!tenant || !/^[a-zA-Z0-9_-]{1,80}$/.test(tenant)) return {status:401,code:'UNAUTHORIZED'};
    if (!body || typeof body!=='object' || Array.isArray(body) || Object.keys(body).some(k=>!allowed.has(k))) return {status:400,code:'INVALID_FIELDS'};
    if (!eq(body.tenantId??'',tenant)) return {status:403,code:'TENANT_MISMATCH'};
    const organization=body.organization, email=body.email, repository=body.repository;
    // Validate the stored form, not the untrimmed input. Deny control/bidi
    // characters before storing or displaying tenant-scoped lead metadata.
    const normalizedOrganization=typeof organization==='string'?organization.trim():'';
    if (normalizedOrganization.length<2 || normalizedOrganization.length>120 ||
        /[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/u.test(normalizedOrganization) ||
        typeof email!=='string' || !EMAIL.test(email) || typeof repository!=='string' || !validRepository(repository)) return {status:400,code:'INVALID_INPUT'};
    if (body.consent!==true || body.privacyVersion!==privacyVersion || body.purpose!=='b2b_evidence_audit_contact') return {status:422,code:'CONSENT_REQUIRED'};
    const time=now(), key=hash(tenant+'|'+String(ip??'unknown'));
    for (const [k,v] of buckets) if (time-v.since>=windowMs) buckets.delete(k);
    if (!buckets.has(key) && buckets.size>=maxBuckets) return {status:429,code:'RATE_LIMITED'};
    const b=buckets.get(key);
    if (b && time-b.since<windowMs && b.count>=limit) return {status:429,code:'RATE_LIMITED'};
    buckets.set(key,{since:b&&time-b.since<windowMs?b.since:time,count:(b&&time-b.since<windowMs?b.count:0)+1});
    const record={id:randomUUID(),tenantId:tenant,organization:normalizedOrganization,email:email.trim().toLowerCase(),repository,
      consent:{version:privacyVersion,purpose:body.purpose,at:new Date(time).toISOString()},state:'QUALIFIED_PENDING_REVIEW',requestId:typeof requestId==='string'?requestId.slice(0,80):null};
    await persist(record); // fail closed: no success on persistence failure
    return {status:202,code:'ACCEPTED',leadId:record.id};
  };
}

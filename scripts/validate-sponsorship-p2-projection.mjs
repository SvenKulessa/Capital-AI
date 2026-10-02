import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const read = p => JSON.parse(readFileSync(resolve(root,p),'utf8'));
const exists = p => existsSync(resolve(root,p));
const fail = (ok,msg,out) => { if (!ok) out.push(msg); };

export function validateSponsorshipP2Projection() {
  const failures=[];
  const matrix=read('docs/growth/sponsorship/P2-CLAIM-EVIDENCE-MATRIX.json');
  const readiness=read('contracts/trust/SPONSORSHIP_P2_READINESS@1.yaml');
  fail(matrix.schema==='SPONSORSHIP_CLAIM_EVIDENCE_MATRIX@1','claim matrix schema mismatch',failures);
  fail(matrix.publicationPolicy?.default==='BLOCKED','publication default must be BLOCKED',failures);
  fail(matrix.publicationPolicy?.verifiedEvidenceRequired===true,'verified evidence must be required',failures);
  fail(readiness.decision?.unknownMayPass===false,'UNKNOWN must not pass P2',failures);
  fail(readiness.decision?.conflictingMayPass===false,'CONFLICTING must not pass P2',failures);
  const ids=new Set();
  for (const claim of matrix.claims ?? []) {
    fail(typeof claim.claimId==='string' && !ids.has(claim.claimId),'claim IDs must be unique',failures); ids.add(claim.claimId);
    fail(['SUPPORTED','BLOCKED','REVIEW_REQUIRED','UNKNOWN','CONFLICTING'].includes(claim.status),claim.claimId+': invalid status',failures);
    if (claim.publication!=='BLOCKED') {
      fail(claim.status==='SUPPORTED',claim.claimId+': only SUPPORTED claims may leave BLOCKED',failures);
      fail((claim.evidenceRefs?.length ?? 0)>0,claim.claimId+': publishable claim lacks evidence refs',failures);
    }
    for (const ref of claim.evidenceRefs ?? []) {
      if (ref.startsWith('main:')) fail(/^[0-9a-f]{40}$/.test(ref.slice(5)),claim.claimId+': invalid immutable main ref',failures);
      else fail(exists(ref),claim.claimId+': missing evidence ref '+ref,failures);
    }
  }
  fail(readiness.decision?.status==='BLOCKED','GROWTH projection must not self-promote TRUST readiness',failures);
  return {passed:failures.length===0,failures};
}
const result=validateSponsorshipP2Projection();
if (!result.passed) { console.error('Sponsorship P2 projection validation failed:',result.failures); process.exitCode=1; }
else console.log('✓ Sponsorship P2 claim/evidence projection validated; TRUST readiness remains authoritative.');

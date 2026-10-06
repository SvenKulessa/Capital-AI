export const TRUTH_AUTHORITY_GATE_VERSION='TRUTH_AUTHORITY_GATE@1' as const;
export type AuthorityClassification='PUBLIC'|'OWNER_ONLY'|'CONFIDENTIAL'|'SECRET';
export type ClaimRisk='GENERAL'|'FINANCIAL'|'REGULATORY'|'SECURITY'|'TOKENOMICS'|'STRATEGY';
export interface PublicAuthorityInput{text:string;classification:AuthorityClassification;claimRisk:ClaimRisk;evidenceRefs:readonly string[];rightsVerified:boolean;strategyDisclosureApproved:boolean;regulatoryReviewRequired:boolean;regulatoryReviewApproved:boolean;}
export interface PublicAuthorityDecision{allowed:boolean;reasons:string[];}
const PATTERNS:readonly RegExp[]=[/\b(?:apy|yield|staking return)\b/i,/\b(?:buyback|burn)\b/i,/\b(?:hard cap|token allocation|vesting|tge)\b/i,/\b0x[a-f0-9]{40}\b/i,/\b(?:internal budget|provider budget|margin target|unit economics)\b/i,/\b(?:secret|private key|api key|credential)\b/i];
export function detectStrategicExposure(text:string):string[]{return PATTERNS.filter(p=>p.test(text)).map(p=>p.source);}
export function evaluatePublicAuthority(i:PublicAuthorityInput):PublicAuthorityDecision{
 const reasons:string[]=[]; if(i.classification!=='PUBLIC')reasons.push('NON_PUBLIC_CLASSIFICATION'); if(i.evidenceRefs.length===0)reasons.push('MISSING_EVIDENCE');
 if(!i.rightsVerified)reasons.push('RIGHTS_NOT_VERIFIED'); if(!i.strategyDisclosureApproved)reasons.push('STRATEGY_DISCLOSURE_NOT_APPROVED');
 if(i.regulatoryReviewRequired&&!i.regulatoryReviewApproved)reasons.push('REGULATORY_REVIEW_NOT_APPROVED');
 if(detectStrategicExposure(i.text).length>0&&i.claimRisk!=='GENERAL')reasons.push('STRATEGIC_OR_REGULATED_CONTENT_DETECTED');
 return{allowed:reasons.length===0,reasons};
}

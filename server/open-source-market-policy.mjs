const OPEN_SOURCE_SOFTWARE_LICENSES = new Set([
  'MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC',
  'GPL-3.0-only','GPL-3.0-or-later','AGPL-3.0-only','AGPL-3.0-or-later',
  'LGPL-3.0-only','LGPL-3.0-or-later','MPL-2.0',
]);
const OPEN_DATA_LICENSES = new Set(['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','ODbL-1.0']);

export const MARKET_SOURCE_POLICY = Object.freeze({
  schema:'CAPITAL_AI_OPEN_SOURCE_MARKET_POLICY@1',
  ownerDecisionAt:'2026-10-04',
  mode:'OPEN_SOURCE_AND_OPEN_DATA_ONLY',
  admittedSources:Object.freeze([]),
  blockedLegacyProviderPaths:Object.freeze([
    'binance','kraken','twelvedata','polygon','massive','financialdatanet','yfinance','coingecko',
  ]),
});

export function evaluateOpenSourceMarketAdmission(evidence){
  const reasons=[];
  if(!evidence || typeof evidence!=='object') return {eligible:false,reasons:['EVIDENCE_MISSING']};
  if(!OPEN_SOURCE_SOFTWARE_LICENSES.has(evidence.softwareLicense)) reasons.push('SOFTWARE_LICENSE_NOT_ADMITTED');
  if(!/^https:\/\//.test(evidence.softwareEvidenceReference||'')) reasons.push('SOFTWARE_EVIDENCE_MISSING');
  if(!OPEN_DATA_LICENSES.has(evidence.dataLicense)) reasons.push('OPEN_DATA_LICENSE_NOT_ADMITTED');
  if(!/^https:\/\//.test(evidence.dataLicenseEvidenceReference||'')) reasons.push('DATA_LICENSE_EVIDENCE_MISSING');
  if(!/^https:\/\//.test(evidence.provenanceReference||'')) reasons.push('PROVENANCE_EVIDENCE_MISSING');
  for(const key of ['commercialDisplayAllowed','commercialDerivedScoringAllowed','cacheStorageAllowed','jetStreamReplayRetentionAllowed']){
    if(evidence[key]!==true) reasons.push(`USE_CASE_NOT_ADMITTED:${key}`);
  }
  return {eligible:reasons.length===0,reasons};
}

export function isAdmittedMarketSource(providerId){
  return MARKET_SOURCE_POLICY.admittedSources.some(source=>source.providerId===providerId && source.eligible===true);
}

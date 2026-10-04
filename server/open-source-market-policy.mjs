const OPEN_SOURCE_SOFTWARE_LICENSES = new Set([
  'MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC',
  'GPL-3.0-only','GPL-3.0-or-later','AGPL-3.0-only','AGPL-3.0-or-later',
  'LGPL-3.0-only','LGPL-3.0-or-later','MPL-2.0',
]);
const OPEN_DATA_LICENSES = new Set(['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','ODbL-1.0']);

export const MARKET_REQUIRED_USE_CASES = Object.freeze([
  'commercialWebDisplay',
  'commercialMobileDisplay',
  'derivedScoringRankingsAnalytics',
  'normalization',
  'cacheHotState',
  'jetStreamPublication',
  'replay',
  'retention',
  'backupRestore',
  'auditEvidence',
  'internalProcessing',
]);

export const BYOK_PRIVATE_SOURCE_POLICY = Object.freeze({
  schema:'CAPITAL_AI_BYOK_PRIVATE_SOURCE_POLICY@1',
  ownerDecisionAt:'2026-10-04',
  mode:'USER_SCOPED_PRIVATE_CONTEXT_ONLY',
  publicMarketAdmission:false,
  redistributionAllowed:false,
  publicDisplayAllowed:false,
  sharedCacheAllowed:false,
  jetStreamPublicationAllowed:false,
  durableRetentionAllowed:false,
  capabilities:Object.freeze({
    privateAccountData:true,
    privateMarketContext:true,
    publicMarketQuotes:false,
    scoringContext:true,
  }),
});

export const MARKET_SOURCE_POLICY = Object.freeze({
  schema:'CAPITAL_AI_OPEN_SOURCE_MARKET_POLICY@1',
  ownerDecisionAt:'2026-10-04',
  mode:'OPEN_SOURCE_AND_OPEN_DATA_ONLY',
  admittedSources:Object.freeze([
    Object.freeze({
      providerId:'wikidata-reference',
      decision:'OPEN_SOURCE_OPEN_DATA_ADMITTED',
      eligible:true,
      scope:'REFERENCE_METADATA_ONLY',
      dataLicense:'CC0-1.0',
      evidenceReference:'docs/market-data/evidence/source-admission-wikidata-20261004.json',
      instrumentManifestReference:'docs/market-data/evidence/wikidata-reference-instrument-manifest-20261004.json',
      capabilities:Object.freeze({
        referenceMetadata:true,
        marketQuotes:false,
        mobileCryptoUniverse:false,
        scoringPriceInput:false,
      }),
    }),
  ]),
  blockedLegacyProviderPaths:Object.freeze([
    'binance','kraken','twelvedata','polygon','massive','financialdatanet','yfinance','coingecko',
  ]),
});

function isHttpsReference(value){
  return typeof value === 'string' && /^https:\/\//.test(value);
}

export function evaluateOpenSourceMarketAdmission(evidence){
  const reasons=[];
  if(!evidence || typeof evidence!=='object') {
    return {decision:'BLOCK',eligible:false,reasons:['EVIDENCE_MISSING']};
  }

  if(!OPEN_SOURCE_SOFTWARE_LICENSES.has(evidence.softwareLicense)) reasons.push('SOFTWARE_LICENSE_NOT_ADMITTED');
  if(!/^[a-f0-9]{40}$/.test(evidence.softwareSourceSha||'')) reasons.push('SOFTWARE_SOURCE_SHA_MISSING');
  if(!/^[a-f0-9]{40}$/.test(evidence.softwareLicenseBlobSha||'')) reasons.push('SOFTWARE_LICENSE_BLOB_SHA_MISSING');
  if(!isHttpsReference(evidence.softwareEvidenceReference)) reasons.push('SOFTWARE_EVIDENCE_MISSING');
  if(evidence.softwarePackagingCompatible!==true) reasons.push('SOFTWARE_PACKAGING_NOT_ADMITTED');

  if(!OPEN_DATA_LICENSES.has(evidence.dataLicense)) reasons.push('OPEN_DATA_LICENSE_NOT_ADMITTED');
  if(!isHttpsReference(evidence.dataLicenseEvidenceReference)) reasons.push('DATA_LICENSE_EVIDENCE_MISSING');
  if(!isHttpsReference(evidence.provenanceReference)) reasons.push('PROVENANCE_EVIDENCE_MISSING');
  if(typeof evidence.datasetId!=='string' || !evidence.datasetId.trim()) reasons.push('DATASET_ID_MISSING');
  if(typeof evidence.datasetVersionOrSnapshot!=='string' || !evidence.datasetVersionOrSnapshot.trim()) reasons.push('DATASET_SNAPSHOT_MISSING');
  if(evidence.attributionObligationsReviewed!==true) reasons.push('ATTRIBUTION_REVIEW_MISSING');
  if(!isHttpsReference(evidence.attributionEvidenceReference)) reasons.push('ATTRIBUTION_EVIDENCE_MISSING');

  for(const useCase of MARKET_REQUIRED_USE_CASES){
    const permission=evidence.useCases?.[useCase];
    if(permission?.allowed!==true || !isHttpsReference(permission?.evidenceReference)){
      reasons.push(`USE_CASE_NOT_ADMITTED:${useCase}`);
    }
  }

  if(evidence.instrumentEligibilityVerified!==true) reasons.push('INSTRUMENT_ELIGIBILITY_NOT_VERIFIED');
  if(typeof evidence.instrumentManifestReference!=='string' || !evidence.instrumentManifestReference.trim()){
    reasons.push('INSTRUMENT_MANIFEST_REFERENCE_MISSING');
  }

  return {
    decision:reasons.length===0?'OPEN_SOURCE_OPEN_DATA_ADMITTED':'BLOCK',
    eligible:reasons.length===0,
    reasons,
  };
}

export function admittedMarketSourcesFor(capability=null){
  return MARKET_SOURCE_POLICY.admittedSources.filter(source =>
    source.eligible===true &&
    source.decision==='OPEN_SOURCE_OPEN_DATA_ADMITTED' &&
    (!capability || source.capabilities?.[capability]===true)
  );
}

export function isAdmittedMarketSource(providerId, capability=null){
  return admittedMarketSourcesFor(capability).some(source => source.providerId===providerId);
}

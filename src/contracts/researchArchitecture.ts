export const RESEARCH_ARCHITECTURE_VERSION='GRAPHRAG_RESEARCH_ARCHITECTURE@1' as const;
export const RESEARCH_ARCHITECTURE={
 priority:'FREE_COMMERCIAL_USE_FIRST',
 knowledgeArchitecture:{engine:'Microsoft GraphRAG',reviewedVersion:'3.2.x',license:'MIT',isolation:'ADAPTER_OR_SIDECAR_REQUIRED',runtimeState:'RUNTIME_PENDING',queryModes:['DRIFT','LOCAL','GLOBAL','BASIC'] as const,defaultResearchMode:'DRIFT'},
 evidenceGraph:{nodes:['SOURCE','DATASET','FACT','CLAIM','MODEL','ASSET','RUN','DECISION','PUBLICATION'] as const,requiredEdges:['DERIVED_FROM','SUPPORTED_BY','CALCULATED_WITH','VALIDATED_BY','SUPERSEDES'] as const,immutableEvidenceRequired:true},
 autonomy:{research:'ALLOWED',reverseEngineeringOfLawfullyAccessibleMaterial:'RESTRICTED',legalDecisionAuthority:'DENIED',tradingAuthority:'DENIED',tokenIssuanceAuthority:'DENIED',publicationAuthority:'DENIED',paidServiceActivationAuthority:'DENIED'},
 fintechQuality:{sourceProvenanceRequired:true,pointInTimeDataRequired:true,lookAheadBiasControlRequired:true,survivorshipBiasControlRequired:true,outOfSampleValidationRequired:true,modelVersioningRequired:true,uncertaintyRequired:true,deterministicReplayRequired:true},
} as const;

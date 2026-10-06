export const TOKENOMICS_RESEARCH_REPORT_VERSION='TOKENOMICS_RESEARCH_REPORT@1' as const;
export const TOKENOMICS_RESEARCH_REPORT={evidenceDate:'2026-10-06',state:'RESEARCH_ONLY',productionAuthority:false,
 recommendedInitialConcept:{name:'CAPITAL-AI Privacy / Utility Credits',settlement:'OFF_CHAIN',transferable:false,tradable:false,investmentClaim:false,purpose:'Entitlement, privacy-preserving quota accounting and auditable service access without creating a market-priced asset.'},
 blockchainDataComparison:[
  {candidate:'Google Blockchain Analytics + BigQuery',commercialLane:'RESTRICTED',targetRole:'Read-only challenger / benchmark source'},
  {candidate:'Subsquid Squid SDK',commercialLane:'CANDIDATE',targetRole:'Primary OSS candidate for multi-chain ingestion'},
  {candidate:'The Graph graph-node',commercialLane:'CANDIDATE',targetRole:'OSS comparison engine'},
  {candidate:'Ponder',commercialLane:'CANDIDATE',targetRole:'Low-complexity OSS comparison engine'},
  {candidate:'Blockscout',commercialLane:'BLOCKED_PENDING_COMMERCIAL_RIGHTS',targetRole:'Not priority-1 until rights are separately admitted'},
 ],benchmarkDimensions:['data completeness','reorg correctness','freshness','deterministic replay','query reproducibility','provenance','schema stability','cost ceiling','commercial rights','privacy impact','failure transparency']} as const;

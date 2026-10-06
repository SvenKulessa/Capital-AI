export const ZERO_COST_API_THRESHOLD_POLICY_VERSION = 'ZERO_COST_API_THRESHOLD_POLICY@1' as const;
export type ZeroCostServiceId =
  | 'GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS' | 'GOOGLE_SEARCH_CONSOLE_URL_INSPECTION'
  | 'GOOGLE_CRUX' | 'GOOGLE_PAGESPEED' | 'GOOGLE_ANALYTICS_DATA'
  | 'GOOGLE_WEB_RISK_URI_LOOKUP' | 'GOOGLE_BIGQUERY_ON_DEMAND' | 'YOUTUBE_DATA'
  | 'GOOGLE_CLOUD_OBSERVABILITY' | 'GEMINI_GENERATIVE';
export type ThresholdState = 'OK' | 'SOFT_STOP' | 'HARD_STOP';
export interface UsageThreshold {
  unit:string; period:'MINUTE'|'HOUR'|'DAY'|'MONTH'|'REQUEST'; providerFreeAllowance:number|null;
  softStop:number; hardStop:number; billableBeyondAllowance:boolean; evidenceDate:'2026-10-06';
}
export interface ZeroCostServicePolicy {
  service:ZeroCostServiceId; domain:'GROWTH'|'MARKET'|'PLATFORM'|'TRUST';
  commercialUseState:'ADMITTED'|'RESTRICTED'|'REVALIDATE'; defaultEnabled:boolean;
  automaticPaidEscalation:false; thresholds:Readonly<Record<string,UsageThreshold>>; restrictions:readonly string[];
}
const GiB=1024**3; const TiB=1024**4;
export const ZERO_COST_API_THRESHOLDS:Readonly<Record<ZeroCostServiceId,ZeroCostServicePolicy>>={
  GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS:{service:'GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS',domain:'GROWTH',commercialUseState:'ADMITTED',defaultEnabled:true,automaticPaidEscalation:false,
    thresholds:{requestsPerDay:{unit:'requests',period:'DAY',providerFreeAllowance:30_000_000,softStop:40_000,hardStop:50_000,billableBeyondAllowance:false,evidenceDate:'2026-10-06'},
      requestsPerMinute:{unit:'requests',period:'MINUTE',providerFreeAllowance:40_000,softStop:800,hardStop:1_000,billableBeyondAllowance:false,evidenceDate:'2026-10-06'}},
    restrictions:['read-only property data','no automatic quota increase','source/property provenance required']},
  GOOGLE_SEARCH_CONSOLE_URL_INSPECTION:{service:'GOOGLE_SEARCH_CONSOLE_URL_INSPECTION',domain:'GROWTH',commercialUseState:'ADMITTED',defaultEnabled:true,automaticPaidEscalation:false,
    thresholds:{requestsPerSitePerDay:{unit:'requests/site',period:'DAY',providerFreeAllowance:2_000,softStop:1_200,hardStop:1_500,billableBeyondAllowance:false,evidenceDate:'2026-10-06'},
      requestsPerSitePerMinute:{unit:'requests/site',period:'MINUTE',providerFreeAllowance:600,softStop:80,hardStop:100,billableBeyondAllowance:false,evidenceDate:'2026-10-06'}},
    restrictions:['read-only URL inspection','no automatic quota escalation']},
  GOOGLE_CRUX:{service:'GOOGLE_CRUX',domain:'GROWTH',commercialUseState:'ADMITTED',defaultEnabled:true,automaticPaidEscalation:false,
    thresholds:{requestsPerMinute:{unit:'requests',period:'MINUTE',providerFreeAllowance:150,softStop:90,hardStop:100,billableBeyondAllowance:false,evidenceDate:'2026-10-06'}},
    restrictions:['aggregate field data only','revalidate terms/quota on provider change']},
  GOOGLE_PAGESPEED:{service:'GOOGLE_PAGESPEED',domain:'GROWTH',commercialUseState:'REVALIDATE',defaultEnabled:false,automaticPaidEscalation:false,
    thresholds:{requestsPerDay:{unit:'requests',period:'DAY',providerFreeAllowance:null,softStop:500,hardStop:750,billableBeyondAllowance:false,evidenceDate:'2026-10-06'}},
    restrictions:['local Lighthouse is primary','enable only after current quota/terms readback','CrUX is primary for field data']},
  GOOGLE_ANALYTICS_DATA:{service:'GOOGLE_ANALYTICS_DATA',domain:'GROWTH',commercialUseState:'RESTRICTED',defaultEnabled:false,automaticPaidEscalation:false,
    thresholds:{projectPropertyTokensPerHour:{unit:'tokens',period:'HOUR',providerFreeAllowance:14_000,softStop:9_000,hardStop:10_000,billableBeyondAllowance:false,evidenceDate:'2026-10-06'},
      propertyTokensPerDay:{unit:'tokens',period:'DAY',providerFreeAllowance:200_000,softStop:80_000,hardStop:100_000,billableBeyondAllowance:false,evidenceDate:'2026-10-06'}},
    restrictions:['consent gate required','returnPropertyQuota reconciliation required','no sensitive audience inference']},
  GOOGLE_WEB_RISK_URI_LOOKUP:{service:'GOOGLE_WEB_RISK_URI_LOOKUP',domain:'TRUST',commercialUseState:'ADMITTED',defaultEnabled:false,automaticPaidEscalation:false,
    thresholds:{uriLookupsPerMonth:{unit:'uris.search requests',period:'MONTH',providerFreeAllowance:100_000,softStop:72_000,hardStop:90_000,billableBeyondAllowance:true,evidenceDate:'2026-10-06'}},
    restrictions:['only uris.search in zero-cost lane','hashes.search/submission blocked until separately cost-admitted','Safe Browsing is not the commercial substitute']},
  GOOGLE_BIGQUERY_ON_DEMAND:{service:'GOOGLE_BIGQUERY_ON_DEMAND',domain:'MARKET',commercialUseState:'RESTRICTED',defaultEnabled:false,automaticPaidEscalation:false,
    thresholds:{queryBytesPerMonth:{unit:'bytes processed',period:'MONTH',providerFreeAllowance:TiB,softStop:800*GiB,hardStop:900*GiB,billableBeyondAllowance:true,evidenceDate:'2026-10-06'},
      queryBytesPerDay:{unit:'bytes processed',period:'DAY',providerFreeAllowance:null,softStop:20*GiB,hardStop:25*GiB,billableBeyondAllowance:true,evidenceDate:'2026-10-06'},
      maximumBytesBilledPerQuery:{unit:'bytes',period:'REQUEST',providerFreeAllowance:null,softStop:4*GiB,hardStop:5*GiB,billableBeyondAllowance:true,evidenceDate:'2026-10-06'}},
    restrictions:['dry-run required','custom QueryUsagePerDay required','maximumBytesBilled required','on-demand only','storage/egress need independent gates']},
  YOUTUBE_DATA:{service:'YOUTUBE_DATA',domain:'GROWTH',commercialUseState:'ADMITTED',defaultEnabled:false,automaticPaidEscalation:false,
    thresholds:{quotaUnitsPerDay:{unit:'quota units',period:'DAY',providerFreeAllowance:10_000,softStop:7_000,hardStop:8_000,billableBeyondAllowance:false,evidenceDate:'2026-10-06'},
      searchCallsPerDay:{unit:'search.list calls',period:'DAY',providerFreeAllowance:100,softStop:70,hardStop:80,billableBeyondAllowance:false,evidenceDate:'2026-10-06'},
      uploadCallsPerDay:{unit:'videos.insert calls',period:'DAY',providerFreeAllowance:100,softStop:60,hardStop:80,billableBeyondAllowance:false,evidenceDate:'2026-10-06'}},
    restrictions:['private/unlisted-first','no automatic quota extension','rights/policy approval before public publishing']},
  GOOGLE_CLOUD_OBSERVABILITY:{service:'GOOGLE_CLOUD_OBSERVABILITY',domain:'PLATFORM',commercialUseState:'RESTRICTED',defaultEnabled:false,automaticPaidEscalation:false,
    thresholds:{paidBudgetEurPerMonth:{unit:'EUR',period:'MONTH',providerFreeAllowance:0,softStop:0,hardStop:0,billableBeyondAllowance:true,evidenceDate:'2026-10-06'}},
    restrictions:['OpenTelemetry remains primary','Google sink needs explicit cost admission']},
  GEMINI_GENERATIVE:{service:'GEMINI_GENERATIVE',domain:'GROWTH',commercialUseState:'RESTRICTED',defaultEnabled:false,automaticPaidEscalation:false,
    thresholds:{paidBudgetEurPerMonth:{unit:'EUR',period:'MONTH',providerFreeAllowance:0,softStop:0,hardStop:0,billableBeyondAllowance:true,evidenceDate:'2026-10-06'}},
    restrictions:['never silently enable paid generation','EEA production terms remain separate','owner budget decision required']},
} as const;
export function evaluateUsageThreshold(service:ZeroCostServiceId,key:string,usage:number):ThresholdState{
  const t=ZERO_COST_API_THRESHOLDS[service].thresholds[key]; if(!t) throw new Error('UNKNOWN_ZERO_COST_THRESHOLD');
  if(!Number.isFinite(usage)||usage<0) throw new Error('INVALID_USAGE_VALUE');
  if(usage>=t.hardStop) return 'HARD_STOP'; if(usage>=t.softStop) return 'SOFT_STOP'; return 'OK';
}
export function assertZeroCostCallAllowed(service:ZeroCostServiceId,key:string,usage:number):void{
  const p=ZERO_COST_API_THRESHOLDS[service]; if(!p.defaultEnabled) throw new Error('ZERO_COST_SERVICE_DISABLED_BY_DEFAULT');
  if(evaluateUsageThreshold(service,key,usage)!=='OK') throw new Error('ZERO_COST_THRESHOLD_NOT_OK');
}

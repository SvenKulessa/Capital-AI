import type { UniversalAssetClass, UniversalAssetIdentity } from './FinanceUniversalAssetIdentity';

export const UNIVERSE_SLA_CONTRACT_VERSION = 'universe-sla/1.0.0' as const;
export const TOP_LEVEL_MINIMUM_AVAILABLE_ASSETS = 24 as const;
export const SUBCATEGORY_TARGET_AVAILABLE_ASSETS = 24 as const;

export type UniverseSlaStatus =
  | 'AVAILABLE'
  | 'INSUFFICIENT_REAL_UNIVERSE'
  | 'PROVIDER_DEGRADED'
  | 'EVIDENCE_INSUFFICIENT';

export interface UniverseAdmissionRecord {
  readonly asset: UniversalAssetIdentity;
  readonly category?: string;
  readonly admitted: boolean;
  readonly evidenceSufficient: boolean;
  readonly providerDegraded?: boolean;
}

export interface UniverseSlaResult {
  readonly contractVersion: typeof UNIVERSE_SLA_CONTRACT_VERSION;
  readonly assetClass: UniversalAssetClass;
  readonly category?: string;
  readonly status: UniverseSlaStatus;
  readonly availableAssets: readonly UniversalAssetIdentity[];
  readonly availableCount: number;
  readonly targetCount: number;
  readonly hardMinimum: boolean;
  readonly reason?: string;
}

/**
 * Evaluates only already discovered, identity-deduplicated and evidence-admitted real assets.
 * It never creates symbols, filler assets or interpolated observations to satisfy a quota.
 */
export function evaluateUniverseSla(
  records: readonly UniverseAdmissionRecord[],
  assetClass: UniversalAssetClass,
  category?: string,
): UniverseSlaResult {
  const scoped = records.filter((record) => (
    record.asset.assetClass === assetClass
    && (category === undefined || record.category === category)
  ));
  const deduplicated = new Map<string, UniversalAssetIdentity>();
  for (const record of scoped) {
    if (record.admitted && record.evidenceSufficient) deduplicated.set(record.asset.assetId, record.asset);
  }
  const availableAssets = [...deduplicated.values()].sort((a, b) => a.assetId.localeCompare(b.assetId));
  const targetCount = category === undefined
    ? TOP_LEVEL_MINIMUM_AVAILABLE_ASSETS
    : SUBCATEGORY_TARGET_AVAILABLE_ASSETS;

  let status: UniverseSlaStatus = 'AVAILABLE';
  let reason: string | undefined;
  if (scoped.some((record) => record.providerDegraded)) {
    status = 'PROVIDER_DEGRADED';
    reason = 'Mindestens ein Provider ist für dieses reale Universum degradiert.';
  } else if (scoped.some((record) => record.admitted && !record.evidenceSufficient)) {
    status = 'EVIDENCE_INSUFFICIENT';
    reason = 'Reale Assets sind vorhanden, aber die Evidence Admission ist unvollständig.';
  } else if (availableAssets.length < targetCount) {
    status = 'INSUFFICIENT_REAL_UNIVERSE';
    reason = `Nur ${availableAssets.length} reale, evidenzzugelassene Assets verfügbar; Zielwert ${targetCount}.`;
  }

  return Object.freeze({
    contractVersion: UNIVERSE_SLA_CONTRACT_VERSION,
    assetClass,
    category,
    status,
    availableAssets: Object.freeze(availableAssets),
    availableCount: availableAssets.length,
    targetCount,
    hardMinimum: false,
    reason,
  });
}

export interface CryptoCanonicalIdentityEvidence {
  readonly assetId: string;
  readonly canonicalSymbol: string;
  readonly chain?: string;
  readonly contractAddress?: string;
}

export interface StockCanonicalIdentityEvidence {
  readonly assetId: string;
  readonly isin?: string;
  readonly figi?: string;
  readonly exchange: string;
  readonly ticker: string;
  readonly currency: string;
}

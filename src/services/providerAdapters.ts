import type { AssetIdentity, DataProvenance } from '../contracts/canonicalContracts';

export interface RawObservation {
  assetId: string; symbol: string; sourceProvider: string; price: number; bid: number | null; ask: number | null;
  volume24h: number | null; observedAt: number; receivedAt: number; rawPayload: Record<string, unknown>;
  provenance: DataProvenance;
}
export interface ProviderHealthReport {
  providerId: string; isOnline: boolean; pingMs: number; lastMessageAt: number;
  errorRateLastHour: number; activeSockets: number; isDemoMode: boolean;
}
export interface ProviderAdapter {
  providerId: string; displayName: string; isDemo: boolean; supportedAssetClasses: string[];
  fetchObservation(asset: AssetIdentity): Promise<RawObservation>;
  healthCheck(): Promise<ProviderHealthReport>;
}

export type OpenDataLicense = 'CC0-1.0' | 'CC-BY-4.0' | 'CC-BY-SA-4.0' | 'ODbL-1.0';
export interface OpenSourceOpenDataAdmission {
  verified: true;
  softwareLicense: string;
  dataLicense: OpenDataLicense;
  evidenceReference: string;
  commercialDisplayAllowed: true;
  commercialDerivedScoringAllowed: true;
  cacheStorageAllowed: true;
  jetStreamReplayRetentionAllowed: true;
}

const OPEN_SOURCE_SOFTWARE_LICENSES = new Set([
  'MIT','Apache-2.0','BSD-2-Clause','BSD-3-Clause','ISC',
  'GPL-3.0-only','GPL-3.0-or-later','AGPL-3.0-only','AGPL-3.0-or-later',
  'LGPL-3.0-only','LGPL-3.0-or-later','MPL-2.0',
]);
const OPEN_DATA_LICENSES = new Set<OpenDataLicense>(['CC0-1.0','CC-BY-4.0','CC-BY-SA-4.0','ODbL-1.0']);

function assertAdmission(admission: OpenSourceOpenDataAdmission | undefined): asserts admission is OpenSourceOpenDataAdmission {
  if (!admission || admission.verified !== true ||
      !OPEN_SOURCE_SOFTWARE_LICENSES.has(admission.softwareLicense) ||
      !OPEN_DATA_LICENSES.has(admission.dataLicense) ||
      !/^https:\/\//.test(admission.evidenceReference) ||
      admission.commercialDisplayAllowed !== true ||
      admission.commercialDerivedScoringAllowed !== true ||
      admission.cacheStorageAllowed !== true ||
      admission.jetStreamReplayRetentionAllowed !== true) {
    throw new Error('OPEN_SOURCE_OPEN_DATA_ADMISSION_REQUIRED');
  }
}

/**
 * Production registry starts empty by design.
 * Historical/proprietary adapters are not registered or silently mapped.
 */
export class ProviderAdapterRegistry {
  private adapters = new Map<string, ProviderAdapter>();

  register(adapter: ProviderAdapter, admission?: OpenSourceOpenDataAdmission) {
    if (adapter.isDemo) throw new Error('DEMO_ADAPTER_NOT_PRODUCTION_ADMISSIBLE');
    assertAdmission(admission);
    this.adapters.set(adapter.providerId, adapter);
  }

  getAdapter(id: string): ProviderAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new Error(`OPEN_DATA_SOURCE_NOT_CONFIGURED:${id}`);
    return adapter;
  }

  getAdapterForAsset(assetClass: string): ProviderAdapter {
    const adapter = [...this.adapters.values()].find(candidate => candidate.supportedAssetClasses.includes(assetClass));
    if (!adapter) throw new Error(`OPEN_DATA_SOURCE_NOT_CONFIGURED:${assetClass}`);
    return adapter;
  }

  getAllAdapters() { return [...this.adapters.values()]; }
}

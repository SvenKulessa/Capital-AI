/**
 * Finance UAI source identity only, not a CAPITAL-AI canonical asset identity.
 * Asset-class normalization into Capital-AI common.ts requires an explicit mapping.
 * Finance source Scoring/contracts.ts @ dcef421fe6e350a3a2ade61d0299aad9ecca213c.
 */
export const UNIVERSAL_ASSET_CONTRACT_VERSION = 'uai/1.0.0' as const;
export type UniversalAssetClass = 'crypto' | 'stock' | 'forex' | 'commodity' | 'index' | 'bond';
export type UniversalAssetSource = 'registry' | 'catalog' | 'request';
export interface UniversalAssetIdentity {
 readonly contractVersion: typeof UNIVERSAL_ASSET_CONTRACT_VERSION;
 readonly assetId: string;
 readonly symbol: string;
 readonly assetClass: UniversalAssetClass;
 readonly name?: string;
 readonly subtype?: string;
 readonly instrumentKind?: string;
 readonly source: UniversalAssetSource;
 readonly providerSymbols?: Readonly<Record<string,string>>;
}

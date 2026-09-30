/**
 * CAPITAL AI — EVIDENCE ENGINE (STAGE 07 EVIDENCE & AUDIT)
 * Local cryptographic fingerprinting; not persisted evidence or a compliance certification.
 * Production provider evidence is persisted and replayed by the backend.
 */

export interface EvidenceRecord {
  evidenceId: string;
  symbol: string;
  assetId: string;
  modelVersion: string;
  computedAt: number;
  inputSnapshotHash: string;
  featuresHash: string;
  weightsHash: string;
  compositeFingerprint: string;
  isAuditCompliant: boolean;
  replayToken: string;
}

export class EvidenceEngineService {
  /**
   * Generates a deterministic SHA-256 cryptographic evidence record.
   */
  public static async createEvidenceRecord(params: {
    assetId: string;
    symbol: string;
    modelVersion: string;
    features: Record<string, any>;
    weights: Record<string, number>;
    subScores: Record<string, number>;
  }): Promise<EvidenceRecord> {
    const computedAt = Date.now();
    const inputPayload = JSON.stringify({
      assetId: params.assetId,
      symbol: params.symbol,
      features: params.features,
    });
    const weightsPayload = JSON.stringify(params.weights);
    const scoresPayload = JSON.stringify(params.subScores);

    const inputSnapshotHash = await this.sha256(inputPayload);
    const weightsHash = await this.sha256(weightsPayload);
    const featuresHash = await this.sha256(scoresPayload);

    const compositePayload = `${params.modelVersion}:${inputSnapshotHash}:${weightsHash}:${featuresHash}`;
    const compositeFingerprint = await this.sha256(compositePayload);
    const evidenceId = `EVD-${params.symbol}-${compositeFingerprint.slice(0, 12).toUpperCase()}`;
    const replayToken = `RPL_${params.symbol}_${computedAt}_${params.modelVersion}`;

    return {
      evidenceId,
      symbol: params.symbol,
      assetId: params.assetId,
      modelVersion: params.modelVersion,
      computedAt,
      inputSnapshotHash,
      featuresHash,
      weightsHash,
      compositeFingerprint,
      isAuditCompliant: false,
      replayToken,
    };
  }

  /**
   * Browser-safe SHA-256 implementation using Web Crypto API.
   */
  public static async sha256(message: string): Promise<string> {
    if (!globalThis.crypto?.subtle) throw new Error('SHA256_UNAVAILABLE');
    const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

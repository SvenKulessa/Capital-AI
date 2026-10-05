import { QuoteFactSchema } from '../shared/market-contracts.mjs';
import { CanonicalMarketEventSchema } from '../shared/canonical-market-events.mjs';

export function normalizeRawQuoteEvidence(input) {
  if (!input || typeof input !== 'object') throw new TypeError('CANONICAL_NORMALIZATION_INPUT_REQUIRED');
  const rawInputEvidenceId = String(input.rawInputEvidenceId ?? '');
  if (!/^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/.test(rawInputEvidenceId)) {
    throw new Error('RAW_EVIDENCE_ID_INVALID');
  }

  const fact = QuoteFactSchema.parse(input.rawRecord?.fact);
  const asset = input.asset;
  if (!asset || typeof asset !== 'object') throw new Error('ASSET_IDENTITY_REQUIRED');
  if (asset.symbol !== fact.symbol || asset.venue !== fact.venue || asset.currency !== fact.quote) {
    throw new Error('CANONICAL_ASSET_MAPPING_MISMATCH');
  }

  const providerDataset = String(input.providerDataset ?? '').trim();
  const rightsEvidenceReference = String(input.rightsEvidenceReference ?? '').trim();
  const instrumentManifestReference = String(input.instrumentManifestReference ?? '').trim();
  const normalizationVersion = String(input.normalizationVersion ?? '').trim();
  const publishedAt = Number(input.publishedAt);

  if (!providerDataset) throw new Error('PROVIDER_DATASET_REQUIRED');
  if (!rightsEvidenceReference) throw new Error('RIGHTS_EVIDENCE_REFERENCE_REQUIRED');
  if (!instrumentManifestReference) throw new Error('INSTRUMENT_MANIFEST_REFERENCE_REQUIRED');
  if (!/^\d+\.\d+\.\d+$/.test(normalizationVersion)) throw new Error('NORMALIZATION_VERSION_INVALID');
  if (!Number.isInteger(publishedAt) || publishedAt < fact.receivedAt || publishedAt > Date.now() + 3000) {
    throw new Error('PUBLISHED_AT_INVALID');
  }

  return CanonicalMarketEventSchema.parse({
    schemaVersion: '1.0.0',
    eventType: 'market_observation',
    normalizationVersion,
    instrumentManifestReference,
    rawInputEvidenceId,
    asset: {
      assetId: asset.assetId,
      symbol: asset.symbol,
      name: asset.name,
      assetClass: asset.assetClass,
      venue: asset.venue,
      currency: asset.currency,
      status: asset.status,
    },
    provenance: {
      providerId: fact.provider,
      providerDataset,
      observedAt: fact.observedAt,
      receivedAt: fact.receivedAt,
      publishedAt,
      latencyMs: fact.receivedAt - fact.observedAt,
      isDelayed: input.isDelayed === true,
      isDemo: false,
      sourceReference: rawInputEvidenceId,
      licenseScope: input.licenseScope,
      rightsEvidenceReference,
      rightsDecision: 'ALLOW',
    },
    quote: {
      price: fact.price,
      bid: fact.bid,
      ask: fact.ask,
      volume24h: fact.volume24h,
    },
    scoreEligible: false,
    decisionEligible: false,
  });
}

export async function normalizeAndPersistRawQuote(infrastructure, input) {
  if (!infrastructure?.replay || !infrastructure?.persistCanonical) {
    throw new TypeError('CANONICAL_INFRASTRUCTURE_REQUIRED');
  }
  const rawRecord = await infrastructure.replay(input.rawInputEvidenceId);
  const event = normalizeRawQuoteEvidence({ ...input, rawRecord });
  return infrastructure.persistCanonical(event);
}

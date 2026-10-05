/**
 * CAPITAL AI — DATA PLAUSIBILITY & AUDIT VALIDATOR (PART 2)
 *
 * Fail-closed validation for score publication, market-data presentation and
 * provenance-sensitive intelligence claims. These checks do not create source
 * rights or production eligibility; they only reject unverifiable output.
 */

import type { FinalRankResult, FeatureValue, DataProvenance } from './canonicalContracts';

export interface PlausibilityViolation {
  ruleId: string;
  ruleDescription: string;
  severity: 'CRITICAL_BLOCKER' | 'COMPLIANCE_WARNING';
  entityId: string;
  details: string;
}

export type DisplayStatus = 'DEMO' | 'DELAYED' | 'LIVE' | 'DEGRADED';

export interface MarketDisplayDatum {
  entityId: string;
  value: number;
  unit: string;
  currency?: string | null;
  observedAt: number;
  evaluatedAt: number;
  maxStalenessMs: number;
  displayStatus: DisplayStatus;
  provenance: DataProvenance;
  min?: number;
  max?: number;
}

export interface AggregateCountEvidence {
  entityId: string;
  totalCount: number;
  categoryCounts: Record<string, number>;
}

export interface IntelligenceClaimEvidence {
  entityId: string;
  text: string;
  claimType: 'generic' | 'institutional_counterparty' | 'onchain_flow' | 'dark_pool' | 'latency';
  providerId?: string | null;
  sourceReference?: string | null;
  observedAt?: number | null;
  chain?: string | null;
  transactionReference?: string | null;
  walletLabelConfidence?: number | null;
  marketScope?: string | null;
  delayMs?: number | null;
  methodologyReference?: string | null;
  measuredLatencyMs?: number | null;
  telemetryMeasured?: boolean;
}

const blocker = (
  ruleId: string,
  ruleDescription: string,
  entityId: string,
  details: string,
): PlausibilityViolation => ({
  ruleId,
  ruleDescription,
  severity: 'CRITICAL_BLOCKER',
  entityId,
  details,
});

const FORBIDDEN_CAUSAL_OR_CERTAINTY_PHRASES = [
  'verursacht durch',
  'caused by',
  'führt zwangsläufig zu',
  'guaranteed return',
  'garantierter gewinn',
  'sichere rendite',
  '100% sicher',
  'kaufempfehlung',
  'investment recommendation',
] as const;

export class DataPlausibilityValidator {
  public static validateFinalRankResult(result: FinalRankResult, now = Date.now()): PlausibilityViolation[] {
    const violations: PlausibilityViolation[] = [];

    if (result.computedAt > now + 3000) {
      violations.push(blocker(
        'PLAU-001-FUTURE-TIMESTAMP',
        'Berechnungs-Zeitstempel liegt unzulässig in der Zukunft',
        result.assetId,
        `computedAt (${result.computedAt}) > now (${now})`,
      ));
    }

    if (!result.eligibility && result.rank !== null) {
      violations.push(blocker(
        'PLAU-002-INELIGIBLE-RANK-PUBLISHED',
        'Asset ohne bestandenes Eligibility-Gate darf keine Rangnummer führen',
        result.assetId,
        `eligibility=false, rank=${result.rank}`,
      ));
    }

    if (result.confidence < 0.9 && result.rank !== null) {
      violations.push(blocker(
        'PLAU-003-LOW-CONFIDENCE-RANK-PUBLISHED',
        'Asset mit unzureichender Konfidenz darf nicht gerankt werden',
        result.assetId,
        `confidence=${result.confidence}, rank=${result.rank}`,
      ));
    }

    if (result.finalScore !== null &&
        (!Number.isFinite(result.finalScore) || result.finalScore < 0 || result.finalScore > 100)) {
      violations.push(blocker(
        'PLAU-004-SCORE-OUT-OF-BOUNDS',
        'Finaler Score liegt außerhalb des definierten Wertebereichs',
        result.assetId,
        `finalScore=${result.finalScore}`,
      ));
    }

    for (const [key, value] of Object.entries(result.subScores)) {
      if (value !== null && (!Number.isFinite(value) || value < 0 || value > 100)) {
        violations.push(blocker(
          'PLAU-005-SUB-SCORE-BOUNDS',
          'Teil-Score liegt außerhalb des definierten Wertebereichs',
          result.assetId,
          `${key}=${value}`,
        ));
      }
    }

    const driverTexts = [
      ...result.topPositiveDrivers.map((driver) => driver.evidenceSummary.toLowerCase()),
      ...result.topNegativeDrivers.map((driver) => driver.evidenceSummary.toLowerCase()),
    ].join(' ');
    for (const phrase of FORBIDDEN_CAUSAL_OR_CERTAINTY_PHRASES) {
      if (driverTexts.includes(phrase)) {
        violations.push(blocker(
          'PLAU-006-UNSUPPORTED-CAUSAL-WORDING',
          'Nicht belegte Kausalitäts-, Gewissheits- oder Empfehlungsaussage erkannt',
          result.assetId,
          `phrase=${phrase}`,
        ));
      }
    }

    if (!/^EVD-[a-f0-9]{64}$/.test(result.evidenceId)) {
      violations.push(blocker(
        'PLAU-007-MISSING-EVIDENCE-ID',
        'Kein gültiger content-addressed Evidence-Verweis zugewiesen',
        result.assetId,
        `evidenceId=${result.evidenceId}`,
      ));
    }

    if (!result.modelVersion || result.computedAt <= 0) {
      violations.push(blocker(
        'PLAU-007B-SCORE-METADATA-INCOMPLETE',
        'Score-Ausgabe benötigt modelVersion und computedAt',
        result.assetId,
        `modelVersion=${result.modelVersion}, computedAt=${result.computedAt}`,
      ));
    }

    if (result.isDemo &&
        (result.eligibility || result.rank !== null || result.scoreEligible || result.rankEligible || result.alertEligible)) {
      violations.push(blocker(
        'PLAU-DEMO-ELIGIBILITY',
        'Demo-Daten dürfen nicht actionable oder rankfähig sein',
        result.assetId,
        'demo result exposed actionable eligibility',
      ));
    }

    return violations;
  }

  public static validateProvenance(provenance: DataProvenance, now = Date.now()): PlausibilityViolation[] {
    const violations: PlausibilityViolation[] = [];
    const timestamps = [provenance.observedAt, provenance.receivedAt, provenance.publishedAt];

    if (timestamps.some((timestamp) => timestamp > now + 3000)) {
      violations.push(blocker(
        'PLAU-008-FUTURE-PROVENANCE-TIMESTAMP',
        'Provider-Provenance enthält einen zukünftigen Zeitstempel',
        provenance.providerId,
        `observedAt=${provenance.observedAt}, receivedAt=${provenance.receivedAt}, publishedAt=${provenance.publishedAt}`,
      ));
    }

    if (provenance.receivedAt < provenance.observedAt ||
        provenance.publishedAt < provenance.receivedAt ||
        provenance.latencyMs !== provenance.receivedAt - provenance.observedAt) {
      violations.push(blocker(
        'PLAU-009-PROVENANCE-TIMELINE-INVALID',
        'Provider-Timeline oder gemessene Latenz ist inkonsistent',
        provenance.providerId,
        `latencyMs=${provenance.latencyMs}`,
      ));
    }

    if (provenance.isDemo && provenance.licenseScope !== 'sandbox_demo') {
      violations.push(blocker(
        'PLAU-010-DEMO-MASQUERADING-AS-LIVE',
        'Demo-Daten dürfen keinen produktiven Lizenzstatus tragen',
        provenance.providerId,
        `licenseScope=${provenance.licenseScope}`,
      ));
    }

    return violations;
  }

  public static validateMarketDisplayDatum(datum: MarketDisplayDatum): PlausibilityViolation[] {
    const violations = this.validateProvenance(datum.provenance, datum.evaluatedAt);

    if (!Number.isFinite(datum.value)) {
      violations.push(blocker(
        'PLAU-011-NON-FINITE-MARKET-VALUE',
        'Marktdatum muss numerisch und endlich sein',
        datum.entityId,
        `value=${datum.value}`,
      ));
    }

    if (!datum.unit.trim()) {
      violations.push(blocker(
        'PLAU-012-INVALID-UNIT',
        'Marktdatum besitzt keine gültige Einheit',
        datum.entityId,
        'unit is empty',
      ));
    }

    if (datum.currency != null && !/^[A-Z]{3}$/.test(datum.currency)) {
      violations.push(blocker(
        'PLAU-013-INVALID-CURRENCY',
        'Währung muss als dreistelliger ISO-ähnlicher Großbuchstaben-Code vorliegen',
        datum.entityId,
        `currency=${datum.currency}`,
      ));
    }

    if (datum.observedAt > datum.evaluatedAt + 3000) {
      violations.push(blocker(
        'PLAU-014-FUTURE-DATUM',
        'Marktdatum liegt in der Zukunft',
        datum.entityId,
        `observedAt=${datum.observedAt}, evaluatedAt=${datum.evaluatedAt}`,
      ));
    }

    const age = datum.evaluatedAt - datum.observedAt;
    if (datum.displayStatus === 'LIVE' &&
        (age > datum.maxStalenessMs || datum.provenance.isDelayed || datum.provenance.isDemo)) {
      violations.push(blocker(
        'PLAU-015-STALE-OR-NONLIVE-DISPLAYED-LIVE',
        'Stale, verzögerte oder Demo-Daten dürfen nicht als LIVE dargestellt werden',
        datum.entityId,
        `ageMs=${age}, maxStalenessMs=${datum.maxStalenessMs}, isDelayed=${datum.provenance.isDelayed}, isDemo=${datum.provenance.isDemo}`,
      ));
    }

    if (datum.displayStatus === 'DEMO' && !datum.provenance.isDemo) {
      violations.push(blocker(
        'PLAU-016-DEMO-LABEL-MISMATCH',
        'DEMO-Anzeige erfordert Demo-Provenance',
        datum.entityId,
        'displayStatus=DEMO but provenance.isDemo=false',
      ));
    }

    if (datum.min !== undefined && datum.value < datum.min ||
        datum.max !== undefined && datum.value > datum.max) {
      violations.push(blocker(
        'PLAU-017-VALUE-OUT-OF-BOUNDS',
        'Marktdatum liegt außerhalb der definierten Bounds',
        datum.entityId,
        `value=${datum.value}, min=${datum.min ?? 'none'}, max=${datum.max ?? 'none'}`,
      ));
    }

    return violations;
  }

  public static validateAggregateCounts(evidence: AggregateCountEvidence): PlausibilityViolation[] {
    const categories = Object.values(evidence.categoryCounts);
    if (!Number.isInteger(evidence.totalCount) || evidence.totalCount < 0 ||
        categories.some((count) => !Number.isInteger(count) || count < 0) ||
        categories.reduce((sum, count) => sum + count, 0) !== evidence.totalCount) {
      return [blocker(
        'PLAU-018-COUNT-INCONSISTENCY',
        'Gesamtanzahl muss exakt mit den disjunkten Kategorieanzahlen übereinstimmen',
        evidence.entityId,
        `total=${evidence.totalCount}, categorySum=${categories.reduce((sum, count) => sum + count, 0)}`,
      )];
    }
    return [];
  }

  public static validateIntelligenceClaim(
    claim: IntelligenceClaimEvidence,
    now = Date.now(),
  ): PlausibilityViolation[] {
    const violations: PlausibilityViolation[] = [];
    const text = claim.text.toLowerCase();

    for (const phrase of FORBIDDEN_CAUSAL_OR_CERTAINTY_PHRASES) {
      if (text.includes(phrase)) {
        violations.push(blocker(
          'PLAU-019-UNSUPPORTED-CLAIM-WORDING',
          'Nicht belegte Kausalitäts-, Gewissheits- oder Empfehlungsaussage erkannt',
          claim.entityId,
          `phrase=${phrase}`,
        ));
      }
    }

    if (claim.claimType === 'institutional_counterparty' &&
        (!claim.providerId || !claim.sourceReference)) {
      violations.push(blocker(
        'PLAU-020-INSTITUTIONAL-COUNTERPARTY-UNVERIFIED',
        'Benannter institutioneller Kontrahent benötigt verifizierbare Source-Provenance',
        claim.entityId,
        'providerId/sourceReference missing',
      ));
    }

    if (claim.claimType === 'onchain_flow') {
      if (!claim.providerId || !claim.sourceReference || !claim.chain || !claim.transactionReference ||
          claim.walletLabelConfidence == null || !Number.isFinite(claim.walletLabelConfidence) ||
          claim.walletLabelConfidence < 0 || claim.walletLabelConfidence > 1 ||
          claim.observedAt == null || claim.observedAt > now + 3000) {
        violations.push(blocker(
          'PLAU-021-ONCHAIN-INFERENCE-EVIDENCE-INCOMPLETE',
          'On-Chain-Flow-Inferenz benötigt Transaktion, Chain, Wallet-Label-Konfidenz, Quelle und Zeitstempel',
          claim.entityId,
          'required on-chain evidence missing or invalid',
        ));
      }
    }

    if (claim.claimType === 'dark_pool' &&
        (!claim.providerId || !claim.sourceReference || !claim.marketScope ||
         claim.delayMs == null || !Number.isFinite(claim.delayMs) || claim.delayMs < 0 ||
         !claim.methodologyReference)) {
      violations.push(blocker(
        'PLAU-022-DARK-POOL-EVIDENCE-INCOMPLETE',
        'Dark-Pool-Metrik benötigt Provider, Scope, Delay und Methodik-Nachweis',
        claim.entityId,
        'required dark-pool evidence missing or invalid',
      ));
    }

    if (claim.claimType === 'latency' &&
        (claim.telemetryMeasured !== true || claim.measuredLatencyMs == null ||
         !Number.isFinite(claim.measuredLatencyMs) || claim.measuredLatencyMs < 0 ||
         !claim.sourceReference)) {
      violations.push(blocker(
        'PLAU-023-LATENCY-CLAIM-UNMEASURED',
        'Latenzbehauptung benötigt gemessene Telemetrie und Evidence-Referenz',
        claim.entityId,
        'measured telemetry evidence missing',
      ));
    }

    return violations;
  }

  public static validateFeatureValue(
    feature: FeatureValue,
    evaluatedAt: number,
    maxStalenessMs: number,
  ): PlausibilityViolation[] {
    const violations = this.validateProvenance(feature.provenance, evaluatedAt);
    if (feature.observedAt > evaluatedAt + 3000) {
      violations.push(blocker(
        'PLAU-024-FEATURE-FUTURE-TIMESTAMP',
        'Feature-Zeitstempel liegt in der Zukunft',
        feature.featureId,
        `observedAt=${feature.observedAt}, evaluatedAt=${evaluatedAt}`,
      ));
    }
    if (evaluatedAt - feature.observedAt > maxStalenessMs) {
      violations.push(blocker(
        'PLAU-025-FEATURE-STALE',
        'Feature überschreitet die zulässige Staleness',
        feature.featureId,
        `ageMs=${evaluatedAt - feature.observedAt}, maxStalenessMs=${maxStalenessMs}`,
      ));
    }
    if (!Number.isFinite(feature.value) || !Number.isFinite(feature.normalizedValue) ||
        feature.normalizedValue < 0 || feature.normalizedValue > 100 ||
        feature.qualityScore < 0 || feature.qualityScore > 100) {
      violations.push(blocker(
        'PLAU-026-FEATURE-BOUNDS-INVALID',
        'Feature-Werte oder Quality-Score liegen außerhalb definierter Bounds',
        feature.featureId,
        `value=${feature.value}, normalized=${feature.normalizedValue}, quality=${feature.qualityScore}`,
      ));
    }
    return violations;
  }
}

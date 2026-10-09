/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Audit ARCH-AUDIT-0002 (AUD2-F-001, S1/S2/S5): gemeinsame, real-datenbasierte
// Bewertungsprimitive fuer alle Crypto-Scoring-Engines (Basis/DeFi in scoring.service.ts,
// Enterprise-23-Faktoren in cryptoScoring.ts, Meme-Coin in memeCoinScoringService.ts).
//
// Jede Funktion hier ist eine dokumentierte, deterministische Berechnung aus TATSAECHLICH
// UEBERGEBENEN Marktdaten (Preis, Volumen, Supply, historische Kurse) - keine Funktion in
// dieser Datei erzeugt einen Wert aus dem Symbolnamen. Wo ein Faktor keine reale Datenquelle
// hat, wird das ueber renormalizeWeights() gehandhabt: der Faktor wird aus der Bewertung
// ausgeschlossen und sein Gewichtsanteil auf die vorhandenen, real belegten Faktoren verteilt
// - statt ihn mit einem geschaetzten oder erfundenen Wert zu fuellen.

export function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Marktkapitalisierung (0-100) auf logarithmischer Skala. Krypto-Marktkapitalisierungen
 * reichen von ca. 10.000 USD (Nano-Cap) bis ca. 2.000.000.000.000 USD (BTC) - eine lineare
 * Skala wuerde alles ausserhalb der Top 10 auf nahe 0 abbilden. log10(10.000)=4,
 * log10(2*10^12)=~12.3.
 */
export function scoreMarketCap(marketCapUsd: number): number | undefined {
  if (!Number.isFinite(marketCapUsd) || marketCapUsd <= 0) return undefined;
  const logValue = Math.log10(marketCapUsd);
  return clamp(((logValue - 4) / (12.3 - 4)) * 100);
}

/**
 * Liquiditaet (0-100) als taegliche Umschlagsrate (Volumen / Marktkapitalisierung) - ein
 * Standardmass fuer Marktliquiditaet. Typische Krypto-Umschlagsraten liegen zwischen 0% und
 * ~30% pro Tag; hoehere Werte werden auf 100 gedeckelt.
 */
export function scoreLiquidity(volumeUsd: number, marketCapUsd: number): number | undefined {
  if (!Number.isFinite(volumeUsd) || !Number.isFinite(marketCapUsd) || marketCapUsd <= 0) return undefined;
  const turnoverRatio = volumeUsd / marketCapUsd;
  return clamp((turnoverRatio / 0.30) * 100);
}

/**
 * Tokenomics/Verwaesserungsrisiko (0-100) als Verhaeltnis von zirkulierendem zu maximalem
 * Angebot. Naeher an 1 (= 100) bedeutet: der Grossteil des jemals existierenden Angebots ist
 * bereits im Umlauf, geringeres kuenftiges Verwaesserungsrisiko durch neu ausgegebene Tokens.
 */
export function scoreTokenomics(circulatingSupply?: number, maxSupply?: number | null): number | undefined {
  if (!circulatingSupply || !maxSupply || maxSupply <= 0) return undefined;
  return clamp((circulatingSupply / maxSupply) * 100);
}

/**
 * Angebots-Transparenz (0-100): ist eine harte Obergrenze des Angebots offengelegt?
 * Ein deklariertes max_supply (z.B. BTC: 21 Mio.) = volle Punktzahl. Nur total_supply ohne
 * deklarierte Obergrenze (z.B. viele Token mit unbegrenzter Inflation) = mittlere Punktzahl.
 * Weder max_supply noch total_supply bekannt = kein Signal (undefined statt geschaetzt).
 */
export function scoreSupplyTransparency(maxSupply?: number | null, totalSupply?: number): number | undefined {
  if (maxSupply && maxSupply > 0) return 100;
  if (totalSupply && totalSupply > 0) return 50;
  return undefined;
}

export interface ReturnStats {
  /** Tages-Standardabweichung der log-Renditen in Prozent. */
  dailyStdevPct: number;
  /** Rate-of-Change ueber das gesamte Fenster in Prozent. */
  rocPct: number;
  /** Einfacher gleitender Durchschnitt der Schlusskurse im Fenster. */
  sma: number;
  /** Letzter Schlusskurs im Fenster. */
  last: number;
  high: number;
  low: number;
}

/**
 * Berechnet Standard-Kennzahlen aus einer REALEN historischen Schlusskurs-Reihe
 * (assetRegistry.getHistory(), nur wenn source === 'live'). Erfordert mindestens 2 Punkte.
 */
export function computeReturnStats(closes: number[]): ReturnStats | undefined {
  if (!closes || closes.length < 2) return undefined;
  const logReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) {
      logReturns.push(Math.log(closes[i] / closes[i - 1]));
    }
  }
  if (logReturns.length < 2) return undefined;

  const mean = logReturns.reduce((a, b) => a + b, 0) / logReturns.length;
  const variance = logReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / logReturns.length;
  const dailyStdevPct = Math.sqrt(variance) * 100;

  const first = closes[0];
  const last = closes[closes.length - 1];
  const rocPct = first > 0 ? ((last - first) / first) * 100 : 0;
  const sma = closes.reduce((a, b) => a + b, 0) / closes.length;
  const high = Math.max(...closes);
  const low = Math.min(...closes);

  return { dailyStdevPct, rocPct, sma, last, high, low };
}

/**
 * Volatilitaet (0-100, hoeher = volatiler). Typische Tages-Volatilitaet bei Krypto liegt
 * zwischen ~1% (Stablecoins/Large-Caps in ruhigen Phasen) und ~15%+ (Small-/Micro-Caps).
 * Konsumenten wenden ueblicherweise (100 - volatilityScore) an, um "geringe Volatilitaet
 * = positiv" abzubilden - siehe scoring.service.ts.
 */
export function scoreVolatility(dailyStdevPct: number): number {
  return clamp((dailyStdevPct / 15) * 100);
}

/**
 * "Regime"-Signal (0-100) aus der tatsaechlichen 24h-Preisaenderung: positive, staerkere
 * Bewegungen deuten auf ein bullisches Momentum-Regime hin. Bewusst einfach und
 * nachvollziehbar gehalten, keine verdeckte Gewichtung.
 */
export function scoreRegime(change24h: number): number {
  return clamp(50 + change24h * 3);
}

/**
 * Trend (0-100): Position des letzten Kurses relativ zum gleitenden Durchschnitt des
 * Beobachtungsfensters. > SMA = Aufwaertstrend.
 */
export function scoreTrend(last: number, sma: number): number {
  if (sma <= 0) return 50;
  const pctAboveSma = ((last - sma) / sma) * 100;
  return clamp(50 + pctAboveSma * 2);
}

/** Momentum (0-100) aus der Rate-of-Change ueber das Beobachtungsfenster. */
export function scoreMomentum(rocPct: number): number {
  return clamp(50 + rocPct * 1.5);
}

/** Breakout-Position (0-100): wo im realen High/Low-Bereich des Fensters liegt der letzte Kurs. */
export function scoreBreakout(last: number, high: number, low: number): number {
  if (high <= low) return 50;
  return clamp(((last - low) / (high - low)) * 100);
}

/**
 * Relative Strength Index (Wilder, Standardperiode = Fensterlaenge). Klassischer, oeffentlich
 * dokumentierter TA-Indikator (0-100), direkt aus realen Schlusskursen berechnet.
 */
export function computeRsi(closes: number[]): number | undefined {
  if (!closes || closes.length < 3) return undefined;
  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gainSum += diff;
    else lossSum += -diff;
  }
  const periods = closes.length - 1;
  const avgGain = gainSum / periods;
  const avgLoss = lossSum / periods;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return clamp(100 - 100 / (1 + rs));
}

// Audit ARCH-AUDIT-0002 (J1, Kapitel 10.1/14.6): Datenqualitaetsschicht - ersetzt
// server.ts' getAssetPatternForSymbol(), das JEDEM Symbol einen benannten Chart-Pattern
// ("Bullish Engulfing", "Cup & Handle" etc.) zuwies - entweder hartkodiert unabhaengig vom
// tatsaechlichen aktuellen Kursverlauf, oder ueber einen Zeichen-Hash-Fallback fuer alle
// anderen Symbole. Keine dieser Zuweisungen basierte auf einer echten Erkennung des
// Kursmusters. Diese Funktion behauptet KEINEN benannten Chart-Pattern (das wuerde eine
// tatsaechliche Mehrkerzen-Mustererkennung auf OHLC-Daten voraussetzen, die diese Codebasis
// nicht hat) - sondern klassifiziert nur die bereits real berechnete Trend-Position
// (scoreTrend()) in drei ehrliche, grobe Kategorien.
export type TrendLabel = 'Aufwärtstrend' | 'Abwärtstrend' | 'Seitwärtsbewegung';

export function classifyTrendLabel(stats: ReturnStats): TrendLabel {
  const trendScore = scoreTrend(stats.last, stats.sma);
  if (trendScore > 60) return 'Aufwärtstrend';
  if (trendScore < 40) return 'Abwärtstrend';
  return 'Seitwärtsbewegung';
}

/**
 * Rechnet einen gewichteten Gesamtscore aus einer Teilmenge tatsaechlich vorhandener
 * Faktoren aus. Faktoren ohne Wert (undefined) werden NICHT mit 0 oder einem Schaetzwert
 * belegt, sondern aus der Summe ausgeschlossen; ihr Gewichtsanteil wird proportional auf die
 * vorhandenen Faktoren umgelegt (dynamische Neugewichtung, Audit-Massnahme S1).
 * `invert` markiert Faktoren, bei denen ein hoeherer Rohwert schlechter ist (z.B. volatility) -
 * fuer diese wird (100 - Wert) verwendet. Der Satz ist read-only: diese Bewertungsprimitive
 * konsumiert Inversionsmetadaten, mutiert sie aber nicht.
 */
export function renormalizeAndScore(
  values: Record<string, number | undefined>,
  weights: Record<string, number>,
  invert: ReadonlySet<string> = new Set<string>()
): { score: number; usedFactors: string[]; missingFactors: string[] } {
  const usedFactors: string[] = [];
  const missingFactors: string[] = [];
  let availableWeightSum = 0;

  for (const key of Object.keys(weights)) {
    if (values[key] !== undefined && Number.isFinite(values[key])) {
      usedFactors.push(key);
      availableWeightSum += weights[key];
    } else {
      missingFactors.push(key);
    }
  }

  if (availableWeightSum <= 0) {
    return { score: 0, usedFactors, missingFactors };
  }

  let weightedSum = 0;
  for (const key of usedFactors) {
    const raw = values[key] as number;
    const effectiveValue = invert.has(key) ? 100 - raw : raw;
    const normalizedWeight = weights[key] / availableWeightSum;
    weightedSum += effectiveValue * normalizedWeight;
  }

  return { score: clamp(weightedSum), usedFactors, missingFactors };
}

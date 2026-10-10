/**
 * Public non-commercial Screener Blueprint Bundle preview.
 * Parses only a bounded YAML subset. Never accepts keys, arbitrary YAML objects,
 * external inputs, provider secrets or live scorer mode.
 */
export const DEMO_FACTOR_IDS = [
  'fundamental', 'technical', 'momentum', 'liquidity', 'risk_quality', 'patterns',
] as const;
export type DemoFactorId = typeof DEMO_FACTOR_IDS[number];

export const SCREENER_BUNDLE_DEMO_YAML = `# Nur synthetische Werte. Keine API-Keys eingeben.
schema_version: 1
product: screener_blueprint_bundle
mode: demo
model: showcase_v0
weights:
  fundamental: 0.22
  technical: 0.18
  momentum: 0.14
  liquidity: 0.16
  risk_quality: 0.15
  patterns: 0.15
signals:
  fundamental: 80
  technical: 70
  momentum: 75
  liquidity: 90
  risk_quality: 60
  patterns: 85
`;

export const DEMO_FACTOR_LABELS: Readonly<Record<DemoFactorId, string>> = {
  fundamental: 'Fundamental', technical: 'Technische Analyse', momentum: 'Momentum',
  liquidity: 'Liquidität', risk_quality: 'Risikogüte', patterns: 'Chartmuster',
};

export type DemoPreview = {
  status: 'DEMO_ONLY';
  model: 'showcase_v0';
  total: number;
  contributions: ReadonlyArray<{
    factor: DemoFactorId;
    weight: number;
    signal: number;
    contribution: number;
  }>;
  productionEligible: false;
  rankEligible: false;
  publishable: false;
};

export type ParsedDemoYaml =
  | { ok: true; preview: DemoPreview }
  | { ok: false; errors: string[] };

const knownFactors = new Set<string>(DEMO_FACTOR_IDS);
const headerValues = {
  schema_version: '1',
  product: 'screener_blueprint_bundle',
  mode: 'demo',
  model: 'showcase_v0',
} as const;
type Header = keyof typeof headerValues;
const headers = Object.keys(headerValues) as Header[];
const numberToken = /^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/;

export function parseScreenerBundleDemoYaml(source: unknown): ParsedDemoYaml {
  if (typeof source !== 'string' || source.length > 2048) {
    return { ok: false, errors: ['Konfiguration fehlt oder ist größer als 2.048 Zeichen.'] };
  }
  const seen = new Set<string>();
  const weights = new Map<DemoFactorId, number>();
  const signals = new Map<DemoFactorId, number>();
  let section: 'weights' | 'signals' | null = null;
  const errors: string[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim() || /^#/.test(line)) continue;
    if (/\t|[{}\[\]!&*]|<<|https?:\/\//.test(line)) {
      errors.push(`Zeile ${index + 1}: nur einfache Blueprint-Schlüssel und Zahlen zulässig.`);
      continue;
    }
    const group = /^(weights|signals):$/.exec(line);
    if (group) {
      section = group[1] as 'weights' | 'signals';
      if (seen.has(section)) errors.push(`Zeile ${index + 1}: Abschnitt doppelt.`);
      seen.add(section);
      continue;
    }
    const scalar = /^([a-z_]+): ([a-z0-9_]+)$/.exec(line);
    if (scalar) {
      section = null;
      const name = scalar[1] as Header;
      if (!headers.includes(name) || scalar[2] !== headerValues[name]) {
        errors.push(`Zeile ${index + 1}: unbekannter oder unzulässiger Header.`);
      } else if (seen.has(name)) {
        errors.push(`Zeile ${index + 1}: Header doppelt.`);
      } else seen.add(name);
      continue;
    }
    const metric = /^  ([a-z_]+): (.+)$/.exec(line);
    if (metric && section && knownFactors.has(metric[1])) {
      const factor = metric[1] as DemoFactorId;
      const destination = section === 'weights' ? weights : signals;
      if (destination.has(factor)) {
        errors.push(`Zeile ${index + 1}: Faktor doppelt.`);
        continue;
      }
      if (!numberToken.test(metric[2])) {
        errors.push(`Zeile ${index + 1}: nur endliche Dezimalzahlen zulässig.`);
        continue;
      }
      const value = Number(metric[2]);
      const limit = section === 'weights' ? 1 : 100;
      if (!Number.isFinite(value) || value < 0 || value > limit) {
        errors.push(`Zeile ${index + 1}: Wert außerhalb 0–${limit}.`);
        continue;
      }
      destination.set(factor, value);
      continue;
    }
    errors.push(`Zeile ${index + 1}: Feld oder Einrückung nicht erlaubt.`);
  }
  for (const name of [...headers, 'weights', 'signals']) {
    if (!seen.has(name)) errors.push(`Pflichtfeld fehlt: ${name}.`);
  }
  for (const id of DEMO_FACTOR_IDS) {
    if (!weights.has(id)) errors.push(`Gewicht fehlt: ${id}.`);
    if (!signals.has(id)) errors.push(`Beispielsignal fehlt: ${id}.`);
  }
  const sum = [...weights.values()].reduce((s, n) => s + n, 0);
  if (weights.size === DEMO_FACTOR_IDS.length && Math.abs(sum - 1) > 1e-9) {
    errors.push('Gewichte müssen in Summe genau 1,00 ergeben.');
  }
  if (errors.length) return { ok: false, errors: errors.slice(0, 10) };
  const contributions = DEMO_FACTOR_IDS.map(factor => {
    const weight = weights.get(factor)!;
    const signal = signals.get(factor)!;
    return Object.freeze({
      factor, weight, signal,
      contribution: Math.round(weight * signal * 10000) / 10000,
    });
  });
  const total = contributions.reduce((s, x) => s + x.contribution, 0);
  return { ok: true, preview: Object.freeze({
    status: 'DEMO_ONLY' as const,
    model: 'showcase_v0' as const,
    total: Math.round(total * 10000) / 10000,
    contributions,
    productionEligible: false as const,
    rankEligible: false as const,
    publishable: false as const,
  }) };
}

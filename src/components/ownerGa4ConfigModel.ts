// Owner-only configuration diagnostic presentation contract.
// The server may add future fields, but nothing outside this exact allowlist reaches the UI.
export const GA4_CONFIG_SCHEMA = 'CAPITAL_AI_GA4_OWNER_CONFIG_DIAGNOSTIC@1';
export const GA4_CONFIG_CODES = [
  'GA4_CONFIG_VALID',
  'GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED',
  'GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON',
  'GA4_MCP_SERVICE_ACCOUNT_INVALID',
  'GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED',
  'GA4_MCP_PROJECT_MISMATCH',
] as const;
export type Ga4ConfigCode = typeof GA4_CONFIG_CODES[number];
export type Ga4ConfigResult = {
  JSON_VALID: boolean | null;
  PROJECT_MATCH: boolean | null;
  reason: Ga4ConfigCode;
};
const allowed = new Set<string>(GA4_CONFIG_CODES);
function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
export function readGa4ConfigResult(value: unknown): Ga4ConfigResult | null {
  if (!record(value) || value.schema !== GA4_CONFIG_SCHEMA ||
      value.status !== 'CONFIG_DIAGNOSTIC_ONLY' ||
      !allowed.has(String(value.reason))) return null;
  const jsonValid = value.JSON_VALID;
  const projectMatch = value.PROJECT_MATCH;
  if (![true, false, null].includes(jsonValid as boolean | null) ||
      ![true, false, null].includes(projectMatch as boolean | null)) return null;
  const code = value.reason as Ga4ConfigCode;
  const expected: Record<Ga4ConfigCode, readonly [boolean | null, boolean | null]> = {
    GA4_CONFIG_VALID: [true, true],
    GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED: [null, null],
    GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON: [false, null],
    GA4_MCP_SERVICE_ACCOUNT_INVALID: [true, null],
    GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED: [true, null],
    GA4_MCP_PROJECT_MISMATCH: [true, false],
  };
  const pair = expected[code];
  if (pair[0] !== jsonValid || pair[1] !== projectMatch) return null;
  return { JSON_VALID: jsonValid as boolean | null, PROJECT_MATCH: projectMatch as boolean | null, reason: code };
}

const guidance: Record<Ga4ConfigCode, string> = {
  GA4_CONFIG_VALID: 'Format und Projektbindung sind plausibel. Als Nächstes GA4-MCP, Property-Zugriff und aggregierte Events separat verifizieren.',
  GA4_MCP_SERVICE_ACCOUNT_NOT_CONFIGURED: 'Service-Account-JSON im geschützten Render-Environment prüfen und aus einer vertrauenswürdigen Quelle wiederherstellen.',
  GA4_MCP_SERVICE_ACCOUNT_INVALID_JSON: 'Render-Variable mit dem unveränderten Original-JSON ersetzen. Keine zusätzliche Quotierung, Dateipfade oder Base64-Darstellung verwenden.',
  GA4_MCP_SERVICE_ACCOUNT_INVALID: 'Service-Account-Typ und Pflichtfelder in der geschützten Render-Konfiguration prüfen. Keine Secrets über Chat oder Browser übertragen.',
  GA4_MCP_CLOUD_PROJECT_NOT_CONFIGURED: 'GOOGLE_ANALYTICS_CLOUD_PROJECT im geschützten Render-Environment ergänzen.',
  GA4_MCP_PROJECT_MISMATCH: 'Die Projekt-ID der Render-Konfiguration mit der service-account project_id abgleichen; nur eine bestätigte Bindung korrigieren.',
};
export function ga4ConfigRecommendation(code: Ga4ConfigCode): string {
  return guidance[code];
}

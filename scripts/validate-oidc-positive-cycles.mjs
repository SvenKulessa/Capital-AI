import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_OIDC_SUCCESS_EVENTS = Object.freeze([
  'OIDC authentication verified at token_exchange',
  'OIDC authentication verified at token_validation',
  'OIDC authentication verified at session_creation',
]);

const sha40 = /^[a-f0-9]{40}$/i;
const sha256 = /^sha256:[a-f0-9]{64}$/i;
const nonEmpty = value => (typeof value === 'string' && value.length > 0) || (typeof value === 'number' && Number.isFinite(value));

function validCycle(cycle) {
  if (!cycle || typeof cycle !== 'object' || Array.isArray(cycle)) return false;
  if (!nonEmpty(cycle.validationId) || !nonEmpty(cycle.runId) || !nonEmpty(cycle.deployId)) return false;
  if (typeof cycle.observedAt !== 'string' || Number.isNaN(Date.parse(cycle.observedAt))) return false;
  if (!sha40.test(cycle.sourceSha || '') || !sha256.test(cycle.imageDigest || '')) return false;
  const gates = cycle.gates || {};
  if (gates.configurationPresent !== true ||
      gates.discoveryVerified !== true ||
      gates.credentialAuthenticationVerified !== true ||
      gates.loginVerified !== true ||
      gates.idTokenValidated !== true ||
      gates.sessionEstablished !== true) return false;
  if (!Array.isArray(cycle.successEvents) ||
      cycle.successEvents.length !== REQUIRED_OIDC_SUCCESS_EVENTS.length ||
      !REQUIRED_OIDC_SUCCESS_EVENTS.every((event, index) => cycle.successEvents[index] === event)) return false;
  return true;
}

export function evaluateOidcPositiveCycles(input) {
  const cycles = Array.isArray(input?.cycles) ? input.cycles : [];
  const positive = cycles.filter(validCycle);
  const validationIds = new Set(positive.map(cycle => String(cycle.validationId)));
  const runIds = new Set(positive.map(cycle => String(cycle.runId)));
  const uniquePositiveCycles = positive.length === validationIds.size && positive.length === runIds.size;
  const pass = positive.length >= 3 && uniquePositiveCycles;
  return {
    schema: 'OIDC_POSITIVE_VALIDATION_CYCLES_RESULT@1',
    requiredPositiveCycles: 3,
    receivedCycles: cycles.length,
    positiveCycles: positive.length,
    uniquePositiveCycles,
    selfHealingPromotionEligible: pass,
    pass,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const raw = readFileSync(process.argv[2], 'utf8');
    if (Buffer.byteLength(raw) > 1024 * 1024) throw new Error('oversized');
    const report = evaluateOidcPositiveCycles(JSON.parse(raw));
    console.log(JSON.stringify(report));
    if (!report.pass) process.exitCode = 1;
  } catch {
    console.log(JSON.stringify({
      schema: 'OIDC_POSITIVE_VALIDATION_CYCLES_RESULT@1',
      pass: false,
      selfHealingPromotionEligible: false,
      error: 'OIDC_POSITIVE_CYCLE_INPUT_INVALID',
    }));
    process.exitCode = 1;
  }
}

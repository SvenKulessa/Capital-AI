import { createHash } from 'node:crypto';

const HIGH_RISK_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions?|rules?|prompts?)/i,
  /(reveal|show|print|return|exfiltrate).{0,48}(system|developer|hidden|secret|api[_ -]?key|token|credential)/i,
  /(system|developer|assistant)\s*[:>]\s*(override|instruction|message)/i,
  /<\/?(?:system|developer|assistant|tool|function)[^>]*>/i,
  /(?:jailbreak|developer mode|dan mode|prompt injection|system prompt override)/i,
  /(call|invoke|use)\s+(?:the\s+)?(?:tool|function).{0,64}(secret|credential|environment|filesystem|network)/i,
];

const MEDIUM_RISK_PATTERNS = [
  /(?:base64|hex|rot13|unicode).{0,32}(decode|payload|instruction)/i,
  /(?:do not|don't)\s+(?:mention|tell|disclose).{0,64}(instruction|prompt|policy)/i,
  /(?:new|replacement)\s+(?:system|developer)\s+(?:prompt|instruction)/i,
];

export function assessPromptInjection(input) {
  const normalized = String(input ?? '').normalize('NFKC').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ');
  let score = 0;
  const reasons = [];
  for (const pattern of HIGH_RISK_PATTERNS) {
    if (pattern.test(normalized)) { score += 4; reasons.push('high-risk-instruction-override'); }
  }
  for (const pattern of MEDIUM_RISK_PATTERNS) {
    if (pattern.test(normalized)) { score += 2; reasons.push('encoded-or-concealed-instruction'); }
  }
  const uniqueReasons = [...new Set(reasons)];
  return {
    allowed: score < 4,
    score,
    reasons: uniqueReasons,
    fingerprint: createHash('sha256').update(normalized).digest('hex').slice(0, 16),
    normalized,
  };
}

export class PromptInjectionError extends Error {
  constructor(result) {
    super('prompt_injection_blocked');
    this.name = 'PromptInjectionError';
    this.code = 'PROMPT_INJECTION_BLOCKED';
    this.fingerprint = result.fingerprint;
    this.reasons = result.reasons;
  }
}

export function assertPromptSafe(input) {
  const result = assessPromptInjection(input);
  if (!result.allowed) throw new PromptInjectionError(result);
  return result.normalized;
}

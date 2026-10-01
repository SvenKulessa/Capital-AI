export const browserBoundaryForbidden = [
  /GEMINI_API_KEY/,
  /OIDC_CLIENT_SECRET/,
  /TELEGRAM_BOT_TOKEN/,
  /api\.telegram\.org/,
  /@google\/genai/,
  /handleAdvisorRequest/
];

export function isForbiddenBrowserText(source) {
  return browserBoundaryForbidden.some(pattern => pattern.test(source));
}

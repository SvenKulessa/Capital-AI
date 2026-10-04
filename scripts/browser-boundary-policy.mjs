export const browserBoundaryForbidden = [
  /GEMINI_API_KEY/,
  /OIDC_CLIENT_SECRET/,
  /SUPABASE_SECRET_KEY/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /sb_secret_/,
  /TELEGRAM_BOT_TOKEN/,
  /api\.telegram\.org/,
  /@google\/genai/,
  /handleAdvisorRequest/
];

export function isForbiddenBrowserText(source) {
  return browserBoundaryForbidden.some(pattern => pattern.test(source));
}

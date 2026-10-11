import { cookieCopy } from '../i18n/cookieCopy.ts';
export function cookieStorageRows(copy: (typeof cookieCopy)[keyof typeof cookieCopy]) {
  return [
    ['_ga / _ga_0542DT2HCE', 'Cookie · Secure · SameSite=Lax', copy.analytics, copy.validity],
    ['capital-ai-cookie-consent-v3', 'Local Storage', copy.preference, copy.validity],
    ['__Host-capital_session_count / __Host-capital_session_*', 'Cookie · HttpOnly · Secure · SameSite=Lax', copy.session, `7 ${copy.days}`],
    ['__Host-capital_pkce', 'Cookie · HttpOnly · Secure · SameSite=Lax', copy.login, `10 ${copy.minutes}`],
    ['capital_ai_locale', 'Cookie · Secure (HTTPS) · SameSite=Lax', copy.language, `1 ${copy.year}`],
    ['capital_ai_locale', 'Local Storage', copy.language, copy.untilDelete],
    ['capital_ai_whale_txs_v1 / capital_ai_sentiment_alerts_v2 / capital_ai_alert_prefs_v2', 'Local Storage', copy.functional, copy.untilDelete],
    ['capital_ai_price_alerts_v2 / capital_ai_pipelines_v1 / capital_ai_active_pipeline_id', 'Local Storage', `${copy.functional} · ${copy.onUse}`, copy.untilDelete],
    ['capital_ai_hero_buddy_hidden_v1 / capital_ai_hero_buddy_position_v1 / capital_ai_hero_buddy_floating_v1', 'Local Storage', `${copy.functional} · ${copy.onUse}`, copy.untilDelete],
    ['capital-ai-vocabulary-grant / capital_ai_telegram_logs_v1', 'Local Storage', `${copy.functional} · ${copy.onUse}`, copy.untilDelete],
  ];
}

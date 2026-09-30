/**
 * ============================================================================
 * [ARCHITEKTUR-MAPPING: TELEGRAM BOT PUSH & WEBHOOK NOTIFICATION ENGINE]
 * ----------------------------------------------------------------------------
 * 1. GRAFISCHE KOMPONENTE : Telegram Push Hub (in WhaleRadarModal, PriceAlertsModal) & Delivery Logs
 * 2. SCORING-LOGIK        : 
 *    - Bewertet Schwellenwerte für automatischen Push (Min. Whale Volume, Impact Score, Price Thresholds)
 *    - Markdown / HTML Payload-Generierung mit Financial Badges
 * 3. DATENANBINDUNG       : 
 *    - REST HTTPS API (`https://api.telegram.org/bot<token>/sendMessage`)
 *    - In-App Simulation & Client-Side LocalStorage Delivery Audit Log
 * 4. DATENQUELLEN / FEEDS : 
 *    - On-Chain Whale Radar Trigger
 *    - Multi-Asset Price Alerts Breaches
 *    - Fear & Greed / Macro Regime Flip Detection
 * ============================================================================
 */

import { TelegramConfig, TelegramMessageLog, WhaleTransaction, PriceAlert, SentimentAlert } from '../types';

/* === [PLATZHALTER: DATENANBINDUNG & KONFIGURATION - TELEGRAM DEFAULT PROFILE] === */
const TELEGRAM_LOGS_STORAGE_KEY = 'capital_ai_telegram_logs_v1';

export const DEFAULT_TELEGRAM_CONFIG: TelegramConfig = {
  enabled: true,
  connected: false,
  channelName: '@CapitalAI_WhaleBot',
  notifyWhaleRadar: true,
  notifySmartMoney: true,
  notifyPriceAlerts: true,
  notifySentimentFlips: true,
  minWhaleVolumeMln: 5, // Alert on transactions >= $5M
};

/**
 * Format a Whale Transaction into a high-impact Telegram push message
 */
export function formatWhaleTelegramMessage(tx: WhaleTransaction): { title: string; body: string; html: string } {
  const isOutflow = tx.actionType === 'EXCHANGE_OUTFLOW';
  const isInflow = tx.actionType === 'EXCHANGE_INFLOW';
  const isDarkPool = tx.actionType === 'DARK_POOL_BUY' || tx.actionType === 'DARK_POOL_SELL';

  const actionIcon = isOutflow ? '🟢' : isInflow ? '🔴' : isDarkPool ? '🟣' : '⚪';
  const formattedUsd = (tx.amountUsd / 1_000_000).toFixed(1) + 'M $';

  const title = `🚨 [WHALE ALERT] ${tx.assetSymbol} • ${formattedUsd}`;

  const body = `
${actionIcon} ${tx.actionLabel}
Asset: ${tx.amountNative.toLocaleString('de-DE')} ${tx.assetSymbol} (${formattedUsd})
From: ${tx.fromWallet.label}
To: ${tx.toWallet.label}
Smart Money Score: ${tx.impactScore}/100 [${tx.smartMoneyBias}]
Signal: ${tx.aiInterpretation}
TxHash: ${tx.txHash.slice(0, 10)}...${tx.txHash.slice(-6)}
`.trim();

  const html = `
<b>🚨 CAPITAL-AI WHALE RADAR ALERT 🚨</b>

${actionIcon} <b>${tx.actionLabel}</b>
💰 <b>Volumen:</b> ${tx.amountNative.toLocaleString('de-DE')} <b>${tx.assetSymbol}</b> (<code>${formattedUsd}</code>)
📤 <b>Von:</b> <code>${tx.fromWallet.label}</code>
📥 <b>Nach:</b> <code>${tx.toWallet.label}</code>

📊 <b>Smart Money Score:</b> <code>${tx.impactScore}/100</code> (<b>${tx.smartMoneyBias}</b>)
🧠 <b>KI-Signal:</b> <i>${tx.aiInterpretation}</i>

🔗 <a href="${tx.explorerUrl || '#'}">On-Chain Explorer: ${tx.txHash.slice(0, 12)}...</a>
⚡ <i>Capital-AI Next-Gen Quant Terminal</i>
`.trim();

  return { title, body, html };
}

/**
 * Format a Price Alert into a Telegram push notification
 */
export function formatPriceAlertTelegramMessage(
  alert: PriceAlert,
  currentPriceFormatted: string
): { title: string; body: string; html: string } {
  const dirIcon = alert.direction === 'ABOVE' ? '📈' : '📉';
  const dirText = alert.direction === 'ABOVE' ? 'überschritten' : 'unterschritten';

  const title = `🔔 [PREISALARM] ${alert.assetSymbol} ${dirIcon}`;

  const body = `
${dirIcon} Schwellenwert ${dirText}!
Asset: ${alert.assetName} (${alert.assetSymbol})
Zielkurs: ${alert.formattedTarget}
Aktueller Kurs: ${currentPriceFormatted}
Zeitstempel: ${new Date().toLocaleTimeString('de-DE')}
${alert.note ? `Notiz: ${alert.note}` : ''}
`.trim();

  const html = `
<b>🔔 CAPITAL-AI PREIS-ALARM</b>

${dirIcon} <b>Schwellenwert ${dirText}!</b>
🎯 <b>Asset:</b> ${alert.assetName} (<b>${alert.assetSymbol}</b>)
📌 <b>Zielpreis:</b> <code>${alert.formattedTarget}</code>
⚡ <b>Aktueller Kurs:</b> <code>${currentPriceFormatted}</code>
${alert.note ? `📝 <i>Notiz: ${alert.note}</i>\n` : ''}
⏱ <i>Ausgelöst: ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} Uhr</i>
`.trim();

  return { title, body, html };
}

/**
 * Get stored telegram notification logs
 */
export function getTelegramLogs(): TelegramMessageLog[] {
  try {
    const raw = localStorage.getItem(TELEGRAM_LOGS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore error
  }
  return [];
}

/**
 * Save a message to telegram logs
 */
export function saveTelegramLog(log: Omit<TelegramMessageLog, 'id'>): TelegramMessageLog {
  const newLog: TelegramMessageLog = {
    ...log,
    id: 'tg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
  };

  try {
    const existing = getTelegramLogs();
    const updated = [newLog, ...existing].slice(0, 50); // Keep last 50
    localStorage.setItem(TELEGRAM_LOGS_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Ignore error
  }

  return newLog;
}

/**
 * Real or simulated Telegram push dispatch
 */
export async function dispatchTelegramPush(
  config: TelegramConfig,
  title: string,
  body: string,
  html?: string
): Promise<{ success: boolean; status: 'DELIVERED' | 'SIMULATED' | 'FAILED'; error?: string }> {
  if (!config.enabled) return { success: false, status: 'FAILED', error: 'Telegram-Versand ist deaktiviert.' };
  try {
    const response = await fetch('/api/telegram/send', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${title}\n\n${body}` }),
      signal: AbortSignal.timeout(7000),
    });
    const result = await response.json();
    if (!response.ok || result.success !== true || result.status !== 'DELIVERED') throw new Error('Telegram benötigt eine freigegebene Anmeldung und serverseitige Konfiguration.');
    saveTelegramLog({ sentAt: new Date().toISOString(), title, body, status: 'DELIVERED' });
    return { success: true, status: 'DELIVERED' };
  } catch {
    const error = 'Telegram-Versand nicht bestätigt. Anmeldung und Server-Konfiguration prüfen.';
    saveTelegramLog({ sentAt: new Date().toISOString(), title, body: error, status: 'FAILED' });
    return { success: false, status: 'FAILED', error };
  }
}

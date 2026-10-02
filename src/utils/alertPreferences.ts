import type { TelegramConfig, UserAlertPreferences } from '../types';

export function sanitizeTelegramConfig(input: Partial<TelegramConfig> = {}): TelegramConfig {
  // Reconstruct only public settings. Old botToken/chatId and unknown fields are discarded.
  return {
    enabled: input.enabled === true,
    connected: input.connected === true,
    channelName: typeof input.channelName === 'string' ? input.channelName.slice(0, 100) : undefined,
    notifyWhaleRadar: input.notifyWhaleRadar === true,
    notifySmartMoney: input.notifySmartMoney === true,
    notifyPriceAlerts: input.notifyPriceAlerts === true,
    notifySentimentFlips: input.notifySentimentFlips === true,
    minWhaleVolumeMln: typeof input.minWhaleVolumeMln === 'number' && Number.isFinite(input.minWhaleVolumeMln) ? Math.max(0, Math.min(100000, input.minWhaleVolumeMln)) : 5,
    lastTestedAt: typeof input.lastTestedAt === 'string' ? input.lastTestedAt.slice(0, 50) : undefined,
  };
}

export function sanitizeAlertPreferences(input: UserAlertPreferences, resetConnection = false): UserAlertPreferences {
  return {
    inAppNotifications: input.inAppNotifications === true,
    soundEnabled: input.soundEnabled === true,
    emailDigest: input.emailDigest === true,
    pushSimulation: input.pushSimulation === true,
    autoCheckIntervalSec: typeof input.autoCheckIntervalSec === 'number' && Number.isFinite(input.autoCheckIntervalSec) ? Math.max(10, Math.min(3600, input.autoCheckIntervalSec)) : 30,
    sentimentAlertsEnabled: input.sentimentAlertsEnabled === true,
    telegram: sanitizeTelegramConfig({ ...(input.telegram || {}), ...(resetConnection ? { connected: false } : {}) }),
  };
}

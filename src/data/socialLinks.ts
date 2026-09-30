/** Owner-confirmed public profiles from the GitHub profile screenshot, 2026-09-30.
 * Keep TikTok's supplied share URL intact; YouTube's share parameter is unnecessary.
 * Link-only integration: do not preload third-party widgets or tracking scripts.
 */
export const socialLinks = [
  { id: 'github', label: 'GitHub', href: 'https://github.com/SvenKulessa' },
  { id: 'tiktok', label: 'TikTok', href: 'https://pro.tiktok.com/t/ZG9AvSuuWN7gg-3ymWr/' },
  { id: 'threads', label: 'Threads', href: 'https://www.threads.net/@svenkulessa' },
  { id: 'youtube', label: 'YouTube', href: 'https://youtube.com/@capital-ai.online' },
  { id: 'x', label: 'X', href: 'https://x.com/CapitalAIOnline' },
] as const;

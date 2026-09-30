# Bestätigte Community-Links

Basis: Main `67cdf660095c68238b2e20604b1cd87cc32d3464`.
Quelle: vom Owner am 30.09.2026 bereitgestellter Screenshot seines GitHub-Profils.

| Plattform | Ziel |
| --- | --- |
| GitHub | https://github.com/SvenKulessa |
| TikTok | https://pro.tiktok.com/t/ZG9AvSuuWN7gg-3ymWr/ |
| Threads | https://www.threads.net/@svenkulessa |
| YouTube | https://youtube.com/@capital-ai.online |
| X | https://x.com/CapitalAIOnline |

YouTube: Freigabeparameter `si` entfernt, Kanalhandle unverändert.
Threads und X: Profil-URLs aus den im Screenshot angegebenen Plattformen/Handles gebildet.
TikTok: bereitgestellten Kurzlink exakt übernommen; nicht als aufgelöster Profil-Permalink behauptet.
GitHub: bisherigen Repository-Link durch das bereitgestellte Profil ersetzt.

## Vier Validierungsschritte
1. Main, PR #38 (gemergt), offene PRs und Branches gelesen: keine parallelen Writer.
2. HTTPS-Ziele, fünf gerenderte Links, `noopener noreferrer`, zugängliche Linknamen,
   Fokus- und mindestens 44px Klickhöhen-Klassen per React-Rendering geprüft: PASS.
3. TypeScript, Produktionsbuild, vorhandene Branding-Tests (67 Asset-Hashes),
   Browser-/Server-Grenzprüfung und `git diff --check`: PASS.
4. Visuelle Smartphone-/Desktop-Prüfung offen: Chromium-Download liefert ungültiges
   Archiv. Externe Profile und TikTok-Weiterleitungsziel nicht live geprüft.

Zentrale Registry: `src/data/socialLinks.ts`. Footer verwendet plattformspezifische
Symbole aus vorhandener Lucide-Abhängigkeit bzw. Text für X. Kein neues Paket,
keine externen Widgets, automatischen Social-Anfragen oder zusätzlichen Tracker.
Bestätigter X-Handle ersetzt die zuvor entfernte unbelegte Social-Metadatenangabe.
Kein Deployment oder manueller CI-Lauf ausgelöst.

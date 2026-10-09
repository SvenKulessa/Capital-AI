# CAPITAL-AI Chart Pattern Shorts · TikTok / YouTube (DRAFT)
Stand: 2026-10-09
Domain: GROWTH · Branch: `capital-ai-growth/chart-pattern-shorts-20261009`

## Umfang
Vier lokal erzeugte MP4-Entwürfe (Cup-and-Handle und Doppelboden, jeweils Educational und Referral), je 55 Sekunden, 1080×1920, H.264/AAC. Geprüfte SHA-256-Digests und echte `CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1`-Teilmanifeste: `CAPITAL-AI-GROWTH/CHART-PATTERN-SHORTS-20261009.json`.

**Wichtig:** Videobytes liegen vorerst als separat bereitgestellte Chat-Artefakte vor, NICHT in einem autorisierten Server-Asset-Store. Keine Veröffentlichung, kein Provider-Receipt, keine TikTok-ID und keine Attribution. Der Render-Runner im Production-Service wurde NICHT aufgerufen. Lokale Rendering-Prototypen sind keine produktive Social-Media-Engine-Ausführung.

## Architekturabgleich
- Content Engine: `src/contracts/contentEngine.ts`; CampaignBrief erlaubt YOUTUBE, aber noch keinen nativen TIKTOK-Kanal. Der TikTok-Kanal bleibt ausschließlich in `contentSocialPackage`-Deliveries. Keine riskante Contract-Migration innerhalb dieses DRAFT.
- Social Media Engine: `src/contracts/socialPublisherAdapter.ts` / `server/social-media/provider-publish.mjs`. TikTok ist `IMPLEMENTED_DISABLED`, Freigaben/Hashbindung müssen vor Provider-Nutzung real existieren.
- `approvals: []`; `deliveryState: DRAFT`, `adapterState: INTEGRATION_PENDING` in beiden Teilmanifesten. Keine simulierten Approval-Refs.
- Audio: offline synthetische deutsche eSpeak-Sprecher, kein natürlicher Podcast-Cast; Voice-QA erforderlich.
- Logo: vom Owner bereitgestelltes Logo, hier abgeleitetes Repository-Favicon + Wortmarke. Keine Drittbilder oder Musik.
- Charts: vollständig schematisch/synthetisch und entsprechend beschriftet. Keine historischen Kurse oder Pattern-Statistiken behauptet.

## Referral-Verwendung und Grenzen
Der Code `yc4ggk3f` und der vom Owner genannte Link `https://proinvite.kraken.com/9f1e/8nfzp3u7` erscheinen nur in den explizit als Werbung gekennzeichneten Referral-Varianten bzw. Captions. Keine garantierten Boni, keine vorgetäuschte Partnerschaft. Allgemeine Kraken-Pro-Teilnahmebedingungen sind einsehbar, die konkreten Linkbedingungen und persönliche Werbeberechtigung sind weiterhin `NOT_PROVEN`.

**TikTok Referral-Variante: REVIEW_REQUIRED / nicht zur Publikation freigegeben.** TikTok beschränkt Krypto-/Finanzdienstleistungswerbung und regulierte Produkte; für die konkrete organische Referral-Veröffentlichung muss die Anbieter-/Plattformfreigabe nachgewiesen werden. Werbekennzeichnung nicht entfernen. Keine bezahlten Boosts, Anzeigen oder gesponserten Posts für den Referral-Link ohne ausdrückliche Prüfung.

## Beispiel-Captions

### Cup Educational
☕ Nicht jede U-Form ist ein Cup-and-Handle! Trend, Rim-Zone, Henkel und möglichen Fehlausbruch prüfen. Synthetischer Chart, keine Live-Kurse oder Anlageberatung. Mehr auf https://capital-ai.online/ #Chartanalyse #TechnischeAnalyse #CapitalAI

### Doppelboden Educational
📉 Zwei Tiefs reichen nicht. Ein Doppelboden braucht Marktumfeld, Support-Zone und Nackenlinie. Auch nach einem Schlusskurs darüber sind Fehlsignale möglich. Synthetischer Chart, keine Anlageberatung. https://capital-ai.online/ #Chartanalyse #Doppelboden #CapitalAI

### Referral-Caption, nur nach Rechteklärung
WERBUNG / REFERRAL · Kraken Pro: Code `yc4ggk3f`, https://proinvite.kraken.com/9f1e/8nfzp3u7. Prämien sind nicht garantiert und setzen Teilnahmebedingungen voraus. Kryptoassets sind hochriskant. Chartbeispiele schematisch, keine Anlageberatung.

## Vor öffentlicher Ausspielung
1. MP4- und Voice-Sichtung / ggf. natürlichere Stimmen mit expliziter Kosten- und Lizenzentscheidung.
2. Videoassets in den genehmigten privaten Asset Store übernehmen, SHA-256 erneut berechnen und Rights-Evidence binden.
3. TikTok-Konto/OAuth/Scopes/App-Review und Creator-Privacy-Optionen live prüfen.
4. Provider- und Plattformbedingungen für Referral-Promotion klären; andernfalls TikTok ausschließlich Bildungsfassungen.
5. Freigabe auf echte `assetSha256`-gebundene `approvalRef` setzen und Social Media Engine Publisher ausführen.
6. Provider-Readback abwarten. Erst dann `PUBLISHED` setzen und echte Performance-/Attributionsdaten abholen.

## Quellen
- https://support.kraken.com/de/articles/kraken-pro-app-referrals (Stand 2026-09-02)
- https://www.kraken.com/de/legal/referrals
- https://www.tiktok.com/community-guidelines/en
- https://ads.tiktok.com/resources/help/article/tiktok-ads-policy-financial-services?lang=de
- https://www.die-medienanstalten.de/service/merkblaetter-und-leitfaeden/leitfaden-werbekennzeichnung-bei-online-medien/

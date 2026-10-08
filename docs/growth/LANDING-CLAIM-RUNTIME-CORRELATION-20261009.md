# Öffentliche Landing-Claims und Runtime

Baseline: `main@57b2923d858e545562f2116aa25b7336d28b6387`. Prüfung: 2026-10-09, Europe/Berlin.

Der Browser auf `/pricing` zeigte im darunterliegenden Hero die pauschale Aussage „LIVE MARKETS. REAL INSIGHTS.“ und Echtzeit-/KI-Scoring-Claims. Der öffentliche `/healthz`-Readback meldete dagegen ECB-Referenzdaten für 20 Forex-Paare, `spotIngestion.configured=false`, `scoreDisplayEnabled=false` und offene Feature-/DQ-/Scoring-Grenzen. Private BYOK-Verbindungen sind damit nicht als globaler verifizierter Live-Feed nachgewiesen.

`src/components/Hero.tsx` und alle sechs Sprachfassungen in `src/i18n/messages.ts` beschreiben nun Lerninhalte, Analysemethoden, private Provider-Workspaces sowie separat ausgewiesene Datenzustände. Die Pillars versprechen keine allgemeine Echtzeitversorgung oder live ausgeführte KI-Modelle. Layout, Datenzugriffe, Preise und Checkout bleiben identisch. Keine Prognose zu Umsatz, Rendite oder Suchrankings.

Die Tarifoberfläche wurde im öffentlichen Browser geprüft: Starter/Pro/Enterprise 7/29/109 EUR monatlich bzw. 75,60/248/1.280 EUR jährlich; Zusatzangebot Vocabulary 19 EUR einmalig. Das ist Oberflächen-Evidence, keine Käufer-/Entitlement-E2E.

Validierung: bestehende vollständige Sprachabdeckung, i18n-/HTTP- und SEO-Regressionen sowie TypeScript/Frontend-Grenzen. Production-Auslieferung der neuen Texte ist erst nach erfolgreicher PR-/Main-CI und Render-Deploy nachgewiesen. Rollback: Textfix-Commit revertieren. Keine neue Ressource oder kostenpflichtige Integration.

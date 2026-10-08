# Finance historical reference intake — research comparison only

Stand: 2026-10-08. Base: Capital-AI main c7e2b12720ba033eb7a01c52963d27f81118b2f8.
Source: SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c.
MARKET: source/target semantics. TRUST: archive and rights evidence. GROWTH: claims.

## Ausgangslage
PR #289 ist gemergt. Die source-pinned Stock/FX Golden-Fixtures und historische
Commodity-Testdaten sind synthetisch. Der im Source-Tree implementierte Archive
Verifier ist kein originaler historischer Datenexport. Die geprüften Finance-/Backtest-
Unterlagen im verbundenen Drive ergaben bei der Metadatensuche keinen konkret
identifizierten Rohdaten-/Source-Score-Datensatz; externe Speicher sind damit
nicht ausgeschlossen.

EMPIRICAL_HISTORICAL_PARITY_NOT_PROVEN.

## Research-only Audit
Neue pure Auditfunktion: FinanceHistoricalParityAudit.ts.
Die Funktion konsumiert vom Caller eingereichte Referenz-Bytes mit SHA-256,
beobachtet/verfügbar/archiviert/entschieden-Zeitachsen und einen JSON-Envelope
des beanspruchten Finance-Source-Scores. Das ist explizit kein source-signierter
oder source-nativer Export; die Envelope kann ohne unabhängige Herkunftsevidence
nicht als originaler Finance-Run authentifiziert werden.

Die Target-Seite wird ausschließlich durch
ScoringEngineService.inspectFinanceModelResearch mit den bereits bestehenden
UAI-, validated-DATA-, Normalizer-, MARKET-Rights- und Faktor-Contracts bewertet.
Der Vergleich projiziert Research-Zahlen auf die Source-Precision von 1 Dezimale,
ohne produktive Scores zu autorisieren.

Zulässige Audit-States: BLOCKED, RESEARCH_MISMATCH, RESEARCH_MATCH_CANDIDATE.
Auch bei MATCH bleibt empiricalHistoricalParityProven=false, denn Hashkonsistenz
authentifiziert keine Quelle und beweist keinen realen historischen Vintage.

## Noch erforderliche Originale
- authentische, unveränderliche Finance Original-Outputs mit Model-SHA,
  Instrument, Zeitpunkt, Faktorinputs und Normalisierungs-Fingerprint;
- offizielle oder Provider-archivierte Payloadbytes mit belegtem historischen
  Release-/Revision-/Availability-/Capture-Zeitpunkt und Byte-Integrität;
- Asset-Universe/PIT-Identität und verifizierte Nutzungs-/Speicherrechte;
- unabhängige Authentizitätsprüfung, dann zeilenweise Source/Target-Vergleiche
  mit Coverage, Non-Matches und Rundungssemantik.

Keine Provider-/BYOK-Abfrage, keine neue Dependency, kein zusätzlicher Required
Check, keine Score-, Ranking-, Trade- oder Publish-Autorität. Unit-Test-Daten sind
ausdrücklich synthetisch und keine Marktevidence. Ein neuer PR löst reguläre
GitHub-Actions-Minuten aus; Restquota und Gebühren sind NOT_PROVEN.
Owner-only Merge gemäß root AGENTS.md.

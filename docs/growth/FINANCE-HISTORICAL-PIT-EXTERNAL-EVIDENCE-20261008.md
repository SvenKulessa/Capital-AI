# Finance Original-Evidence und Historical PIT — externer Quellabgleich

Stand: 2026-10-08. CAPITAL-AI main bei Beginn: e94d47cddde8ae32da749d08bc161daad323b914.
Source: SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c.
Primary domain GROWTH (evidence documentation), MARKET (PIT semantics), TRUST (data rights, provenance).

## Verifizierter aktueller Stand

- PR #297 ist im main; PR #298 ebenfalls erfolgreich gemergt. Das aktuelle
  `package.json` referenziert den financeHistoricalParityAudit-Test genau einmal;
  Render-Owner- und Analyse-UI-Tests sind ebenfalls enthalten.
- Finance `main` entspricht noch dem gepinnten Source-SHA
  `dcef421fe6e350a3a2ade61d0299aad9ecca213c`.
- Die Source-Golden-Tests sind explizit **synthetisch**; source-basierte Archiv-/Vintage-
  Validierungsfunktionen und historische Testzeitstempel sind kein Originaldatenexport.
- Für dieses Assessment wurde keine unveränderlich authentifizierte,
  nichtsynthetische Menge von Finance-Original-Score-Ergebnissen zusammen mit
  Provider-PIT-Rohdaten nachgewiesen. Abfrage der Finance-Release-Liste ergab
  keine Releases. Recherche im verbundenen Drive und Project/Library stellte
  ebenfalls keinen belegten Paar-Datensatz bereit. Dies beweist nicht, dass
  andere private/externe Ablagen keine solchen Daten enthalten.

## Offizielle Provider-Historie — konkret verifiziert

| Quelle | Instrument/Scope | Beobachtung/Meldedatum | dokumentierte tatsächliche Veröffentlichung | Status |
|---|---|---|---|---|
| CFTC Historical Viewable, Disaggregated Petroleum Futures Only | COT Petroleum Positions | 2025-09-30 | 2025-11-19 statt ursprünglich geplant 2025-10-03 | Amtliche Report-Seite und amtliche Termin-Korrektur online verifiziert; historische **Original-Release-Bytes, as-of Revision und Lizenzfreigabe nicht nachgewiesen** |
| EIA Weekly Petroleum Status Report | Wöchentliche Petroleum-Fakten | Report-spezifisch | Veröffentlichungszeit und Ausnahmen im EIA-Schedule | Offizieller Quellen-/Schedule-Pfad verifiziert; kein konkret historisches Originalrelease-Byte-Snapshot in diesem Slice |

CFTC Historical Viewable: https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalViewable/cot093025

CFTC Petroleum Report: https://www.cftc.gov/sites/default/files/files/dea/cotarchives/2025/futures/petroleum_lf093025.htm

CFTC Special Announcements (Bericht 2025-09-30 ursprünglich 2025-10-03,
tatsächlich 2025-11-19): https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalSpecialAnnouncements/index.htm

CFTC weist ausdrücklich darauf hin, dass Datumsangaben der Historical-Viewable-
Listen **Report Dates und nicht Release Dates** sind:
https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalViewable/index.htm

EIA WPSR Schedule (Standard- und Ausnahmetermine):
https://www.eia.gov/petroleum/supply/weekly/schedule.php

EIA Rechtehinweise: https://www.eia.gov/about/copyrights_reuse.php
Die EIA erläutert Public-Domain-Reuse für US-Government-Publikationen,
empfiehlt Quellen-/Datumsangabe und weist auf möglicherweise geschützte
Drittmaterialien hin. Dies **allein** belegt weder Scope noch tatsächlich
geprüfte Providerrechte in der konkreten CAPITAL-AI-Research-Anwendung.
CFTC-Nutzungsrechte wurden im konkreten Anwendungs-/Datenprodukt-Scope
nicht abschließend überprüft.

## PIT-Korrektheit

Die CFTC-Seite enthält reale Meldedaten, aber ein am 2025-10-03 gedachter
Score durfte **nicht** die erst am 2025-11-19 veröffentlichten COT-Zahlen
sehen. Der zusätzliche Unit-Test bindet die *offiziell belegte Datumsrelation*
an die bestehende `inspectFinanceHistoricalParityCandidate`-Boundary:
`FINANCE_HISTORICAL_VINTAGE_ORDER_UNPROVEN` führt zum Zustand `BLOCKED`.

Test-Bytes und Source-Score-Envelope sind weiterhin **synthetisch**;
das Release-Datum 2025-11-19 ist ein belegtes Kalenderdatum, keine
sekundengenau attestierte Freigabezeit. Die neue Testabdeckung erteilt
keine Source-Authentizität, Revisions- oder MarketDataRights-Freigabe.

## TRUST / MARKET Prüfmatrix

| Notwendige Evidence | Aktueller Beleg | Bewertung |
|---|---|---|
| Finance Original Score/Inputs je Instrument, Zeitpunkt, Modell-SHA | Nur synthetische Goldens | NOT_PROVEN |
| Original Provider Release-Bytes und archivierter Capture-Hash | CFTC live abrufbares historisches Report-HTML, aber Original-Release-Bytes nicht fixiert | NOT_PROVEN |
| Offizieller Release-Kalendertag für CFTC Sep-2025 | CFTC offizielles Bulletin | VERIFIED (Kalendertag) |
| Exakte PIT-Revisions-/Availability-/Erfassungs-Uhrzeiten | Kein unabhängiger Original-Capture | NOT_PROVEN |
| Instrument-/Normalizer-/Fingerprint-Identität Source vs Target | Keine echten historischen Paare | NOT_PROVEN |
| Konkrete Vertrags-/Verwendungskette inkl. Speicherung/Research | Kein geprüfter Contract für diese Dataset-Lane | REVIEW_REQUIRED |
| End-to-end empirische Finance Source-/Target-Score-Parität | Paar-Datensatz fehlt | NOT_PROVEN |

## Entscheidungs- und Kostenoptionen

**A — Empfohlen:** Vorhandene, rechtmäßig gesicherte Original Finance Runs
und zugehörige Point-in-Time Archive durch den Owner lokalisieren lassen.
Keine neue bezahlte Provideraktivierung. Private Secrets/Originaldaten nur
über dafür freigegebene sichere Kanäle, nicht in GitHub oder öffentliche
Test-Fixtures. Aufwand primär für Herkunftsprüfung/Normalisierung.

**B — Alternative:** Historische öffentliche CFTC/EIA-Releases künftig
kontrolliert neu erfassen, mit SHA-256, beobachtet/veröffentlicht/erfasst,
Revision- und Rights-Ledger. Kosten für Speicher, API-/Netzwerk- und CI-Last
sowie Betrieb vor Produktivaktivierung quantifizieren (aktuelle Quotas
nicht geprüft). Das rekonstruierte öffentliche Material ersetzt **nicht**
die fehlenden damals original berechneten Finance Scores.

Kein Provideraufruf mit Nutzer-BYOK-Schlüsseln, kein Import von fremden
Rohdaten in das Repository, kein produktives Scoring/Publishing/Ranking.
Nur dokumentierte CFTC/EIA-Webseiten und deterministischer Regressionstest.
MERGE nur durch Owner; Required Checks gemäß AGENTS.md.

# Snapshot und SSE zur Website

Stand: 04.10.2026. Primär PRODUCT; beteiligt MARKET, PLATFORM und TRUST.
Owner-Entscheidung: „Asset-Transport B freigegeben“ — Snapshot plus SSE.
Basis und zuletzt abgeglichener Main: `8e34c7a1f15cf46a89caf08d01ae4d6bf91a8c9f`.
`AGENTS.md@currentmain` berücksichtigt. Diese lokale Implementation ist keine Production-Freigabe.

## Verhalten und Contracts

- `GET /api/market/snapshot?limit=100&category=AKTIEN`: maximal 100 Instrumente je Seite; optionaler Kategorie-Filter für alle neun Kategorien aus `shared/market-contracts.mjs`.
- `nextCursor` enthält SHA-256 der Instrumentliste und Offset. Folgeabrufe behalten den Kategorie-Filter. Bei abweichendem Universum HTTP 409; der Client verwirft den unvollständigen Snapshot.
- `CAPITAL_AI_MARKET_SNAPSHOT@1`: `universeId`, `total` (registrierte zugelassene Instrumentbindungen), `items` (frische, belegte Quotes), `nextCursor`, `coverage`. Fehlende/abgelaufene Quotes werden ausgelassen. Registrierte Bindungen sind kein Nachweis frischer Kurse.
- `GET /api/market/events`: ein gemeinsamer Valkey-Pub/Sub-Listener; `quote`-Events mit Evidence-ID sowie `reset` nach Verbindungsaufbau. Bei Reconnect wird ein neuer Snapshot geladen. Dies ist ausdrücklich kein verlustfreies SSE-Replay; dauerhaftes Replay bleibt NATS JetStream vorbehalten.
- Quotes V2 tragen validierte Instrumentmetadaten einschließlich stabiler `assetId`. Mehrere Handelsplätze desselben Assets werden im Client und im registrierten Klassenzähler anhand dieser ID zusammengeführt. V1 bleibt für historische Facts lesbar.
- Manifest: `MARKET_INSTRUMENT_MANIFEST` bezeichnet zur Laufzeit eine JSON-Datei mit einem Array von `InstrumentSchema`-Einträgen. Maximal 2 MiB, 9000 Instrumente insgesamt, 1000 je Klasse. Fehlende/ungültige Liste ergibt keine multi-asset Auslieferung. Kein synthetisches Manifest wird produktiv eingebunden.
- Quelle muss `isAdmittedMarketSource(provider, 'marketQuotes')` erfüllen, Quote frisch sein und Metadaten müssen dem Manifest entsprechen. `MARKET_QUOTES_ENABLED` bleibt zusätzlicher Schalter. `actionable:false` bleibt Pflicht.

## Mengen- und Fehlergrenzen

Maximal zwei parallele Snapshot-Aufträge, 16 Cache-Reads je Auftrag und 32 ausstehende Reads insgesamt. Sechs Sekunden Deadline. Auch hängende Reads erzeugen keine unbegrenzte Anzahl neuer Operationen.

Maximal 64 SSE-Verbindungen, 15 Sekunden Heartbeat, fünf Minuten Verbindungsdauer, begrenzter Subscription-Handshake. Langsame Empfänger werden geschlossen; kein unbegrenzter Anwendungspuffer. Die vorhandene prozesslokale Grenze von 120 Transport-Anfragen/Minute bleibt bestehen. Der Transport ruft keine externen Provider pro Browser auf.

Ein gemeinsamer Frontend-Store wird von den Marktansichten genutzt. Er lädt höchstens 90 Seiten und höchstens 1 MiB pro Antwort, puffert neuere Deltas während Pagination, entfernt Quotes nach 30 Sekunden und verbindet mit exponentiellem Backoff/Jitter erneut. REST funktioniert auch bei fehlendem SSE-Handshake. Kategorie-Filter und Stammdaten decken Aktien, ETFs, Indizes, Krypto, Forex, Rohstoffe, Futures, Optionen und Anleihen ab.

## Lokale Validation

- `npm run test:market`: 23 Server-/Contract-Tests und vier Client-Tests. Enthalten: 900 synthetische Assets über echte lokale HTTP-Abrufe bis zur Frontend-Konvertierung, 100 eindeutige Assets je Klasse, Pagination, Quellen-Gates, falsche Bindungen, abgelaufene Daten, Reconnect, Backpressure und Timeouts.
- `npm run lint`: TypeScript und Frontend-Boundaries.
- `npm run test:navigation`: sieben Navigationstests. Veraltete Erwartung 17 → 16 Tab-Links korrigiert und `/vocabulary` getrennt abgesichert.
- `node --test server/security.test.mjs scripts/prepare-render-image.test.mjs`: vier Regressionstests. Bereits auf Main vorhandenes literales `\\n` im Test wurde als echter Zeilenumbruch repariert, damit TypeScript wieder ausführbar ist.
- `npm run build` und `node scripts/verify-browser-boundary.mjs`: bestanden. Die Boundary-Prüfung ersetzt keinen vollständigen Secret-Scan.
- Keine neuen Libraries oder Lockfile-Änderungen. Docker-Kontext und Runtime-COPY wurden um die benötigte Server-Datei erweitert. Kein Docker-Image gebaut und keine Attestation erzeugt.

Die 900er-Fixtures belegen ausschließlich technische Kapazität. Sie sind keine Provider-, Rechte-, Instrument- oder Live-Coverage-Evidence. Ein <200-ms-Production-Latenznachweis fehlt. Vergleichsbenchmark/CADS und echte Desktop-/Mobile-Browser-Abnahme sind ebenfalls noch offen.

## 3 VALIDATE / 5 APPROVE

| Validate | Ergebnis |
|---|---|
| Lokaler Datenvertrag und technische 900er-Kapazität | PASS, synthetisch |
| Lokale Grenz-/Fehler-/Frontend-Prüfungen | PASS |
| Reale Quellen → Quotes → Website und Production-Identität | BLOCKED |

| Approve | Ergebnis |
|---|---|
| PRODUCT | Lokal implementiert und getestet; Browser-/Owner-Review offen |
| MARKET | BLOCKED: keine zugelassene Preisquelle und kein reales 900er-Manifest |
| TRUST | PENDING: neue Daten-/Release-Evidence; vorhandene Lizenz-Evidence REVIEW_OPEN |
| PLATFORM / Runtime Evidence | BLOCKED: Docker-/GHCR-/Render-Korrelation dieses Standes fehlt |
| Owner | Architektur B freigegeben; Release/Production nicht freigegeben |

Aktueller Policy-Readback: `admittedMarketSourcesFor('marketQuotes').length === 0`. Die Wikidata-Zulassung betrifft ausschließlich Referenzmetadaten. Der vorhandene Lizenzbericht bindet historischen Source und bleibt `REVIEW_OPEN`.

## Supply Chain und nächste Abnahme

`CAPITAL-AI-SH-SUPPLY-CHAIN` nutzt die vorhandenen lokalen Prüfpfade; `test:market` umfasst jetzt Transport und Client. Ein automatischer Selbstheilungs-/Promotion-Workflow wird nicht ohne drei unabhängige positive Validierungszyklen aktiviert. Reconnect und Snapshot-Resynchronisierung umgehen keine Quellen-/Release-Gates.

Nächste Schritte: reales von MARKET/TRUST zugelassenes Instrumentmanifest samt Preisquellen und Rights-Evidence; Broker-Auslieferung mit echten Quotes; Mobile/Desktop-Smoke; Draft-PR und kostenrelevante CI separat freigeben; exakte Docker-/GHCR-/Render-Identität dieses Standes korrelieren; Gates erneut bewerten.

Rollback: Commit zurücknehmen und bisherigen Quote-Client wiederherstellen; zur Laufzeit `MARKET_QUOTES_ENABLED=false` beziehungsweise Manifest-Bindung entfernen. Runtime-Änderungen benötigen die jeweilige Freigabe. Keine Secrets, Auth-Bindings, Zulassungsflags oder Production-Systeme wurden geändert.

## Weiterführende Abnahme vom 04.10.2026

Das vorhandene reale Manifest wurde gegen die gleichnamige Library-Datei gelesen. Es enthält 20 Krypto-, 20 Aktien-, 20 Forex-, 20 Index- und acht eindeutige Rohstoffassets. ETFs, Futures, Optionen und Anleihen fehlen. Status bleibt `CATALOG_EVIDENCE_NOT_RIGHTS_ADMISSION`; keine Live-OHLCV-, Freshness- oder Replay-Abnahme.

Neue Quellengegenprüfung: Coin Metrics Community verlinkt ausdrücklich CC BY-NC 4.0 und ist damit für den vorgesehenen kommerziellen Preis-/Scoringpfad blockiert. EZB-Referenzkurse bieten tägliche EUR-Raten; 29 Währungen wurden beobachtet. Daraus werden weder Live-Quotes noch 100 Rohinstrumente behauptet. Die Nutzungsbedingungen verlangen insbesondere Quellenhinweis, Hinweise bei kostenpflichtiger Darstellung und Kennzeichnung von Änderungen. Keine neue Zulassung oder Runtime-Aktivierung vorgenommen.

Production wurde im Cloud Browser in den vorhandenen Preview-Modi „iPhone Frame“ und „Vollbreite“ geprüft: Hydration erfolgreich, keine bestätigten Quotes, „Alle (0)“. Dies ist eine read-only Prüfung des bestehenden Main, keine Abnahme der neuen Implementation. Kein echtes Mobile-Device emuliert. Der isolierte Kandidat auf Loopback-Port 3018 ist im Cloud Browser durch `ERR_BLOCKED_BY_CLIENT` nicht erreichbar. Lokale Playwright-Pakete sind vorhanden, aber keine zugehörige Chromium-Binary. Die Browser-Abnahme dieses Commits bleibt deshalb partiell/offen.

Maschinenlesbare Evidence: `evidence/asset-delivery-validation-20261004.json`.

Offene PRs #155–#158 frisch gelesen: #155 betrifft den separaten LEGAL_POLICY-Kern, #156/#157 Production-/Digest-Evidence, #158 organisatorische Domain-Policy. Die Aussage, dass #158 technische Gates unverändert lässt, stammt aus seinem PR-Text; er ist noch offen und ersetzt `AGENTS.md@currentmain` nicht. Diese Änderung beinhaltet keinen Merge oder Production-Deploy.

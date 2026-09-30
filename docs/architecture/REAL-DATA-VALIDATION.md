# Verifikation der Redis-/NATS-Datenanbindung

Stand: 2026-09-30. Main-Basis `d646a1bd7f9df9cac3fd921302c88e9651f899fe` nach Merge der PRs #16 und #17. Die Datenanbindung ist auf diesem aktuellen Main integriert. OIDC/Telegram-Sicherheitsänderungen bleiben erhalten; Main wird durch diesen Arbeitsbranch nicht verändert.

## Implementiert

- Gepinnte offizielle Node-Clients: Redis 6.2.1, NATS transport-node / jetstream 3.4.0.
- Quote-Facts mit Quelle, Instrument/Börse/Quote-Währung, Beobachtungs- und Empfangszeit, Payload-Hash und bestätigtem JetStream-Evidence-Verweis.
- Redis-Cache mit maximal 30 Sekunden Rest-TTL, atomarem Zeitstempelvergleich und Prüfung gegen die dauerhaft gespeicherte Originalbeobachtung.
- Zod-Laufzeitverträge, Evidence-Replay, Status-API, Pipeline-Flag und geordneter Shutdown; bestehende API-Ratenlimits und Single-flight erhalten.
- Produktions-Seeds, zufällige Whale-Ereignisse, Demo-Scorer, erfundene Quorum-/Latency-Messwerte und unbelegte Analysen entfernt bzw. gesperrt. Demo-Adapter und Feature-Fixtures stehen nur unter `__tests__/fixtures`.
- Bestehende Marktkarten liefern belegte Quotes. Historie, Änderung, Fundamentals und Scores werden bei fehlender Quelle nicht berechnet oder geschätzt. Die bisherigen simulierten Analyse-Ansichten sind durch klare Verfügbarkeitszustände ersetzt; Layoutumfang dieser Ansichten reduziert sich entsprechend.
- Registry: 50 IDs, 45 planned/unavailable, 5 blocked/unavailable. Keine erfundene Aktivierung oder Validierungszeit.

## Lokal bestanden

- TypeScript, Frontend-Build, bestehende Contracts/Provider/Scoring und 20 Foundation-Fälle.
- Fünf neue Marktvertrags-Fälle einschließlich fehlender Dienste, Simulationsabwehr, Instrument-/Währungsprüfung, ungültiger Bücher, Zeitstempel, Payload-Größe und Fallback.
- Sechs Provider-Fälle einschließlich Single-flight und negativem Cache (Teil des vorhandenen Sicherheitszweigs).
- Navigation, Lizenzmetadaten und Prebuilt-Render-Konfiguration.
- 19 Sicherheitsregressionen für OIDC, Telegram, HTTP und Browser-Speicherung aus PR #17 sowie Browser-Boundary-Check nach frischem Build.
- Echte lokale Redis-8.10.2- und NATS-2.15.0-Dienste: Publish-Ack, Wiederholung/Deduplication, Replay, Cache-Manipulation, verspätete Ticks, Client-Neuverbindung, Ausfall und Ablehnung abgelaufener Facts.
- Separater NATS-Prozessabbruch mit anschließendem Neustart auf demselben Dateispeicher und identischem Evidence-Replay. Test-Payloads sind Test-Harness-Daten, keine Live-Marktbelege.

Offizielle Release-Dateien wurden vor Nutzung gegen die veröffentlichten SHA-256-Digests geprüft. Redis-Source: `ae6973de9b6ad8e6cf21b1e764abccab59200689af6aabce10d4cf6bbb2e253f`; NATS Linux amd64: `5d2c51caca950333aba84911df7d377f826f3a59ec36061c6539105084f65c92`. Compose enthält die aus der offiziellen Docker-Registry gelesenen Image-Digests. Docker/Compose selbst wurde mangels Docker-Daemon hier nicht ausgeführt.

## Nicht verifiziert / offen

- Kein erfolgreicher öffentlicher Binance-/Kraken-WebSocket-Lauf aus dieser Umgebung. Kraken-REST lieferte eine nicht verwertbare Sperrseite. Deshalb kein Nachweis eines echten End-to-End-Live-Feeds.
- Keine Provider-Schlüssel oder validierten News-, Fundamentals-, Options-, L2- und On-Chain-Verträge eingerichtet. Alle 50 Scorer bleiben unfreigegeben; Rankings/Alerts bleiben gesperrt.
- Keine Render-Provisionierung, kein Deployment, keine Image-Sicherheitsprüfung auf diesem Commit. NATS Private Service, persistenter Speicher und gegebenenfalls Cluster müssen eingerichtet werden. Workspace und mögliche Kosten sind vor Provisionierung zu bestätigen.
- Container-/OS-Release-Gates und Lizenz-Distribution-Review bleiben offen. `tweetnacl@1.0.3` ist eng als `DEPENDENCY_DISTRIBUTION_REVIEW` inventarisiert; kein pauschales Unlicense-Allowlisting und keine Deployment-Freigabe.
- Kein Beleg für WORM-Konformität, Provider-Nutzungsrechte, Hochverfügbarkeit, vollständige Archivierung oder eine 45-ms-SLA.
- Build meldet weiterhin einen großen JavaScript-Chunk. Kein visueller Browser-Abnahmelauf.

## Reproduzierbare Standardprüfungen

`npm run lint`, `npm test`, `npm run test:market`, `npm run test:navigation`, `npm run test:security`, `npm run build`, `npm run verify:browser`. Build-Ausgabe vorher leeren, damit alte Artefakte nicht die Browser-Prüfung verfälschen. Für isolierte konfigurierte Redis-/NATS-Dienste: `npm run test:market:integration`. Betriebsanleitung: `deploy/MARKET-DATA-OPERATIONS.md`.

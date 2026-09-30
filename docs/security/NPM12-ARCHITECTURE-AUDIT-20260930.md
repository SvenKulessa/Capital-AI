# npm 12.2.0 und Architektur-Sicherheitsprüfung

## Basis und Überlappung

Geprüfter Produktions-/Scan-Commit: `3dcecd0637347923a0254c85526361779e119bbf` (PR #47).
Nach Erstellung auf Main `c268a49e15976a99358972006c68fc7688fa5f50` (PR #52) aktualisiert;
PR #51 ergänzt Chromium-/CI-Dokumentation, PR #52 das Header-Logo.
Keine Überschneidung mit diesem Security-Slice. Kein direkter Main-Push oder Protection-Bypass.

## Upgradeentscheidung

npm 12.2.0 ist am 30.09.2026 offiziell als stabiles Release veröffentlicht.
Node-Anforderung: `^22.22.2 || ^24.15.0 || >=26.0.0`; verwendetes Node 24.19.0 erfüllt diese.
Registry-Integrität npm: `sha512-ZsJjKpTnlmSXOLLXiU1xDCzC4Wlok4IwZmh/aw2KUuXytU7q6qMv/cUT7MoeSf95Slwuw/lRXYefGzGCspHPNQ==`.

Das Upstream-Bundle enthält weiterhin brace-expansion 5.0.9 und undici 6.28.0.
Die vorhandenen geprüften Vendor-Patches auf 5.0.12 und 6.28.1 bleiben daher notwendig.
Der Scan über alle Schweregrade entdeckt zusätzlich vier MEDIUM-CVEs in ip-address 10.5.0:
CVE-2026-101910, CVE-2026-101911, CVE-2026-101912, CVE-2026-101913.
Der zusätzliche integrity-gesicherte Bundle-Patch auf 10.7.1 beseitigt diese im lokalen Folgescan.
Der Hardener prüft Basisversionen, Lockfile-Integritäten, Engines und Dependency-Kompatibilität;
minimatch, Undici sowie IPv4-/IPv6-Parser werden wirklich ausgeführt.
Keine CVE-Ausnahme und keine globalen Änderungen am Host-Paketmanager.

Berücksichtigte Majoränderungen: Node-Mindestversion, Lifecycle-Allowlist, unbekannte Konfigurationen,
entferntes shrinkwrap und geänderte JSON-Ausgaben. Repository verwendet package-lock.json,
keine shrinkwrap-Datei und keine betroffenen view/pack/publish-JSON-Verbraucher.
Installations-/Prune-Befehle behalten --ignore-scripts; Build und Runtime bleiben getrennt.
Die npm-Konfigurationswarnung http-proxy entsteht aus dem lokalen Host-Environment;
es wird keine Projektkonfiguration dafür eingeführt. Im finalen Runtime-Image wird npm entfernt.

## Vier Validierungsschritte

1. **Identität und Nachweise:** Main/Branches/PRs, Render-Workspace AICapital, Anwendung,
   privater NATS-Dienst und verwalteter Valkey geprüft. Main-Scan-Artefakt 11115486810 von
   Lauf 36753436044 heruntergeladen; SHA-256
   `6c56cc4ce13f763e2a1fcebe3b02c44dd3daf0d1512027988439e8de19f5c6dc` bestätigt.
2. **Statische Prüfung und Toolchain:** Trivy 0.74.0 aus offizieller GitHub-Veröffentlichung,
   Binärarchiv-SHA-256 `2ae6fe3ee734b7fdf11335663e18c75ea12dccc76062f09f164a3b0f8be4371a`
   gegen Release-Checksums bestätigt; DB aktualisiert am 30.09.2026, 13:11 UTC.
   Quellscan mit Dependencies, Secrets und Konfiguration über alle Schweregrade;
   gepatchtes npm separat als rootfs gescannt. Keine CVEs oder Secrets im finalen npm-Scan.
3. **Regression und Wiederherstellungsgrenzen:** Mit isoliertem npm 12.2.0:
   npm ci --ignore-scripts, vollständiger Preflight inklusive TypeScript, Vertrags-/Security-/Navigationstests,
   Build, Browser-Boundary und npm prune --omit=dev erfolgreich.
   Server-Suite: 31 bestanden, 2 private Broker-Integrationstests mangels Credentials übersprungen.
   Neue Regressionen beweisen Abbruch vor Netzwerkverbindung bei fehlendem NATS-Token,
   Ablehnung unbegrenzter Streams/erweiterter Subjects, Secret-Redaktion und Fehler bei fehlenden Berichten.
   Keine Störung/Neustarts der produktiven Broker.
4. **Live-Korrelation und Übergabe:** /healthz meldet NATS, Redis und Pub/Sub connected.
   Reale Kraken-BTCUSD-Quote aus Cache gelesen, Evidence
   `CAPITAL_FACTS:31394:874c09973b65f8ab127026cbaefb7fda946a884780f37bf616c4218a350d16e5`
   über /api/market/evidence mit HTTP 200 und hashVerified=true bestätigt.
   Das beweist diesen Read-/Replay-Pfad, keinen vollständigen Fan-out-/Ausfalltest.
   Finale neue Docker-Images werden erst durch den PR-Sicherheitslauf geprüft.

## Befunde nach Bereich

| Bereich | Evidenz / Ergebnis | Grenze oder offene Maßnahme |
|---|---|---|
| Main-Quellcode, Build, Runtime, NATS-Image | Alle vier unveränderten Main-Berichte: 0 HIGH/CRITICAL, 0 Secret-Funde | Historische Berichte enthalten nur HIGH/CRITICAL; keine Aussage über kleinere Schweregrade |
| Lokaler Quellscan alle Schweregrade | 0 Paket-CVEs, 0 Secrets; 2 LOW DS-0026 | Fehlende HEALTHCHECKs in NATS-/Scanner-Dockerfiles; private TCP-Brokerprüfung und CI-Ausführung separat vorhanden |
| npm 12.2.0 mit drei Vendor-Patches | 0 CVEs, 0 Secrets im rootfs-Scan | Kein neuer vollständiger Build-Image-Nachweis vor PR-CI |
| NATS-Netzwerk | private_service, Frankfurt, einzig offener Port 4222, ein Service, 5-GB-Disk | TLS auf Broker-Ebene nicht konfiguriert; privates Netz ersetzt keinen verifizierten Ende-zu-Ende-TLS-Nachweis |
| NATS-Identität / Rechte | Konfiguration verlangt Token, JetStream-Limits und File-Storage | Gemeinsames Token besitzt breite Broker-Rechte; getrennte Identitäten und Subject-/Admin-Rechte noch offen |
| NATS-Live-Image | Live-Deploy vom Commit 090b00bb432e329daf62129d10d2c5ca041662b6 | Tatsächlicher Runtime-Digest/UID/GID nicht vom Provider bestätigt; kein Gleichsetzen mit aktuell geprüftem Image |
| Valkey / PubSub | Managed 8.1.10, Free, Frankfurt; ipAllowList=[], persistenceMode=off | Kein öffentlicher IP-Zugriff; Plattform-OS/SBOM und ACL-/TLS-Konfiguration über verfügbare Read-APIs nicht nachgewiesen |
| Evidence-Integrität | Cache/PubSub-Daten werden gegen durable Hash-Evidence geprüft; actionable=false | Hash schützt Inhalt, belegt aber keine Rechtefreigabe des Providers oder Herkunft bei kompromittiertem Writer |
| Anwendung live | Render-Commit entspricht geprüftem Commit; Quote/Replay funktionieren | buildIdentity.bound=false; Render baut aus Git, attestierter GHCR-Digest ist nicht als Live-Quelle nachgewiesen |
| Main-Governance | Aktives Ruleset, PR und strikter Docker Security Gate, keine Bypass-Actors | Review-Anzahl 0; Änderungen an Rechte-/Freigabepolitik nicht Teil dieses Slices |
| ZITADEL | Bestehende Auth-Regressionen bestanden | Discovery-Fehler am 30.09., 17:08 UTC in Provider-Logs; echter Login hier nicht abschließend validiert |

Produktionsfreigabe bleibt offen, bis Image-Quelle, Runtime-Digest und gebundene Runtime-Identität
mit den attestierten CI-Nachweisen übereinstimmen. Ein grüner Scan allein setzt deployEligible nicht auf true.
Der verwaltete Valkey-Host kann über diese Schnittstellen nicht vollständig forensisch gescannt werden.

## Öffentliche Scan-Evidenz

Alle vier CI-Scans inventarisieren nun UNKNOWN/LOW/MEDIUM/HIGH/CRITICAL.
Der Scannerprozess muss erfolgreich sein; ein separater Gate-Schritt blockiert HIGH/CRITICAL-CVEs,
HIGH/CRITICAL-Misconfigurations und jeden Secret-Fund. Fehlerhafte/fehlende Berichte blockieren ebenfalls.
Bereinigte Paket-/CVE-/Fixlisten erscheinen im Joblog und als *.public.json;
die GitHub-Step-Summary zeigt für jeden Bereich Status und Anzahlen, auch bei Fehlern.
Rohberichte mit möglichen Secret-Matches, Code, Zeilen und Pfaden werden nicht mehr in das
öffentliche Scan-Artefakt hochgeladen. SBOMs, Lizenzen und Image-Identität bleiben verfügbar.

Maschinenlesbare, bereinigte Befunde: `docs/security/evidence/npm12-architecture-audit-20260930/`.

Quellen:
- https://github.com/npm/cli/releases/tag/v12.2.0
- https://github.com/npm/cli/releases/tag/v12.0.0
- https://registry.npmjs.org/npm/12.2.0
- https://registry.npmjs.org/ip-address/10.7.1
- https://github.com/SvenKulessa/Capital-AI/actions/runs/36753436044

## Privater Broker-Test auf Owner-Anforderung

`scripts/verify-private-brokers.mjs` wird im Runtime-Image bereitgestellt.
Er benötigt ausschließlich die bestehenden Service-Environment-Variablen
REDIS_URL, NATS_URL, NATS_TOKEN (optional NATS_REPLICAS) und Ausführung im privaten Render-Netz.
Aufruf in der Capital-AI-Render-Shell nach Deployment dieses PRs:
`node /app/scripts/verify-private-brokers.mjs`.

Vier Checks: authentisierte Verbindung/Produktiv-Stream-Policy/falscher Token;
atomarer Valkey-Cache mit TTL und eigener Pub/Sub-Channel;
eigener kurzlebiger JetStream mit File-Ack/Deduplizierung/Hash-Replay;
Replay nach neu aufgebauter Clientverbindung und Aufräumen.
UUID-Namensräume trennen sämtliche Testdaten von Produktiv-Quotes. Cache-TTL 5 Sekunden,
Stream-max_age 120 Sekunden, max_bytes 1 MB, max_msgs 2; eigener Stream und Schlüssel werden gelöscht.
Es werden keine produktiven Broker-Prozesse neu gestartet und keine Live-Quote geschrieben.
Keine Zugangsdaten/URLs oder SDK-Fehlermeldungen werden ausgegeben.

Dieser zusätzliche Remote-Test ist **OFFEN**: Der Connector bietet keine Shell-/SSH-Ausführung,
dieser Workspace hat keine Broker-Credentials und keine authentisierte Render-SSH-Sitzung.
Ein lokaler Start bestätigt BROKER_CREDENTIALS_REQUIRED vor Netzwerkzugriff.
Die vorhandene produktive Quote-/Evidence-Prüfung ist davon unabhängig bestanden.
Die bisherigen Integrationstests mit synthetischen BTCUSD-Quotes dürfen nicht unverändert
gegen den produktiven CAPITAL_FACTS-Stream ausgeführt werden.

## Ergänzende CI- und lokale Broker-Evidenz

PR #53, Head de4f076542312485680d0cfe20e4ad747c349274, CI-Lauf 36757317050:
Docker Security Gate **success**, einschließlich NATS-Image/Disk-Bootstrap,
Quellscan, npm-12-Build-Image, Runtime-Image, SBOM, Server-Regressionen und Runtime-Hardening.
PR-CI prüft den virtuellen Merge-Commit be5e1b5936668a2011f438c078dec582e6c38e0b.
Verifiziertes Artefakt 11116957280, SHA-256
8ac9b18a73fed1b9448a8f1e43c0bcea33e6c566681b5d56520ab3a59b3f2af5.
Bereinigte Ergebnisse sind als pr-*.public.json archiviert.

| Neuer Scan (alle Schweregrade) | CVEs / Advisories | Konfigurationsbefunde | Secrets |
|---|---|---|---|
| Quelle | 0 | 2 LOW DS-0026 | 0 |
| Build-Image mit npm 12.2.0 | 0 | nicht Teil dieses Image-Scans | 0 |
| Runtime-Image | 0 | nicht Teil dieses Image-Scans | 0 |
| NATS-Image | GO-2026-5932, UNKNOWN | nicht Teil dieses Image-Scans | 0 |

Der Go-Befund betrifft ausdrücklich die ungewarteten golang.org/x/crypto/openpgp-Pakete,
keine allgemeine Aussage über alle x/crypto-Funktionen. Der Advisory enthält keine Fixversion.
Er bleibt sichtbar; keine Ignore-/VEX-Ausnahme. Ein vollständiger transitiver
Reachability-/Symbolnachweis am tatsächlichen Render-NATS-Binary ist noch offen.
Quelle: https://vuln.go.dev/ID/GO-2026-5932.json

Der neue isolierte Broker-Probe wurde zusätzlich gegen echte lokale NATS-2.15.0- und
Valkey-8.1.10-Prozesse ausgeführt: alle vier Checks bestanden, keine übriggebliebenen Probe-Streams.
NATS-Binary stammt aus offizieller GitHub-Release-Distribution; SHA-256 gegen SHA256SUMS bestätigt:
5d2c51caca950333aba84911df7d377f826f3a59ec36061c6539105084f65c92.
Valkey wurde lokal aus der offiziellen getaggten 8.1.10-Quelle gebaut;
Archiv-SHA-256 c74e50cd83f6d398a3dc570e04ac2fe538249585d021f76ee2449bbf9ebd04ed
ist eine Dokumentation des Downloads, keine unabhängige Herausgebersignatur.
Diese temporären Werkzeuge/Binärdateien werden nicht ins Repository aufgenommen.

Auch scripts/test-market-infrastructure-local.mjs bestand mit denselben echten lokalen Prozessen:
1. Fan-out, Deduplizierung, Reihenfolge, Schemas und Evidence-Integrität.
2. NATS-Prozessneustart, dauerhaftes Replay und Subscriber-Wiederherstellung.
3. Leerer Valkey-Neustart, Replay, begrenzte Wiederherstellung und Unsubscribe.
4. Cache-only kann JetStream-Evidence niemals ersetzen.

Das ersetzt weiterhin keinen Test auf den privaten Render-Diensten. Deren produktive
Quote-/Evidence-Prüfung ist bestätigt; Shell-/SSH-Probe, Runtime-Digest und Login bleiben offen.

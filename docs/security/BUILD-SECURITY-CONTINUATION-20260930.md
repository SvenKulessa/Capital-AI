# Sicherheitsworkflow und Migration: geprüfter Fortsetzungsstand

## Ursache und Korrektur

Run 36703891487 (2026-09-30 10:40:56Z), Main fed9ab247e6f231dca96801720e8a557b0ce2048:
Quellscan scheitert ausschließlich an DS-0002/HIGH für deploy/Dockerfile.nats: USER 0:0.
Npm/Bun HIGH/CRITICAL: 0. App-Dockerfile und Scanner-Dockerfile: keine HIGH/CRITICAL-Konfigurationsbefunde.
Build-/Runtime-Image wurden in diesem Lauf nicht geprüft oder veröffentlicht.

Der NATS-Entrypoint benötigt Root zur Eigentumszuordnung der gemounteten Disk und execs danach UID/GID 1000.
Die eng begrenzte Ausnahme AVD-DS-0002 gilt nur für deploy/Dockerfile.nats und endet am 2026-10-30.
Keine CVE-/Secret-Ausnahme. Der konfigurierte Container-USER und docker exec bleiben Root;
das ist eine dokumentierte Bootstrap-Restberechtigung, kein vollständig rootloses Image.
Vor dem Quellscan wird die bestehende NATS-Laufzeitprüfung jetzt verpflichtend ausgeführt:
frische Disk, nicht-root PID 1, Neustart, GID 1000, effektive Capabilities 0.
Ein gemeinsames Skript verhindert abweichende Prüfungen zwischen App- und NATS-Workflow.
Scannerfehler und alle übrigen HIGH/CRITICAL blockieren weiterhin.
Der Quellscan speichert jetzt auch seinen JSON-Bericht.

## Vier Validierungsschritte

1. Logs und Main: Ursache exakt korreliert. Separater NATS-Lauf 36701040297 auf af60cf4330466bbd08c730d276ef9c649bbc0f7a war erfolgreich, einschließlich Image-Scan/SBOM/Disk-Neustart.
2. Gepinntes Trivy 0.74.0 lokal aus offiziellem Release mit SHA-256-Prüfung: ohne Ausnahme DS-0002 reproduziert; mit pfadgebundener Ausnahme keine HIGH/CRITICAL-Konfigurationsbefunde. Bash-Syntax und diff --check PASS.
3. Lokal: 20 Auth-/OIDC-/Image-Profil-/IONOS-Tests PASS, TypeScript PASS; zusätzlich Docker-Kontexttests PASS. Neuer kombinierter Dockerlauf noch NOT_RUN: kein lokaler Docker-Daemon. Neue UID/GID-/Capability-Prüfung daher noch nicht live bewiesen.
4. Render/DNS: aktueller Live-Deploy dep-daue1uvavr4c738qvr5g basiert auf af60cf4330466bbd08c730d276ef9c649bbc0f7a. Starter, Frankfurt, eine Instanz, Auto-Deploy/Previews aus, /healthz. Git-Dockerquelle mit GHCR-Credential; immutable GHCR-Imagequelle nicht nachgewiesen. Live Auth-Konfiguration vorhanden, Login am 2026-09-30 11:50Z HTTP 400 authentication_failed vor Redirect. DNS-Umschaltung und Finance-Abschaltung blockiert bis Login-/Release-Gates bestanden sind.

## ZITADEL und GHCR

Das erzeugte Image-Blueprint erhält nun PUBLIC_APP_ORIGIN, OIDC_ISSUER, OIDC_CLIENT_ID,
OIDC_CLIENT_SECRET als serverseitige sync:false-Konfiguration. Geheimnisse werden nicht kopiert.
Der Auth-Server meldet bei Fehlern ausschließlich eine feste Phase (discovery, token_exchange,
token_validation, session_creation, callback_validation); weder Exception noch URL/Token/Code/Secret werden protokolliert.
Der negative Test prüft einen upstream reflektierten Geheimnistext ausdrücklich.
Die Diagnose ist eine Vorbereitung; eine Korrektur der unbekannten Live-Issuer-/ZITADEL-Konfiguration wird nicht behauptet.

## DNS-Fortsetzung

IONOS-Inventar aus Run 36693847135 (09:05Z), rollbackWebRecords gelesen:
- capital-ai.online: A 216.24.57.1, TTL 3600.
- www.capital-ai.online und mta-sts.capital-ai.online: CNAME finance-7clq.onrender.com, TTL 3600.
- 24 übrige Records erhalten; Inventar enthält deren Digest.
- Zielservice hatte /healthz und exakte MTA-STS-Policy mit HTTP 200.

Nach frisch erfolgreicher Image-/Loginprüfung: Render-Bindings und konkrete DNS-Anweisungen lesen,
Rollback-Werte erneut korrelieren; nur passende Web-Records zu capital-ai-uvsl.onrender.com umstellen,
sofern Render dies bestätigt. Root-A-Adresse nicht ohne Provider-Anweisung ändern.
MX/TXT/SPF/DKIM/DMARC/TLS-Reporting und _mta-sts unverändert erhalten.
Domain/TLS, kanonischen Ursprung, Login/Session/Logout, Datenzugriff und MTA-STS prüfen;
erst danach Finance suspendieren. Keine Löschung des Quellrepositories.

Render-Connector bietet keine Operation für Imagequellen-/Domain-Binding-Wechsel oder Suspendierung;
IONOS-Connector nicht verfügbar. Browser-Fallback erfordert Freigabe gemäß Browser-Werkzeugrichtlinie.
Actions-Secrets können nicht ausgelesen werden. Kein Workflow/Deploy, DNS-Schreibzugriff oder Servicewechsel wurde ausgeführt.

## PR-34-Abgleich mit PR 33 und COMP am 30.09.2026

PR 33 ist auf Main 1afa70d673c6f865b471dce6420342b3c44f3bd5 gemergt (COMP-Head 14cb9af5590949736c096684a8e0d90fd267812c).
Es existiert aktuell kein separater COMP-Branch mehr. Der Inhalt wird aus dem gemergten PR und Main geprüft.
Der ursprüngliche PR-34-Head 566f6c817619f65b6e99cdf5bc8f0a9b45d4c1aa kollidierte in server/auth.test.mjs.
Beide Testsätze bleiben jetzt erhalten: Subject-Isolation/Datenschutz-Entwurf aus COMP und geheimnisfreie OIDC-Diagnose aus SEC.

Dateifehler aus PR 33: server/privacy.mjs und shared/legal-identity.mjs waren durch die Docker-Kontext-Allowlist ausgeschlossen.
Der Kontexttest wurde gegen die unveränderte Main-Allowlist ausgeführt und reproduzierte den Fehler für shared/legal-identity.mjs.
Beide Dateien sind jetzt ausdrücklich erlaubt; weiterhin kein pauschales Öffnen des server-/shared-Verzeichnisses.
Die veraltete Aussage im COMP-Cutoverplan über ein fehlendes Zoneninventar wurde auf den gelesenen Snapshot und die Pflicht zum frischen Readback korrigiert.

Vier Prüfschritte:
1. PR-/Branch-Abgleich: Mergekonflikt und Ausschlussfehler reproduziert; Main-Inhalt aus PR 33 übernommen.
2. Zugriff und Datenschutz: 21 Backend-/OIDC-/Datenschutz-/MTA-STS-/Imageprofil-Tests sowie 9 Rechtstext-/Navigation-/Analytics-Tests PASS.
3. Dateigrenzen/Anwendung: 2 Docker-Kontexttests, TypeScript, Vite-Produktionsbuild und Browser-Boundary (26 Dateien) PASS.
4. Workflow/Abschluss: Actionlint 1.7.12 aus offiziellem SHA-256-verifiziertem Release für beide geänderten Workflows (nur veraltete ubuntu-26.04-Labelmeldung ausgeblendet; dieser Runner startete im gelesenen Actions-Lauf erfolgreich), Bash-Syntax, Konfliktmarkerprüfung und diff --check PASS.

Der COMP-Inhalt bleibt erhalten: nur eigene verifizierte OIDC-Sitzung im Export, kein vollständiger ZITADEL-/Finance-Datenauszug,
E-Mail-Entwurf mit persisted=false/sent=false, anonymer Kontakt und deaktivierte optionale Analytics.
Diese Quellcodeprüfung ersetzt keinen produktiven Login oder neue Image-/CVE-/SBOM-Nachweise.
Kein Workflow/Deploy oder Domainwechsel wurde gestartet.

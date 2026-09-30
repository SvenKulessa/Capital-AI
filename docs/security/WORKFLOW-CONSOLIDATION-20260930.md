# Docker-Workflows, Preflight und Release-Abgleich

Baseline: `67cdf660095c68238b2e20604b1cd87cc32d3464` (PR #45), 30.09.2026.

## Vergleich und Bereinigung

| Workflow | Sicherheit / Qualität | Performance / Entscheidung |
|---|---|---|
| build-security.yml | SHA-gepinnte Actions und Tools, keine persistierten Checkout-Credentials, read-only Default-Token, HIGH/CRITICAL + Secrets, isolierter Build, SBOM, Runtime-Smoke; Publish ausschließlich Main/manuell | Kanonisches Pflicht-Gate bleibt `Docker Security Gate`. NATS-Image-Scan/SBOM/Lint werden übernommen. Joblokaler Trivy-Cache verhindert wiederholte DB-Downloads, ohne Aktualisierungen auszuschalten. Generierte Report-TARs werden vom Source-Scan ausgeschlossen und separat als Images gescannt. |
| nats-security.yml | Eigenständiger Image-Scan und SBOM ergänzten das bisherige Gate | Entfernt, nachdem alle Prüfungen in das Pflicht-Gate übernommen wurden. Kein zusätzlicher Scanner-Build/Workflow nötig. |
| bootstrap-main-protection.yml | Einmaliger Workflow mit Admin-PAT; erfolgreicher Bootstrap + aktiver Provider-Readback belegt | Entfernt. Vertragsdatei, Readback und Tests bleiben. |
| render-cli-readonly.yml | Main-/Repo-Guard, Prüfsumme der CLI, keine öffentlichen Rohantworten; neue OIDC-Diagnostik gibt nur boolesche Gates aus | Behalten für gezielte Runtime-Abnahme. Keine DNS-, Env- oder Service-Mutation. |
| ionos-domain-inventory.yml | Lesendes DNS-Inventar mit Rückweg-Evidence | Behalten für Domainwechsel; kein Docker-Duplikat. |

Alle PRs und Merge-Queue-Läufe erzeugen das Pflicht-Gate; kein Workflow-Pfadfilter kann den Check in `pending` festhalten. Manuelle Release-Läufe haben eine getrennte Concurrency-Gruppe und werden nicht durch neue PR-/Push-Validierungen abgebrochen. Publish-Permissions bleiben auf den Publish-Job beschränkt. Ein Publish verwendet dasselbe geprüfte Image-Artefakt statt eines erneuten Anwendungsbuilds.

## Preflight vor dem Pull Request

- `npm run preflight`: 28 schnelle Kontext-, Lizenz-, CVE-Policy-, Main-Schutz-, Handoff- und OIDC-Diagnosetests plus Lockfile-Lizenzinventar; keine Paketinstallation oder Docker erforderlich.
- Nach `npm ci --ignore-scripts --no-audit --no-fund`: `npm run preflight:full` ergänzt TypeScript, Vertrags-/Security-/Navigationstests, Frontend-Build und Browsergrenzenprüfung.
- Bei eingeschränkten lokalen Dateisystemen `TMPDIR` auf ein vorhandenes beschreibbares Verzeichnis setzen. Das ist kein Produktfix.
- Derselbe schnelle Preflight wird vor Docker in CI erneut ausgeführt. Lokale Nachweise ersetzen den Required Check nicht. Image-, Secret-, SBOM- und Runtimeprüfungen bleiben auf dem exakten CI-Image erforderlich.

Persistente Runner-Caches für Docker-Layer oder fremde PR-Artefakte werden in diesem Slice nicht eingeführt. Der bestehende Docker-Daemon nutzt seine lokalen Layer bereits zwischen Build-Target und Runtime-Build; SBOM/Scans werden weiter auf den aktuellen Artefakten ausgeführt. Keine gemessene Laufzeitverbesserung behauptet, bevor der neue Workflow gelaufen ist.

## Fünf Validierungsschritte und Live-Befund

1. Main + offene PRs + Ruleset frisch lesen: Baseline oben, keine offenen PRs, Ruleset 24259174 aktiv, keine Bypasses.
2. Preflight, TypeScript, Verträge, Security, Navigation, Frontend und Browsergrenzen lokal prüfen. Neuer CI-Image-Build bleibt bis zum PR-Lauf offen; Docker-Daemon lokal nicht vorhanden.
3. Aktueller Main-Lauf 36747802046: `Docker Security Gate` erfolgreich, Build/Runtime-Scan, SBOM und Smoke erfolgreich. Publish und Handoff übersprungen; das belegt keinen GHCR-Kandidaten.
4. Render-Deploy dep-daujvd3tqb8s73bltfk0 ist auf demselben Main live, Starter/eine Instanz. Health: Redis/NATS/PubSub connected, Ingress fail_closed, buildIdentity.bound=false. Render bleibt Git-backed; kein attestierter Runtime-Digest nachgewiesen.
5. ZITADEL/Domain: session configured=true, aber Login HTTP 400 und Render-Log `OIDC authentication failed at discovery`. Bekannter Tenant-Discovery liefert S256 und client_secret_basic. Tatsächliche Runtime-Konfiguration ist noch nicht gelesen. `Render CLI read-only verification` erhält vier credentialfreie Diagnose-Gates: kanonischer Issuer, erlaubte Origin, vorhandene Credentials, kompatible Discovery. Der Abruf von capital-ai.online/healthz hat in dieser Umgebung ein Timeout ergeben; das ist keine Feststellung eines globalen Domainausfalls.

## Konkrete Fortsetzung

Zuerst den geänderten Required-Workflow auf dem PR prüfen und mergen. Danach den vorhandenen read-only Render-Workflow auf Main ausführen und OIDC-Gates prüfen. Erwarteter Issuer ist `https://capital-ai-hhxh4i.us1.zitadel.cloud` ohne Console-Pfad oder trailing slash. Redirect für die spätere Hauptdomain: `https://capital-ai.online/api/auth/callback`; vorher müssen Runtime-Origin und in ZITADEL zugelassene Test-Callback-URI exakt zusammenpassen. Discovery-Konfiguration ist keine echte Login-Abnahme.

GHCR-Kandidaten-Publishing und fünf Handoff-Gates bleiben unverändert aktiv. Lizenz-/Redistribution-Evidence steht weiterhin auf REVIEW_OPEN. Vor einem Testdeploy muss sie für den exakten Kandidaten positiv sein. Nach attestiertem Kandidaten den bestehenden Service gemäß aktuellen offiziellen Render-Dokumenten auf Image-Quelle umstellen, Provider-Readback/Digest/Health verifizieren und ZITADEL-Login/Logout prüfen. Danach Domain-Zuordnung und DNS mit frischem Rollback-Inventar übernehmen; Finance erst nach Abnahme suspendieren. Keine Domains, Dienste oder Credentials wurden in diesem Slice verändert.

Quellen: https://render.com/docs/native-runtimes#changing-a-services-runtime ; https://render.com/docs/blueprint-spec ; https://trivy.dev/docs/v0.72/guide/configuration/cache/

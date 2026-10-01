# Roadmap-Abgleich — 01.10.2026

Basis: `SvenKulessa/Capital-AI@2150643dae8190fb2f8cd496072a7cc2baa89cfe` nach PR #71, #72 und #73. Dieser Bericht aktualisiert den statischen Repo-Snapshot; er ersetzt keine Production-Freigabe und keine permanente Status-API. Der Bericht vom 30.09. bleibt historisch.

## Beobachtungen und Grenzen

| Bereich | Aktueller Befund | Quelle / Grenze |
|---|---|---|
| Main | `2150643dae8190fb2f8cd496072a7cc2baa89cfe` | Frischer Git-Fetch; keine uncommitteten Änderungen des älteren Arbeitsverzeichnisses übernommen |
| Render-App | Image-Quelle `ghcr.io/svenkulessa/capital-ai@sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`; nicht suspendiert | Render-Connector, Workspace `tea-d90o4rj7uimc739i86ug`, Service `srv-dau1rp893c1s73cdhm1g`; Konfiguration ist nicht allein aktive Deploy-Evidence |
| Runtime | `/healthz` antwortet `status:ok`, `bound:true`, Source `4fbd1373b07092ed8ef550f60e9cf60f1f3f526d`, Builder `SvenKulessa/Capital-AI/.github/workflows/build-security.yml` | Frischer HTTPS-Readback auf `https://capital-ai-uvsl.onrender.com/healthz`; Runtime ist älter als Main |
| Transport | Redis/NATS/PubSub `connected`; Stream CAPITAL_FACTS, file storage, eine konfigurierte Replica | `/healthz` und `/api/market/status` frisch gelesen; keine Subscriber-Zähler im aktiven Statuspayload; keine neue Restart-/Restore-Probe durchgeführt |
| Restart-Recovery | Archivierter Bericht nennt 56.118 wiederhergestellte Nachrichten | `docs/architecture/PART1-RUNTIME-CLOSEOUT-20260930.md`; Bericht gelesen, Rohlogs in dieser Sitzung nicht unabhängig neu geprüft; kein externer Backup-Restore |
| App-Auth | `/api/auth/session`: HTTP 200, `configured:true`, `authenticated:false`, `user:null` | Frische anonyme Anfrage; kein Login- oder Service-Account-Test |
| ZITADEL-Discovery | HTTP 200, kanonischer Issuer, S256 und client_secret_basic unterstützt | `https://capital-ai-hhxh4i.us1.zitadel.cloud/.well-known/openid-configuration`; öffentliche Metadaten, keine authentifizierte Konfigurationsabfrage |
| Ruleset | 24259174 aktiv: linear history, merge+squash, zwei strict Required Checks mit App 15368, CodeQL medium-or-higher/errors-and-warnings, Code Quality warnings | Frischer GitHub API-Readback; keine Policy-Änderung, keine aktuelle Analyzer-Policy-Abnahme daraus abgeleitet |
| Lizenz-/Rechtefreigabe | `REVIEW_OPEN`, `deployEligible:false`, gebundener Source `ed594ef93f66ee8f13f67d75dde56f46a95b1cd6` | Bestehendes license-rights-review.json; weder Main noch aktueller Runtime-Source, keine automatische Umschreibung |
| Finance | `not_suspended` | Render-Service `srv-d91o1o9o3t8c73edi55g`; aktuelle HTTPS-Hauptdomain-Probe nicht auswertbar, heutige Domainzuordnung daher offen |
| Offene PRs | #60, #61, #63–#69 | GitHub-PR-Snapshot; Branch-/PR-Arbeit ist keine Main-Implementierung |

## ZITADEL-Service-Account-Prüfung: Zugriffslücke

Die lokale Umgebung enthält keine ZITADEL-/Render-Credential-Variablen und keinen vorhandenen Render-CLI-Zugang. Der Render-Connector hat keine lesende Env-Var-Aktion; GitHub Secrets lassen sich über den Connector nicht zurücklesen. Der angefragte authentifizierte Service-Account-Readback wurde deshalb **nicht ausgeführt**. Es wird weder behauptet, dass der Service Account fehlt, noch dass seine Secrets gültig sind.

Der bestehende `render-cli-readonly.yml` verwendet `RENDER_API_KEY_TEST` für einen vertraulichen Render-Env-Read und gibt nur OIDC-Diagnosebooleans aus. `diagnose-oidc.mjs` liest OIDC_ISSUER/PUBLIC_APP_ORIGIN/OIDC_CLIENT_ID/OIDC_CLIENT_SECRET; es prüft keinen ZITADEL-Service-Account. Eine Erweiterung kann erst nach Feststellung des tatsächlichen Credential-Typs und der bestehenden Secret-Namen erfolgen. Keine zusätzlichen Secret-Namen oder Adminrechte werden erfunden. Kein kostenpflichtiger oder explizit freigabepflichtiger CI-Lauf wurde gestartet.

Geplanter Readback in fünf Schritten:

1. Vorhandene Secrets nur im autorisierten Runtime-/CI-Kontext aufnehmen; Service Account von OIDC-Loginclient trennen. Ausgaben enthalten weder Token/Schlüssel noch Benutzerlisten.
2. Gültigkeit über das tatsächliche Verfahren (PAT, private-key JWT oder client credentials) prüfen; keine Rechte automatisch erweitern.
3. Aktive Organisation/Projekt/App, Callback-/Logout-URLs, Login-/Passkey-/MFA-Policies, Branding und SMTP mit vorhandenen Leserechten prüfen. 403 oder fehlende Abdeckung ausdrücklich offen lassen.
4. Ergebnisse an Zeitpunkt, API-Version und Source-/Runtime-Snapshot binden. Service-Account-API-Zugriff belegt keinen Browserlogin und keine Mailzustellung.
5. Login, eigener Export, Logout/401 und tatsächliche Mailzustellung separat auf Zielhost abnehmen; wiederkehrende Diagnosemuster erst nach drei unabhängigen positiven Zyklen dauerhaft automatisieren.

Offizielle Grundlage: https://zitadel.com/docs/guides/integrate/service-accounts/authenticate-service-accounts . ZITADEL verlangt für seine APIs die passende Audience und Administratorberechtigungen entsprechend dem konkreten Endpunkt; erfolgreiche Authentifizierung allein beweist keine Leseberechtigung für alle Konfigurationen.

## Roadmap-Korrekturen

- Main-/Datum-/PR-Snapshot erneuert; ältere Runtime-Source explizit ausgewiesen.
- Alte NATS-unavailable-Aussage durch frische Verbindungsevidence ersetzt; Subscriber-/Replay-/DR-Gates bleiben offen.
- Lineare Historie samt Squash-Verfügbarkeit anhand Ruleset bestätigt; alte Mergeblockade nicht fortgeschrieben.
- Unbelegte 70-/80-Prozentwerte entfernt; vollständige Implementierungs-Slices mit 100 % bleiben auf ihren ausdrücklich beschriebenen Repo-Umfang begrenzt.
- Zwei begrenzte Pakete ergänzt: OSS-Lizenz-/Vertragswerkzeuge und authentifizierter ZITADEL-Readback.
- Domain-, Auth-, SMTP-, Altdaten-, Lizenz- und Production-Handoff-Abnahmen getrennt gehalten. Kein DNS-/Deploy-/Finance-Schreibzugriff.

## Validierung

Quell-/Identitätsabgleich, Repo-/Live-Readbacks, Roadmap-Struktur-/Referenzprüfung und lokale TypeScript-/Navigation-/OIDC-Checks bilden vier Validierungsschritte. Lokale Checks werden im PR mit tatsächlichem Ergebnis angegeben. Positive unabhängige produktive Self-Healing-Zyklen: **0**.

Nachkorrelation: Während der Bearbeitung wurde PR #72 gemerged; Main erneut gelesen und auf e9e7dd5 aktualisiert. Die einzige Änderung seit 0e1db9f betrifft `.github/dependabot.yml` (Governance-/Patch-Grenzen), keine Runtime-Funktionsänderung.

Nachkorrelation 06:00 Berlin: Main nach PR #73 auf 2150643 gelesen; Attestation-Workflow angepasst, Runtime weiterhin gesondert. Auf Owner-Wunsch Organisations-/Adapter-Migrationsplan unter `docs/security/ORG-MIGRATION-PLAN-20261001.md` ergänzt; keine Transferausführung. Render-Connectorzugriff frisch erfolgreich, aber kein Env-/REST-Adapter exponiert.

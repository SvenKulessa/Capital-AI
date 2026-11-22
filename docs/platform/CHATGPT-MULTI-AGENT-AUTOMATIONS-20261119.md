# CAPITAL-AI · ChatGPT Multi-Agent Automation Catalog · 2026-11-19

Status: **Repository-Deklaration / kein Live-Readback**. Diese Datei ist nicht autorisierend; maßgeblich ist die aktuelle Root-`AGENTS.md` (`SOLO_MAINTAINER_FLOW@2`). Kein neuer Scheduler, Required Check, Worker, Toolrecht oder Provider wird durch diese Datei aktiviert.

## Governance und Zuständigkeiten

Die fünf autorisierenden Engineering-Domains sind PRODUCT, MARKET, PLATFORM, TRUST und GROWTH. Die Anzeige-Spezialistenrolle SECURITY ist innerhalb des TRUST-Sicherheits-Scopes ein Prüfprofil und keine zusätzliche Berechtigung. Die Agenten sind Rollen in derselben autorisierten Ausführung, keine eigenständigen GitHub-/Provider-Identitäten. ChatGPT Automations verwaltet die tatsächliche Terminierung außerhalb des Repositories.

| Externer ChatGPT-Workflow | Task-ID | Verantwortliche Domain | Zeitplan (Europe/Berlin) | Rechte | Letzter an diesem Datum beobachteter Zustand |
| --- | --- | --- | --- | --- | --- |
| CAPITAL-AI Multi-Agent Delivery Loop | `6af29c716e8081918a0f965f3286feb2` | PLATFORM (Orchestrierung), fachlich PRODUCT/MARKET/GROWTH und TRUST | 10:00 und 18:00 Uhr täglich | Nur tatsächlich verbundene Tools, nach AGENTS.md und GitHub-Rulesets; Squash erst nach aktueller Evidence | ChatGPT-Aufgabe aktiviert; letzter geplanter Lauf am 19.11.2026 10:05 CET **FAILED** (Ursache NOT_PROVEN), nächste Planung 18:00 CET |
| CAPITAL-AI Multi-Agent Quality Sentinel | `6ad07c8ca64c8191bd60d434371f81f2` | TRUST (SECURITY als Spezialist) | 07:00 und 15:00 Uhr täglich | Strikt read-only, keine Repo-/Cloud-Mutationen | ChatGPT-Aufgabe aktiviert; letzter aufgezeichneter Erfolg 22.10.2026, Ausführung seit Reaktivierung **NOT_PROVEN** |

**Wichtig:** Diese Zeitpläne und Statusangaben sind ein manueller, zeitgebundener ChatGPT-Readback vom 19.11.2026. Sie sind keine vom Repo verifizierbare Live-Anzeige. Änderungen an Zeitplan, Aktivierung, letzter Ausführung und Providerzustand nur im ChatGPT Automations-Backend prüfen. Ein erfolgreiches `run_now` mit dem Ergebnis `Ready to run in this conversation` ist **kein** erfolgreich ausgeführter geplanter Lauf.

## Begrenzter Multi-Agent-Flow

1. ORCHESTRATOR/PLATFORM ermittelt aktuellen `main`, offene Scope-PRs/Issues und tatsächliche Abhängigkeiten.
2. TRUST/SECURITY bewertet Auth-/Tenant-/BYOK-/Supply-Chain-/Lizenz- und Kostenrisiken ohne Secret-Exporte.
3. PRODUCT/MARKET/GROWTH priorisieren den kleinsten unabhängigen, messbaren Nutzwert; bestehende Branches bevorzugen.
4. QUALITY verifiziert passende Positiv- und Negativtests sowie vorhandene CI, Docker Security Gate, Domain Governance, CodeQL/Review-Regeln und `expected_head_sha`.
5. RELEASE darf nur bei vollständig nachgewiesener Delegation nach AGENTS.md squash-mergen; OBSERVER prüft `main`, Render, `/healthz` und Runtime-BuildIdentity **separat**, ohne Runtime-Wirkung zu erfinden.
6. Höchstens zwei technisch unterschiedliche Reparaturversuche je Slice; danach `BLOCKED`/`NOT_PROVEN`. Keine unendliche Wiederholung oder konkurrierende Mutationen.

Der Quality Sentinel meldet neue, deduplizierte Findings; er triggert **keine** eigenständige GitHub-Schreiboperation. Der Delivery Loop behält den tatsächlichen Autorisierungs-/Merge-Vertrag. Die LangGraph-State-Machine im Repository ist nur dann ausführende Orchestrierung, wenn reale, separat autorisierte Aktionen und Checkpoints angeschlossen sind.

## Catalogue-Center-Anbindung und Beleggrenze

Der bestehende Owner-Katalog `/control-center?tab=tools` liest über `/api/internal/repository-tools` nur den GitHub-Main-Snapshot. Die zwei Einträge in `config/tool-catalog-integrations.json` verweisen auf **diese Datei** und erscheinen als `EXTERNER_DIENST` / `REPO_BINDING_ONLY`, nicht als vom Repository gesteuerte ChatGPT-Ausführung. `version=null`, `actualCallsPerDay=null` und fehlende Live-Provider-/Betriebs-/Umsatz-Evidence sind beabsichtigt. Der Main-Commit und der Git-Blob-SHA belegen nur die Katalogdeklaration, nicht die Ausführung.

Kosten: keine neuen Ressourcen durch diese Integration. Die tatsächliche ChatGPT-Tarif-/Task-Grenze, GitHub-Action-Minuten, Render-Compute und eventuelle Provider-Ausgaben sind separat zu bewerten; neues kostenpflichtiges Enablement bleibt genehmigungspflichtig. Kein Deployment, kein neuer Cron, keine Sozial-/Finanz-Veröffentlichung, keine produktive SQL-/OAuth-/Secret-Mutation.

## Negative Testfälle für den Katalog

- Nur exakt diese beiden benannten externen Aufgaben werden in der Repo-Deklaration geführt, ohne Secret, Credential oder Schreib-URL.
- Keine Repository-Aussage darf aus `scheduled` ein `VERIFIED`-Laufresultat ableiten.
- Fehlt die dokumentierende Quelle in einem SHA-gebundenen Tree, verwirft der vorhandene Katalog die entsprechende Integration.
- Die bestehenden GitHub-Checks bleiben unverändert; der Katalog erweitert lediglich die Bestandsanzeige.

Rollback: Die beiden JSON-Deklarationen und diese Markdown-Datei revertieren. ChatGPT-Automationszustand bleibt davon unberührt.

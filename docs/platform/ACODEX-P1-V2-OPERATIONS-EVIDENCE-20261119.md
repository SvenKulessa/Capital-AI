# CAPITAL-AI AcodeX · P1-v2 Operations Health – read-only-Betriebsstandard

**Dokumentversion:** `1.0.0` · **Stand:** 2026-11-19 (Europe/Berlin) · **Evidence-Zeitzone:** ausschließlich UTC  
**Domäne:** CAPITAL-AI-PLATFORM; Schnittstelle zu CAPITAL-AI-TRUST / Evidence-Governance  
**Charakter:** nicht autorisierende, wiederverwendbare Betriebsanleitung. Die allein autorisierende Repository-Engineering-Richtlinie ist die aktuelle Root-[`AGENTS.md`](https://github.com/SvenKulessa/Capital-AI/blob/main/AGENTS.md) / `SOLO_MAINTAINER_FLOW@2`. **Keine zusätzlichen Pflicht-Checks, Freigaben, Reviewer, Cronjobs, Apps oder CI-Gates.**

**Verifizierte Evidenz:** [P1-v2-Abschlussbericht v1.1.0](https://drive.google.com/file/d/18s5PsFUI2qc-0s58O-f3ECCrYA8bu9T2/view?usp=drivesdk) · [historische v1.0.0](https://drive.google.com/file/d/1x_bhZ_HdgL-OKuHlPgYIk--5DB0KtwOA/view?usp=drivesdk). Beide sind versionierte, eigenständige Dateien; v1 wird nicht überschrieben. Das Operations-Health-Geräteergebnis vom **2026-11-19T00:43:05Z** lautete `P1_HEALTH_STATUS=VERIFIED`, `P1_HEALTH_EXIT=0`, `P1_HEALTH_OUTER_EXIT=0` nach dem erwarteten Neustart `00:41:03Z` und Pull `00:41:28Z`.

## Zweck, Datenfluss und Vertrauensgrenzen

```text
Existierender Terminalstart (kein zusätzlicher Trigger)
  └── vorhandenes startup.sh → vorhandenes drive-pull.sh (bestehender rclone copy)
                                    └── drive-sync.log + Guard-Audit
Manueller, anlassbezogener Aufruf:
  python3 -B Operations Health v1
    ├── Lesepfad: drive-sync.log (höchstens 4 MiB)
    ├── SHA-256: drive-pull.sh und Shared Guard
    ├── Lock-Metadaten; /proc nur bei vorhandenem Lock
    └── ausschließlich sanitisierte VERIFIED/NOT_PROVEN/BLOCKED-Ausgabe
```

- Das Health-Modul ist ein **separater Python-Standardbibliotheks-Readback**. Es ruft **kein** `rclone`, `drive-pull.sh`, OAuth-Endpunkte, Netzwerk-API, Timer, Cron oder Scheduler auf; `python3 -B` vermeidet Python-Bytecode-Dateien.
- Produktive Skripte, Auth-Daten, Drive-Remotes (`gdrive:` Reader `drive.readonly` und separater Writer `acodegdrive:`), Berechtigungen, Shared Guard und Start-Hooks bleiben unverändert. Das Lesen historischer Logs bestätigt **keine aktuelle** OAuth-Token-Gültigkeit.
- Rohlogs, vollständige Kommandozeilen, Token, Private Keys, Session- oder Personendaten werden **nicht** in Evidence übertragen. Statuscodes, Fehlerklassen, UTC-Zeitpunkte und geprüfte Hashes genügen.
- Der Monitor ist **keine permanente Überwachung**; „kein neuer Pull“ ist ohne konkret erwarteten Start kein Fehler. Keine automatische Reparatur oder Löschung von Locks.

## Einmaliges Prüfen und laufender Betrieb

**Bereits bestätigte Health-Datei:**
`/public/CAPITAL-AI-ACODE-CHATGPT-EXCHANGE/shared/2026-11-19_PLATFORM_CHATGPT_P1_V2_OPERATIONS_HEALTH_v1.py`  
Geräteseitig am 19.11.2026 `sha256sum -c: OK`, SHA-256:
`d58526f46f61cd208af9bdc67ca7e7f01c29179d8067ffaf613cfffea5473e1d`.

### A. Anlassbezogene Bestandsprüfung (ohne erwarteten Start)

```sh
S=/public/CAPITAL-AI-ACODE-CHATGPT-EXCHANGE/shared
python3 -B "$S/2026-11-19_PLATFORM_CHATGPT_P1_V2_OPERATIONS_HEALTH_v1.py"
RC=$?; echo "P1_HEALTH_OUTER_EXIT=$RC"
```

- Erwarteter Gesamtstatus **`NOT_PROVEN`, Exit `2`**, wenn `--expected-start-utc` fehlt und sonst alles in Ordnung ist. Das ist *kein* Incident, sondern eine explizite Nachweisgrenze.
- Andere Teilstatus wie `P1_V2_SHA_MATCH`, `P1_V2_FILTERS_PRESENT`, `SHARED_GUARD_SHA_MATCH`, `NO_NEW_OAUTH_OR_PULL_FAILURE_IN_WINDOW` und `LOCK_CLEAR` sind trotzdem als Einzelbelege auswertbar.

### B. Abnahme eines regulär erwarteten Terminalneustarts

**Vor dem tatsächlichen Schließen** UTC-Referenz notieren, nichts dazuerfinden:

```sh
date -u '+EXPECTED_START_UTC=%Y-%m-%dT%H:%M:%SZ'
```

Nach dem vollständigen Neustart (bestehender Hook arbeitet unabhängig):

```sh
S=/public/CAPITAL-AI-ACODE-CHATGPT-EXCHANGE/shared
python3 -B "$S/2026-11-19_PLATFORM_CHATGPT_P1_V2_OPERATIONS_HEALTH_v1.py" \
  --expected-start-utc 'ECHTER_ZUVOR_NOTIERTER_UTC_WERT'
RC=$?; echo "P1_HEALTH_OUTER_EXIT=$RC"
```

- Nur einen **real erfassten** UTC-Wert einsetzen. Der Health-Checker wartet nicht auf einen Pull.
- Ein erfolgreicher Pull nach `EXPECTED_START_UTC` und Guard-Audit `0` bei freier Sperre kann `VERIFIED` ergeben.
- Bis **120 Sekunden** nach erwartetem Start ist ein fehlender Erfolg `NOT_PROVEN` (Karenz). Erst danach wird ein fehlender Erfolg `BLOCKED` – sofern die Eingaben und das Log verlässlich sind.
- `BASELINE_UTC` ist im Health-Modul ursprünglich auf `2026-11-18T23:11:25Z` festgelegt. `--since-utc` darf nur auf einen **wirklich im Log nachgewiesenen** Erfolgszeitpunkt gesetzt werden; es schreibt keinen Zustand und rotiert keine Logs.

## Standard für Evidence-Bewertung (VERIFIED / BLOCKED / NOT_PROVEN)

| Check / Ereignis | VERIFIED | NOT_PROVEN | BLOCKED |
|---|---|---|---|
| P1-v2-Konfiguration | Bestätigte `drive-pull.sh`-SHA und fünf rekursive Filter inkl. `--max-size 100M` | Unvollständige Datei-Evidence | Unerwartete Hash-/Filterabweichung |
| Shared Guard | Bestätigte Guard-SHA sowie `AUDIT_EXIT_CODE=0` und Erfolgsmarker **im selben Pull-Segment** | Audit-Ausgabe noch unvollständig | Neue nonzero-Audit-Werte oder fehlender Auditnachweis nach Karenz |
| OAuth-/Pull-Logfenster | Keine neuen `invalid_grant`-/Pull-Fehler **seit dem belegten Baseline-Anker** | Log/Anker nicht vorhanden oder zu groß (>4 MiB) | Neuer `invalid_grant` oder `Drive-Pull fehlgeschlagen (Exit N)` nach Anker |
| Neustartvollständigkeit | Erfolg **nach dem zuvor erfassten** Startzeitpunkt | Startzeit fehlt oder 120-s-Karenz läuft | Nach 120 s noch kein Erfolg, trotz konkretem erwartetem Start |
| Drive-Sperre | `LOCK_CLEAR` | Junges Lock, älteres Lock mit aktivem oder nicht prüfbarem Worker | Mögliches veraltetes Lock ≥15 Minuten ohne erkennbaren Worker; **Verdacht, kein Angriffsbeweis** |

**Gesamtstatus:** `BLOCKED > NOT_PROVEN > VERIFIED`. **Exit:** `0=VERIFIED`, `2=NOT_PROVEN`, `3=BLOCKED`. Innerhalb eines einzelnen Laufs ist nur der tatsächlich gemessene UTC-Zeitraum belegt. Kein generischer `VERIFIED`-Anspruch auf künftige Betriebszeit, Token-Gültigkeit oder Doppelstartfreiheit.

## Evidence-Governance-Schnittstelle für CAPITAL-AI

Der On-Demand-Bericht ist eine **Evidence-Quelle**, kein Gate. Für eine bestehende Evidence Console / Issue / PR nur diese nachgewiesenen, datensparsamen Felder übernehmen:

| Feld | Form | Begründung |
|---|---|---|
| `workstream` | `PLATFORM / ACODEX_P1_V2` | Scope-Signal, keine neue Domain-Freigabe |
| `evidence_version` | `1.1.0` | Revisionsschutz, v1.0.0 unverändert |
| `source` | Drive-Dateilink zur v1.1-Evidence + Operations-Health v1 | Stabile Provenance |
| `baseline_utc` | `2026-11-18T23:11:25Z` | Anfang des verifizierbaren Logfensters |
| `expected_start_utc` | `2026-11-19T00:41:03Z` | Vor Neustart dokumentierter Zeitpunkt |
| `latest_success_utc` | `2026-11-19T00:41:28Z` | 25 Sekunden nach Erwartungszeitpunkt |
| `health_check_utc` | `2026-11-19T00:43:05Z` | Abnahmezeit |
| `status` | `VERIFIED` | Geräte-Readback, nicht unabhängig live ausgelesen |
| `exit_codes` | `health=0, outer=0` | Maschinen- und Shell-Evidence |
| `guard_audit` | `0`, `LOCK_CLEAR` | Guard/Sperr-Evidence |
| `new_failure_count` | `oauth=0, pull=0` | Ausschließlich Logfenster nach Baseline |
| `provenance` | `operator_terminal_output` | Keine Behauptung eines Smartphone-Connectors |
| `restrisiko` | `NOT_PROVEN: token longevity, universal duplicate-start freedom, content DLP` | Präzise Grenzen |

Die **11/11** rekursiven Policy-Tests und **22/22** Monitor-Unittests haben einen eigenen technischen Test-Scope; sie werden nicht als 33 produktive Android-Gates summiert. Drive-Snapshot **44/39/5** ist ein archivierter Zustand vor weiteren Uploads, kein aktueller Sollwert.

**Governance-Prozess:** Erst die vorliegenden Logs/Dateien lesen und belegen, dann optional sanitisierte Evidence aktualisieren. Bei `BLOCKED` Ursache read-only untersuchen und den kleinsten sicheren Fix gemäß der aktuellen Root-`AGENTS.md` behandeln; **niemals** die Sperre automatisch löschen oder Rechte, OAuth-Scopes, Scheduler oder Pull-Hooks im Rahmen dieses Health-Checks ändern. Keine Kostenaktivierung, neue Freigabestufe oder zusätzliche Required Checks.

## Test- und Archivquellen

- [P1-v2-Abschlussbericht v1.1.0](https://drive.google.com/file/d/18s5PsFUI2qc-0s58O-f3ECCrYA8bu9T2/view?usp=drivesdk)
- [P1-v2-Abschlussbericht v1.0.0 (historisch)](https://drive.google.com/file/d/1x_bhZ_HdgL-OKuHlPgYIk--5DB0KtwOA/view?usp=drivesdk)
- [Operations Health v1](https://drive.google.com/file/d/19l7vOPdeJ8riv7UFjbeQdjUkOl8co7Nh/view?usp=drivesdk)
- [Operations Tests v1 – 22/22 isolierte Tests](https://drive.google.com/file/d/1wc7yX-ZCy-nzLAEwtPcQ1ngoQmPZpl5o/view?usp=drivesdk)
- [Operations Runbook v1](https://drive.google.com/file/d/121sfc6A5a6J00lajhXMzFmDTkUd__3tg/view?usp=drivesdk)

**Status der Dokumentation:** `VERIFIED` für die beobachtete AcodeX-Abnahme, nicht für künftige Laufzeit oder eine Live-Evidence-Console-Synchronisierung. Änderungen an GitHub/Website erfordern den entsprechenden regulären Repository-Workflow; dieses Dokument führt keinen automatischen Push aus.
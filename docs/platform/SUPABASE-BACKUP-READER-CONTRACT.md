# PostgreSQL-17-Berechtigungsvertrag für den Backup-Reader

`CAPITAL_AI_BACKUP_READER_CONTRACT@1` · [Issue #664](https://github.com/SvenKulessa/Capital-AI/issues/664) · 12.11.2026

**VERIFIED** ist der begrenzte synthetische Dump mit Restore in einem zweiten Cluster. **BLOCKED** bleibt die Produktionsrolle. Die beobachteten `PUBLIC`-Rechte eröffnen Schreibpfade und der bestehende unbeschränkte Export überschreitet die getestete Allowlist. **NOT_PROVEN** bleiben vollständige Produktions-Recovery und GCS.

## Rollenprofil und Berechtigungsgrenzen

Das Fixture verwendet eine echte Anmeldung als `capital_ai_backup_reader` mit `LOGIN`, `NOSUPERUSER`, `NOCREATEDB`, `NOCREATEROLE`, `NOREPLICATION`, `NOINHERIT` und `CONNECTION LIMIT 1`. Es prüft das Fehlen von Mitgliedschaften und der SELECT-Grant-Option. Die Rolle besitzt keine Testobjekte. Der definierte Exportumfang bestimmt `CONNECT`, Schema-`USAGE` und `SELECT` auf benannten Tabellen und Sequenzen. `SELECT` auf der Sequenz erlaubt das Sichern des Stands. `nextval` bleibt gesperrt.

`default_transaction_read_only=on` ist eine Voreinstellung. Die Negativtests überschreiben sie mit `BEGIN READ WRITE` und verlangen SQLSTATE `42501`. Der reguläre `pg_dump` setzt `row_security=off`. Das Fixture weist den Fehler ohne `BYPASSRLS` und die vollständige Zeilenmenge mit `BYPASSRLS` nach. Das Attribut wirkt rollenweit auf erreichbare Objekte. `--enable-row-security` kann die gesicherte Zeilenmenge filtern und erfüllt den Vollständigkeitsvertrag nicht.

| Priorität | Effektiver Pfad | Nachweis |
| --- | --- | --- |
| P0 | `PUBLIC` → `net.USAGE` → Queue-DML oder `net.http_delete` | Beide Aufträge werden trotz rollenbezogenem `REVOKE` angenommen und vor dem Commit zurückgerollt. `http_get` und `http_post` bleiben im nachgestellten Provider-Profil gesperrt. |
| P0 | Geerbtes `pg_read_all_data` → `cron.USAGE` → `cron.schedule` | Ein Testjob wird registriert und zurückgerollt. Mit den minimalen Grants schlagen Schedule, Unschedule, Alter und Zugriffe auf Jobdaten fehl. |
| P0 | `PUBLIC TEMP` und `PUBLIC EXECUTE` auf LO-Erzeugungsfunktionen | Temporäre DDL und `lo_create` gelingen zunächst und werden zurückgerollt. Die lokalen Negativtests sperren auch `lo_creat`, `lo_from_bytea` sowie Lesen und Löschen eines fremden Large Objects. |
| P0 | Erreichbare `SECURITY DEFINER`-Funktionen | Der Funktionsaufruf ist nach dem lokalen Rechteentzug gesperrt. Vor dem Restore gesetzte Default Privileges verhindern ein implizites `PUBLIC EXECUTE` auf der wiederhergestellten Funktion. |

Die lokale Gegenprobe verändert gemeinsam wirksame ACLs nur in der Testinstanz. Ein ausdrücklich berechtigter Fixture-Worker behält seinen net-Zugriff. Für eine spätere Bewertung sind effektive Schema-, Tabellen-, Spalten-, Sequenz- und Funktionsrechte einschließlich erreichbarer Wrapper, Besitz, Grant-Optionen, Default Privileges und Rollenpfade zu prüfen. Ein rollenbezogener Entzug hebt `PUBLIC`-Grants nicht auf. Die vom Provider verwalteten Rechte bleiben ein Blocker.

## Katalogstand und Recovery-Umfang

Readback vom 12.11.2026 aus PostgreSQL-Katalogen. PostgreSQL `170011`, 113 RLS-Tabellen, keine FORCE-RLS-Tabellen, keine Large Objects und keine Rolle `capital_ai_backup_reader`. `PUBLIC` besitzt `USAGE` auf `net` und `public`, `TEMP` auf der Datenbank und `EXECUTE` auf den drei geprüften LO-Erzeugungsfunktionen. `cron`, `vault`, `extensions` und `pgmq` gewähren `PUBLIC` kein Schema-`USAGE`.

| Schemas | Tabellen / RLS / Sequenzen | Recovery-Umfang |
| --- | --- | --- |
| `public`, `private`, `fintech_core`, `stripe` | 65/65/2, 14/14/0, 5/5/0, 29/0/0 | App-Daten, DDL, Policies, Sequenzstände und Abhängigkeiten. Die produktive Allowlist auf Objektebene bleibt offen. |
| `auth`, `storage`, `realtime` | 27/16/1, 10/10/0, 3/1/1 | Provider-kompatiblen Wiederaufbau separat prüfen. Storage-Binärdaten brauchen einen eigenen Export und Restore. |
| `supabase_migrations`, `extensions` | 1/0/0, 1/0/0 | Migrationsstand und benutzerdefinierte Objekte mit der Zielumgebung abgleichen. |
| `cron` · `pg_cron 1.6.4` | 2/2/2 | Ungefilterte Extension-Config-Objekte: `cron.job`, `cron.job_run_details`, `cron.jobid_seq`, `cron.runid_seq`. Der Test weist sie im unbeschränkten synthetischen Dump nach. Jobs im Ziel erst kontrolliert reaktivieren. |
| `net` · `pg_net 0.20.4` | 2/0/1 | Keine registrierten Config-Objekte. Flüchtige Request-/Response-Daten und Queue-Sequenz aus dem fachlichen Recovery-Umfang ausnehmen. Keine ausstehenden Requests wiederholen. |
| `pgmq` · `pgmq 1.5.1` | 3/0/1 | Keine registrierten Config-Objekte. Queue-/Archivdaten und Sequenzstände je fachlich benötigter Queue entscheiden. Replay und Duplikate separat prüfen. |
| `vault` · `supabase_vault 0.3.1` | 1/0/0 | `vault.secrets` ist ein ungefiltertes Config-Objekt. Schlüssel-Recovery und Provider-Portabilität separat prüfen. Kein Zugriff auf entschlüsselte Werte für den Reader. |
| `graphql`, `graphql_public`, `pgbouncer` | je 0/0/0 | Funktions- und Providerabhängigkeiten erfassen. |

Weitere Erweiterungen ohne registrierte Config-Objekte: `btree_gist 1.7`, `pg_stat_statements 1.11`, `pgaudit 17.1`, `pgcrypto 1.3`, `plpgsql 1.0`, `uuid-ossp 1.1`, `wrappers 0.6.3`. Clusterweite Rollen, Eigentümer und ACLs brauchen eine eigene Wiederherstellung. Der [bestehende Exporter](../../scripts/platform/backup-stream-encrypt.sh) verwendet einen unbeschränkten Plain-Dump mit `--no-owner --no-privileges`. Der Testreader scheitert an diesem unbeschränkten Aufruf. Der verifizierte Dump umfasst das vollständige synthetische Schema `app`. [OCC-v2 #548](https://github.com/SvenKulessa/Capital-AI/pull/548) bleibt HOLD.

## FK-Restore-Regression (Erweiterung PR #665, isoliert per CI verifiziert)

Das synthetische Schema `app` umfasst jetzt eine Eltern-Tabelle `app.tenants` mit Primärschlüssel und die Kind-Tabelle `app.notes` mit einem **validierten Fremdschlüssel** auf `app.tenants.tenant` (`ON UPDATE RESTRICT ON DELETE RESTRICT`). Der eng begrenzte Reader erhält `SELECT` auf beide Tabellen. Der Quell- und der unabhängige Restore-Cluster prüfen jeweils:

- **Positiv:** zwei Eltern- und zwei Kindzeilen, kein verwaistes Kind, im Katalog validierte Fremdschlüsseldefinition sowie erfolgreicher Kind-INSERT mit gültiger Referenz innerhalb einer zurückgerollten Transaktion.
- **Negativ:** INSERT mit unbekanntem Tenant, DELETE eines referenzierten Parents und UPDATE des referenzierten Parent-Schlüssels müssen jeweils explizit mit SQLSTATE `23503` scheitern; andere SQLSTATEs sind kein PASS.
- **Integrität:** der SHA-256-Fingerprint von Quelle und Restore umfasst beide Tabellen, die Identitätssequenz, RLS-/Policy-Definitionen und PK/FK/CHECK-Constraints. Die vorhandenen `42501`-Tests für Rollenrechte bleiben unverändert.

**Aktuelle Evidence (exakte PostgreSQL-17.11-Version, synthetisch VERIFIED):** [GitHub Actions Run 43329997408](https://github.com/SvenKulessa/Capital-AI/actions/runs/43329997408), Job `131572015906` SUCCESS, geprüfter PR-Head `4490702b5acd1768e9005eb1e8a115f38d8a6022`. Der Server meldet `PostgreSQL 17.11 (Debian 17.11-1.pgdg12+2)`. Die signierte historische PGDG-Paketquelle liefert exakt `postgresql-server-dev-17=17.11-1.pgdg12+2`; die Docker-Installation hält Client/Server auf 17.11 und prüft die Header-Paketversion ausdrücklich. Dies behebt den zuvor reproduzierten ABI-Konflikt `pg_cron.so: undefined symbol: heap_datum_check` mit versehentlich verwendeten 17.12-Headern. Extensions aus festgelegten Upstream-Quellcommits: `pg_net 0.20.4`, `pg_cron v1.6.4` (Katalog `1.6`; die abweichende Supabase-Katalogbezeichnung `1.6.4` ist **keine** Provider-Binary-Paritätsgarantie).

- 51 PASS-Zeilen, darunter 33 explizite SQLSTATE `42501`-Rollenverweigerungen und 6 explizite SQLSTATE `23503`-FK-Verweigerungen, je 3 im Quell- und im Restore-Cluster.
- Synthetischer scoped Dump SHA-256: `caa488bdf0f590bbca3720e23c6eaaecc3f56e5bfb2c5959dd1e94d405bf66f6` (laufbezogen).
- Identischer SHA-256-Fingerprint von Quelle und Restore: `0221d18d8ca4c8243d3729c62e89bcbf30e90d4b18f1848638f6817a7aa7e610`.
- Container-Tests offline, nicht privilegiert, Daten auf kurzlebigen separaten Clustern, keine Verbindung zur Produktivdatenbank und keine produktiven Credentials.

**Fehlerursache / Regression:** Der vorherige [17.12-Lauf 43328313501](https://github.com/SvenKulessa/Capital-AI/actions/runs/43328313501) war fachlich grün, aber mit dem produktiven Patchlevel nicht identisch. Der erste Korrekturlauf [43329626727](https://github.com/SvenKulessa/Capital-AI/actions/runs/43329626727) schlug berechtigt fehl: 17.11-Server mit 17.12-Extension-Build-Headern (`heap_datum_check`). Die versionsgleichen archivierten Entwicklungsheader beseitigten den Fehler ohne Sicherheitsausnahme oder Testschwächung.

**Grenzen:** Dies bestätigt ausschließlich die synthetische PG17.11-Fixture-Recovery. **NOT_PROVEN** bleiben ein vollständiger, separat autorisierter Supabase-Auth-/Storage-/Vault-/ACL-Restore, byte-identische Supabase-Provider-Extension-Binaries, die tatsächlich produktiv nutzbaren Backup-Reader-Rechte sowie unabhängige Recovery eines echten GCS-Backups. **BLOCKED** bleiben produktiver Dump/Provisionierung und der OCC-v2-Cutover von PR #548. Die aktuellsten Required Checks gelten nur für den jeweiligen PR-Head; dieser Dokumentationscommit braucht neue Head-CI.

## P1 – Auth-/Storage-/Vault-/ACL-Recovery-Slices (isolierte Regression)

**Contract:** `CAPITAL_AI_SUPABASE_RECOVERY_SLICES@1`. Dieser zusätzliche, eigenständig ausführbare Test liegt unter [`scripts/platform/backup-recovery-slices-test.sh`](../../scripts/platform/backup-recovery-slices-test.sh) und wird im **bestehenden** Workflow `PG17 Backup Reader Contract (isolated)` neben dem Reader-Vertrag mit PostgreSQL **17.11** ausgeführt. Keine neue Required-Check-Pipeline, kein Provider-Zugriff, keine Produktionsmigration.

- **Auth (synthetisch):** zwei Testbenutzer, zwei Identitäten und zwei Sitzungen; Quell- und separater Zielcluster prüfen Anzahl und echte FK-Referenzen. Verwaiste Auth-Sitzungen müssen mit SQLSTATE `23503` scheitern. Dies testet **nicht** GoTrue, echte MFA, OAuth-Anbieter oder Token-Rotation.
- **Storage (synthetisch):** zwei private Buckets mit je einem Objekt. Ein eigener lokaler Binary-Payload wird **außerhalb** von PostgreSQL gehalten, per SHA-256 gegen die wiederhergestellten `storage.objects`-Metadaten überprüft und mit separatem Datei-Kopiervorgang in ein isoliertes Ziel überführt. Der alleinige Datenbank-Dump muss den Test **nicht bestehen** (fehlende Bytes); veränderte Datei-Bytes müssen ebenfalls scheitern. Public-Bucket- und Foreign-Key-Negativtests laufen getrennt. Dies testet **keine** Supabase-Storage-API, keinen realen S3-Export und keine tatsächlichen Benutzerdateien.
- **Vault (nur kryptografisches Prinzip):** ein **offensichtlich synthetischer** `pgcrypto`-Ciphertext lässt sich nach dem Dump im isolierten Ziel mit dem Testschlüssel entschlüsseln; ein falscher Testschlüssel scheitert. `pgcrypto` ist **kein** Nachbau der Provider-Extension `supabase_vault` und beweist **nicht** deren Masterkey-/Rootkey-Portabilität, tatsächlichen Secret-Restore oder KMS-Rechte.
- **Provider-artige ACL/RLS (synthetisch):** zwei getrennte `tenant_a`-/`tenant_b`-Rollen erhalten über RLS je genau eine Objektzeile. Ein dedizierter `recovery_reader` darf nicht Auth-/Vault-Daten lesen, keine Storage-Metadaten schreiben und nicht `pg_read_all_data` erben. Bei `pg_dump --no-owner --no-privileges` fehlen Ziel-Grants **absichtlich**; erst die getrennte ACL-Rekonstruktion erlaubt den isolierten Tenant-Test. Die realen Supabase-`PUBLIC`-/`pg_net`-Risiken bleiben von diesem Test **unverändert BLOCKED**.

**Reproduktion:** auf dem bereits fest versionierten PostgreSQL-17.11-Fixture-Runner als nicht privilegierter OS-Benutzer, mit `pgcrypto` aus PostgreSQL contrib:

```bash
bash scripts/platform/backup-recovery-slices-test.sh
```

Zwei lokale Cluster, dynamische Loopback-Ports, `--network none`-Container ohne Linux-Capabilities. Die Bash-Test-Datei akzeptiert keine Verbindungsargumente, bereinigt libpq-Umgebung, führt keine Netzwerkanfragen außerhalb des Testcontainers aus und löscht ihre temporären SQL-Dumps und Objekt-Bytes beim Beenden. Pro Lauf werden die SHA-256 des synthetischen Dumps und ein lokaler Daten-Fingerprint ausgegeben, **keine** Zugangsdaten oder Auth-/Vault-Werte.

**Evidenzgrenze:** Erst nach **tatsächlich grünem GitHub-Runner** `SYNTHETIC_SLICES_VERIFIED`; bis dahin `IN_PROGRESS`. Ein vollständiger Provider-Restore bleibt **NOT_PROVEN**. Für einen später ausdrücklich autorisierten echten Restore müssen zusätzlich unabhängig nachgewiesen werden: alle 27 realen `auth`-Tabellen inklusive Sessions/MFA/OAuth/Provider-Konfiguration, tatsächliche Storage-Datei-Bytes und private ACLs, die vom Provider freigegebene Vault-Key-Portabilität oder sichere Re-Provisionierung, Rollen/Objekt-Owner/Default-Grants, `cron`/`pg_net`/`pgmq` und deaktivierte Webhooks sowie ein unabhängiger Offsite-Download und RPO/RTO. **Kein** produktiver Dump, keine Secrets und kein OCC-v2-Cutover.

## Reproduktion

Auf einem isolierten Linux-Einbenutzer-Runner als unprivilegierter OS-Benutzer mit PostgreSQL-17-Server/Client, `pg_net 0.20.4`, Upstream-`pg_cron v1.6.4`, Python 3 und ripgrep. `PG17_BINDIR` kann den Pfad zu den PG17-Binaries angeben.

```bash
bash scripts/platform/backup-reader-contract-test.sh
```

Zwei frische Cluster verwenden dynamische Loopback-Ports. PostgreSQL-Prozesse erhalten eine bereinigte Umgebung. Der Test deaktiviert Cron-Ausführungen, verwendet nur eine Loopback-URL und prüft, dass nach dem Rollback kein net-Auftrag übrig ist. Er prüft die Restore-ACLs und Tenant-Isolation, vergleicht die SHA-256-Fingerprints von Zeilen, Sequenz, Constraints und RLS/Policies und gibt den separaten Dump-Hash aus. Die Cluster und Dumps werden anschließend entfernt.

Getestet mit Debian PostgreSQL `17.11-0+deb13u1`, `pg_net` Tag `v0.20.4` (`698fb055f666366a78c112b0578b0a5652ddbcfa`) und `pg_cron` Tag `v1.6.4` (`9490f9cc9803f75105f2f7d89839a998f011f8d8`). Das Upstream-Paket meldet `pg_cron=1.6` im Katalog. Supabase meldet `1.6.4`. Der Lauf prüft die nachgestellten ACLs auf Upstream-Objekten. Die Parität mit der Providerdistribution ist offen.

Der **historische** dokumentierte Lauf (vor der FK-Erweiterung) meldete 42 bestandene Prüfungen, davon 33 erwartete Ablehnungen mit SQLSTATE `42501`. Diese Ergebnisse sind keine neue Head-CI-Evidence.

- Synthetischer Dump SHA-256 `20367b6a463d48c86f7d83d35fab2f5b711ef274f85a1f33d97a4538e3fb65a8`
- Identischer Fingerprint von Quelle und Restore `e89cf82f0c5f0581581462439b2d2cae6265e92ed5b959553a01769afb954e50`

[PostgreSQL 17 pg_dump](https://www.postgresql.org/docs/17/app-pgdump.html) · [Supabase pg_net ACLs](https://supabase.com/kb/troubleshooting/revoking-access-to-pg_net-objects-has-no-effect-0bbc16) · [Supabase Extension ACLs](https://supabase.com/kb/troubleshooting/revoking-privileges-on-storage-pg_cron-vault-and-extension-objects-has-no-effect-916576)

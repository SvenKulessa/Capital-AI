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

**PG17-FK-Evidence VERIFIED für den synthetischen Test-Scope:** [GitHub Actions Run 43327840519](https://github.com/SvenKulessa/Capital-AI/actions/runs/43327840519), Test-Head `d46c069398ed988aebbdbc999ba5d0040c34f7a8`, Job `131564723357` SUCCESS. 50 PASS-Meldungen, darunter 33 erwartete SQLSTATE `42501` und 6 erwartete FK-Verletzungen mit SQLSTATE `23503` (je 3 in Quelle und Restore). Der tatsächlich gestartete PostgreSQL-Server meldete **17.12**, nicht 17.11: Das fest gepinnte 17.11-Docker-Basisimage erhielt bei der Installation des PGDG-Development-Pakets ein aktualisiertes 17.x-Serverpaket. Extension-Katalog: `pg_net=0.20.4`, `pg_cron=1.6` aus gepinntem Upstream-Commit v1.6.4. Ein exakter 17.11-Provider-Patchlevel-Test bleibt ausstehend.

- Synthetischer Dump SHA-256: `29894a68aff7807d9944b685b6b2b140be87769dc562086d6d6f07079ef00142`
- Identischer Fingerprint Quelle/Restore: `0221d18d8ca4c8243d3729c62e89bcbf30e90d4b18f1848638f6817a7aa7e610`
- Der CI-Lauf wurde ohne produktive Verbindungsvariablen und ohne Container-Netzwerk mit zwei wegwerfbaren PostgreSQL-Clustern ausgeführt. Die vollständig neue Head-Verifikation nach diesem Dokumentations- und Versionsassertion-Commit ist separat zu prüfen.
- **Nicht nachgewiesen:** vollständiger Supabase-Auth-/Storage-/Vault-Recovery-Pfad, identische Provider-Extension-Binaries, sichere produktive Backup-Rolle, vollständiger Export mit effektiven Provider-ACLs, produktiver GCS-Backup-Restore, OCC-v2-Cutover. **OCC #548 HOLD.**



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

# AIFINANCIAL: Härtung und Wartung

Stand: 2026-10-04 Europe/Berlin. Projekt: `ryzywoktpmyhwzxmstyu`.
Root-Contract: `AGENTS.md@currentmain`, Main `fd4a299f1d1baacd98a8d9cf24abe670adea1be1`.

## Status und Scope

Nur lesende Provider-Abfragen und lokale Vorbereitung durchgeführt. Keine produktive
DDL, Policy-, Auth-, Billing- oder Retention-Änderung ausgeführt. Kein Datenbank-Upgrade.
Die SQL-Dateien sind Review-Vorschläge, keine registrierten Supabase-Migrationen.
Vor Ausführung erneut Provider-Zustand prüfen; produktive Security-Änderungen benötigen
Owner-Freigabe gemäß Root-Contract. Die bereits bekannte Historienabweichung
(86 Remote-Migrationen fehlen lokal) bleibt offen. Nicht mit `migration repair`
kaschieren oder diese Vorschläge automatisch mit `db push` ausrollen.

## Verifizierte Befunde

- Eine Triggerfunktion ohne `search_path`: `public.touch_social_media_accounts_updated_at()`.
  SECURITY INVOKER; Body setzt ausschließlich `new.updated_at = now()`.
  Vorschlag: `search_path = pg_catalog`; Body, Owner und Grants bleiben erhalten.
- Vier fehlende FK-Indizes: Inventory-Events `component_id`, Owner-Evidence
  `challenge_id` und `credential_id`, Owner-Credentials `owner_user_id`.
  Drei Tabellen mit geschätzt null Zeilen und zusammen 73728 Bytes einschließlich Indizes.
  Vier vollständige B-Tree-Indizes; keine Änderung von Constraints oder Grants.
- Vier Social-Media-Policies: `FOR ALL`, permissive, `TO public`, jeweils
  `auth.role() = 'service_role'` in USING und WITH CHECK.
  Vorschlag kapselt den bestehenden Ausdruck in einem unkorrelierten SELECT.
  Rollen, Claim-Prüfung und Schreibprüfung bleiben erhalten. Dies ist ein minimaler
  InitPlan-Fix; die Ablösung der veralteten `auth.role()`-Prüfung durch `TO service_role`
  ist eine gesonderte Auth-Änderung und hier bewusst nicht enthalten.
- Passwort-Leak-Schutz: Advisor meldet deaktiviert. Laut offizieller Dokumentation
  ab Pro verfügbar. Aktueller Tarif und Auth-Einstellung sind noch nicht providerseitig
  geprüft. Kein kostenpflichtiger Tarifwechsel und keine Auth-Umschaltung vorbereitet.
- Cron: 94234 Einträge, 65519616 Bytes (~62,48 MiB), null fehlgeschlagene oder
  unvollständige Einträge zum Snapshot. Ältester Eintrag 2026-07-30.
  Aktive Jobs: Stripe-Sync jede Minute; bestehende Privacy-Retention täglich `17 3 * * *`.

## Cron-Retention: Vorschlag zur Entscheidung

Empfehlung: abgeschlossene Cron-Ausführungen 30 Tage behalten; alle Status gleich
behandeln, laufende Ausführungen erhalten. Zum Snapshot wären ca. 51011 Einträge
betroffen. Alternative 7 Tage: ca. 84148; 90 Tage: aktuell null.
Dies betrifft ausschließlich `cron.job_run_details`, keine Geschäfts-, Privacy-
oder Security-Evidence-Tabellen. Vor Freigabe prüfen, ob Cron-Historie für vertragliche
Nachweispflichten oder Incident-Aufklärung benötigt wird; gegebenenfalls vorher archivieren.
Löschung ist ohne Backup/Archiv nicht rückrollbar. Täglicher separater Cleanup-Job
erst nach Festlegung der Frist; bestehenden Privacy-Job nicht überschreiben.
DELETE gibt Speicher zur Wiederverwendung frei und verkleinert die Datei nicht sofort.
Kein `VACUUM FULL` als Routinefix (exklusive Sperre).

## 110 als ungenutzt gemeldete Indizes

Alle 110 Advisor-Indizes mit dem Live-Katalog korreliert: zusammen 2048000 Bytes
(~1,95 MiB), null constraintgebunden, alle `idx_scan = 0`, 104 auf laut Statistik
leeren Tabellen. Tabelle selbst wurde jeweils bereits gelesen; das beweist keine
repräsentative Produktnutzung. `pg_stat_database.stats_reset` ist null; Serverstart
2026-10-02 20:31 UTC. Statement-Statistik seit 2026-09-25 11:38 UTC, 619 Statements,
273484 Calls, null Deallocations. Diese Beobachtungsgrenzen reichen nicht für
eine Löschentscheidung. Keine Indizes entfernen.

`index-snapshot.json` enthält ausschließlich technische Katalog-/Zählerdaten.
Vorschlag: mindestens 30 Tage repräsentative Nutzung einschließlich Monatsläufen
beobachten; Vorher/Nachher-Snapshots und Resets erfassen. Für jeden Kandidaten
FK-Abdeckung, RLS-/Join-/Sortierpfade, seltene Owner-/Recovery-/Compliance-Operationen,
Indexdefinition und echte Query-Pläne prüfen. Statement-Texte nicht ungefiltert
exportieren (mögliche vertrauliche Literale). Erst dann einzeln entscheiden.

## Validierung, Ausführung und Rollback

Read-only EXPLAIN auf der Live-Datenbank bestätigt für `(select auth.role())`
einen InitPlan mit One-Time Filter. Das ist kein vollständiger RLS-Integrationstest.
Vor Production auf isolierter Umgebung Triggerverhalten und Zugriffsmatrix
(anon, authenticated, service_role; SELECT/INSERT/UPDATE/DELETE) einschließlich
negativer Fälle und unveränderter Grants testen.

`proposed-hardening.sql`: atomare Transaktion, 2 Sekunden Lock-Timeout, 30 Sekunden
Statement-Timeout; bei Sperrkonflikt abbrechen statt unbegrenzt warten. Standard-
CREATE INDEX ist hier wegen der derzeit kleinen Tabellen vorgesehen. Bei Wachstum
Indexbau separat mit `CONCURRENTLY` außerhalb der Transaktion planen.
Gleichnamige Indizes führen absichtlich zum Abbruch, statt eine falsche Definition
mit IF NOT EXISTS zu akzeptieren. Vor erneuter Ausführung Zustand korrelieren.

Nach freigegebener Ausführung `verify.sql`, Trigger-/RLS-Integrationstests und beide
Advisors erneut ausführen. Erwartung: 1 search_path-, 4 FK- und 4 InitPlan-Befunde
entfallen. Kein bestandener Check ersetzt Auth-/Production-Freigaben.
Rollback bei unverändertem Scope: vier neu erzeugte Indizes entfernen,
vier Policies auf dokumentierte direkte `auth.role()`-Ausdrücke zurücksetzen,
Funktionsoption `RESET search_path`. Bei späteren Änderungen kein blindes Rollback.
Nach Historienabgleich Migration mit `supabase migration new` generieren und
Provider-Ausführung mit Repository-Historie nachvollziehbar verbinden.

## Offizielle Quellen

- [Changelog](https://supabase.com/changelog)
- [Fester Funktions-search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [FK-Indizes](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys)
- [RLS InitPlan](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- [RLS und Rollen](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Passwort-Leak-Schutz](https://supabase.com/docs/guides/auth/password-security)
- [Index-Advisor](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)
- [Cron](https://supabase.com/docs/guides/cron)

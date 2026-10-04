# Supabase: Migrationshistorie und Update-Preflight

Stand: 2026-10-04. Root-Contract: AGENTS.md@currentmain.
Geprüfter Main: `776a743688f13013b09c95b91a52ef9793d1a5eb`.
Projekt: AIFINANCIAL (`ryzywoktpmyhwzxmstyu`).

## Konkreter Fehler und Korrektur

Supabase Preview meldet „Remote migration versions not found in local migrations directory“.
Remote und Repository enthalten jeweils 94 Migrationen; genau zwei Versionsnummern stimmen nicht überein:

| Repository vorher | Remote / Repository nachher | Name |
| --- | --- | --- |
| 20261004073500 | 20261004073046 | vocabulary_access_server_gates |
| 20261004074800 | 20261004074704 | vocabulary_quant_pro_private_content |

Die erste Datei ist mit den gespeicherten Remote-Statements exakt identisch.
Die zweite stimmt bis auf den abschließenden Zeilenumbruch überein.
Beide vorhandenen Git-Blobs werden unverändert unter den tatsächlichen Remote-Versionsnummern weitergeführt.
Die übrigen 92 Versionsnummern stimmen überein. SQL-Inhalte, Schema, Daten und Remote-Historie werden durch diese Reparatur nicht verändert.
Kein migration repair, db push, Reset oder erneutes Ausführen bereits angewandter Migrationen.
Rollback: diesen Rename-Commit revertieren; damit würde die bekannte Versionsabweichung zurückkehren.

## Verifikation und Grenzen

- Remote-Historie mit SQL und list_migrations frisch gelesen.
- Repository-Baum gegen den exakten Main-SHA gelesen; keine offenen PRs beim Abgleich.
- Mengenvergleich nach dem Rename: 94 / 94, kein Remote-only oder Local-only.
- Vorhandensein der beiden Vocabulary-Tabellen und des lesenden Content-RPC providerseitig bestätigt.
- Keine vollständige SQL-Content-Parität der übrigen 92 Migrationen behauptet.
- Kein Empty-Database-Replay durchgeführt; vorhandene historische Baseline-Abhängigkeiten damit nicht verifiziert.
- Supabase-Branch vor Reparatur: MIGRATIONS_FAILED, Projekt ACTIVE_HEALTHY.
- Preview bleibt FAIL / UNVERIFIED, bis die Integration den korrigierten Git-Stand verarbeitet und ein frischer Provider-Readback PASS bestätigt.
- Nicht Teil der Required-Status-Checks laut Owner-Übergabe; diese Einstufung wurde hier nicht unabhängig gegen alle Rulesets verifiziert.
- Historische Angabe „86 Remote-Migrationen fehlen lokal“ in README.md ist für diesen Snapshot SUPERSEDED / NON-AUTHORIZING; der aktuelle Befund ist die obige Zweierabweichung.

## PostgreSQL-Update: separat und noch nicht ausgeführt

Provider-Version: 17.6.1.127; SQL: PostgreSQL 17.6, aarch64.
Offizieller Changelog vom 2026-09-25 kündigt 17.11 / 15.19 an.
Die für dieses Projekt tatsächlich angebotene Upgrade-Version wurde noch nicht im Dashboard verifiziert.

Read-only Preflight:
- Datenbankgröße: ca. 100,6 MB zum Snapshot; keine garantierte Downtime-Schätzung.
- Replication Slots: 0.
- ltree-Indizes: 0.
- Float-GiST-Indizes: 0 (btree_gist ist installiert).
- Custom Operators mit nicht eingebauten Selectivity Estimators außerhalb von Extensions: 0.
- Datenbank-Funktionsdefinitionen mit Legacy-PGP-cipher-algo bf/blowfish/cast5: 0.
  Dies beweist weder historische Client-Nutzung noch die Unbetroffenheit sämtlicher verschlüsselter Nutzdaten.
- pgcrypto und supabase_vault installiert.

Kein verfügbares Connector-Tool für In-place-Upgrade oder Upgrade-/Backup-Eligibility.
Vor produktivem Upgrade: angebotene Zielversion, Backup-/Recovery-Status und Downtime-Freigabe verifizieren;
danach bevorzugt In-place-Upgrade, Version/Health und Auth-/Vault-/Vocabulary-Pfade prüfen.
Pause/Restore ist kein automatisch freigegebener Ersatz.

## Security-Readback

Advisor: Passwort-Leak-Schutz WARN (deaktiviert); fünf INFO für RLS aktiv ohne Policies.
Diese Hinweise bleiben sichtbar; kein pauschales Security-PASS.
Remediation:
- https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

## 3 Validate / 5 Approve

Validate 1: Versionsmengen und exakter Main — PASS.
Validate 2: Inhalt der zwei betroffenen Migrationen und unveränderte Blobs — PASS.
Validate 3: frischer Supabase-Preview-/Replay-Nachweis — OPEN.

Approve: konkrete Owner-Anforderung vorhanden; technische Rename-Evidence vorhanden;
TRUST-/Required-Check-Abnahme, Owner-Merge und Production-Upgrade-Handoff bleiben OPEN.
Keine automatische Self-Healing-Promotion aus einem einzigen Validierungszyklus.

## Offizielle Quellen

- https://supabase.com/changelog.md
- https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes
- https://supabase.com/docs/guides/platform/upgrading
- https://supabase.com/docs/guides/deployment/branching/troubleshooting

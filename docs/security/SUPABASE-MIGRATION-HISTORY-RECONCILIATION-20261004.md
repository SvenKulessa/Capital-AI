# Supabase-Migrationshistorie — Rekonstruktion 2026-10-04

## Identitäten

- Capital-AI Basis: `13fda1288a717cc62c1b0c654057f9ebded3e26a`
- TRUST-Branch: `capital-ai-trust/supabase-migration-history-20261004`
- Historische Quelle: `SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`
- Supabase-Projekt: `AIFINANCIAL`

## Read-only Befund

Die Remote-Historie in `supabase_migrations.schema_migrations` enthielt **92**
registrierte Migrationen. Im Capital-AI-Repository lagen vor der Rekonstruktion
nur **7** aktive SQL-Dateien:

- 6 Versionen waren remote registriert;
- 86 remote registrierte Versionen fehlten lokal;
- `20260926000000_capital_ai_pipeline_builder_schema.sql` war nur lokal vorhanden.

Alle 86 fehlenden Remote-Versionen konnten unter identischem
`<timestamp>_<name>.sql` in `SvenKulessa/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c` gefunden werden.
Nach der Rückführung stimmten die Git-Blob-SHAs aller 86 Dateien exakt mit der
historischen Quelle überein.

## Pipeline-Builder-Migration

Die lokale Version `20260926000000_capital_ai_pipeline_builder_schema.sql` ist
nicht in der Remote-Historie registriert. Eine read-only Schema-Prüfung bestätigte,
dass die zwölf darin vorgesehenen Workspace-/Pipeline-/Paper-Trading-Tabellen in
AIFINANCIAL nicht existieren. Im Anwendungscode besteht keine aktive Datenzugriffs-
Abhängigkeit auf diese Tabellen.

Konsequenz:

- nicht als `applied` markieren;
- nicht gegen Produktion ausführen;
- aus der aktiven `supabase/migrations`-Kette entfernen;
- ARCH-PIPE-0002 bleibt als nicht-authorisierender Target-State erhalten.

## Kanonischer Zustand

Nach diesem Branch-Stand gilt:

1. lokale aktive Migrationen = remote registrierte Migrationen zum
   Rekonstruktionszeitpunkt: **92 = 92**;
2. bereits angewandte Remote-Migrationen werden nicht erneut ausgeführt;
3. die Supabase-History wird nicht mit `migration repair` manipuliert;
4. es erfolgt kein `db push`, kein `db reset --linked` und keine produktive DDL/DML;
5. Finance dient nur als historische Evidence-Quelle; neue Schemaänderungen entstehen
   ausschließlich im Capital-AI-Repository.

## Nicht ausgeführt

- kein `supabase migration repair`
- kein `supabase db push`
- kein `supabase db reset --linked`
- keine Produktionsmigration
- keine Datenmutation
- keine Secret-Mutation
- kein Render-, NATS- oder Valkey-Deploy

## Verifikation nach Merge

Nach Owner-Merge ist die Supabase-Preview-/Branch-Erstellung erneut zu prüfen.
Wenn die Branching-Migrationen danach scheitern, ist ausschließlich der konkrete
SQL-Replay-Fehler gegen die nun vollständige, reproduzierbare Historie zu
analysieren; die Remote-History darf nicht pauschal umgeschrieben werden.

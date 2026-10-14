# CAPITAL-AI: clientseitige Backup-Verschlüsselung für Google Drive

**Geltungsbereich:** ausschließlich lokale Verschlüsselung vor einem Drive-Upload. Google Drive OAuth, Backup-Export, Upload und Restore sind separate Aufgaben und noch nicht produktiv aktiviert.

Bestehender privater Zielordner: `CAPITAL-AI / PLATFORM / CAPITAL-AI Supabase Backups`. Keine Backups/Schlüssel ins Git-Repository oder in GitHub Actions Artifacts legen.

## 👋⚙️ Einmaliges Schlüsselpaar auf dem Owner-PC

```bash
# age und age-keygen lokal aus vertrauenswürdiger Quelle installieren.
umask 077
age-keygen -o capital-ai-recovery-identity.txt
age-keygen -y capital-ai-recovery-identity.txt
```

**Nur** den ausgegebenen öffentlichen `age1...` Empfänger als Repository-Variable `CAPITAL_BACKUP_AGE_RECIPIENT` freigeben. Der private Schlüssel `capital-ai-recovery-identity.txt` darf niemals in GitHub, Google Drive, einen Agent-Chat, CI-Logs oder eine öffentliche Cloud. Zwei getrennte verschlüsselte Offline-Recovery-Kopien aufbewahren und Zugriff testen. Ohne privaten Schlüssel sind die Sicherungen irreversibel verloren.

## Verschlüsselung eines lokalen SQL-Exports

```bash
export CAPITAL_BACKUP_AGE_RECIPIENT='age1...PUBLIC_RECIPIENT...'
bash scripts/platform/drive-encrypt.sh database.dump database.dump.age
# Nur die *.age Datei auf Drive hochladen.
```

Der Befehl prüft die Empfängerform, verlangt eine nichtleere normale Quelldatei, verhindert Überschreiben, erstellt die Ausgabedatei als mode 0600 und führt **keinerlei Netzwerkzugriff** aus. Es wird niemals automatisch eine unverschlüsselte Quelle übertragen.

## Offline-Wiederherstellung

```bash
age --decrypt -i /secure/offline/capital-ai-recovery-identity.txt -o database.dump database.dump.age
```

Ein kryptographischer Roundtrip ist kein vollständiger Supabase-Restore. Rollen, Auth/Storage, Objekte, Vault/Secrets, Edge Functions, Konfiguration und Tenant-Daten müssen in einem gesonderten isolierten Disaster-Recovery-Test berücksichtigt werden.

## Test

```bash
bash scripts/platform/drive-encryption-test.sh
```

Der Test erzeugt ausschließlich **temporäre Testschlüssel und Testdaten** und prüft korrekte Wiederherstellung, falsche Schlüssel, manipuliertes Chiffrat und Überschreibschutz. In GitHub CI wird hierfür das Distribution-Paket `age` installiert.

**Rollback:** Diese Dateien und den Testworkflow zurücknehmen. Es werden weder Produktiv-Datenbank noch Google-Drive-Inhalte verändert.
## Synthetic PostgreSQL restoration and retention dry-run

The existing `Drive Backup Encryption Test` workflow now executes a **synthetic-only** recovery test:

```bash
# GitHub-hosted Ubuntu runner with PostgreSQL, sudo and age installed
bash scripts/platform/backup-synthetic-restore-test.sh
node --test scripts/platform/backup-retention.test.mjs
```

The test creates two disposable **local** PostgreSQL databases over the Ubuntu Unix socket at `/var/run/postgresql:5432`, exports synthetic rows via `pg_dump`, encrypts the SQL using the existing `drive-encrypt.sh`, removes the original SQL export, decrypts and validates SHA-256, and restores into the second database. Local-only connection arguments and ephemeral synthetic keys are enforced. Cleanup removes both test databases and temporary data. **No Supabase connection, customer data, remote storage, Drive token or production restore is used.** This is a schema/row roundtrip smoke test, not comprehensive Supabase Auth/Storage/Vault disaster recovery.

The pure `scripts/platform/backup-retention.mjs` policy is a **non-destructive plan only**: default 30-day window, preserve at least seven newest verified archives, stop when there is no verified archive from the last 48 hours, and stop on malformed or non-matching SHA-256. The `readbackSha256` supplied to any future caller **must** be calculated independently from the actual re-downloaded encrypted blob, never copied from upload metadata or an API receipt. The planner has no Drive delete or network capability; an automated deletion job is neither configured nor authorized by these tests.

**Still blocked / NOT_PROVEN:** An actual Supabase SQL export requires a separately protected PostgreSQL dump connection; automated Google Drive uploads require a dedicated, Owner-authorized Google OAuth writer independent of ChatGPT's Drive connector. Production upload, remote ciphertext retrieval/hash verification, retention deletion, test of physical Render mount permissions, full disaster restore and measured RTO/RPO have not been performed. Do not put a production DB URI, OAuth refresh token, age identity or plaintext dump into GitHub logs, repository or workflow artifacts.

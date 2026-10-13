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
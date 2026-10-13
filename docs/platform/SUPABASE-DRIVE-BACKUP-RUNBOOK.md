# CAPITAL-AI – verschlüsseltes Supabase-Backup nach Google Drive

Stand: 2026-10-13; Status: **STAGED, NOT ACTIVE**. Dieser Branch wird nicht nach `main` gemergt, bis Datenbankzugang, Google-OAuth-Schreibzugang, Quoten und echter Restore verifiziert wurden. Keine private Recovery-Identity im Repository, GitHub Secrets, Google Drive oder Chat ablegen.

## Ziel

Vorhandener privater Ordner: `CAPITAL-AI / PLATFORM / CAPITAL-AI Supabase Backups`. Die Drive-Ordner-ID ist private Owner-Konfiguration und gehört nicht in das öffentliche Repository.

Kette: **GitHub Actions (nur main)** → **Supabase CLI: roles/schema/data** → **tar + SHA-256-Manifest** → **age (öffentlicher Empfänger)** → **rclone Google Drive** → **Download des Chiffrats und Bytevergleich**. Der private Recovery-Schlüssel verbleibt ausschließlich beim Owner auf Android und in seiner sicheren Offline-Zweitkopie.

Der Uploadtest verifiziert nur verschlüsselte Bytes; für DATABASE_RESTORE_VERIFIED ist ein zusätzlicher echter isolierter Restore nötig.

## 👋⚙️ Google-OAuth einrichten (persönliches My Drive)

Google Service Accounts können keine Dateien in einem persönlichen `My Drive` besitzen; die vorhandene GA4-/GSC-OIDC-Service-Identität ist kein Backup-Uploader. Der bestehende ChatGPT-Drive-Connector stellt GitHub keine OAuth-Credentials zur Verfügung.

**Empfohlen:** Ein dediziertes Backup-Google-Konto erhält *Editor* nur auf dem Zielordner; ein separater Google-Cloud-OAuth-Desktop-Client im dafür verwalteten Projekt wird mit Google Drive API autorisiert. Für einen bereits vorhandenen Ordner benötigt rclone in dieser Variante den OAuth-Scope `drive`; die Berechtigungsbegrenzung erfolgt daher über das separate Google-Konto. `root_folder_id` ist eine technische Zielvorgabe, **keine** Sicherheitsgrenze. Vor einer produktiven Ausführung den Zugriff durch `rclone lsf` und den gezielten Upload einer verschlüsselten synthetischen Datei prüfen.

Google Cloud Console: https://console.cloud.google.com/apis/credentials

Auf Android in Acode Alpine: `apk add rclone`; danach `rclone config` und den Desktop-OAuth-Client mit dem separaten Backup-Konto autorisieren. Wenn die Browserweiterleitung im Android-/Alpine-Terminal nicht funktioniert, zunächst den lokalen OAuth-Autorisierungsablauf reparieren; **keinen** Token in Chat, Issue, Git-Datei oder Screenshots posten. Google OAuth-Projekte im externen Status `Testing` vergeben üblicherweise nur sieben Tage gültige Refresh-Tokens. Eine dauerhafte Autorisierung benötigt passende Veröffentlichungs-/Verifizierungsbedingungen von Google.

## 👋⚙️ Geschützte GitHub-Einstellungen

URL: https://github.com/SvenKulessa/Capital-AI/settings/secrets/actions

| Typ | Name | Wert |
| --- | --- | --- |
| Repository variable | `CAPITAL_BACKUP_AGE_RECIPIENT` | Bereits hinterlegter und getesteter öffentlicher `age1...`-Empfänger |
| Repository variable | `CAPITAL_BACKUP_DRIVE_FOLDER_ID` | Die private ID des bereits bestehenden Backup-Zielordners (nur in GitHub Variables hinterlegen) |
| Repository secret | `CAPITAL_BACKUP_SUPABASE_DB_URL` | Ausschließlich gültige PostgreSQL-Session-Pooler- oder Direktverbindungsadresse mit sicher hinterlegtem Passwort |
| Repository secret | `CAPITAL_BACKUP_GOOGLE_CLIENT_ID` | ID des separaten Google-Desktop-OAuth-Clients |
| Repository secret | `CAPITAL_BACKUP_GOOGLE_CLIENT_SECRET` | Secret dieses Google-OAuth-Clients |
| Repository secret | `CAPITAL_BACKUP_GOOGLE_OAUTH_TOKEN` | Das von `rclone config` generierte OAuth-Token-JSON, inklusive Refresh-Token |

**NIEMALS** ein privates `age`-Recovery-Identity-File, Supabase-Service-Role-Key oder OAuth-Refresh-Token in `vars`, ein Repository-File, ein PR oder die Chat-Unterhaltung übertragen.

## Ausführung und Tests

Der vorbereitete GitHub-Workflow ist `.github/workflows/supabase-drive-backup.yml`. Er wird erst nach Merge in `main` über `workflow_dispatch` oder täglich um **05:17 UTC** ausführbar. Er bricht bei fehlenden Einstellungen **vor** Checkout und Installation ab. Die Geheimnisse sind nur im Check und im Export-/Upload-Schritt verfügbar und werden nicht an Drittanbieter-Setup-Actions vererbt.

Mock-Test ohne Netzwerkzugriff:

```bash
bash -n scripts/platform/supabase-drive-backup.sh
bash scripts/platform/supabase-drive-backup.test.sh
```

Ein Mock ist kein Live-Test. Nach Freigabe einmal manuell starten und danach prüfen: Workflow erfolgreich, privater Zielordner enthält genau ein neues `.tar.age`-Archiv, Chiffrat-Download bytegleich, Datei auf Android mit **privatem Owner-Schlüssel** entschlüsselbar, tar-Manifest gültig. Für echten isolierten Restore PostgreSQL 17 verwenden und Rollen, Funktionen, Daten, Auth/Storage-Metadaten und Anwendungs-Entitlements validieren.

**Nicht im Standard-SQL-Dump:** Storage-Objektbytes, Edge-Function-Code, Auth-Provider-Einstellungen, Render- und Google-Cloud-Secrets, Vault/Encryption Root Key, sonstige Runtime-Konfiguration. Diese Komponenten separat sichern und separat testen.

## Kosten, Risiken, Rollback

- Kein kostenpflichtiger Dienst wurde hinzugefügt. GitHub-Actions-Minuten, Google-Drive-Speicher, Supabase-Egress und GCP-OAuth-Nutzungsgrenzen bleiben **USAGE/COST_NOT_PROVEN**.
- Der Workflow löscht **keine** bisherigen Backups. Retention und Drive-Quota müssen vor Dauerbetrieb geklärt werden.
- OAuth-Scope `drive` ist bewusst weitreichend; darum getrenntes Backup-Konto und ausschließlich gezielte Ordnerberechtigung verwenden.
- Rollback: Noch **kein** Workflow auf `main`. Nach Aktivierung Workflow deaktivieren und OAuth-Token widerrufen; archivierte `.age`-Daten bleiben ohne privaten Recovery-Schlüssel unlesbar. Keine Datenbank-Mutation durch Backup-Workflow.

Quellen: https://supabase.com/docs/guides/deployment/ci/backups, https://developers.google.com/workspace/drive/api/guides/about-shareddrives, https://rclone.org/drive/, https://developers.google.com/identity/protocols/oauth2.

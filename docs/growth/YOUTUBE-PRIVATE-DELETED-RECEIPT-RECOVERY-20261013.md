# CAPITAL-AI-GROWTH — Privater YouTube-Test: gelöschten Beleg archivieren

Stand: 2026-10-13. Scope: `capital-ai-growth/youtube-private-receipt-recovery-20261013`.

## Vorfall und Evidence

Der einzige registrierte private Upload-Beleg wurde am 2026-10-13 10:36:51 UTC
als `VERIFIED_PRIVATE` bestätigt. Der Human Owner hat ausdrücklich angegeben,
dass er das ursprüngliche Video **nur in YouTube** gelöscht hat.
Der neue `private_readback_mismatch` entsteht bei einem erneuten
`videos.list(part=snippet,status)`-Readback, der nicht mehr die exakte
Video-ID, den Kanal und den Status `private` liefert.

Die Account-Verbindung und OAuth-Secrets werden **nicht** zurückgesetzt.
Die bestätigte Provider-Löschung ist eine **Owner-Aussage**, kein
separater Provider-Löschungsnachweis; der Recovery-Beleg ist entsprechend
mit `provider_deletion_verified=false` gekennzeichnet.

## Speicherentscheidung

Die bisherige `youtube_private_upload_jobs`-Zeile ist **nur Metadaten**,
keine Videodatei. Die neue `youtube_private_upload_archive` speichert genau
die historische Upload-Receipt inklusive ursprünglicher Werte,
ausdrücklichem Archivierungsgrund und Zeitstempel. Speicherbedarf
einige Kilobyte pro Vorgang (Schätzung, keine gemessene Livegröße);
die bestehenden Supabase-Postgres-Ressourcen werden wiederverwendet.
Kein neues Dropbox-, Drive-, Objekt-Speicher- oder kostenpflichtiges
Datenbank-Konto und keine neue OAuth-Berechtigung erforderlich.

Google Drive/Dropbox wären nur für die eigentlichen MP4-/Quellmedien
sinnvoll; darüber würde der transaktionale DB-Abgleich zwischen
archiviertem und erneut freigegebenem Auftrag nicht automatisch korrekt.

## Kontrollierte Operation

1. Human Owner bestätigt die exakte externe Video-ID, den Zielkanal,
   die Löschung in YouTube sowie den Wunsch nach Neuupload.
2. Migration `20261013105500_youtube_private_deleted_receipt_recovery.sql`
   nach grünem PR-Gate ausrollen.
3. **Ein einziges Mal** service_role-only
   `capital_youtube_archive_deleted_private_test(owner_uuid, channel_id,
   asset_sha256, old_video_id)` ausführen. Alle vier Werte werden
   gegen die vorhandene `VERIFIED_PRIVATE`-Zeile und das verbundene
   YouTube-Konto geprüft. Die DB-Transaktion sperrt diese Zeile,
   archiviert das vollständige ursprüngliche Receipt und entfernt
   ausschließlich den zutreffenden aktiven Auftrag.
4. Danach archivierten Beleg und fehlenden **genau einen** aktiven
   Auftrag read-only nachweisen; alle übrigen Upload-Jobs
   bleiben unverändert.
5. Erst jetzt kann der Owner über
   `/api/social-media/youtube/private-test` das geprüfte Original
   `Capital-AI-Short-01-ohlc.mp4` selbst **einmalig privat** hochladen.
   Der SHA-256-Fingerprint im bestehenden Backend muss passen.
6. Anschließend `/api/social-media/youtube/private-test/status`
   aus authentifizierter Owner-Sitzung prüfen. Nur bei exakt übereinstimmender
   Video-ID, Kanal-ID und `privacyStatus=private` ist das
   **neue** Receipt `VERIFIED_PRIVATE`.

Bei einer unklaren oder ambigen YouTube-Antwort **niemals**
automatisch ein zweites Video anlegen. Bei fehlender
Providerberechtigung oder Provider-Quota kein Upload starten.

## Sicherheit, Kosten und Rollback

- Kein anonymer oder `authenticated` Zugriff auf Archiv oder
  Service-RPC; kein Browser-Reset-Endpunkt, keine automatische
  Berechtigungseskalation.
- Transaktionale `INSERT archive + DELETE active` auf einer einzigen
  vorher exakt geprüften, `FOR UPDATE` gesperrten Zeile;
  fehlende/abweichende Zeilen und Replay werden abgewiesen.
- Das Archiv ist historisch und keine Provider-Bestätigung der Löschung.
  RLS aktiv; User-Löschung entfernt das Archiv über User-FK-Cascade.
- Provider-Readback und privater Neuupload können YouTube-API-Quota
  verbrauchen. Konkrete verfügbare Quote und mögliche Kosten:
  `NOT_PROVEN`; es gibt keine automatische neue API-Aktion.
- Rücknahme: Archiv enthält Originalzeile und Metadaten.
  DB-Restore nur nach zusätzlicher Prüfung, ob inzwischen ein neues
  Receipt existiert; niemals blind zwei aktive Jobs herstellen.
- Die ursprünglichen Funktionstests bleiben erhalten.
  Der zusätzliche PG17-Contract prüft Rechte, genaue Identität,
  Replay/Fehlzuordnung, Archivintegrität und neuen Claim
  auf isolierten Testdaten.

## Abnahmekriterien

- Migrationsskript PG17 PASS und Docker Security Gate / Domain Governance
  für exakten PR-Head PASS.
- Produktive SQL-Funktions-ACL geprüft, erwartete einzelne
  `VERIFIED_PRIVATE`-Zeile archiviert und deren aktive
  Sperrzeile entfernt.
- Owner-seitiger Neuupload und neuer YouTube-Readback
  separat als `NOT_PROVEN`, bis tatsächlich durchgeführt.

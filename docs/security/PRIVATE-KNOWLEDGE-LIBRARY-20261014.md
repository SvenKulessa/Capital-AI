# CAPITAL-AI — Private Architektur- und Social-Wissensbibliothek

Stand: 2026-10-14. Authority: AGENTS.md / SOLO_MAINTAINER_FLOW@1. Domain TRUST, gemeinsam mit PRODUCT, PLATFORM und GROWTH.

## Kontogebundener, einfacher Kunden-Download

Der vorhandene GET /api/billing/blueprints/download/<SKU> bleibt der empfohlene freigeschaltete Link. Der Kunde sieht ihn erst nach nachgewiesenem Kaufrecht. Die Website validiert bei JEDEM Aufruf die Supabase-Session, das aktuelle SKU-Entitlement und den SHA-256 des Artefakts. Kein zeitloser, anonym teilbarer Geheimes-URL-Token ist nötig. Kunden-Downloads und internes KI-Wissen teilen keine AuthZ-Berechtigungen.

Optionaler späterer Versand an Käufer ohne bestehende Session: kurzlebige, kryptografisch zufällige, atomar einmalig konsumierbare Token; an Käufer/SKU/Version, TTL, Rate-Limit und Widerruf gebunden. NICHT_IMPLEMENTED. Kein ungeprüfter permanent freier Link.

## Vier getrennte private Dokumentarten

| Slot | Zweck | Zugriffsgrenze |
|---|---|---|
| architecture-glossary | Architekturbegriffe und Trust Boundaries | Owner, perspektivisch eng berechtigter KI-Read-only-Job |
| single-maintainer-agent | Agenten-/Skills-/QA-Architektur nach SOLO_MAINTAINER_FLOW@1 | Owner, perspektivisch spezialisierter KI-Job |
| mobile-architecture | Architektur für das eigenständige Mobile-Repository | Owner; keine Mobile-App im Web-Repo |
| social-blog-playbook | DRAFT-Vorlagen für Website/Blog, X, Pinterest, Reddit, Facebook und künftige Kanäle | Owner, erst nach Freigabe ausgewählte öffentliche Textausschnitte |

Die vier ausgearbeiteten Markdown-Originaldateien werden bewusst NICHT in Git committed. Das Owner-Importpaket wird getrennt mit SHA-256-Manifest bereitgestellt. Es ist ein vorbereitetes Importartefakt und NICHT bereits auf der Render-Disk nachgewiesen.

## Datenfluss

Owner IAM und verifizierte Konto-E-Mail -> /api/private/knowledge/verify und /import -> AES-256-GCM -> /var/data/capital-ai-private-knowledge -> /backup -> ausschließlich verschlüsselter Google Drive Backup-Ordner.

Bestehender Customer-Entitlement-Download bleibt ausschließlich bei den Blueprint-SKUs; es gibt keine öffentliche Knowledge-Bibliothek und keine geteilten Customer-/Owner-Rechte. Die bestehende private Blueprint-Disk bleibt davon getrennt.

## Speicherung und kryptografische Grenzen

- Wiederverwendung der Owner-provisionierten 5-GB-Disk unter /var/data; neues, separates Verzeichnis mit Mode 0700; Dateien 0600.
- AES-256-GCM mit unabhängiger HKDF-Domain-Ableitung aus dem bereits definierten serverseitigen BLUEPRINT_DISK_ENCRYPTION_KEY. Kein Schlüsselwert in Git, Drive, Chat, API-Ausgaben, Containerschicht oder Logs.
- Whitelist mit vier Slot-Namen, SemVer, 512-KiB-Limit je UTF-8-Markdown-Dokument und unveränderlichem atomarem Create. Keine beliebigen Pfade, keine Symlinks, kein Überschreiben.
- Verschlüsselte .caikb-Dateien mit AES-GCM Auth-Tag, SHA-256, Slot-/Version-AAD. Ciphertext-Backup und Restore prüfen Identität und Integrität.
- API prüft bestehenden verifizierten Owner-Login auf allen Routen; Schreib-/Restore-Operationen verlangen zusätzlich Same-Origin. Keine anonymen Endpunkte.

## Verifizierbare API

- GET /api/private/knowledge/verify: Owner, Schlüssel-/Write-Status. Schreibprobe beweist noch keine Persistenz über Deployment.
- GET /api/private/knowledge/inventory: Owner, vollständige nur lesbare Dokument-Metadaten.
- POST /api/private/knowledge/import/{slot}/{semver}: Owner, Markdown, SHA-256-Header.
- GET /api/private/knowledge/file/{slot}/{semver}: Owner, Markdown-Attachment, private no-store.
- GET /api/private/knowledge/backup/{slot}/{semver}: Owner, verschlüsseltes Binär-Attachment, Cipher-SHA.
- POST /api/private/knowledge/restore/{slot}/{semver}: Owner, Ciphertext + erwarteter Original-SHA, atomar ohne Überschreiben.
- UI: /studio?tab=blueprints -> Founder · Private Architektur- und Content-Bibliothek.

## Drive Backup

Der private Google-Drive-Ordner ARCHITECTURE-KNOWLEDGE-ENCRYPTED wurde unter CAPITAL-AI/PRIVATE-BACKUPS erstellt. Folder ID: 1TtgbwQvSxJd6vOwWfJEaMgcPZ9bLfAWF. Er ist ein Ziel für .caikb-Ciphertext und ein separates Minimalmanifest (Slot, Version, Original-SHA, Cipher-SHA). NIEMALS Markdown-Klartext/Schlüssel in die Cloud hochladen. ChatGPT Drive Connector ist NICHT die Runtime-Identität des Render-Webservices. Automatischer Drive-Upload und Cloud-Restore sind NICHT_IMPLEMENTED; nachweisbar erst nach unabhängiger Übertragung und Hash-/Restore-Readback.

## Autonome KI und Social Publisher

Read-only KI-Zugriff ist NICHT_IMPLEMENTED: erfordert kurzlebige Workload-Identität (Audience, Scope, Actor, Dokumentklasse, Zeitfenster, maxBytes, Tenant), keine Weitergabe von Owner-Cookies oder Service-Role-Keys. Dokumentinhalte werden als untrusted Data/Prompt-Injection-Quelle behandelt; aktuelle Repository-Governance ist vorrangig. Agenten dürfen ohne spezifisches Jobrecht weder private Inhalte lesen noch Publikationsrechte erlangen.

Content Engine erhält nach separatem Public-Claims- und Rechtecheck nur explizit publizierbare Faktenkarten/Drafts. X, Pinterest, Reddit, Facebook und neue Kanäle haben jeweils eigene Account-/Community-/Werbe-/Marken-/Bild-/Providerregeln. Kein automatisches Publishing, kein Astroturfing, keine unbelegten Produktions- oder Finanzclaims.

## Nachweise, Kosten und Owner-Schritt

Test: node --test server/private-knowledge-vault.test.mjs. Bestehende Required Checks Docker Security Gate und Domain Governance am exakten Head, keine neuen Gates. Separat: User-/Tenant-Negativtests, Verschlüsselungs-/Manipulations-/Restore-Test. Render disk-write unter UID1000, Persistenz über Restart, vier tatsächliche Uploads und Drive-Ciphertext-Roundtrip bleiben NOT_PROVEN bis Live-Evidence.

Der bestehende Disk-Tarif wird nicht verändert, neue Render-Dienste werden nicht aktiviert. Drive-Quota/Transfer und künftig API-Kosten bleiben NOT_PROVEN.

👋⚙️ Owner: Falls noch nicht konfiguriert, serverseitigen 32-Byte/64-Hex BLUEPRINT_DISK_ENCRYPTION_KEY ausschließlich im Render-Environment setzen und den Recovery-Key unabhängig offline sichern. Nach erfolgreichem Owner-Login die vier Markdown-Dateien aus dem privaten Importpaket in die vier Slot-Arten mit Version 1.0.0 importieren. Prüfnachweise/Hashes exportieren, dann ausschließlich .caikb nach Drive.

Rollback: GitHub-PR revertieren, vorhandene encrypted Disk-Objekte und Schlüssel/Originale unverändert belassen; gekaufte Entitlements und frühere Blueprint-Backups bleiben unberührt.

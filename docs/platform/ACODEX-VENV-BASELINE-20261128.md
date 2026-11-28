# Bestehende AcodeX-Python-venv

Stand: 2026-11-28 (Europe/Berlin). Repository-Basis: `a8386552b2cac583bcdc90e5316c22f782524143`.

## Bestand und Wiederverwendung

| Merkmal | Dokumentierter Bestand |
| --- | --- |
| Umgebung | `/public/.local/share/capital-ai-oci-readonly/venv` |
| Interpreter | `/public/.local/share/capital-ai-oci-readonly/venv/bin/python` |
| Kontext | `sys.prefix != sys.base_prefix`, erwarteter venv-Pfad bestätigt |
| Isolation | `include-system-site-packages = false` bestätigt |
| Aufruf | Bestehenden Interpreter explizit mit `-I -B` verwenden |
| Verwendung | Bestehende OCI-/Python-Werkzeuge; GA4-Prüfhelfer mit dieser venv aufgerufen |
| Persistenz | Bestehende lokale Umgebung wiederverwenden; Wiederanlauf nach Geräte-/Terminalneustart in dieser Evidence nicht separat geprüft |

Vor weiteren Installationen den Bestand und die bestehende PIP-Policy prüfen. Fehlende System-Python-Imports belegen nicht, dass das Paket in dieser venv fehlt. Kein automatisches `apk add`, globales PIP-Installieren, Policy-Override oder Anlegen einer zweiten venv allein wegen eines fehlenden Imports im System-Python. Keine neue Policy-Autorität: maßgeblich bleibt [AGENTS.md](../../AGENTS.md).

Eine venv isoliert Python-Abhängigkeiten; sie ist keine Betriebssystem-Sandbox und kein Beleg für Schutz gegen andere Prozesse mit denselben Rechten. Schlüssel bleiben außerhalb von Shared, Repository und Chat. Interaktive Anmeldung, Schlüsselpfad-Eingabe und Secret-Übernahme ohne ACOPY; nur bereinigte Diagnosen erfassen.

## Herkunft und geprüfter Paketstand

Quelle: vom Owner in diesem GA4-/AcodeX-Chat bereitgestellte Geräteausgaben vom 2026-11-28. Kein unabhängiger Fernzugriff auf Android; Datum ohne erfundene Uhrzeit, Device-Attestation oder GitHub-CI-Run-ID. Skriptprüfsummen wurden zusätzlich gegen die gespeicherten/Drive-Originale abgeglichen; Offline-Selftests sind getrennte Code-Evidence.

| Nachweis | Status und begrenzte Aussage |
| --- | --- |
| `VENV_CONTEXT`, `VENV_ISOLATION` | `VERIFIED` im Owner-Readback |
| `cryptography 50.0.2`, `cffi 2.1.1`, `pycparser 3.12` | Installation in bestehender venv, Binär-Wheels; Import anschließend `VERIFIED` |
| `certifi` | Nur venv betroffen: `2026.7.22` durch `2026.11.20` ersetzt |
| Certifi-Wheel | `CERTIFI_WHEEL_SHA256=VERIFIED` vor Installation; Reparaturskript verwendet Versions-/Hash-Pin |
| System-Certifi | `CERTIFI_SYSTEM_COUNT=0`, kein betroffener System-Certifi-Stand gefunden |
| Paketkonsistenz | `PIP_CHECK=PASS`; bei Certifi-Reparatur `OTHER_PACKAGES=UNCHANGED` |
| Integrität | Bootstrap, Session v2, Baseline, rclone, rm, startup, Drive-Pull, Shared Guard und PIP-Policy im letzten Scan bestätigt; Pins vor/nach Scan unverändert |
| TLS | Expliziter lokaler Kontext mit Zertifikats-/Hostnamenprüfung und CA-Store `VERIFIED`; kein Live-Handshake-/Gesamtsitzungsnachweis |

## Letzter vollständiger begrenzter Scan

Ausgeführt über vorhandenen `2026-11-28_TRUST_CHATGPT_ACODEX_NPM_CONFIG_REPAIR_v4.py --scan`, nach Certifi-Reparatur:

```text
DAILY_SCAN_MODE=FRESH
DAILY_SECURITY_RESULT=LIMITED_NO_REPORTED_FINDINGS
DAILY_ORIGINAL_PINS=VERIFIED
NPM_VERSION_VALUE=11.12.1
NPM_INVENTORY_SOURCE=GLOBAL_LS_PLUS_SYSTEM_PREFIX
NPM_INVENTORY=VERIFIED
ALPINE_CANDIDATES=0
OSV_ADVISORIES=0
OSV_QUERIES=14
OSV_SKIPPED=33
PACKAGE_UPDATES=NONE
SCHEDULER=UNCHANGED
ACOPY_COMMAND_EXIT=0
```

`OSV_SKIPPED=33` bedeutet nicht durch diesen OSV-Allowlist-Abgleich bewertet. `LIMITED_NO_REPORTED_FINDINGS` ist keine pauschale Schwachstellenfreiheit oder vollständige Härtungsabnahme. Vorherige Certifi-Advisories `GHSA-6q48-6c7w-9gw2` und `PYSEC-2026-4320` sind Aliase desselben Problems; historischen Befund erhalten.

## Umgebungsvariablen und offene Grenzen

- `SSLKEYLOGFILE`, `LD_PRELOAD`, `PYTHONPATH`, `PYTHONHOME`, `OPENSSL_CONF`, `BASH_ENV`, `ENV` waren im bereinigten Readback ungesetzt.
- `NODE_OPTIONS` wurde als Speicherlimit eingeordnet; daraus folgt keine weitere Sicherheitsbehauptung.
- `LD_LIBRARY_PATH` zeigte auf das Acode-App-Verzeichnis `/data/user/0/com.foxdebug.acode/files`: absolut, Verzeichnis, Modus `0771`, kein direkter Symlink. Direkter Elternordner `0700`; weiter oben wurde ein Symlink gemeldet. Die im Terminal sichtbaren UID/GID-Werte belegen keine Android-Root-Rechte oder globale Android-IAM-/SELinux-Isolation.
- Gruppenmitgliedschaft, reale Android-Zugriffsrechte und effektive Schreibbarkeit durch andere Prozesse: `NOT_PROVEN`. Das gruppenbeschreibbare App-Verzeichnis nicht pauschal umchmoden oder die Variable global entfernen; zuerst den tatsächlichen App-/Loader-Kontext prüfen.
- Historischer OCI-Lock enthält weiterhin `certifi==2026.7.22`: `HISTORIC_LOCK=UNCHANGED_MIGRATION_REQUIRED`. Vor Wiederaufbau einen korrigierten Nachfolger mit Resolver-/Hash-/Importprüfung erstellen; historischen Lock nicht als aktuellen sicheren Installationsstand ausgeben. Diese Dokumentation migriert den Lock nicht.
- Neustart-/Recovery-Readback der venv, vollständige OS-/App-Härtung sowie GA4-Schlüsselzuordnung, Sieben-Tage-Bericht und geschützter Render-Provider-Readback bleiben separat `NOT_PROVEN`.

## Nachvollziehbare Prüfquellen

| Bestehendes Shared-Artefakt | SHA-256 |
| --- | --- |
| `2026-11-28_TRUST_CHATGPT_ACODEX_NPM_CONFIG_REPAIR_v4.py` | `98dd1a28393392772976f02b8e16190433033cb04fb826fa184eeb367b0a776a` |
| `2026-11-28_TRUST_CHATGPT_ACODEX_CERTIFI_CONTEXT_v1.py` | `312b7ba014a95e77954e6bb5ffe5a62f6d255a0d5db1f03916baf2bdd54857fa` |
| `2026-11-28_TRUST_CHATGPT_ACODEX_CERTIFI_REPAIR_v1.py` | `993c67893973852ca2399f028f14131da822dc7d25383ba539bdc5df5d5a8c5a` |
| `2026-11-27_PLATFORM_CHATGPT_GA4_KEY_READBACK_v1.py` | `be4809d5541de7ae6059cd929d16840eaa2fed61cc9b8c18eaf6e781dd0ea172` |

Betriebskontext ergänzend: [AcodeX Recovery](ACODEX-RECOVERY-20261125.md). Eine spätere Paketänderung oder ein Wiederaufbau benötigt neue passende Laufzeit-Evidence; dieser Stand ist eine datierte Bestandsaufnahme. Kein neuer Scheduler, Sync, Required Check, Paketinstallationsschritt oder Deployment durch diese Dokumentation.

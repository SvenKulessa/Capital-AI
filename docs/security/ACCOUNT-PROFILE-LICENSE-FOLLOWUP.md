# Kontoausbau und offene Herkunftsnachweise

Stand: 2026-09-30. Geprüfter Capital-AI-Main: `3cb6717216dedcf93b6c55625dde81dc987d7814`.
Finance-Referenz: `dcef421fe6e350a3a2ade61d0299aad9ecca213c`.
Dies ist ein Abgleich und eine Umsetzungsspezifikation. Die nachstehenden Kontofunktionen sind damit noch nicht implementiert oder live abgenommen.

## Main und parallele Arbeit

PR #53 (npm/Broker/Scan-Evidenz) ist in Main enthalten. Bei der erneuten Prüfung gab es nur Main und keine offenen PRs. Vor jeder Implementierung erneut Branches und PRs vergleichen. Build-, Broker- und Scan-Änderungen nicht als Teil des Kontoausbaus duplizieren.

## Finance-Abgleich und Zielverhalten

| Funktion | Finance-Code als Referenz | Neues Ziel |
|---|---|---|
| Eigene Profilseite | src/components/ProfilePage.tsx | Authentifizierte Route /profile; Profil nur für den verifizierten OIDC-Subject |
| Profilbild | POST/DELETE /api/auth/profile/avatar, PNG/JPG/WebP, UI-Limit 2 MB | Upload, serverseitige Größen-/Formatprüfung, Bilddekodierung, sichere Ausgabe, Austausch/Löschung; dauerhafter Speicher |
| Angaben | Name, Benutzername, Telefon, Favoriten, Assetklasse, Risiko, Kapital, Anlagehorizont, Erfahrung, Währung | Servervalidierte Felder; E-Mail-Verifizierung und MFA-Zustand aus ZITADEL |
| Abo-Badge | src/features/public/ui/SubscriptionStatusBadge.tsx | Nach Login im Header und Profil; Tier aus verifiziertem Billing-/Entitlement-Readback |
| Passkey | src/components/SecuritySettingsPanel.tsx | Einrichtung und eigenständige Anmeldung ohne Passwort über ZITADEL; echten Login prüfen |
| Passwort | Sicherheitsseite fordert Reset-Mail an | Passwort vergessen öffentlich, eigene Passwortänderung nach erneuter Authentifizierung |
| TOTP | Enrollment mit QR/Secret und Codeprüfung | Einrichtung erst nach erfolgreicher Codeprüfung als aktiv anzeigen; Entfernen nach Reauthentifizierung |
| Telefon | Telefon speichern, Challenge und Codeprüfung | Nummer im E.164-Format; Verifizierung plus separate SMS-OTP-Aktivierung |

Finance ist die Funktions-/Gestaltungsreferenz. Sein alter Authentifizierungs- und Speichercode darf nicht ungeprüft an die neue ZITADEL-Identität angeschlossen werden. Gleiche E-Mail-Adressen beweisen keine Identitätskontinuität zwischen alter und neuer Anwendung.

Im neuen Main sind /api/auth/login, callback, session und logout vorhanden. LoginPage zeigt Session/Name, aber kein Profil, keinen Abo-Readback und keine Sicherheitsverwaltung. Ein UI aus Finance belegt allein noch keine funktionierende neue Backend-Anbindung.

### Persistenz und Abonnement

Profildaten über (issuer, subject) autorisieren. Fremde Subject-/User-ID im Request darf den Eigentümer nicht bestimmen. Abonnement, phoneVerified und emailVerified sind keine frei schreibbaren Profilfelder. Clientseitig gesendete Tiers dürfen keine Rechte freischalten.

Die aktuelle Session ist prozesslokal. Ein lokales Render-Verzeichnis oder localStorage erfüllt die geforderte dauerhafte, kontogebundene Speicherung nicht. Vor Implementierung den vorhandenen Profilspeicher, Bildspeicher und die maßgebliche Billing-/Abo-Quelle feststellen. Bei unbekanntem Billingzustand „Abonnement wird geprüft“/Fehlerzustand anzeigen; nicht automatisch ein bezahltes oder Free-Abonnement behaupten.

### ZITADEL, IONOS und Sicherheit

ZITADEL bleibt der Identitätsanbieter für Passwort, Passkeys, Mail-Verifizierung und MFA. Seine Self-Service-Funktionen und APIs sind die Integrationsbasis. Secrets/TOTP-Schlüssel/SMTP-Zugangsdaten niemals in das öffentliche Repository schreiben.

Offizielle Referenzen:
- https://zitadel.com/docs/concepts/features/selfservice
- https://zitadel.com/docs/guides/manage/console/default-settings
- https://zitadel.com/docs/guides/integrate/login/hosted-login

ZITADEL unterstützt passwortlose Passkeys, Passwortänderung, TOTP sowie Telefonverifizierung/SMS-OTP. Für SMS ist ein eingerichteter Versandprovider erforderlich; eine gespeicherte Nummer ist kein aktivierter zweiter Faktor.
Passkeys sind an die Anmeldedomain gebunden. Anwendungshost und ZITADEL-Anmeldedomain getrennt behandeln. Vor Enrollment festlegen, ob die bestehende ZITADEL-Domain bleibt oder eine eigene Login-Domain eingeführt wird; nach Domainänderung Registrierung und Anmeldung erneut prüfen.

Für Registrierung/Verifikation und Passwort-Rücksetzung den eigenen IONOS-SMTP-Provider in ZITADEL konfigurieren und aktivieren. Absenderadresse ist noch zu bestätigen. Zugangsdaten ausschließlich im vorgesehenen Secret-Feld. Logo, Hintergrund #02050e, helle Schrift und bestehende Amber-Akzentfarbe sowie deutsche Mailtexte an die Website angleichen. Test: tatsächliche Zustellung, sichtbarer Absender, SPF/DKIM/DMARC, gültiger einmaliger Link, Ablauf und Rückkehr zur richtigen Website. Der dokumentierte ZITADEL-Cloud-Custom-Domain-Schritt ist bei SMTP-Konfiguration zu berücksichtigen.

### Abnahme

1. Passkey einrichten, abmelden und ausschließlich mit Passkey anmelden; ungültige/abgelaufene Challenge ablehnen.
2. Profil und Bild speichern; nach erneutem Login und Dienstneustart unverändert lesen. Konto B darf Konto A weder lesen noch überschreiben.
3. Abo-Badge entspricht dem Backend-Readback; Manipulation eines Profil-/Browser-Tiers ändert keine Rechte.
4. Registrierungs-/Reset-Mail echt zustellen; Token nicht wiederverwenden. Passwort ändern und mit dem neuen Passwort anmelden.
5. TOTP erst nach Codeprüfung aktiv; falsche Codes ablehnen. Telefonnummer verifizieren und SMS-OTP separat testen.
6. Direkte Profil-URL ohne Session zeigt Anmeldung, API liefert 401; fehlende Persistenz meldet einen Fehler statt erfolgreichen Speicherns.

## Assets: vorhandene Nachweise und präzise Lücken

Der Eigentümer bestätigt, dass Bilder Lizenzinformationen besitzen. Das ist berücksichtigt. Die folgende Liste bezeichnet fehlende oder unvollständige **Repository-Evidenz**, nicht eine Feststellung fehlender Rechte.

### Logo-Asset-Pack

public/branding/capital-ai-logo.jpg und die Ableitungen unter public/branding/asset-pack sind durch docs/licenses/Capital-AI-BRANDING.md sowie Pack-Provenance und Manifest beschrieben. Source-SHA-256: 6244629091073823b4cff86908adb0403a217779219bfb44883bd956548243e3. Projektverwendung ist dokumentiert; eine allgemeine Drittlizenz ist dafür nicht erforderlich.

Das bereitgestellte Manifest zählt 66 Einträge, das Repository-Manifest 67 einschließlich Metadaten. Sie sind nicht identisch: 57 gemeinsame Hashes stimmen überein; acht gemeinsame Pfade unterscheiden sich. Das gelieferte Preview fehlt im Repository; README und generation-environment sind zusätzliche Repository-Einträge. Das ist eine Versions-/Zuordnungsfrage, kein Beleg für fehlende Bildrechte. Für den Repo-Stand dessen Manifest verwenden.

### Noch zu ergänzen

| Betroffen | Im Repository vorhanden | Fehlende Ergänzung |
|---|---|---|
| src/assets/images/glowing_earth_nodes_1789997454893.jpg | Eigentümer-Herkunftsbestätigung: Finance-Social-Media-Engine, durch Gemini eingebettet; Hash aae548443cb6ec1be4c7d9f9389c52cc1e01b28df28fbc4e985750dd424bb671 | Verweis auf die bereits vorhandene Lizenzinfo für genau diesen Hash; Erstellungsartefakt/Datum, tatsächliches Generierungswerkzeug/Modell und gegebenenfalls Tarif/maßgebliche Nutzungsbedingungen. Einbettung durch Gemini allein bestimmt nicht den Urheber-/Generierungsdienst. |
| src/components/AssetLogo.tsx | Inline-Zeichnungen und Symbolzuordnung für 70 Ticker/Aliase | Herkunft/Autor bzw. offizielle Vorlagenreferenz je tatsächlich unterschiedlicher Zeichnung; Lizenz-/Brand-Guidelines, soweit einschlägig. Aliase und generische Rohstoffsymbole nicht als 70 eigenständige Marken behandeln. |
| Plus Jakarta Sans | OFL-1.1-Lizenztext und Upstream-Metadaten vorhanden | Identität/Version/Hash der wirklich ausgelieferten Remote-Schriftdatei oder reproduzierbar lokal ausgelieferte Datei mit Lizenztext. Dies ist keine fehlende Schriftlizenz. |
| Binance-Stream, Kraken v2, Twelve Data quote, Polygon/Massive snapshot | Provider/Endpunkte und öffentliche Dokumentationsreferenzen vorhanden | Tatsächlich geltender Vertrag/Erlaubnis, Account-Tarif, Vertragspartner/Region, Feeds/Börsen und Nutzungsscope: öffentliche Anzeige, API-Weitergabe, abgeleitete Scores, Cache-/Aufbewahrung, Export/Weiterverkauf sowie Attribution. Keine API-Keys als Nachweis aufnehmen. |
| Node-/Alpine-Container | Lizenztexte, Pakete, Versionen und APKBUILD-Referenzen vorhanden | Zum tatsächlich freizugebenden GHCR-Digest passende SBOM-/Quellen-/Patch-/Buildinput-Nachweise und erforderliche Notice-/Source-Auslieferung. Alten Scan-/Source-SHA nicht als aktuellen Image-Nachweis verwenden. |

Die früheren capital_ai_* JPEGs sind aus dem aktuellen Baum entfernt. Ihre historischen Einträge nicht als aktuelle Bildlücke führen. Bei späterer Übernahme der Finance-Abo-Bilder deren eigene Pfade und Lizenzreferenzen mit übernehmen; sie sind aktuell nicht im neuen Repo enthalten.

Detailquelle: docs/security/evidence/license-rights-review.json. Der dortige applicationSourceSha ed594ef... und der damalige Scan sind historisch; die Datei ist kein Lizenz-Freigabenachweis für den aktuellen Main oder einen neuen Image-Digest.

## GHCR und DNS

Read-only Render-Befund: Capital-AI läuft weiter als repo-basierter Docker-Service. Das gesetzte GHCR-Registry-Credential beweist noch keine GHCR-Image-Umschaltung. AutoDeploy ist aus. Finance ist ebenfalls noch aktiv.

Den vorhandenen deploy/DNS-CUTOVER.md und docs/security/DOMAIN-MIGRATION.md fortführen. DNS-Zone und aktuelle Render-Domainbindungen vor Änderungen frisch inventarisieren; keine frühere DNS-Momentaufnahme als heutigen Istzustand ausgeben. Vor dem Cutover Image-/Lizenz-/Runtime-Nachweise und Callback auf https://capital-ai.online/api/auth/callback korrelieren. PUBLIC_APP_ORIGIN koordiniert umstellen und Anmeldung, Profil, Abo, TLS sowie mta-sts prüfen. MX/SPF/DKIM/DMARC und Mailzustellung erhalten. Finance erst nach erfolgreicher Abnahme suspendieren; Rückweg dokumentieren.

## Noch benötigte Betriebsangaben

- Bestätigte IONOS-Absenderadresse und sichere Konfiguration des zugehörigen SMTP-Postfachs.
- Vorhandener dauerhafter Profil-/Bildspeicher oder freizugebende neue Speicherlösung.
- Maßgebliche Abo-/Billingquelle und Regeln zur Migration bestehender Finance-Abonnements.
- Vorhandener SMS-Provider für die gewünschte Telefon-2FA.
- Referenz auf die bereits vorhandene Hero-Lizenzinfo und die Provider-Vertragsnachweise.

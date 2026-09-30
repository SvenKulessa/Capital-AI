# ZITADEL-Datenschutzanpassung vor dem Dienstwechsel

## Auftrag und Ausgangsstand

Ziel: Capital-AI ersetzt Finance als produktiven Webservice; Anmeldung erfolgt über ZITADEL. Keine neue Supabase-Abhängigkeit, keine automatische Übernahme alter Identitäten, keine Provisionierung eines kostenpflichtigen Speichers.

- Zielbasis: `fed9ab247e6f231dca96801720e8a557b0ce2048`.
- Seit dem lokalen Implementierungsstand `af60cf4` wurden ausschließlich der Render-CLI-Leseworkflow und dessen Dokumentation ergänzt. Keine Überschneidung mit diesem Change Set; die neuen Dateien bleiben im Remote-Basistree erhalten.
- Keine offenen Ziel-PRs beim erneuten Writer-Abgleich.
- Ziel-`AGENTS.md` ist an der gelesenen Basis nicht vorhanden. Branch-Ausführung und Human-Merge gemäß dem expliziten Projektauftrag bleiben erhalten.
- Verantwortungsbereiche: Compliance (Rechtstexte), Frontend (Darstellung), Operations (Dienstwechsel), Security (Identitäts-/Zugriffsgrenzen). Keine Übertragung produktiver PVC-Verantwortung.

## Implementierter Umfang

| Bereich | Verhalten |
|---|---|
| `GET /api/privacy/export` | Nur verifizierte serverseitige OIDC-Sitzung; Export des eigenen Ausstellers, Subjects, Namens und Sitzungsablaufs |
| `POST /api/privacy/requests` | Same-Origin und verifizierte Sitzung; vorbereitetes `mailto`, ausdrücklich `persisted=false`, `sent=false`, `status=email_draft` |
| Anonyme Datenschutzkontakte | Direkter E-Mail-Entwurf bleibt ohne Login verfügbar |
| Datenumfang | Kein ZITADEL-Kontobackup, kein Finance-/Supabase-Export, kein Postfachzugriff; fehlende Quellen im Export ausdrücklich genannt |
| Speicher | Kein permanentes Anfrageregister, keine kostenpflichtige Datenbank/Disk; kein Schreiben personenbezogener Anfragen nach Valkey/NATS |
| Schutz | Keine Browser-Identitäten als Autorität; keine Tokens/Passwörter/MFA-Secrets im Export; Rate-Limits, begrenzte Eingaben, keine Anfrageinhalte in Anwendungslogs |
| Rechtstexte | Dokumentversion 2026-09-30; ZITADEL, Render, notwendige Cookies und angeforderter Telegram-Versand; keine alten RLS-/Retention-/Stripe-Portalzusagen |
| Analytics | Optionales Analytics/Werbung deaktiviert, einschließlich bestehender Tracker-Aufrufe; SEO bleibt funktionsfähig |
| Docker | Neue Datenschutzroute im Runtime-Image enthalten; gemeinsame öffentliche Identitätsdaten unter `shared/legal-identity.mjs` |

ZITADEL verwaltet Identitäten und kann kleine nutzerbezogene Metadaten halten. Es wird hier nicht als allgemeine Datenbank für Anträge oder Geschäftsvorgänge verwendet. Bestehende Vertrags- und Betroffenenrechte bleiben über den Verantwortlichen bearbeitbar. Der begrenzte Download ist ausdrücklich kein vollständiger Auskunftsbescheid.

## Vier Validierungsschritte

1. **Herkunft und Abgleich:** Main frisch gelesen; neue Main-Dateien ohne Scope-Überschneidung identifiziert; Zielservice und Deployment über Render gelesen.
2. **Zugriffsgrenzen:** 17 Tests in `server/auth.test.mjs`, `server/security.test.mjs` und `server/mta-sts.test.mjs` erfolgreich. Echte Test-JWTs/PKCE, ungültige Signatur/Audience/Issuer/Nonce/Ablauf, Sessionrotation/Logout, Identitätstrennung, Origin-/Eingabeprüfungen und Rate-Limit überprüft.
3. **Darstellung und Datenschutz:** 9 Tests für Rechtstexte, Navigation und vollständig deaktiviertes Analytics erfolgreich. Neue Verarbeitungstätigkeiten und Exportgrenzen gerendert.
4. **Anwendung:** TypeScript, Vite-Build und `git diff --check` erfolgreich. Docker-Runtime-COPY geprüft; ein neuer Containerbuild/SBOM/CVE-Nachweis ist nicht durch den lokalen Vite-Build ersetzt.

Der erste Backendtest scheiterte am in der Arbeitsumgebung nicht vorhandenen `/tmp`-Verzeichnis. Derselbe Test läuft mit einem beschreibbaren `TMPDIR` ohne Änderung der Anwendung. Im Rate-Limit-Test wurde der Aufrufzähler berichtigt: zehn Versuche erlaubt, der elfte wird abgewiesen; die Implementierungsgrenze wurde nicht verändert.

```sh
mkdir -p .test-tmp
TMPDIR="$PWD/.test-tmp" node --test server/auth.test.mjs server/security.test.mjs server/mta-sts.test.mjs
node --import tsx --test scripts/legal-pages.test.mjs scripts/navigation.test.mjs scripts/privacy-analytics.test.mjs
npm run lint
npm run build
git diff --check
```

## Beobachteter Betriebsstand und offene Gates

Render-Readback bei Fortsetzung:

- Workspace: AICapital, `tea-d90o4rj7uimc739i86ug`.
- Neuer Dienst: `srv-dau1rp893c1s73cdhm1g`, `https://capital-ai-uvsl.onrender.com`, eine Starter-Instanz, Auto-Deploy aus.
- Live-Deployment: `dep-daue1uvavr4c738qvr5g`, Source `af60cf4330466bbd08c730d276ef9c649bbc0f7a`.
- Finance-Zieldienst für die spätere Suspendierung: `srv-d91o1o9o3t8c73edi55g`. Vor Abschaltung erneut lesen.

Frühere HTTPS-Proben vom selben Tag bestätigten den neuen Dienst mit `configured=true`, aber ohne authentifizierte Nutzersitzung. Die Root-Domain lieferte noch die Finance-Health-Antwort mit Supabase-Konfiguration. Diese Proben sind historische Beobachtungen, kein aktueller Cutover-/Login-Nachweis.

Noch offen: Human-Merge, exact-SHA-Deployment/Container-Sicherheitsnachweis, echter ZITADEL-Login und Download unter der Ziel-Domain, Domain-/DNS-/TLS-Readback, Umgang mit Finance-Altdaten und bestehenden Verträgen. Erst nach diesen Gates Finance suspendieren. Keine Domainänderung, Suspendierung, Repositoryarchivierung oder Datenlöschung wurde mit diesem Change Set vorgenommen.

Der Render-Connector bietet hier keine Domaintransfer-/Suspendierungsaktion. Ein Dashboard-Fallback benötigt nach der Browser-Toolvorgabe vorherige Nutzerfreigabe. Der Actions-Secret `RENDER_API_KEY_TEST` ist nicht lokal lesbar; der bestehende CLI-Workflow ist ausdrücklich read-only und wird nicht zweckentfremdet.

Referenzen:
- https://zitadel.com/docs/guides/manage/console/users-overview
- https://zitadel.com/docs/guides/manage/console/applications-overview
- https://render.com/docs/custom-domains
- https://render.com/docs/configure-other-dns
- Umschaltplan: `deploy/DNS-CUTOVER.md`.

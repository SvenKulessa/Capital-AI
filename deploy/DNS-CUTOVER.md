# Finance → Capital-AI: Domainwechsel und Abschaltung

Dies ist ein vorbereiteter Ausführungsplan, kein Nachweis einer bereits erfolgten Umschaltung.

## Exakte Dienste

| Rolle | Dienst | Referenz |
|---|---|---|
| Ziel | Capital-AI | `srv-dau1rp893c1s73cdhm1g`, `capital-ai-uvsl.onrender.com`, SvenKulessa/Capital-AI |
| Bisherige Produktion | Finance | `srv-d91o1o9o3t8c73edi55g`, capital-ai-online/Finance |
| Workspace | AICapital | `tea-d90o4rj7uimc739i86ug` |

## 1. Vorbedingungen und Rückweg

- Aktuelle Domainzuordnungen, authoritative Nameserver, DNS-Records, TLS-Status und beide Dienstzustände read-only sichern. Das IONOS-Inventar aus Actions-Lauf 36693847135 vom 30.09.2026, 09:05Z, wurde gelesen: Root-A 216.24.57.1 sowie www-/mta-sts-CNAMEs auf finance-7clq.onrender.com, jeweils TTL 3600. Vor Schreibzugriff frisch erneut lesen und mit dem Rollback-Artefakt abgleichen; aus MX-Records wird kein DNS-Provider abgeleitet.
- Aktuellen Main, angenommenes Source-/Image-Digest und Container-Sicherheitsnachweis korrelieren. PR-Merge allein ist kein Deployment.
- Finance-Altdaten und bestehende Vertragsverwaltung müssen nach Abschaltung weiter zugänglich/bearbeitbar sein. ZITADEL-Subjects dürfen nicht allein anhand gleicher E-Mail-Adressen an alte Supabase-Datensätze gebunden werden. Keine Daten oder Secrets löschen.
- Neuer Dienst muss vor dem Domainwechsel unter seiner Render-URL funktionieren. Bei fehlgeschlagenem Login, Export oder TLS-Nachweis nicht fortfahren.

## 2. ZITADEL und Anwendung

- In der vorhandenen ZITADEL-Web-Anwendung genau `https://capital-ai.online/api/auth/callback` als Redirect URI zulassen, ohne Wildcards. Die Render-Test-Callback-URI darf für den Vorabtest zusätzlich bestehen.
- Runtime `PUBLIC_APP_ORIGIN=https://capital-ai.online` erst im koordinierten Übergang setzen; der Server leitet die Callback-URI daraus ab.
- `OIDC_ISSUER`, `OIDC_CLIENT_ID` und `OIDC_CLIENT_SECRET` serverseitig beibehalten; keine Tokens ins Repo oder in öffentliche Protokolle kopieren.
- Einen echten Login samt Logout und erneutem Login testen. `configured=true` allein genügt nicht.

## 3. Domains und DNS

- Bestehende Custom Domains von Finance inventarisieren und erst danach gezielt auf Capital-AI übertragen. Kandidaten: `capital-ai.online`, `www.capital-ai.online`, `mta-sts.capital-ai.online`; zusätzliche Domains nicht aus historischem Chat übernehmen.
- Hauptdomain als kanonischen Host nutzen; `www` auf dieselbe HTTPS-Origin umleiten, damit OIDC- und Same-Origin-Prüfungen konsistent bleiben.
- Bei gemeinsamem Render-Loadbalancer kann der Root-A-Record bereits korrekt sein: ein DNS-Wechsel allein überträgt dann nicht die Render-Domainzuordnung.
- Für die Root-Domain bei geeigneter DNS-Unterstützung ALIAS/ANAME bzw. Flattening auf `capital-ai-uvsl.onrender.com`; andernfalls den aktuell von Render bestätigten A-Record verwenden (Dokumentationswert am 30.09.2026: `216.24.57.1`). Bei Cloudflare Render-spezifische CNAME-Anleitung beachten.
- Für bestätigte Subdomains CNAME auf `capital-ai-uvsl.onrender.com`. Nur betroffene Website-AAAA-Records nach Providerprüfung entfernen; keine pauschale Zonenbereinigung.
- MX, SPF, DKIM, DMARC, `_mta-sts` und Mailprovider-Records nicht ändern. Der MTA-STS-HTTPS-Endpunkt muss weiterhin die bestehende IONOS-Policy ausliefern.
- Nach dem Domaintransfer Render-Verifizierung und gültiges TLS-Zertifikat für jeden übernommenen Host prüfen. Bei Problemen die zuvor gesicherte Finance-Zuordnung und DNS-Konfiguration wiederherstellen.

## 4. Abnahme auf der Hauptdomain

- HTTPS-Zertifikat/Hostname, HTTP→HTTPS und www→kanonischer Host prüfen.
- `/healthz` muss den neuen Capital-AI-Dienst zeigen, nicht die frühere Finance-Antwort.
- `/impressum`, `/agb`, `/datenschutz` mit Version 2026-09-30 laden; Direktlinks, Neuladen und Browser-Zurück prüfen.
- Neuer ZITADEL-Login, Session, Logout und Wiederanmeldung; Datenauszug nur für eigene verifizierte Sitzung; anonym 401 am Export.
- Anfrageweg: E-Mail-Entwurf, keine Behauptung dauerhafter Speicherung oder bereits erfolgter Löschung.
- Markt-/Datenzugriff und benötigte Provider separat prüfen. NATS nicht verfügbar oder Datenpfad nur `fail_closed` bedeutet keinen vollständig verifizierten Marktservice.
- `/.well-known/mta-sts.txt` am übernommenen MTA-STS-Host gegen die vorherige Policy vergleichen.

## 5. Finance außer Betrieb

Erst nach dokumentierter Abnahme Finance in Render **suspendieren**. Keine Service-/Repository-/Datenlöschung. Keine zusätzliche Abschaltung historischer, bereits suspendierter Testdienste. Nach Suspendierung Hauptdomain, ZITADEL, Export und MTA-STS erneut prüfen. Bei Fehlern Finance wieder aufnehmen und die gesicherte Domainzuordnung zurücksetzen.

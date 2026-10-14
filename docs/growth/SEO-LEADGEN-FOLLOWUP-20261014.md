# CAPITAL-AI-GROWTH | X-Pilot, SEO Lead Generation und verantwortbare Outreach-Architektur

**Stand:** 14.10.2026 | **Status:** DRAFT / REVIEW_REQUIRED; technische Source-Evidence separat.  
**Basis:** `SvenKulessa/Capital-AI@48face2c9cf767f256000b8701545665674a8048`; `AGENTS.md` ist allein autorisierende Engineering-Policy.  
**Gebrandetes Marketing-PDF:** privater Owner-Google-Drive-Ordner `CAPITAL-AI/GROWTH/Marketing`; kein Kunden- oder KI-generiertes Produkt-Live-Attest.

## Erster durchgehender Prototyp — genaue Grenze

- `src/data/growthMarketingPilot.ts`: erster quellgebundener deutschsprachiger X-Lernbeitrag; SHA-256-Asset; konkreter `CAPITAL_AI_CONTENT_ENGINE@1`-Plan und `CAPITAL_AI_CONTENT_SOCIAL_PACKAGE@1`-Manifest.
- `src/features/home/SocialContentEngineStatus.tsx`: mobile, kontrastreiche, textäquivalente Prozessgrafik und Zustandsanzeige; Stand datiert und **kein Live-Analytics-Dashboard**.
- X-One-Shot: `server/social-media/x-article-test.mjs` ermöglicht den separaten, authentifizierten **manuellen** Owner-Artikeltest mit serverseitigem X OAuth2-Refresh, CAS-Lease und Provider-Readback.
- Die unveränderte Bridge `src/contracts/socialPublisherAdapter.ts` bleibt Authority: Ein Content-Entwurf, X-OAuth-Scopes oder Website-Grafik autorisiert keine autonome Social-Publikation. Plan/Manifest haben keine Approvals, Deliveries oder Provider-Aufrufe.
- Am 14.10.2026 lieferte die owner-projektbezogene Supabase-Abfrage aus `capital_x_article_tests` **keine Zeilen**. Deswegen ist der erste veröffentlichte X-Artikel weiterhin **NOT_PROVEN**; nicht per SQL, BFF-Service-Role oder unsignierter Request nachahmen.
- Für **wirklich ausgeführte** Posts sind die X Provider-ID, kanonischer Postlink, author_id, Ausgaben und datierter DB-Readback zwingend nachzuweisen. Unklare Providerantworten dürfen keinen erneuten POST erzeugen.

## Content-Strategie und feste Obergrenze

Zielgruppe A: erwachsene Finanzlernende, Lehrkräfte, private Research-Nutzer. CTA: `/learning`, bestehende Lernmodule und Kosten-/Datenbegrenzungen.  
Zielgruppe B: FinTech-/Quant-/Research-Teams. CTA: öffentliche Architektur/Blueprint-Dokumentation, konkrete Frage oder qualifizierter Dialog, **kein** erfundener Demo-, Ranking- oder Blueprint-Checkout.  
Zielgruppe C: Engineering-/Open-Source-Community. CTA: nachvollziehbare Diagramme, GitHub-Quellen und Architekturkritik.

Vier Wochen: insgesamt 16 redaktionelle **DRAFT**-Einheiten, davon 14 textbasierte Posts und zwei X-Artikel. Frequenz Mo 15:00, Di 11:30, Mi 13:30, Do 15:00 `Europe/Berlin`; Startwoche 19.10.2026. Kein persistenter Scheduler implementiert oder aktiviert.

Owner-angekündigte X Test-Credits: 20 USD (Guthabenstand **nicht aus API belegt**); interne **Vorschlags-Obergrenze 3 USD** bis zur ersten Rechnung/Preiskorrelation. Aufteilung der Pilotreserve:
- 40 % (€/$ im **X-Budget: USD**): eigene redaktionelle Veröffentlichung
- 15 %: nur plattformseitig erlaubte **read-only** Discovery
- 15 %: nur zulässige, sparsame Analytics-Readbacks
- 10 %: OAuth Identity-/Account-Readback
- 20 %: Safety-Reserve; nicht automatisch verbrauchen

**0 % für automatische Follows, Massen-Likes, unbeauftragte Replies, ungefragte Werbe-DMs und Bulk-Email.** API-Meters sind nicht gleich Kostenbelege. Preise sind endpoint- und möglicherweise URL-/Media-abhängig; X-Developer-Console-Spend-Cap, Credit-Expiry und Auto-Recharge-Status muss der Owner kontrollieren, bevor API-Mutationen ausgelöst werden. Keine zusätzliche Render/GPU/SMTP-Lizenz aktivieren.

## SEO nach erstem nachweislich veröffentlichtem Artikel — P0 bis P2

Die kanonische Roadmap hält **SEO-00 bis SEO-11** vollständig offen, bis ihr jeweiliger Scope belegt ist. Priorisierung, keine erfundenen Ergebnisse:

| Priorität | ID | Ziel und Umsetzung | Evidence/Abnahmetest |
|---|---|---|---|
| P0 | SEO-03 | Anonymer HTTP-Readback: robots.txt, sitemap.xml, Canonical, noindex, SSR/HTML, Broken Links, status codes, JSON-LD, OG | URL-/Datum-/Commitgebundene Reports, unveränderte private Routen |
| P0 | SEO-07 | Read-only GSC/GA4-Zugriffe und Property verifizieren, Indexierung/Impressions trennen, Consent-Boundary durchsetzen | Erst echte API-Readbacks, danach 28-Tage-Baseline; kein erfundenes 0/CTR |
| P0 | SEO-04 | Pillar-Content für Finanzbildung, Score-Mathematik, Datenqualität, Multi-Source-Architektur; EEAT, Suchintention und interne Verlinkung | 4 redaktionell geprüfte, crawlbare Hub-Einstiege mit korrekten Claims |
| P1 | SEO-05 | GitHub → technische Doku → kanonische URL → Landing/qualifizierter Kontakt | überprüfte Canonical-/URL-Kette, UTM-Kohärenz |
| P1 | SEO-06 | Erst nach bestätigter X-Veröffentlichung source-bound Social-Flywheel über Campaign/Content/Asset | echte Delivery-ID, providerseitiger Link und consent-aware Website-Zuordnung |
| P1 | SEO-08 | Hilfreiche, semantische und barrierearme HTML-Inhalte mit Quellen; ausdrücklich genehmigte AI-Search-Crawler-Policy | reale HTTP-Tests, Structured Data und Nutzungsgrenzen |
| P1 | SEO-09 | Wiederholbare SEO-CI, Inkonsistenz-/Linkreport ohne Doppelchecks oder Score-Claims | PR-Check-Evidence / Repro-Cases |
| P2 | SEO-10 | Selbstkorrekturen nur bei eng begrenzten risikoarmen deterministischen Regeln | Diff, Revert und Gate-Traces |
| P2 | SEO-11 | White-Hat-Kooperationen, fachliche Community-Kommentare nur nutzergesteuert, opt-in Partner-Pitches | dokumentierte Rechte, UTM/Referral nur mit gültiger Datenbasis |
| Erhalt | SEO-00/01/02 | Indexing-Policy, Content Manifest und Metadata-as-Code gegen aktuelle Seite regressionsprüfen | Source-/Runtime-Korrelation statt historischer Labels |

**Primäre Erfolgskriterien**: verifizierte indexierbare qualifizierte Seiten, organische Klicks nach Länder-/Intent-Segment, erster zielseitiger Lernpfad, berechtigte B2B-Kontaktanfragen und tatsächliche freigegebene Kaufpfade. GA4/GSC und Kauf-Readbacks dürfen nicht aus Codeexistenz hochgerechnet werden.

## Nodemailer / SMTP: nur permissioned Partner-Outreach

Die derzeitige `src/contracts/marketingOutreachPolicy.ts` ist verbindlich im Anwendungsscope: explizite Einwilligung mit Beleg oder eng begrenzte `§7 Abs. 3 UWG`-Bestandskunden-Ausnahme; dokumentierte DSGVO-Rechtsgrundlage; Sperrliste, Widerspruch, Abmeldung, Frequency Cap, Senderidentität, Auditbeleg und Kill Switch. **Öffentlich sichtbare B2B-Kontaktadressen** allein sind keine gültige Erlaubnis für werbliche E-Mails nach deutschem Recht.

Daher als funktionaler Folgeschritt: lokale Vorlagen/Preview, SMTP-Transport erst nach personenbezogener Zweck-/Berechtigungsprüfung; opt-in Kontakte über Website-Formular, Newsletter oder bereits zugelassene Bestandskundenbeziehung. Initiales Versandbudget **0 €** und **0 automatisierte externe Mails**. Ohne ausdrücklich freigegebenen SMTP-Provider, Kostenkontingent und berechtigte Empfänger bleibt Versand `BLOCKED`.

Mögliche laufende Kosten nach Freigabe: SMTP-Provider, Domain-/DKIM/SPF/DMARC-Betrieb, Bounce/Complaint-Management und Zustellungsmonitoring; konkret **NOT_PROVEN**. Kein unbelegtes Erfolgs-, Open-Rate-, Lead- oder Revenue-Versprechen.

## X Community Discovery / Analytics / Lernen: getrennte Phasen

**Phase A – read-only:** Nur offizielle X API, technisch durch Account-/Endpoint-Scopes, Quote, ToS, Ziel-Community-Allowlist und Abrechnung abgesichert. Öffentliche Inhalte sind kein Freibrief für dauerhaftes persönliches Profil-Harvesting; gespeicherte Kandidaten minimal halten, TTL und Löschung. Redaktionelle Themencluster aus zugelassenen öffentlichen Community-Inhalten ableiten und menschlich verifizieren.

**Phase B – authentische Interaktion:** Follow, Like, Reply und Mention werden nicht als Massengrowth/Engagement-Manipulation automatisiert. Insbesondere keine massenhaften, unaufgeforderten automatischen Replies auf fremde FinTech-Posts und kein Autofollow, keine API-Quota-Umgehung. Allenfalls echte Einzelbeiträge aus einem redaktionell geprüften Owner-Workflow unter den jeweiligen X-Automation-Regeln.

**Phase C – Messung und Verbesserung:** X-Providerwerte nur nach autorisierten API-Reads, Website-Funnel nur bei zulässiger Consent-/Telemetry-Evidence. Content-Hypothesen/Varianten + UTM werden getrennt vom Modelltraining gespeichert. **Kein Online-Lernen durch selbstständiges Ändern von Produktions-Gewichten, Claims, Berechtigungen oder Budgets.**

## Persönliche Owner-Handlungen

👋⚙️ X Developer Console: Guthaben, API-Scopes, tatsächlich berechnete Endpointkosten und Max-20-USD-Cap bestätigen; Owner-Artikeltest im bestehenden verifizierten Login einmalig auslösen.  
👋⚙️ Für Mails: einen zugelassenen SMTP-Sender und **belegbare Einwilligungen/Kunden-Ausnahmesituationen** bereitstellen, bevor Versand/Follow-up freigeschaltet wird.

## Quellen (Stand 14.10.2026)

- X API Pay-per-use: https://docs.x.com/x-api/getting-started/pricing
- X Automation rules: https://help.x.com/en/rules-and-policies/x-automation
- § 7 UWG: https://www.gesetze-im-internet.de/uwg_2004/__7.html
- Google hilfreiche Inhalte: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Indexing: https://developers.google.com/search/docs/crawling-indexing
- Repo: `shared/seo-content-manifest.mjs`, `shared/seo-metadata.mjs`, `src/contracts/marketingOutreachPolicy.ts`, `src/data/socialContentRoadmap.ts`, `server/social-media/x-article-test.mjs`.

# CAPITAL-AI · Agent Operations / Governance Evidence – Organic Pilot v1

**Datum:** 2026-11-19 · **Scope:** GROWTH + PRODUCT + TRUST · **Status:** DRAFT_ONLY / NO_AUTO_PUBLISH / NO_PAID_ADS.

## Anschluss an den bestehenden Funnel

Keine zweite öffentliche Landingpage: Bestehende Route `/governance-evidence-sprint` mit Kontakt-`POST /api/public/contact`, Einwilligungs-/Datenschutzhinweisen und Musterbericht verwenden. Die bereits vorhandene **interne** Agent-Operations-Vorschau unter `docs/product/agent-operations-pilot-preview.html` enthält nur synthetische Demo-Karten und einen expliziten Verweis auf diesen Kontaktweg.

**Positionierung:** Governance & Evidence Sprint = begrenzte manuelle B2B-Bestandsaufnahme. Agent Operations = **ungeöffneter** deterministischer Pilot mit 3 synthetischen Workflows. Weder die öffentlich beschriebene Sprint-Leistung noch eine angefragte Beratung behauptet produktive Agenten-Ausführung, Kundendatenprüfung oder Security-Zertifizierung.

**Preisautorität:** Der auf der vorhandenen Sprint-Seite angegebene Betrag von 690 € netto ist **unverbindliche Kalkulationshypothese**, kein verbindlicher Preis und keine neue Stripe-SKU. Für Agent Operations selbst wird kein Preis genannt und keine Zahlung ausgelöst.

## Redaktionsfertige organische Beiträge – noch nicht veröffentlicht

### Kanal: LinkedIn / IT-Dienstleister (MSP)

**Headline:** Weniger Zeit für Nachweis-Suche. Mehr Klarheit bei Freigaben.

In kleinen IT-Teams kosten das Zusammentragen von CI-Runs, Commit-SHAs und Prüfberichten oft mehr Abstimmung als erwartet. CAPITAL-AI entwickelt hierfür nachvollziehbare Evidence-Workflows und bietet einen eng begrenzten Governance & Evidence Sprint zur fachlichen Bestandsaufnahme an. Unser Agent-Operations-Pilot zeigt ergänzend **nur synthetische Demos**; keine produktive KI-Automatisierung oder Zertifizierung.

**Diskussionsfrage:** Wo geht in Ihrem Team bei Freigaben die meiste Zeit verloren?

**CTA (Owner-/Redaktionsfreigabe erforderlich):** https://capital-ai.online/governance-evidence-sprint?utm_source=linkedin&utm_medium=organic&utm_campaign=agent_ops_pilot_20261119#anfrage

### Kanal: LinkedIn / DevSecOps

**Headline:** Grün in CI ist ein Signal – kein vollständiger Nachweis.

Welche Commit-SHA gehört zu welchem Security-Scan? Welche Gate-Entscheidung ist tatsächlich belegt? Wir untersuchen drei eng begrenzte Evidence-Anwendungsfälle: CI-/PR-Nachweise, Credential-Ablaufmetadaten und Medienrechte-Triage. Unsere Agent-Operations-Beispiele sind derzeit **synthetisch und nicht als Live-Service freigegeben**. Der vorhandene Governance & Evidence Sprint bietet einen gesondert vereinbarten manuellen Review.

**Diskussionsfrage:** Welche Evidence fehlt häufig bei Ihrer Freigabeentscheidung?

**CTA:** https://capital-ai.online/governance-evidence-sprint?utm_source=linkedin&utm_medium=organic&utm_campaign=agent_ops_pilot_20261119#anfrage

### Kanal: Fachcommunity / Content- und Medienrechte-Operations

**Headline:** Medienrechte vor der Veröffentlichung prüfbar dokumentieren.

Quellennachweis, Attribution und kommerzielle Nutzungsrechte sollten vor einem Publish getrennt bewertet werden. Die Agent-Operations-Vorschau von CAPITAL-AI simuliert deshalb ein **menschlich zu bestätigendes** Media-Rights-Review, ohne automatisch Lizenzfreigaben oder Veröffentlichungen zu erteilen. Wir suchen fachliches Feedback zur Dokumentation dieser Entscheidungen.

**Diskussionsfrage:** Wie dokumentiert Ihr Team Lizenz- und Attributionsentscheidungen heute?

**CTA:** https://capital-ai.online/governance-evidence-sprint?utm_source=community&utm_medium=organic&utm_campaign=agent_ops_pilot_20261119#anfrage

## Funnel, Consent und Messbarkeit

```text
Organischer Beitrag (erst nach Freigabe)
    → vorhandene /governance-evidence-sprint-Route
    → datensparsame B2B-Kontaktanfrage (nur vom Nutzer aktiv gesendet)
    → Mailserver-Receipt (accepted ≠ zugestellt)
    → Owner-qualifizierte Discovery / Budget- und Scope-Review
    → individuelles Angebot (kein Checkout aus der Kampagne)
```

1. **Awareness**: Nur vorhandene consent-gesteuerte, aggregierte GA4-/UTM-Messung berücksichtigen, soweit am tatsächlichen Runtime-Pfad nachgewiesen. Keine neue Tracker-Initialisierung, keine Datenbank und keine Cookies durch diese Kampagne.
2. **Lead**: `/api/public/contact` akzeptiert Nachricht + Rückantwortadresse nach Consent-Acknowledgement; kein Newsletter-Opt-in. Anfragen nachweisbar nur bei realer Mailserverannahme, kein erfundener Leadstatus.
3. **Qualification**: Ein Owner vermerkt intern nur mit legitimer Grundlage Branche, Pain, gewünschtes Ergebnis, Sicherheits-/Datenbedarf und Budgetindikation. Keine automatisierte Anreicherung, keine ungefragte Kontaktaufnahme.
4. **Conversion**: Erst ein tatsächlich vereinbarter Beratungsauftrag oder erfolgreich abgewickelter Kauf zählt als Umsatz. Keine synthetischen Funnel-KPIs und keine Umsatzgarantie.

## Mindest-Negativtests (bestehender Governance-Testpfad)

- Keine Duplikat-Landingpage oder neues Lead-Endpoint.
- Kein `fetch`, `sendBeacon`, `gtag`, `dataLayer`, `localStorage` oder Formular in der internen Vorschau.
- `robots=noindex,nofollow,noarchive` und `DRAFT_ONLY` bleiben erhalten.
- Drei synthetische Workflows und ausdrücklich nur ein bereits existierender Kontaktpfad.
- Keine Kreditzusagen, Handelsaufforderungen, Live-Sicherheitszertifikate, neue Stripe-Preise oder bezahlte Ads.

## Gate / Eigentümerentscheidungen

**TECH:** Agent Pilot #786 ist gemergt; der PostgreSQL-17-Service-Test im isolierten CI-Job `pg-ledger` von Run 44494242314 war SUCCESS. In den produktiven und Recovery-Supabase-Projekten wurde am 19.11.2026 die Pilot-Tabelle **nicht** gefunden; keine Migration angewandt. Render meldete `dep-dbvc7rqjnfac739u02lg` live für main `61da8c46...`. Das Feature bleibt auf Source-Ebene `default-OFF`; echte Runtime-Flag-Lage ist NOT_PROVEN. Kein SaaS-Launch.

**RIGHTS:** PR #714 bleibt wegen fehlender kommerzieller EUR-OHLC-Quellrechte, Datenqualität und Merge-Konflikten gesperrt. Keine Buy/Sell-Signale in dieser Kampagne.

**RELEASE:** Redaktionelle Freigabe vor Post, kein Paid-Ads-Budget, keine automatisierte Veröffentlichung. Änderungen an der öffentlichen Route nur nach Website-/Sicherheits- und Consent-Gates. Die vorliegende Änderung ist interner Quellcode-/Dokumentationsumfang.

## Vorhandene Referenzen

- `docs/product/AGENT-OPERATIONS-PILOT-READINESS.md`
- `docs/product/agent-operations-pilot-preview.html`
- `src/features/home/GovernanceEvidenceSprintPage.tsx`
- `scripts/governance-evidence-sprint.test.mjs`
- `server/learning-inquiry.mjs`
- `docs/growth/GOVERNANCE-EVIDENCE-SPRINT-MUSTERBERICHT-20261119.md`
- GitHub PR #786, PR #714, main `61da8c461721b55731d1ec4ecc0161b7f154825c`

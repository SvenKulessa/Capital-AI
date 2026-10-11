# Cookies & Consent v3 — CAPITAL-AI GROWTH

Stand: 2026-10-11 · Status: CODE_PRESENT (Live-/Browser-Status erst nach Deployment)

## Nutzerwirkung

Die Website zeigt ohne gespeicherte gültige Entscheidung eine zugängliche, nicht blockierende Consent-Leiste. Gleichwertige Aktionen: „Nur notwendige“, „Anpassen“ mit getrennten Statistik-/Marketing-Präferenzen, „Alle erlauben“. Nach der Entscheidung bleibt ein Button zur Änderung/Widerruf erreichbar; andere Browser-Tabs synchronisieren den Zustand.

`src/privacy/cookieConsentV3.ts` ist die einzige first-party Präferenzautorität. Version `COOKIE_CONSENT_V3`, Schlüssel `capital-ai-cookie-consent-v3`, Speicherdauer 180 Tage, Versionsbindung an `PRIVACY_NOTICE_VERSION`. Bei fehlender, ungültiger, abgelaufener oder verweigerter Speicherung gilt **keine optionale Einwilligung**. Speicherung geschieht als Local-Storage-Entscheidung ohne Besucherkennung, IP-Adresse, Cookie-Identifier oder personenbezogene Nutzdaten. Auth-/Session-Cookies bleiben für die vom Nutzer angeforderten Kontofunktionen unabhängig und technisch notwendig.

## Autorität und Grenzen

Das ist ein wirksames **Consent-Interface samt persistenter Opt-in-/Widerrufslogik**, aber **keine Aktivierung von Analytics oder Advertising**. `src/utils/analytics.ts` bleibt ohne GA4-/Marketing-Tags, ohne Drittanbieter-Cookies und ohne Seiteneventversand. Ein späterer Tracking-PR müsste die getrennten Kategorien und den tatsächlichen Dienst, Consent-Status pro Request, Widerruf/Rücknahme von Cookies, SPA-Deduplikation, Datenschutzhinweise, Providerrechte, CSP und die reale Laufzeit gesondert prüfen. Keine vorgetäuschten Conversion-Werte.

Alternative: Ein externes Consent-Management-Paket (CookieConsent v3) könnte mehr Vorlagen bieten, würde aber Dependency-, Lizenz-, Accessibility- und Supply-Chain-Arbeit erzeugen. Aktuell ist die wartbare interne Implementierung ohne neuen Runtime-Provider zweckmäßiger. Sie ist **nicht** als Installation des gleichnamigen externen Pakets zu bezeichnen.

## Testvertrag

`node --import tsx --test src/privacy/cookieConsentV3.test.ts` prüft Default-Deny, separate Kategorien, Ablehnung, Widerruf, Version/Frist, Manipulation, Storage-Ausfall sowie UI-Mount/Consent-Grenzen. Der vorhandene `npm test`-Pfad integriert den Test in das bestehende `Docker Security Gate`.

## Abnahme-/Kostenstatus

- Keine kostenpflichtige API, kein neues SaaS, kein zusätzliches Required Check.
- Bisherige `Docker Security Gate` / `Domain Governance` bleiben unverändert.
- Vollständige Browser-QA, tatsächliche Cookie-Bestandsaufnahme und rechtliche Endbewertung: **NOT_PROVEN**, bis Produktion und Third-Party-Verarbeitung ausgelesen sind.
- Hauptauswirkung direkt nach Merge/Deploy: Consent-Leiste und wiederöffnungsfähige Präferenzverwaltung; Rollback durch Revert der Cookie-UI-Anbindung.

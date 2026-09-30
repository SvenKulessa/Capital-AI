# Übertragung der öffentlichen Rechtstexte

## Herkunft und Umfang

- Auftrag: Impressum, Datenschutz und AGB aus `capital-ai-online/Finance` nach `SvenKulessa/Capital-AI` übertragen.
- Quelle: `capital-ai-online/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`.
- Zielbasis: `SvenKulessa/Capital-AI@ec6300e8a3ed2ba28cffa81c8c1de6f3ad0717d2`.
- Fachlicher Bereich: Compliance (Rechtstexte), Frontend (Darstellung); keine Übertragung produktiver PVC-Verantwortung.
- Finance bleibt unverändert.

| Quelldatei | Ziel | Übertragung |
|---|---|---|
| `src/features/public/ui/LegalAndFaqPages.tsx` | `src/components/LegalAndFaqPages.tsx` | Impressum und alle acht AGB-Abschnitte wortgleich; Datenschutzdarstellung mit E-Mail-Kontakt statt fehlender Backend-Funktionen |
| `src/privacy/privacyPolicy.ts` | gleicher Pfad | Bytegleich: Verantwortlicher, Version, alle neun Verarbeitungstätigkeiten und sechs Anfragetypen |
| `src/features/public/content/publicLegalContent.ts` | `src/content/publicLegalContent.ts` | Kontakt und gemeinsame FAQ übernommen; Aussagen zu fehlenden Datenschutz-/Cookie-Funktionen an den Zielstand angepasst |
| `src/features/billing/billingContract.ts` | `src/content/legalDocumentVersions.ts` | Nur AGB-Version und Gültigkeitsdatum; kein Import des historischen Preisregisters |

Die vorhandenen Routen `/impressum`, `/datenschutz`, `/agb` und deren Navigation bleiben bestehen. Die gemeinsame FAQ-Komponente verwendet ebenfalls die Finance-Inhalte, damit alte Musterkontakte und widersprüchliche Rechts-/Zertifizierungszusagen nicht bestehen bleiben. SEO-Beschreibungen und der Kopiertext verwenden den aktuellen Anbieter; Kopieren erfasst den sichtbaren Seiteninhalt.

## Validierung in vier Schritten

1. Herkunft: beide Main-SHAs und Quelldateien gelesen; Ziel-`AGENTS.md` nicht vorhanden; keine offenen Ziel-PRs beim Abgleich.
2. Vollständigkeit: Impressum-/AGB-JSX-Blöcke direkt gegen Finance verglichen; unverändert. `privacyPolicy.ts` bytegleich, einschließlich aller neun Einträge. Kein GmbH-/Register-/Musterkontakt in den drei gerenderten Seiten.
3. Integration: Vite-SSR-Seitentests für Anbieter, alle Datenschutz-Einträge, alle AGB-Abschnitte und Routen/Aliase; bestehende Navigationstests erfolgreich. Der erste Testversuch über direkten TS-Import scheiterte an JPG-Assets. Das Laden über Vite behebt den Testloader-Fehler und verwendet die Asset-Auflösung der Anwendung.
4. Anwendung: `npm run build`, `npm run lint`, `node --import tsx --test scripts/legal-pages.test.mjs scripts/navigation.test.mjs` und `git diff --check` erfolgreich. Der Build meldet weiterhin große Chunks; dies blockiert den Build nicht.

## Verbleibende Grenzen

- Keine Rechtsberatung oder rechtliche Neubewertung; Übertragung bestehender Finance-Dokumente.
- Keine Aussage, dass Finance-Runtimekontrollen im neuen Dienst bereits umgesetzt sind. Der Datenschutzbereich und die FAQ kennzeichnen diesen Unterschied ausdrücklich.
- Im Ziel sind `/api/privacy/requests`, `/api/privacy/export` und der Finance-Cookie-Dialog nicht implementiert. Keine Blindverknüpfung und keine fingierte Erfolgsbestätigung. Datenschutzanfragen öffnen einen E-Mail-Entwurf; Versand erfolgt durch den Nutzer. Datenauszüge können über denselben Kontakt angefordert werden.
- `src/utils/analytics.ts` besitzt noch keinen belegten Finance-Consent-Gate. Die importierte Finance-Aussage zu GA4-Opt-in ist daher ausdrücklich als Finance-Dokumentstand eingeordnet. Die Consent-Integration und eine Prüfung der tatsächlich aktiven Verarbeitung/Retention bleiben ein eigenes Arbeitspaket.
- Bestehende AGB-Aussagen zur Verwaltung von Finance-Abonnements übertragen keine Stripe-Integration in diesen Dienst.
- Noch kein Merge, Deployment oder produktiver Browsernachweis. Veröffentlichung folgt erst nach Review/Merge und Deployment.

## Reproduzierbare Prüfungen

```sh
npm run build
npm run lint
node --import tsx --test scripts/legal-pages.test.mjs scripts/navigation.test.mjs
git diff --check
```

# Commerce-Frontend — 2026-10-09

Implementierungsbaseline: `main@3a763958ecb6730930ffba66bfa5491c0c19f93a`.

## Problem und Verhalten

Die Startseite führte primär zu Analyse- und internen Plattformbereichen. Der Preiskatalog
sprach über die interne Monetarisierungsstrategie und zeigte dieselben aktiven Kaufbuttons
bei noch unbekanntem Kontostatus, Checkout-Ausfall und laufender Anfrage. Ein gemeinsames
Promise.all machte außerdem einen Billing-Ausfall zu einem vermeintlich anonymen Konto.

Zwei lokalisierte Startseiten-Einstiege führen nun zu Lernportal und Tarifvergleich;
Vocabulary bleibt ein separates Lernprodukt. Beträge stammen ausschließlich aus dem
bestehenden Katalog. Nutzenorientierte Tariftexte folgen den CADS-Tier-Capabilities,
Jahresbetrag und Vergleichsmonatswert bleiben getrennt. Provider-/Modellkosten und
private Datenrechte werden erklärt, ohne Live-Scoring oder einen Anlageerfolg zu versprechen.

Kontostatus und Checkout-Verfügbarkeit werden unabhängig ausgewertet. Unbekannte oder
fehlerhafte Antworten erlauben keinen Checkout. Eine Statuswiederholung ist möglich;
Mehrfachklicks und Änderungen des Abrechnungszyklus während einer Anfrage werden blockiert.
Statusabfragen und Checkout sind zeitlich begrenzt, beim Schließen wird abgebrochen.
Callback-Neuidentitäten aus dem Parent starten keinen Status-Reset oder Checkout-Abbruch.
Nach abgelaufener Sitzung führt der nächste Klick zur Anmeldung. Produktdetails sind
auch anonym erreichbar. Der Server bleibt Autorität für Identität, Preis und Berechtigung.

## Entscheidung

Gewählt: vorhandenen Preiskatalog und Stripe-Redirect erhalten. Kleine, rückrollbare
Frontend-Änderung, keine neue Ressource, Dependency, SKU, Analytics-Erfassung oder API.
Alternative: eigene Produktseiten und eingebetteter Checkout. Mehr Gestaltungsfreiheit,
aber zusätzlicher Routing-, Integrations- und Wartungsaufwand; für die belegten Probleme
nicht erforderlich. Das bestehende Checkout-Sessions-Modell passt zur offiziellen
Subscription-Dokumentation: https://docs.stripe.com/payments/subscriptions
(geprüft am 2026-10-09). Der im Stripe-Skill angegebene Pfad
https://docs.stripe.com/references/billing.md lieferte 404; die erreichbare Primärquelle
wurde verwendet. Keine Änderung an Stripe-API-Version oder Tax-Konfiguration.

## Validierung und Grenzen

- `npm test`: erfolgreich, 478 gemeldete bestandene Tests über mehrere Suites.
- `npm run lint`: TypeScript und Frontend-Grenzen erfolgreich.
- `npm run build`: erfolgreich; Vite meldet weiterhin den Bundle-Größenhinweis.
- Gezielt: sieben Commerce-State-/Rendering-Tests und 36 bestehende Billing-/Entitlement-/
  Vocabulary-Tests erfolgreich. Die neuen Tests sind Teil von `npm test` im vorhandenen CI.
- Sprache: Einstiegstexte in sechs Sprachen; detaillierter Preiskatalog ist weiterhin
  deutsch und als solcher ausgezeichnet. Auswahlbuttons verwenden aria-pressed statt
  unvollständiger Tab-Semantik; Fokus wird beim Schließen zurückgegeben.
- Kein echter Kauf, kein Auth-Enrollment, kein Webhook-/Entitlement- oder Browser-E2E
  aus diesen Tests abzuleiten. Quota, Conversion und Umsatz sind ungemessen.
- Ein UI-Abbruch garantiert keinen Abbruch einer bereits serverseitig erstellten
  Checkout-Session; er verhindert spätes Navigieren aus einem geschlossenen Dialog.
- Neue Tarife, Ressourcen oder Provider werden nicht aktiviert. Die Änderung erzeugt
  keine zusätzliche Anbieterabrechnung außer bestehendem normalem Web-/CI-Betrieb.

## Roadmap-Bezug und offene Abnahme

| Paket | In diesem Slice | Offen |
| --- | --- | --- |
| PRODUCTION-WEB-01-PRODUCT | Landing-Einstiege, Pricing, Auth-/Fehler-/Loading-Zustände | Browser-, Responsive- und echte Buyer-E2E-Abnahme |
| SAAS-MEMBERSHIP | vorhandene Tarife verständlich dargestellt; sichere Statusauswertung | Testkäufe für alle sechs Tarif-/Zyklus-Kombinationen, Sync und Lifecycle |
| MARKET-VOCABULARY | separater Lernzugang und direkter Produkteinstieg | echter Käufer-, Download- und Widerrufs-Roundtrip |
| PRODUCTION-WEB-01-GROWTH | Quellengebundene Nutzen-/Kosten-/Verfügbarkeitsaussagen | GSC-/Conversion-Readbacks und vollständige öffentliche Content-Korrelation |
| AP-SEC-AUTH-LIVE | keine falsche Anonymisierung bei Billing-Ausfall | persönlicher Google-/TOTP-Roundtrip |
| PR #247 | aktueller optionaler Scan fehlgeschlagen | 44 HIGH-Befunde im Reviewer-Image; kein Merge aus App-Docker-PASS |

Der Gesamtbestand umfasst weitere offene Roadmap-Pakete. Sie werden nicht durch
Frontend-Rendering oder grüne CI pauschal erledigt. Rollback: diesen PR revertieren;
Katalog, Datenzugriff, Billing-Sync und Infrastruktur benötigen keine Rückmigration.

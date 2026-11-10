# Consentierter Commerce-Funnel

Basis: main `33cbb2108c923a5607cfeb49332f1e630cb1c138`, 10.11.2026. Der öffentliche Healthcheck meldete denselben runtimeIdentity.sourceSha; buildIdentity.bound war false. Dies belegt die Runtime-Deployment-Umgebung, keine gebundene Build-Identität.
Scope: öffentliche Angebote → gültiger Checkout → verifizierter Erstkauf.
Roadmap-Zuordnung: SEARCH-SEO / CA-GROWTH-SEO-ARCHITECTURE.

## Tatsächlicher Abgleich

- VERIFIED: Der bestehende föderierte Google-Audit [42769788954](https://github.com/SvenKulessa/Capital-AI/actions/runs/42769788954) lief auf dieser Main-Basis erfolgreich. Property 548187678 und Website-Stream G-0542DT2HCE sind lesend erreichbar. Dies belegt Leserechte, keine bestimmte IAM-Rolle oder Schreibberechtigung.
- VERIFIED: `generate_lead`, E-Mail-/Query-Redaktion, deaktivierte erweiterte Messung und deaktivierte Formularinteraktionen. Der nach #604 erneuerte Sitemap-Nachweis ist enthalten: kanonische Sitemap registriert, nicht ausstehend, 0 Fehler, 0 Warnungen. Die Index-Snapshots für die drei geprüften URLs sind NEUTRAL mit unbekannten Crawl-/Canonical-Feldern. Kein Indexierungsnachweis.
- IN_PROGRESS: Die zuvor SEO-abhängige Messfreigabe und Learning-exklusive Kaufmessung werden durch diesen Scope ersetzt. Eigene öffentliche Allowlist mit /pricing, /blueprints und /checkout/confirmation; Studio, Konto, Admin und Dokumentrouten bleiben ausgeschlossen. /blueprints bietet den vorhandenen Katalog öffentlich an; der bestehende Checkout-Kill-Switch bleibt maßgeblich.
- NOT_PROVEN: Echte Anfragen, Live-Käufe, Umsatzanstieg und Ende-zu-Ende-GA4-Eingang. Ein API-/Browser-Test mit Fixtures ist kein Verkauf.

Readback: [google-commerce-baseline-20261110.json](evidence/google-commerce-baseline-20261110.json). Die aggregierten Berichtszeilen bleiben vom Zahlungsnachweis getrennt.

## Ereignisse und Datenquellen

| Ereignis | Auslöser | Autorität |
| --- | --- | --- |
| view_item | sichtbares öffentliches Produktangebot; nach Opt-in auch bei späterer Einwilligung | bestehende Learning-, Pricing- und Blueprint-Kataloge |
| begin_checkout | erfolgreiche Session-Erstellung mit geprüfter Stripe-Checkout-URL | bestehende authentifizierte Checkout-Endpunkte |
| generate_lead | ausschließlich bestehende erfolgreiche SMTP-Annahme | bestehender Learning-Inquiry-Receipt |
| purchase | authentifizierter, gleichursprünglicher POST /api/billing/purchase-receipt, danach gültiger Consent | Stripe-Readback: Identität, Live-Modus, vollständige bezahlte Session, exakt eine Katalogposition, keine Erstattung/Streitigkeit; vollständig rabattiertes Learning mit bestätigtem no_payment_required bleibt ein Kauf mit Wert 0; bei SaaS nur bezahlte initiale Rechnung |

Checkout-Starts sind eigenständige Funnel-Ereignisse, keine Leads. `ga4_commerce_report` liefert die vier Event-Zähler getrennt. Bei SaaS werden kostenlose Trials und Verlängerungen nicht als Erstkauf gesendet. Zahlungsverwaltung, Verlängerungen und Erstattungen bleiben ausschließlich Stripe zugeordnet. Die Bestätigungsseite erteilt keine Berechtigung; bestehende Webhooks bleiben für die Auslieferung verantwortlich.

Session-Kennungen werden vor Analytics-Initialisierung aus Query und Fragment entfernt und höchstens zehn Minuten im Dokument-Speicher gehalten. Keine Speicherung in Local-/SessionStorage. Der Beleg enthält nur HMAC-Transaktionskennung, EUR-Wert nach Rabatt und eine kataloggebundene Position. Keine E-Mail-, Nutzer-, Kunden-, Rechnungs- oder Session-Kennung an GA4. Transaktionskennungen bleiben über die alten Learning-Rückkehrpfade konsistent. GA4-Transaktionsdeduplizierung ergänzt die lokale Deduplizierung; dies ist kein persistentes Exactly-once-Protokoll.

## Einstellungen und Grenzen

Zeitzone, Aufbewahrungsdauer und Attributionsmodell wurden nicht verändert. Der vorherige Audit projizierte diese Werte sowie purchase/Google Signals nicht; der Adapter liest diese Felder jetzt zusätzlich und kennzeichnet unzugängliche Einstellungen als NOT_PROVEN. Fehlende Zeitzonen verhindern eine belastbare Tagesabgrenzung, unbekannte Aufbewahrung begrenzt die bewertbare historische Detailanalyse, unbekannte Attribution verhindert vergleichbare Kanalzuordnungen. Bis zum aktuellen Readback werden dafür keine Werte angenommen. Browserseitig bleiben Signals und Werbepersonalisierung ausdrücklich deaktiviert; Ablehnung, Widerruf und Ablauf sperren alle Commerce-Ereignisse. Datenschutz- und Consent-Texte nennen alle drei Produktgruppen; Notice-Version 2026-11-10.1 macht eine erneute Einwilligung erforderlich, bevor bestehende Learning-Einwilligungen für den erweiterten Zweck genutzt werden.

`ga4_configure_learning` legt generate_lead/purchase nur bei nachgewiesenem Fehlen an und liest jede Änderung zurück. Keine automatische Änderung der oben genannten Property-Einstellungen. Für externe Änderungen gilt weiterhin das vorhandene Worker-Write-Enablement; zunächst auditieren, nur Abweichungen anwenden, danach erneut auditieren.

Validierung: TypeScript ohne Ausgabe; Produktionsbuild inklusive bestehender Chunk-Grenzen; bestehende Checkout-, Enterprise-Trial-, Google-Maintenance-, Consent-/Privacy-Tests; neue Receipt- und URL-/Policy-Tests. Direkte Ausführung der Testdateien prüft die einzelnen Fälle. Browser mit lokalen API-Fixtures: Bestätigung und Angebote bei 390/1440 px, URL-Bereinigung vor Tag-Laden, NOINDEX, keine GA-Ladung ohne Einwilligung, genau ein Kaufereignis nach Einwilligung und kein Tag im privaten Konto. Keine vollständige WCAG-Zertifizierung und kein realer Stripe-Kauf.

Rollback: Scope-Commit revertieren; vorhandene Checkout-Kill-Switches und Consent-Abschaltung bleiben verfügbar. Neu angelegte GA4-Erfolgsereignisse würden durch einen Code-Revert nicht gelöscht; eine externe Rücknahme wäre separat lesend zu prüfen.

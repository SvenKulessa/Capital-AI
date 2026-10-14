# CAPITAL-AI Partner-Email-Vorlagen – ausschließlich berechtigte Kontakte

Stand: 2026-10-14 | **DRAFT / REVIEW_REQUIRED / NO_SEND**  
Versandberechtigung, Empfänger, Sender-Domain, Abmeldung und Provider sind **NOT_PROVEN**.

## Voraussetzung

Diese Vorlagen sind **keine Freigabe für die Nutzung öffentlich gefundener E-Mail-Adressen**. Versand erst nach individueller Prüfung gemäß `src/contracts/marketingOutreachPolicy.ts` mit dokumentiertem Consent (bzw. rechtlich geprüfter enger Bestandskundenausnahme), nachgewiesener DSGVO-Basis, Frequenzgrenzen, Unsubscribe, Suppression, SPF/DKIM/DMARC und Kostenlimit. `GROWTH_OUTREACH_ENABLED` bleibt deaktiviert, solange diese Nachweise fehlen. Keine Adresslisten und kein SMTP-Aufruf in diesem Paket.

### Vorlage A — Einladungsantwort auf vorliegende Kooperationsanfrage

**Betreff:** Ihre Anfrage zu CAPITAL-AI: Datenqualität und nachvollziehbare Scores

Guten Tag,

vielen Dank für Ihr Interesse an den technischen Lern- und Architekturkonzepten von CAPITAL-AI.

Im Mittelpunkt stehen Datenherkunft, Zeitstempel, nachvollziehbare Gewichtungsmodelle und Grenzen von Screener-Analysen. Die vorhandene öffentliche Dokumentation trennt konzeptionelle Blueprints von implementierten und produktiv geprüften Komponenten.

Passender Einstieg: https://capital-ai.online/learning

Wenn Ihr Interesse eher einer technischen Forschungs-/FinTech-Kooperation gilt, können wir gerne Ihre konkrete Fragestellung besprechen. Ohne Freigabe werden keine personenbezogenen Analyse- oder Handelsdaten benötigt.

Mit freundlichen Grüßen  
CAPITAL AI – Growth

**Pflichtfooter für einen späteren zulässigen Versand:** verifizierte Absender-/Impressumsangabe, aktuell funktionsfähige Abmeldemöglichkeit und ggf. individuelle Datenschutzinformation. Diese Felder werden vor Versand verbindlich ergänzt.

### Vorlage B — Bestehender, nachweislich berechtigter Bildungskontakt

**Betreff:** Neues Lernmaterial: Datenqualität und gewichtete Scores

Guten Tag,

für Ihren bereits bestehenden CAPITAL-AI-Lernkontakt haben wir zusätzliche Erklärungen zur Datenqualität und zur Mathematik gewichteter Analysefaktoren vorbereitet. Der Inhalt verwendet gekennzeichnete synthetische Lernbeispiele statt individueller Handels- oder Renditeversprechen.

Sie finden den Einstieg hier: https://capital-ai.online/learning

Falls Sie solche Hinweise künftig nicht erhalten möchten, nutzen Sie bitte den in Ihrer Nachricht verfügbaren Abmeldeweg. Wir respektieren einen Widerspruch unmittelbar.

Mit freundlichen Grüßen  
CAPITAL AI – Learning

**Rechtsprüfung vor jedem Versand:** `§7 Abs.3 UWG` gilt nur bei kumulativ erfüllten Voraussetzungen; nicht allein, weil eine alte Geschäftsbeziehung besteht.

## Späterer Nodemailer-Pfad — nur nach Zulassung

`Consented contact → marketingOutreachPolicy.ts → recipient/sender verification → provider config → templated message → Nodemailer SMTP (DKIM/SPF/DMARC) → result receipt → suppression + audit`.

**Kostenannahme (kein Kauf):** Phase 1 = 0 EUR, 0 Mails. Als spätere Budgetidee max. 25 EUR/Monat nach separater Provider-/Owner-Freigabe, ausschließlich für nachgewiesen erlaubte Empfänger. Externe Tarife und tatsächliche Kosten: NOT_PROVEN.

Quellen: https://www.gesetze-im-internet.de/uwg_2004/__7.html · https://www.gesetze-im-internet.de/bdsg_2018/ · `src/contracts/marketingOutreachPolicy.ts`.

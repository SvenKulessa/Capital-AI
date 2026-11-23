# Learning Universe – Phase A B2B-Anfragekatalog: Launch-Readiness
Stand: 2026-11-23 · PR #911 · **DRAFT_ONLY / OWNER_PUBLICATION_APPROVAL_PENDING**.

## Beauftragter Launch-Scope
- Ein einziger zusätzlicher B2B-Anfrageabschnitt **innerhalb des vorhandenen** `NewsDesignCatalog` (keine neue Route, kein Shop).
- Drei klar als **Konzepte** bezeichnete Angebote: Publisher Pack, Studio, B2B-Partnerschaft. Darstellungen dienen der Bedarfsermittlung, nicht der Erteilung von Nutzungsrechten.
- **Unabhängiger, standardmäßig deaktivierter Anfragekanal:** Die drei B2B-Karten und die vorhandene News-Design-Vorschau zeigen ausschließlich nicht anklickbare Hinweise (`data-inquiry-availability="DISABLED_BY_DEFAULT"`). Keine `mailto:`-Links, Kontaktaufnahme, Server-Verarbeitung, zusätzlichen Logs/Analytics/CRM-Schreibvorgänge oder Zustellbehauptungen. Die technische PR-Abnahme benötigt keinen E-Mail-Provider. Eine spätere Freischaltung erfordert einen eigenen, nachweislich funktionsfähigen und autorisierten Kontaktpfad.
- Existierender Datenschutz-Link `/datenschutz/`, keine separaten eingegebenen Kontaktfelder und keine automatischen Datentransfers durch die neuen Karten.
- **Keine** Preise, Streichpreise, Rabatte, Zahlungs-/Checkout-Links, Lizenz-/Entitlement-/Publishing-Grants, Reseller-Rohdateiübertragung, Tracking, Produktiv-Provider, neue Domains oder Asset-Mutationen.
- Bisherige zehn SVG-Katalogvorschauen/Hashes unverändert; Marketing-Sprache „Designvorschau“ statt unbelegter vermarktungsbezogener Originalitätszusagen.

## Technische Evidence (nicht mit Produktionsfreigabe verwechseln)
- Implementierung: `src/features/pricing/NewsDesignCatalog.tsx`, bestehende Design-Katalog-Komponente. Das Rendering verweigert den gesamten B2B-Anfrageabschnitt, sobald das importierte Commercial-Draft-Modell nicht mehr `DRAFT_ONLY / INQUIRY_ONLY` und ohne Kauf-/Rechteautorität ist.
- Regressionen: `src/features/pricing/commerceState.test.tsx` – drei Konzeptkarten und vier standardmäßig deaktivierte Anfrage-Hinweise im Gesamtkatalog; keine `mailto:`-Links, keine Kontakt- oder Providerabhängigkeit, unverbindliche Texte, kein Preis-/Rabatt-/Checkout-/Kunden-PII-Vertrag, bestehender `/datenschutz/`-Link, Rendering innerhalb des vorhandenen Katalogs. Erst der erfolgreiche CI-Lauf des aktuellen Head kann die Regression als `CI_VERIFIED` nachweisen.
- Dieser Slice entsteht **ausschließlich** auf dem bestehenden Draft-PR; `main` und produktive Dienste bleiben unverändert. CI für den **finalen** PR-Head separat als VERIFIED/FAILED/NOT_PROVEN erfassen; frühere CI-Befunde werden nicht vererbt.

## P0 – vom Owner und/oder zuständigen Fachpersonen nachzuweisen, bevor öffentlich
| Gate | Iststatus | Minimale verifizierbare Evidence ohne sensible GitHub-Daten |
| --- | --- | --- |
| Rechtlich korrekte Anbieteridentität / Impressum | NOT_PROVEN | Freigegebener Unternehmens-/Anbietername und geprüfte Impressums-/Kontaktangaben in bestehender `/impressum/`-Seite, ggf. privat referenzierter Status |
| BRAND / Markenverwendung | NOT_PROVEN | Ausdrückliche Owner-Bestätigung, dass CAPITAL-AI/Logo/Design im B2B-Anfragekatalog in eigenem Namen gezeigt werden darf; Dritt-/Ähnlichkeitsprüfung soweit erforderlich |
| Bild-/Gestaltungsvorschau | NOT_PROVEN für Drittrechte | Per-Asset-Prüfentscheidungen und Rechteketten außerhalb des öffentlichen Git; [Evidence-Gap-Matrix](../licenses/2026-11-23_PRODUCT_CHATGPT_LEARNING_SOURCE_RIGHTS_EVIDENCE_GAP_MATRIX_v1.md) |
| Angebotstext und Leistungsversprechen | OWNER_APPROVAL_PENDING | Die drei Konzepttexte und Hinweis auf noch ungeprüfte Rechte dem Owner zur Freigabe vorlegen; keine Vorwegnahme einer Liefer-/Nutzungszusage |
| Datenschutz / Angebotsdarstellung | DRAFT_ONLY | Den vorhandenen `/datenschutz/`- und `/impressum/`-Inhalt für den tatsächlichen Entwurfsumfang prüfen. Es gibt keinen aktiven Anfragekanal oder Datenerfassungs-CTA. Mailbetrieb und Zustelltests sind **aus diesem PR und sämtlichen GitHub-PR-/Issue-Required-Gates ausgelagert**; ihre Ergebnisse sind keine Voraussetzung für die technische Abnahme eines standardmäßig deaktivierten Kanals. |
| Veröffentlichung / Zielseite | BLOCKED | Explizite Owner-Freigabe für genau den finalen HEAD-SHA, die bestehende Zielseite und den genehmigten Wortlaut. Noch **kein** Merge oder produktives Deploy |
| Required Checks und Accessibility | NOT_PROVEN bis finaler CI-Readback | Docker Security Gate, Domain Governance, TRUST/Lint/Tests, Browser QA, CodeQL am finalen SHA; keine erfundenen PASS-Daten |

## Vorgesehener Releaseablauf – nach Beweisschluss, nicht jetzt
`Draft-Code + CI → Owner-Identität/Brand/Rechte/Privacy → endgültiger Text-Review → explizite, SHA-/URL-bezogene Owner-Publikationsfreigabe → separat autorisierter regulärer GitHub-/Deployment-Flow → URL-/HTTP-/Visuell-Readback`

Aus dieser Checkliste **entsteht keine Release- oder Merge-Erlaubnis**. Bei fehlender Evidence **HOLD**, nicht „VERIFIED“ setzen.

## Ausgelagerte E-Mail-Betriebsaufgabe (keine PR-/Issue-Abhängigkeit)

Der Owner hat am 2026-11-23 die Mail- und Postfachprüfung aus allen PRs und Issues herausgelöst. Keine Mailtests vor **2026-12-01**. Der separate einmalige Aufgabeintrag `IONOS Support-Empfang prüfen` ist der alleinige Nachfolger für diesen Betriebsfall; das Repository ist hierfür weder Ausführungsplan noch Status-Ledger. Bestehende historische PR-Kommentare bleiben unangetastet. Die deaktivierten Anzeigen sind **keine** Aussage über den Mailzustand und erzeugen keine neue PR-Mergebedingung.

## Phase B bleibt getrennt
Keine automatische Umwandlung von Anfragen zu Kunden, Bestellung oder Lizenz. Ein entgeltlicher Publisher-/Reseller-Vertrieb erfordert zusätzlich individuellen rechtlich geprüften Vertrag, unterschriebene Asset-Anlage A, überprüfte Rechte-/Delivery-Digests, steuerliche Einordnung und Rechnungspfad. Das interne EUR-99-/290-Ziel und die 25/30-%-Szenarien werden in Phase A nicht öffentlich gezeigt.

Rollback: Diese rein dokumentarische Datei kann einzeln auf dem PR-Branch revertiert werden; kein produktiver Zustand wird verändert.

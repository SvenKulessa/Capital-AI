# Open-Source-Werkzeuge für Vertrags- und Lizenznachweise

Recherche: 01.10.2026. Primary Domain TRUST; Infrastrukturintegration PLATFORM, Dokumentenablage GROWTH. Status: recherchierte Auswahl, nicht installiert, keine Scans ausgeführt und keine rechtliche Freigabe.

| Werkzeug | Einsatz im bestehenden Nachweisprozess | Lizenz und Grenze | Primärquelle |
|---|---|---|---|
| OSS Review Toolkit (ORT) | Dependency-Analyse, Scanner-Orchestrierung, Policy-Auswertung, SPDX/CycloneDX, Notices und Quellarchive | Apache-2.0; ersetzt keine Rechteentscheidung. Als separates Prüfwerkzeug, keine App-Runtime-Abhängigkeit. | https://github.com/oss-review-toolkit/ort |
| ScanCode Toolkit | Datei-/Paketlizenz- und Copyright-Erkennung, JSON/SPDX/CycloneDX für Vendor-Code, Sources und Notices | Eigene LICENSE/NOTICE und Daten-/Komponentenlizenzen der gewählten Version prüfen; Scanergebnis beweist keine Provider-Erlaubnis. | https://github.com/aboutcode-org/scancode-toolkit |
| FOSSology | Manuelle Klärung unklarer Lizenzfunde und Reviewentscheidungen, Ergänzung zu ORT/ScanCode | Lizenz pro gewähltem Release prüfen; zusätzlicher Dienst mit Datenbank und Betriebsaufwand, daher erst bei wiederkehrendem Klärungsbedarf. | https://www.fossology.org/about/ ; https://github.com/fossology/fossology |
| Documenso Community | Vorlagen, Unterzeichnung und Dokumentenverwaltung für echte Providervereinbarungen | AGPL-3.0 Community / kommerzielle Enterprise-Lizenz; signiert Vereinbarungen, beschafft keine Nutzungsrechte. Hosting-, Zertifikats- und Datenschutzumfang separat prüfen. | https://docs.documenso.com/docs/policies/licenses ; https://docs.documenso.com/docs |

## Empfohlener begrenzter Einstieg

Zuerst ORT + ScanCode als Pilot gegen das bestehende Inventar und den freigegebenen Auslieferungsscope. Keine dauerhafte neue Render-Instanz für diesen ersten Schritt. FOSSology erst für unklare Funde; Documenso nur bei eigenem Unterzeichnungsbedarf. Anbieterunterlagen oder vertrauliche Verträge gehören nicht vollständig in dieses öffentliche Repository. Dort nur zulässige Referenzen, Hashes und redigierte Entscheidungen führen.

Vorhandene Vertragsmatrix in `docs/security/evidence/license-rights-review.json` weiterverwenden: Vertrag/Erlaubnis, Gesellschaft/Region, Tarif/Add-ons, Feeds/Symbole/Venues, öffentliche Anzeige, API-Redistribution, abgeleitete Scores/Research, Cache/Retention, Export/Weiterverkauf, Attribution und Gültigkeit. Ein positiver Scanner ersetzt keinen dieser fehlenden Vertragsnachweise.

## Fünf Validierungsschritte

1. Scope: exakten Source-SHA, Kandidaten-/Plattform-Digest, Paketversionen und Toolversion/-Hash binden; tatsächlich ausgelieferte Assets und Providerdaten bestimmen.
2. Erkennung: Dateien und Dependency-/OS-Inventar scannen; unbekannte oder widersprüchliche Lizenzen offen lassen.
3. Verpflichtungen: Notices, vollständige korrespondierende Quellen, erforderliche Lieferwege und konkrete Providervertragserlaubnisse mit geltender Version prüfen.
4. Entscheidung: Nachweise und begrenzte Reviewentscheidung an denselben Auslieferungsscope binden; `REVIEW_OPEN` nicht durch einen Scan automatisch in `APPROVED` umschreiben.
5. Wiederholung: Unterschiede beim nächsten Kandidaten prüfen. Erst nach drei unabhängigen positiven Validierungszyklen wiederkehrende Muster dauerhaft in die begrenzte Self-Healing-Automatisierung aufnehmen. Keine automatische Vertrags-, Lizenz- oder Production-Freigabe.

Aktuell ausgeführte positive Pilotzyklen: **0**.

# CAPITAL-AI Governance & Evidence Sprint — MUSTERBERICHT

> **MUSTER / NICHT DURCHGEFÜHRTE PRÜFUNG** · Stand 2026-11-19. Dieses Dokument ist ein transparentes Formatbeispiel für ein B2B-Angebot. **Es enthält keine Kundendaten, keine echten Testergebnisse und keine Konformitätsbestätigung.**

## 1. Auftrag und Scope (Platzhalter)

- Kunde / Auftraggeber: \`[bei tatsächlicher Beauftragung festzulegen]\`
- Prüfobjekt: **ein** zuvor vereinbartes Repository, höchstens **zwei** vorhandene CI-Workflows.
- Erfasster Main-/Source-SHA: \`NOT_PROVEN — kein Kundencode eingesehen\`
- Zeitraum / Evidence-Cutoff: \`NOT_PROVEN — zu vereinbaren\`
- Zugriffsmodell: nur explizit vereinbarte, minimal nötige read-only Quellen; keine Secrets, Tokens, Rohkundendaten oder produktiven Mutationen.

## 2. Beispieltabelle — keine Befunde

| Feld | Musterstatus | Erforderlicher echter Beleg | Kleinster nächster Schritt |
| --- | --- | --- | --- |
| Build-/CI-Ausführung | NOT_PROVEN | Exakte Job-URL, Commit-SHA, Zeitpunkt, Exit-Code | Berechtigten Job-Readback prüfen |
| Container-/Dependency-Scan | NOT_PROVEN | Scanversion, Datenstand, vollständige relevante Findings, SHA | Berichte auf dieselbe Buildidentität beziehen |
| Governance-/Branch-Protection | NOT_PROVEN | Tatsächliches aktives Ruleset und anwendbare Required Checks | Repo-Schutzkonfiguration lesen |
| Runtime/Release-Identität | NOT_PROVEN | Deployment-ID, Image-/Artefakt-Digest und Laufzeit-Readback | Source ↔ Build ↔ Runtime korrelieren |

**Statussemantik:** VERIFIED ausschließlich mit tatsächlich eingesehenem Beleg und exakter Quellenidentität; BLOCKED bei reproduzierter Sperre; NOT_PROVEN bei fehlender oder nicht überprüfbarer Evidence; REVIEW_REQUIRED bei einem fachlichen Entscheidungsbedarf. Keine erfundenen PASS-Ergebnisse.

## 3. Risikobewertung (Formatvorschlag)

- **P0:** Geheimnis-/Mandanten-/Authentifizierungsgrenze; Entscheidung anhand konkreter Evidence.
- **P1:** Nicht korrelierbare CI-/Artefakt-/Runtime-Identität, soweit sie die Freigabeentscheidung betrifft.
- **P2:** Dokumentation, Observability und nachgelagerte Betriebsqualität.

Keine dieser Prioritäten ist ein echter Kundenbefund.

## 4. Ergebnis und Maßnahmen

1. Tatsächliche Quellen und Zeitbezug erfassen; SHA-/Run-/Artefakt-Referenzen gegenprüfen.
2. Findings mit Reproduzierbarkeit, Risiko und kleinster reversibler Maßnahme dokumentieren.
3. Offene Nachweise und Restunsicherheiten im Ergebnisgespräch erläutern.

## 5. Übergabe

- Bericht mit Quellen-/Evidence-Matrix und priorisierten Maßnahmen; Ergebnisgespräch bis 30 Minuten.
- **Nicht enthalten:** Penetrationstest, laufendes Monitoring, M365-Tenant-Scan, Audit-Zertifizierung, behördliche Freigabe, Rechtsberatung, DORA-/ISO-/DSGVO-Garantie oder automatische produktive Änderungen.
- Ein tatsächlicher Bericht würde nur nach Scopevereinbarung, Datenschutz-/Vertragsklärung und nachweisbarer technischer Prüfung erstellt.

## 6. Angebotsgrenze und Datenschutz

Ein Pilot-Richtwert von **690 € netto** ist eine **unverbindliche Preis-/Kalkulationshypothese**, kein festes Checkout-SKU und keine automatische Leistungspflicht. Erst eine individuelle schriftliche Leistungsvereinbarung legt Preis und Umfang fest. Die öffentliche Kontaktanfrage nutzt die bereits vorhandene \`/api/public/contact\`-Route (gleiches Origin, SMTP-TLS, Antwortadresse/Nachricht, kurze Retry-Metadaten im Serverspeicher). Keine neue CRM-/Lead-Datenbank, keine Kontaktinhalte an Analytics, keine Newsletter-Einwilligung. Die Datenschutzinformationen der Website gelten für den Anfrageweg.

## 7. Release-/Evidencegrenze

Landingpage-Quellcode und bestandene CI beweisen weder Live-Erreichbarkeit noch SMTP-Zustellung, rechtliche Einzelfallfreigabe oder Kundennachfrage. Keine Live-Freigabe, kostenpflichtige Aktivierung, Provider-Berechtigungsänderung oder automatisches Publizieren aus diesem Muster ableiten.

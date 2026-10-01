# Lizenzabschluss vor dem einmaligen Publish

Stand 01.10.2026, Basis-Main `44fdad6d8a70d849ab1545b55d881d4cabd8d0b7`. Der Owner hat Publish, anschließenden Deploy desselben attestierten Digests und Abnahme beauftragt. Dies ist die Ausführungsfreigabe, keine Behauptung zusätzlicher Drittanbieterrechte. Lizenzstatus bleibt REVIEW_OPEN und deployEligible=false, bis die tatsächlichen Belege vorliegen.

## Fünf Validierungsschritte

1. **Scope lesen:** Die vorhandene Evidence betrifft ed594ef93f66ee8f13f67d75dde56f46a95b1cd6. Der neue Main und der aktive Kandidat 4fbd1373b07092ed8ef550f60e9cf60f1f3f526d sind davon zu unterscheiden. Offene PRs 75/76 und Dependency-Majors wurden nicht übernommen.
2. **Technisch schließbare Font-Lücke:** Beide unveränderten TTFs und OFL wurden aus google/fonts am bereits dokumentierten Commit 23e54b51ddffbc7713c583748e3bd86f62b1fa4a abgerufen. Git-Blob-IDs wurden gegen die frische Upstream-Verzeichnisantwort geprüft; SHA-256/Bytegrößen sind in public/fonts/provenance.json hinterlegt. OFL stimmt bytegenau mit dem vorhandenen archivierten Text überein. Keine Fontsoftware geändert oder neu lizenziert.
3. **Auslieferung prüfen:** index.html lädt lokale CSS; beide Variablenfonts (normal/italic, 200–800) sowie OFL und Provenienz werden über Vite public/ und Docker COPY ausgeliefert. TTF-MIME und Footer-Lizenzverweis ergänzt; CSP erlaubt nur eigene Fontquellen. Hash-, Upstream-, Lizenz- und Docker-Kontext-Regressionen prüfen diese Kopplung. Die tatsächliche spätere Image-Auslieferung bleibt am finalen Digest zu bestätigen.
4. **Offene Rechte exakt halten:** Die Tabelle unten bleibt REVIEW_OPEN. Quelle/Herkunft, Lizenztext, erfolgreicher Scan und allgemeine Ausführungsfreigabe ersetzen keine fehlende konkrete Rechte-/Scope-Evidence. Die bestehende applicationSourceSha und legalApproval werden nicht erfunden oder auf einen ungeprüften Stand umgeschrieben.
5. **Publish/Promote ohne Neubuild:** Erst nach scoped Review und gültiger Source-Bindung finalen Main erneut lesen. .github/workflows/build-security.yml per workflow_dispatch auf refs/heads/main: publish_candidate=true, verify_production_handoff=false. Vor Dispatch Main-SHA prüfen und nach Run den tatsächlichen head_sha vergleichen. Danach candidate.json, Artifact-Hashes, alle Scanberichte, I/P/K, Provenance und SBOM prüfen. Ziel ausschließlich AICapital/Capital-AI (tea-d90o4rj7uimc739i86ug / srv-dau1rp893c1s73cdhm1g). Konfiguration und Deploy verwenden die attestierte ghcr.io/svenkulessa/capital-ai@sha256:…-Referenz, keinen Tag und keinen Rebuild. Abnahme mit vorhandenen Validatoren und frischem Runtime-Readback. Der kombinierte Publish/Handoff-Workflow wird nicht als späterer bloßer Readback erneut gebaut.

## Tatsächlich verbleibende Lizenznachweise

| Scope | Bereits vorhanden | Für Abschluss erforderlich |
|---|---|---|
| OS-/Basisimage-Binaries | Versionen, Alpine-Rezepte, einige Originaltexte/Source-Header | Vollständige korrespondierende Quellen inkl. Patches/Buildinputs, Auslieferungs-/Hinweispflichten und Zuordnung zu genau den Image-Binaries |
| Hero-Erdbild | Hash aae54844…, Owner-Herkunftsstatement | Erstellungsreferenz/Generator und dafür geltende Nutzungsbedingungen bzw. belastbare Rechtebestätigung für die kommerzielle Verwendung |
| Logos/Markenzeichen | Owner-Logo-Nutzung, Inline-Symbolinventar | Herkunft und einschlägige Brand-/Markenbedingungen für tatsächliche Darstellungen |
| Binance/Kraken/Twelve Data/Polygon-Massive | Adapter und Primärquellenhinweise, licenseScope=unverified | Vertrag/Erlaubnis mit Einheit/Region, Tarif, Feeds, öffentlicher Anzeige, API-Weitergabe, abgeleiteten Scores, Cache/Retention, Export und Attribution |
| Font | Gepinnte Originalbytes, OFL, lokale Auslieferung und Tests | Bestätigung derselben Dateien im finalen Image; Bestandteil des scoped Gesamt-Reviews |
| Gesamt-Review | REVIEW_OPEN; legalApproval=null | Tatsächliche Reviewer-/Owner-Entscheidung und gültige Bindung an den zu veröffentlichenden Source/Image-Scope |

Vertrauliche Vertragsinhalte und Secrets gehören nicht ins öffentliche Repo. Dort sind nur geprüfte, nicht vertrauliche Nachweisreferenzen und Entscheidungen zu dokumentieren. Eine pauschale APPROVED-Markierung ist nicht die Erledigung dieses Arbeitspakets.

AP-SEC-IMAGE bleibt GEHALTEN; die bereits belegte technische Identität des aktiven historischen Kandidaten bleibt bestehen. Domain-Inventar und Cutover-/Rollback-Vorbereitung können beginnen. DNS, SMTP/Auth-Abnahme und Finance-Ablösung bleiben getrennt. Keine dauerhafte Self-Healing-Regel vor drei unabhängigen positiven Validierungen; diese Font-Kopplung ist zunächst durch gezielte Regressionen abgesichert.

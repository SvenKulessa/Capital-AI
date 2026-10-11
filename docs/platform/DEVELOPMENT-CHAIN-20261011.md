# Development Chain: Chat → PR → CI → Release → Runtime

Stand: 2026-10-11. **Arbeits-/Evidence-Referenz, keine zusätzliche Governance.**
Alle Autorisierung, Required Checks und Merge-Regeln stehen ausschließlich in `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`).

## Ziel

Eine einzige nachverfolgbare Umsetzungskette statt isolierter Statusberichte. Bestehende Workflows weiterverwenden; keine neuen Pflichtreviews, Admission-Gates, zusätzlichen Required Checks oder neuen kostenpflichtigen Ressourcen.

| Stufe | Prüffrage | Artefakt / Nachweis | Nicht automatisch bewiesen |
| --- | --- | --- | --- |
| Chat-Auftrag | Welche konkrete Nutzerwirkung ist gewünscht? | Ziel, Scope, Nicht-Ziele, testbare Abnahme, Risiken | Umsetzbarkeit ohne Quellcode |
| Branch | Auf welchem Main-Baseline-Commit basiert die Änderung? | `git rev-parse main`, Scope-Abgleich mit offenen PRs | Aktualität eines älteren PR-Branches |
| Implementierung | Ist die kleinste vollständige Wirkung implementiert? | Code-/Konfigurationsdiff und gezielte Tests | Funktion in Production |
| PR | Kann der Owner die Wirkung und Rücknahme beurteilen? | PR-Template, Change-/Test-/Rollback-Evidence | Merge-Authority |
| CI | Sind exakt die bestehenden Required Checks erfolgreich? | Docker Security Gate, Domain Governance, zugehörige Run-IDs | End-to-End-Produktionswirkung |
| Version / Release | Ist der auszuliefernde Stand identifizierbar? | Main SHA, `VERSION`, `CHANGELOG.md`, optional OCI Digest | Automatische Tag- oder Produktfreigabe |
| Deployment | Läuft der erwartete Commit / das erwartete Artefakt? | Render-Deploy, Health, Source-Identität, Logs | Echte Geschäftsfunktion ohne Readback |
| Website & Commerce | Stimmt das sichtbare Versprechen mit der tatsächlichen Funktion überein? | Landingpage, Produkt/Preis, Checkout, Auth, Entitlement, SEO, Rights, Browser-Readback | Umsatz / Conversion |
| Folgearbeit | Was bleibt wirklich offen? | konkrete Folgeaufgabe, Besitzer, Scope, Evidenzstand | freigegebene Umsetzung oder Providerrechte |

## Chat-Auftrag: Mindestinformation ohne neuen vorgeschalteten Gate

Ein guter Befehl enthält **erwartete Wirkung**, **Scope**, **Abnahmekriterien**, **Ausschlüsse** und **Evidenzanforderungen**. Fehlende Details aus aktuellem Code und bestehender Evidence ableiten, soweit sicher möglich; nicht unnötig mit Formularen, vorgeschalteten Reviews oder abstrakten Planungs-PRs blockieren.

Beispiel:

```text
Prüfe auf aktuellem main den Learning-Portal-Checkout.
Ziel: Angebote, Preis und Entitlement sind für Nutzer konsistent.
Ändere nur den betroffenen App-/Test-/Dokumentations-Scope.
Akzeptanz: reproduzierbarer Vertrags-/UI-Test und nachvollziehbarer PR-Diff.
Keine realen Zahlungen, Provideraktivierung oder Production-Mutation.
Berichte Code-, Test- und Runtime-Status getrennt und benenne Rollback.
```

## PR-Erstellungsqualität

Ein PR belegt **eine abgeschlossene, nach Merge nutzbare Änderung**. Unfertige Vorbereitung nicht als Feature deklarieren. `.github/pull_request_template.md` hält diese Aussagen zusammen:

- **Was ändert sich?** Nutzerwirkung, Scope, Abnahmekriterien und unveränderte Grenzen.
- **Was ist tatsächlich belegt?** Testkommando, untersuchter Source-SHA, GitHub-Check und CI-Laufzeit.
- **Welche Nachwirkungen?** Website-/Lizenz-/Security-Folgen, Release-/Docs-Auswirkung und komponentenspezifischer Rollback.

Es bleiben exakt zwei Required Checks: `Docker Security Gate` und `Domain Governance`. Eine PR bleibt ohne explizite PR-bezogene Freigabe des Owners ungemergt.

## Pipeline-Effizienz: messen, dann optimieren

`scripts/ci-efficiency-report.mjs` erhebt read-only vorhandene Workflow-/Job-Zeitstempel. Erweiterung: je Workflow, Ereignistyp (`pull_request`, `push` usw.) und CI-Schritt Anzahl, aufsummierte gemessene Sekunden, Median, p95, Maximum und gemessene Fehlversuche. PR- und Main-Push-Laufzeiten bleiben getrennte Vergleichskohorten. Fehlende oder übersprungene Schrittdaten werden nicht erfunden. Die wöchentliche Evidence unter `.github/workflows/ci-efficiency-report.yml` zeigt die teuersten beobachteten Schritte; Output liegt im bestehenden Actions-Artefakt.

```bash
# Im Repository ausführen: reine Unit-Tests, kein Provisioning.
node --test scripts/ci-efficiency-report.test.mjs
npm run lint
npm run test:seo
# Nur mit vorhandenem GH_TOKEN / GITHUB_TOKEN: read-only API-Abfrage.
CI_LOOKBACK_HOURS=168 CI_MAX_RUNS=300 node scripts/ci-efficiency-report.mjs
```

Die Report-Quellen können auf 300 Runs begrenzt sein (`truncated` beachten). Job-/Schritt-Walltime ist **kein** GitHub-Abrechnungsnachweis, kein Cache-Hit-Rate-Nachweis und kein Service-SLO. Optimierungen erst anhand vergleichbarer Run-Scopes bewerten, insbesondere Build-Scans, Docker-Caching, Lizenzscan, parallele Actions und `npm ci`. Keine Tests oder Scans lediglich für kürzere Zeiten entfernen.

## Versionen, automatische Aktualisierung und Release

1. **Dependencies:** `.github/dependabot.yml` aktualisiert npm, GitHub Actions und Docker-Abhängigkeiten als PR-Kandidaten. Lockfiles und Sicherheits-/Lizenzwirkung bleiben in den bestehenden Checks verifizierbar. Kein automatischer Merge aufgrund einer Version.
2. **Produktversion:** `VERSION` enthält die aktuelle semantische Produktversion; `CHANGELOG.md` dokumentiert veröffentlichungsrelevante Änderungen. Versionsbump nur zusammen mit tatsächlich geänderter Release-Wirkung; nicht pro Chat-Nachricht und nicht bei jedem CI-Run. Tags oder GitHub Releases sind erst nach belegter Release-Entscheidung zu erzeugen.
3. **Production:** `render.yaml` definiert den normalen Main-basierten Render-Pfad mit `autoDeployTrigger: checksPass`. Der optionale OCI-Candidate-/Production-Handoff in `.github/workflows/build-security.yml` ist davon zu unterscheiden. Keine Release-Evidence behaupten, ohne dass Source-SHA, Runtime-SHA und ggf. OCI-Digest tatsächlich korreliert wurden.
4. **Dokumentation:** Living Docs per bestehenden `scripts/documentation-drift.mjs` und `scripts/generate-documentary.mjs` gegen Quellcode prüfen; historische Evidence bleibt unverändert. Automatische Korrekturen von Vertrags-, Lizenz-, Rechtstexten, Preisangaben oder Produktversprechen nicht aus einer Versionsnummer ableiten.

## Chat- und Release-Evidence (ohne zusätzliche Freigabestufe)

Bei einem umsetzbaren Chat-Auftrag sind Ziel, kleinster wirksamer Scope, konkrete Abnahme und Rücknahmeoption die Ausgangspunkte. Ein Reviewer kann diese direkt auf die PR-Felder abbilden. Für Versionierung und Release gilt: Auto-Updates von Dependabot sind Kandidaten; automatische Dokumentprojektionen sind nur für maschinenlesbare, aus Source abgeleitete Inhalte zulässig. Preis-/Lizenz-/Rechtsaussagen werden nie ohne aktuelle Quelle automatisch geändert. Freigegebene Releases brauchen zugeordneten Main-SHA, erfolgreich verifizierte technische Checks, unveränderliche Artefaktidentität, nachvollziehbares Changelog und verifizierte Produktionsidentität. Fehlt ein Element, bleibt es NOT_PROVEN.

## Website-Plausibilität und Monetarisierung

Der relevante öffentliche Pfad ist **SEO → glaubwürdiger Inhalt → echtes Angebot → Checkout → Entitlement → belegte Nutzung**. Prüfen: sichtbare Claim-/Rechtebasis, tatsächlichen Stripe-Produkt-/Preisreadback, Auth-Grenze, fehlgeschlagene Zahlungen, Mobilansicht, Canonicals, robots/Indexierung, Impressum/Datenschutz und Barrierefreiheit. Ein grüner Unit-Test genügt nicht als echter Browser- oder Zahlungsverifikationsnachweis.

Content-/Social-Publishing bleibt bei fehlendem Legal-Receipt und Hybrid-Approval blockiert. Nutzereigene BYOK-Ergebnisse bleiben außerhalb öffentlicher Feeds und gemeinsamer Caches. NATS/Rust-Pause und Provider-Rechte werden durch diese Entwicklungsoptimierung nicht geändert.

## Zustände und Rollback

Pro Aussage einen belegten Zustand verwenden: `CODE_PRESENT`, `TEST_PASS`, `RUNTIME_VERIFIED`, `PRODUCTION_READY`, `NOT_PROVEN` oder `BLOCKED`. Jeder Zustand muss auf den konkret geprüften Commit und Scope bezogen sein. Fehlgeschlagene Checks werden nicht als `SKIPPED`/PASS umetikettiert.

Konservativer Rollback: den betroffenen PR-/Main-Commit über den normalen Owner-Pfad revertieren; nur tatsächlich betroffene Services neu deployen. Vor Datenbank-Migrationen gesondert Vorwärts-/Rückwärtskompatibilität und Datenwiederherstellung belegen. **Kein NATS-Redeployment allein wegen eines Main-HEAD-Wechsels.**

## Nachmessung

Nach dem Merge an zwei vergleichbaren CI-Run-Gruppen validieren, ob sich gemessene Median-/p95-Dauer von `Docker Security Gate` und Top-Schritten verbessert oder verschlechtert. Ein `CODE_PRESENT`-Befund am PR genügt für die Änderung der Reporting-Software; der Effekt auf regelmäßige CI-Effizienz bleibt bis zu echten Messungen `NOT_PROVEN`.

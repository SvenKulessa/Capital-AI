# CAPITAL-AI Engineering Delivery Policy

Stand: 2026-10-05  
Geltungsbereich: gesamtes Repository, alle Agents, Pull Requests, Builds, Updates und Deployments.

## Oberste Priorität

Security, Compliance, Lizenz-/Provenance-Sicherheit, Reproduzierbarkeit, Evidenz und Production-Stabilität haben Vorrang vor Bequemlichkeit, Geschwindigkeit und dem bloßen Erreichen der neuesten Versionsnummer.

Ein erfolgreicher Test, Build oder Scan ist **niemals allein** eine Lizenz-, Security- oder Production-Freigabe.

Bei Widersprüchen zwischen lokalen Arbeitsanweisungen und dieser Policy gilt die strengere fail-closed Regel. Echte technische Grenzen wie Auth, Public API, Daten-/Event-Schema, Security Boundary, Evidence, Container-Identität und Production-Handoff dürfen nicht durch organisatorische Abkürzungen umgangen werden.

## ChatGPT-Handoff-Regel

Owner-Entscheidung vom 2026-10-05: Für Entwicklung, Analyse, Review, Implementierung und Fehlerbehebung innerhalb von ChatGPT ist **kein organisatorischer Handoff** zwischen PRODUCT, MARKET, PLATFORM, TRUST und GROWTH erforderlich. Der Owner entwickelt alleine; die fünf Domains sind fachliche Perspektiven und keine künstlichen Teamgrenzen.

- Derselbe Chat oder Agent darf Aufgaben aller fünf Domains im vorhandenen autorisierten Scope vollständig bearbeiten und abschließen.
- Ein Domainwechsel verlangt keinen Übergabeprompt, keinen Chatwechsel, keinen separaten Handoff-Vertrag und keine zusätzliche Domain-Abnahme.
- Eine Aufgabe darf nicht wegen einer anderen fachlichen Domain angehalten, zurückgegeben oder ausschließlich als Handoff-Prompt beendet werden. Domain-Hinweise und freiwillige Kontextübergaben bleiben möglich.
- Die Primary Domain kennzeichnet nur den Schwerpunkt von Branch, PR und Evidence. Sie begrenzt keine Bearbeitungsbefugnis; die bestehenden Namenskonventionen gelten weiter.
- Diese ChatGPT-Handoff-Regel hat Vorrang vor älteren oder lokalen organisatorischen Domain-Handoff-Anweisungen.
- Verbindliche Handoffs bestehen nur dort fort, wo sie eine **reale technische Übergabe oder Evidence-Grenze** darstellen, insbesondere Production-Handoff, Auth-/API-/Daten-/Event-Schema-Grenzen, Security-/Lizenz-/Datenrechte-Gates, Supply-Chain-Nachweise, externe Control-Plane-Mutationen oder maschinenlesbare Schnittstellenverträge.
- Ein technischer Handoff ist kein Chatwechsel und keine organisatorische Domain-Abnahme. Derselbe Chat darf auch den technischen Handoff bearbeiten, sofern Scope und konkrete Autorisierung dies erlauben.
- Prüfungen und Freigaben werden ausschließlich über konkrete, risikobasierte technische Gates und belastbare Evidence abgebildet. Ein erfolgreicher Test ersetzt keine Security-, Lizenz-, Owner- oder Production-Freigabe.
- Maschinenlesbare Evidence-/Datenverträge, einschließlich `GROWTH_HANDOFF@1`, bleiben an ihren technischen Schnittstellen gültig; sie begründen keine Pflicht zu einem Chat- oder Domainwechsel.
- Die Regel gilt repository- und anwendungsweit für alle fünf Domains sowie für Web- und Mobile-Arbeit, die diese Root-Policy verwendet. Sie ändert gespeicherte ChatGPT-Projekteinstellungen und Richtlinien anderer Repositories nicht automatisch.

## Chat-Ausgabe: Status-Snippets

Für Status-, Review-, Handoff-, Implementierungs- und Abschlussmeldungen in ChatGPT gilt repositoryweit:

- **Erledigte Schritte** und **offene bzw. nächste Schritte** müssen am Ende der Antwort in **zwei getrennten Code-Snippets** dargestellt werden.
- Beide Statusblöcke dürfen **nicht** zu einem gemeinsamen Snippet zusammengeführt werden.
- Der erste Block beginnt mit `✅ ERLEDIGT` und enthält ausschließlich bereits tatsächlich ausgeführte, verifizierte oder nachweislich abgeschlossene Schritte.
- Der zweite Block beginnt mit `🔧 OFFEN / NÄCHSTE SCHRITTE` und enthält ausschließlich noch ausstehende, blockierte, geplante oder als Nächstes zu prüfende Schritte.
- Nicht ausgeführte Arbeiten dürfen nicht unter `✅ ERLEDIGT` erscheinen. Ein grüner Test oder Check darf nur als erledigte **Evidence** genannt werden und ersetzt keine Security-, Lizenz-, Governance-, Owner- oder Production-Freigabe.
- Wenn für eine Antwort eine der beiden Kategorien leer ist, bleibt der betreffende Snippet trotzdem separat erhalten und enthält eine eindeutige Angabe wie `- keine`.
- Zusätzliche Statusangaben wie `BLOCKED`, `PENDING`, `APPROVED`, `MERGED` oder `PRODUCTION-HANDOFF` dürfen außerhalb oder innerhalb der passenden Kategorie ergänzt werden, dürfen aber die Trennung der beiden Snippets nicht ersetzen.

Beispiel:

```text
✅ ERLEDIGT
- CURRENT_MAIN geprüft
- Required Checks ausgewertet
```

```text
🔧 OFFEN / NÄCHSTE SCHRITTE
- Security-Finding schließen
- betroffene Required Checks und technische Gates neu bewerten
```

## Domain-Einstiegspunkt

Für **jede** Domain und jede neue Arbeitssitzung ist der erste verbindliche Kontext `AGENTS.md@currentmain`.

- Vor Planung, Änderung, Review oder Merge ist `AGENTS.md` vom **aktuellen `main`** zu lesen; eine ältere Branch-Kopie ist nicht als kanonische Policy ausreichend.
- PRODUCT, MARKET, PLATFORM, TRUST und GROWTH übernehmen diese Root-Policy vollständig als übergeordneten Contract.
- Domain-spezifische Dokumente und `AGENTS.md`-Dateien dürfen die Root-Policy konkretisieren oder verschärfen, aber nicht abschwächen.
- Weicht ein Feature-Branch vom aktuellen `main` ab, ist vor einer zustandsverändernden Aktion erneut gegen `AGENTS.md@currentmain` und den aktuellen Main-SHA zu korrelieren.
- PRs sollen im Evidence-/Review-Text bestätigen, dass der aktuelle Root-Contract berücksichtigt wurde.

## Standardmodell für Änderungen und Updates

1. **CURRENT MAIN zuerst** — vor jeder Änderung gegen den aktuellen `main`-SHA korrelieren.
2. **Frischer Branch** — Änderungen beginnen auf einem aktuellen `capital-ai-<domain>/<purpose>-YYYYMMDD` Branch.
3. **Klassifizieren** — Security, Patch, Minor oder Major sowie betroffene Domain und Runtime bestimmen.
4. **Patch/Minor** — dürfen bei niedrigem Risiko als Routine-Updates gebündelt werden, bleiben aber test-, lizenz- und evidenzpflichtig.
5. **Major** — immer als eigene Migration behandeln: Release Notes/Migrationshinweise, API-/Typ-/Runtime-Kompatibilität, Quellcode-Suche nach Breaking Changes, Lizenz/Provenance, Lockfile-Diff und Rollback prüfen.
6. **Security-Updates** — nicht durch Komfortregeln unterdrücken. Kritische Fixes dürfen schneller bearbeitet werden, aber Production-Gates bleiben unverändert.
7. **Konflikte** — keine pauschale `ours/theirs`-Auflösung für Lockfiles, Vendor-Patches oder Security-Evidence. Von aktuellem `main` rekonstruieren und bereits neuere sichere Änderungen bewahren.
8. **Neueste stabile Version** — bevorzugen, wenn unterstützt und kompatibel. "Latest" ersetzt keine Migrationsprüfung.
9. **Self-Healing** — wiederkehrende sichere Reparaturmuster nur nach expliziter technischer Zulassung eines reproduzierbaren Fix-Fingerprints als automatische Invariante fest verankern.
10. **Post-Merge-Korrelation** — nach einem Merge nach `main` muss bei tatsächlicher Datei-, Contract-, Lockfile-, Runtime- oder Evidence-Überschneidung eine Rekorrelation betroffener offener Arbeiten gegen den neuen Main erfolgen. Der kanonische Contract ist `POST_MERGE_CORRELATION@3` in `docs/security/POST-MERGE-CORRELATION-SELF-HEALING.md`. Automatische Fixes bleiben auf explizit zugelassene, deterministische Low-Risk-Fingerprints begrenzt. Ein neuer Repository-HEAD allein ist weder ein Deployment- noch ein NATS-Redeploy-Signal.

## Kritischer Preflight vor Pull-Request-Erstellung

Für jeden neuen Pull Request muss der exakte Branch-Head **vor der PR-Erstellung** einen kritischen Preflight erfolgreich durchlaufen haben. Der Preflight ist Evidence für den Branch-Head und ersetzt weder Required Checks noch Security-, Lizenz-, Governance-, Owner- oder Production-Freigaben.

- Mindestumfang nach `npm ci --ignore-scripts --no-audit --no-fund`: `npm run preflight:full`.
- Domain-/Scope-kritische Regressionen müssen zusätzlich ausgeführt werden, wenn sie nicht bereits vollständig im Full-Preflight enthalten sind.
- Änderungen unter `.github/workflows/**` müssen vor der PR-Erstellung gegen den aktuellen Main-Workflowbestand geprüft werden: Trigger, Required-Check-Namen, SHA-Pinning externer Actions, Permissions/Least-Privilege und unbeabsichtigte Scan-/Build-Duplikate.
- Der Feature-Branch-Push-Workflow `Pre-PR Critical Preflight` liefert dafür repositoryseitige Evidence. Bei einem durch Agenten erstellten PR ist dessen erfolgreicher Lauf auf dem exakten Head abzuwarten.
- Ein nach PR-Erstellung korrigierter älterer PR kann die zeitliche Reihenfolge nicht rückwirkend erfüllen; für seinen neuen exakten Head ist der gleiche Preflight dennoch vor weiterer Merge-Bewertung nachzuholen.
- Ein grüner Preflight ist niemals allein Merge-, Lizenz-, Security- oder Production-Freigabe.

## Public-Repository PR- und Standard-Runner-Regel

Owner-Entscheidung vom 2026-10-05: `SvenKulessa/Capital-AI` ist öffentlich. Das Erstellen oder Aktualisieren eines Pull Requests darf nicht wegen gewöhnlicher GitHub-Actions-Minuten, Standard-GitHub-Hosted-Runnern oder einer pauschalen Runner-Kostenbetrachtung verzögert, blockiert oder von einer zusätzlichen Owner-Freigabe abhängig gemacht werden.

- Für PRs dürfen die repositoryseitig vorgesehenen Standard-GitHub-Actions und Required Checks automatisch anlaufen.
- Ein Agent muss vor dem Erstellen eines PRs nicht auf verfügbare Standard-Runner-Minuten warten und keine separate Runner-Kostenfreigabe einholen.
- Fehlende, laufende oder fehlgeschlagene Required Checks verhindern nicht die PR-Erstellung, können aber weiterhin Review-, Merge- oder Production-Gates blockieren.
- Diese Regel ist keine pauschale Kosten- oder Production-Freigabe. Kostenpflichtige Larger Runner, zusätzliche Storage-/Compute-Ressourcen, neue kostenpflichtige GitHub-Produkte, manuelle Production-Deployments sowie Billing-, Auth-, DNS-, Secret-, Ruleset- oder sonstige privilegierte Mutationen behalten ihre eigenen Gates.
- Security-, Lizenz-, Governance-, Supply-Chain- und Production-Handoff-Anforderungen bleiben vollständig bestehen.

## Update-Trust-Contract

Für **jedes** Update, Upgrade, Patch und jeden dependency-bezogenen Bugfix gilt zusätzlich eine verpflichtende Herkunfts- und Community-Gegenprüfung.

### Zielzustand: latest stable, aber verifiziert

- Verwendet wird grundsätzlich die **neueste stabile, unterstützte Version**, sobald sie für CAPITAL-AI kompatibel ist und die nachfolgenden Trust-Gates erfüllt.
- Pre-Releases, Nightlies, RCs und experimentelle Builds werden nicht als Routine-Update übernommen.
- Ein neuer Versionsstand wird nicht allein deshalb akzeptiert, weil Registry, Dependabot oder ein Versionsscanner ihn als "latest" meldet.

### Verbindliche Quellenhierarchie

Mindestens folgende Evidenzklassen sind zu prüfen und im PR nachvollziehbar zu dokumentieren:

1. **Offizielle Herkunft** — Maintainer-/Vendor-Repository, offizieller Release/Tag/Changelog und gegebenenfalls offizielle Security Advisories.
2. **Registry-/Artefakt-Evidenz** — erwarteter Paketname/Namespace, Publisher/Maintainer, Version, Lockfile, Registry-URL, Integritäts-Hash sowie verfügbare Provenance/Signaturen/Attestations.
3. **Security-Intelligence** — GitHub Advisory Database/Dependabot, OSV/CVE und die im Projekt vorgesehenen Vulnerability-/Secret-/Misconfiguration-Scanner.
4. **Lizenz/Redistribution** — SPDX-/Lizenzmetadaten, Lizenztext, NOTICE-/Attributionspflichten und Änderungen gegenüber der bisher verwendeten Version.
5. **Maintainer-/Community-Gegenprüfung** — offizielle Issues, Discussions, Security-Kanäle oder die etablierte Community des jeweiligen Projekts auf Hinweise zu kompromittierten Releases, Account-/Maintainer-Takeover, Typosquatting, zurückgezogenen Releases, schädlichen Install-Skripten, unerwarteten Ownership-Wechseln oder regressiven Breaking Changes prüfen.

Community-Signale sind zusätzliche Evidenz und ersetzen niemals die offizielle Herkunftsprüfung. Umgekehrt reicht ein formal korrekt veröffentlichtes Paket nicht aus, wenn seriöse Maintainer-/Community- oder Security-Hinweise auf eine mögliche Kompromittierung bestehen.

### Fail-closed Regeln

Ein Update bleibt **BLOCKED**, wenn mindestens einer der folgenden Punkte ungeklärt ist:

- Herkunft, Publisher oder Namespace ist nicht eindeutig verifizierbar.
- Version/Tag, Registry-Artefakt oder Integritäts-/Provenance-Evidence widersprechen sich.
- Es bestehen glaubhafte ungeklärte Hinweise auf Supply-Chain-Kompromittierung, Maintainer-Takeover oder Typosquatting.
- Lizenz oder Redistribution-Rechte sind unklar oder haben sich inkompatibel geändert.
- Install-/Postinstall-Skripte, neue Binärartefakte oder neue Netzwerkzugriffe erscheinen ohne nachvollziehbaren Grund.
- Ein Major-Upgrade wurde nicht gegen dokumentierte Breaking Changes und betroffenen Anwendungscode geprüft.

### Mindest-Evidenz je Update

Jeder Update-PR soll mindestens festhalten:

- bisherige und neue Version,
- Update-Klasse: Security/Patch/Minor/Major/Bugfix,
- offizielle Release-/Changelog-Quelle,
- Security-/Advisory-Ergebnis,
- Lizenz-/Provenance-Ergebnis,
- Maintainer-/Community-Gegenprüfung mit Datum,
- relevante Breaking Changes beziehungsweise "keine gefunden",
- Lockfile-/Transitive-Dependency-Diff,
- ausgeführte Tests/Scans,
- verbleibende Risiken und Rollback-Pfad.

Für Security-sensitive Komponenten, Major-Upgrades, Auth, Runtime, CI/CD, Container, Broker und Deployment-Infrastruktur sind mindestens **zwei voneinander unabhängige Evidenzklassen zusätzlich zur Registry** erforderlich.

## Remote AI Cloud Browser Changes

Jede **zustandsverändernde** Aktion an externen Systemen, die durch eine AI-gestützte Cloud-Browser-Sitzung im Namen des Owners ausgeführt wird, muss verpflichtend als **"Remote AI basierte Cloud Browser Sitzung — durch den Owner freigegeben"** dokumentiert werden.

Dabei gelten mindestens folgende Regeln:

- Ausführungsmodus und Owner-Freigabe müssen explizit benannt werden.
- Die Evidence muss Zielsystem, Scope, Zweck, konkrete Änderungen, Ergebnis, providerseitigen Readback und Rollback-Möglichkeit enthalten.
- Es darf nicht der Eindruck entstehen, der Owner habe eine konkrete UI-Aktion persönlich ausgeführt, wenn diese tatsächlich durch die AI-gestützte Remote-Sitzung erfolgte.
- Secrets, Tokens, Session-Cookies, Recovery Codes und andere Zugangsdaten dürfen nicht in Evidence oder Screenshots gespeichert werden.
- Kritische Änderungen an Auth, Billing, DNS/Domain, Production, Branch Protection oder Security Controls benötigen zusätzlich einen verifizierten Endzustand.
- Die Session-Dokumentation ersetzt keine Required Checks, Security-/Lizenz-Gates oder Production-Handoff-Freigaben.

Verbindliche Detailregel:
- `docs/security/REMOTE-AI-CLOUD-BROWSER-SESSIONS.md`

## Tool- und Plugin-First-Nutzung

Für alle Domain-Chats und Agents gilt: bereits verfügbare und für die Aufgabe geeignete Tools, Plugins, Connectoren und spezialisierte Skills sollen aktiv genutzt werden, wenn sie die Evidenz, Korrektheit, Aktualität, Reproduzierbarkeit, Sicherheit, Geschwindigkeit oder Ergebnisqualität sinnvoll verbessern.

### Generelle Owner-Freigabe für Low-Risk-Nutzung

Der Owner erteilt eine generelle Freigabe für **niedrigriskante** Tool-/Plugin-Nutzung ohne erneute Einzelbestätigung. Dazu zählen insbesondere:

- Read-only Recherche, Suche und Dokumentationsabruf,
- Repository-/Datei-/Konfigurationsanalyse ohne Zustandsänderung,
- Security-, Lizenz-, Provenance- und Dependency-Analyse,
- Benchmarking und Vergleichsmessungen ohne produktive Seiteneffekte,
- lokale oder isolierte Analyse-/Validierungswerkzeuge,
- Abruf von Status-, Metadaten-, Log- oder Evidence-Informationen,
- Nutzung spezialisierter Domain-Tools zur Verbesserung oder Verifikation eines Ergebnisses.

Vor einer Aufgabe soll geprüft werden, ob ein vorhandenes spezialisiertes Tool/Plugin gegenüber einer generischen oder manuellen Lösung einen belastbaren Vorteil bietet. Tool-Nutzung darf nicht Selbstzweck sein.

### Grenzen der generellen Freigabe

Die Low-Risk-Freigabe ist **keine pauschale Schreib- oder Produktionsvollmacht**. Bestehende strengere Regeln bleiben vorrangig. Eine gesonderte Freigabe bzw. das dafür definierte Gate bleibt erforderlich, wenn eine Aktion insbesondere:

- externe Daten, Konfigurationen oder Ressourcen zustandsverändernd schreibt/löscht,
- Build-, Test-, Deploy- oder andere kostenrelevante Workflows startet, soweit hierfür eine Owner-Freigabe vorgeschrieben ist,
- Production, DNS/Domain, Auth, Billing, Branch Protection, Rulesets oder Security Controls verändert,
- Secrets, Credentials, Tokens oder privilegierte Identitäten erzeugt, rotiert oder exponieren könnte,
- kostenpflichtige Ressourcen oder Abonnements erzeugt/verändert,
- irreversible oder schwer rückrollbare Auswirkungen hat,
- einen bestehenden Security-, Lizenz-, Governance- oder Production-Handoff-Gate berührt.

### Domain-Anwendung

- PRODUCT nutzt geeignete Tools für Frontend, UX, Accessibility, Browser-/Bundle- und Produktqualität.
- MARKET nutzt geeignete Tools für Datenqualität, Provider-/Schema-Vergleich, Scoring-/Research-Evidence und Markt-Datenvalidierung.
- PLATFORM nutzt geeignete Tools für Runtime, Container, CI/CD, Observability, Performance und Infrastruktur-Evidence.
- TRUST nutzt geeignete Tools für Security, Compliance, Governance, QA, Lizenz, Provenance und Supply-Chain-Evidence.
- GROWTH nutzt geeignete Tools für Docs, SEO, Social, Branding und veröffentlichungsbezogene Qualitätsprüfung.

Neue oder wesentlich anders eingesetzte Tools/Plugins unterliegen zusätzlich dem Tool-/Architektur-Benchmarking, wenn ihre Auswahl eine strategische Architektur-, Pipeline-, Security-, Kosten- oder Runtime-Entscheidung darstellt.

## Tool-, API- und Architektur-Benchmarking

Neue Tools, Anwendungen, Libraries, Runtimes, Provider, Schnittstellen und wesentliche Kombinationen daraus dürfen nicht allein aufgrund von Bekanntheit, Neuheit oder Einzelbenchmarks zum Standard werden. Für strategische Tool-Entscheidungen ist eine **reproduzierbare Decision Evidence** verpflichtend.

### Benchmark-Pflicht

Vor Einführung, Ablösung oder wesentlicher Erweiterung sind geeignete Kandidaten gegen denselben realistischen CAPITAL-AI-Workload zu vergleichen. Je nach Komponente umfasst das mindestens:

- funktionale Abdeckung und Korrektheit,
- Security- und Trust-Boundary-Eigenschaften,
- Performance: Laufzeit, Durchsatz, Latenz und gegebenenfalls Startup-Zeit,
- CPU-, RAM-, Disk-, Netzwerk- und Artefakt-/Bundle-Verbrauch,
- Skalierbarkeit und Verhalten unter Last,
- Build-/CI-Auswirkung und Cache-Verhalten,
- Runtime-/Browser-Auswirkung, wenn produktionsrelevant,
- Stabilität, Fehlerverhalten und Recovery,
- Integrations-/Migrationsaufwand,
- Wartbarkeit und API-/Schema-Stabilität,
- Herkunft, Maintainer-/Community-Gesundheit und Release-Modell,
- Security-/CVE-/Supply-Chain-Oberfläche,
- Lizenz, Redistribution, Attribution und Provenance,
- Observability, Auditierbarkeit und Evidence-Fähigkeit,
- Kosten/Provider-Limits, sofern relevant,
- Lock-in, Portabilität und Rollback-/Exit-Pfad.

Benchmarks müssen nach Möglichkeit warm/cold, typische und relevante Grenzfälle unterscheiden. Messungen werden mehrfach ausgeführt; Hardware/Runner, Runtime-Versionen, Datenmenge, Konfiguration, Commit/Version und Messmethode sind festzuhalten. Marketing-Benchmarks dürfen als Hinweis dienen, ersetzen aber keine reproduzierbare CAPITAL-AI-Messung.

### CAPITAL-AI Benchmark-Scoring

Strategische Tool-/API-/Architekturentscheidungen verwenden ein **gewichtetes CAPITAL-AI Decision Score (CADS)** von 0 bis 100. Die Gewichtung wird **vor** dem Benchmark anhand der Einheit/Toolklasse festgelegt und mit der Evidence gespeichert. Dadurch dürfen Kriterien nicht nachträglich zugunsten eines Kandidaten verschoben werden.

Default-Gewichtung für allgemeine technische Komponenten:

- Security & Trust: **25 %**
- Funktionale Korrektheit / Coverage: **20 %**
- Performance & Ressourcen: **15 %**
- Reliability / Operations: **10 %**
- Maintainability & Integration: **10 %**
- License / Provenance / Compliance: **10 %**
- Evidence / Observability / Auditability: **5 %**
- Portability / Cost / Exit: **5 %**

Jede Dimension erhält 0–100 Punkte; der CADS ist die gewichtete Summe. Für spezialisierte Einheiten dürfen Gewichte angepasst werden, müssen aber zusammen 100 % ergeben und vor der Messung dokumentiert sein.

**Security ist nicht kompensierbar:** Ein hoher Gesamtscore kann einen nicht erfüllten Security-/Trust-, Lizenz-/Provenance- oder funktionalen Muss-Gate nicht ausgleichen. Ein Kandidat bleibt unabhängig vom CADS **BLOCKED**, wenn ein fail-closed Gate verletzt ist, eine glaubhafte ungeklärte Supply-Chain-Gefahr besteht, die notwendige Detection/Korrektheit unterschritten wird oder Lizenz/Redistribution ungeklärt ist.

Tool-Security muss mindestens Herkunft/Publisher, Artefaktintegrität/Provenance, CVE-/Advisory-Lage, Dependency-/Binary-Surface, Install-/Postinstall-/Netzwerkverhalten, Maintainer-/Community-Risiko, Update-/Release-Modell, Berechtigungen/Privilegien, Daten-/Secret-Zugriff, Sandbox-/Isolationseigenschaften und Incident-/Rollback-Fähigkeit betrachten.

Für browser- oder runtimekritische Komponenten werden Performance- und Web-Performance-Gewichte erhöht; für Security Scanner, Auth, CI/CD, Container, Secrets, Governance und Supply Chain wird Security & Trust erhöht. Die konkrete Profilwahl wird im Benchmark als `scoreProfile` versioniert.

### Decision Evidence / ADR

Die Auswahl muss nachvollziehbar begründen:

- welches Problem gelöst wird,
- welche Kandidaten geprüft wurden und warum,
- welche Muss-/Kann-Kriterien gelten,
- welche Benchmark- und Security-Ergebnisse vorliegen,
- welche Lizenz-/Provenance- und Community-Evidence vorliegt,
- welche Trade-offs bewusst akzeptiert werden,
- warum die gewählte Einzelkomponente oder Kombination gegenüber den geprüften Alternativen geeignet ist,
- welche Annahmen, Grenzen und Restrisiken bestehen,
- wie Rollback, Austausch oder Re-Evaluation möglich sind.

Eine Entscheidung ist keine dauerhafte Behauptung, dass ein Tool generell „das beste“ sei. Sie gilt für den dokumentierten Workload, Zeitpunkt und Versionsstand.

### Re-Evaluation

Eine erneute Bewertung ist erforderlich, wenn mindestens eines zutrifft:

- Major-Version oder grundlegender Architekturwechsel,
- relevante Security-/Lizenz-/Maintainer-Änderung,
- Performance-Regressionsbudget überschritten,
- neue belastbare Alternative mit potenziell wesentlichem Vorteil,
- geänderter Workload, Skalierungsbedarf oder Provider-/Kostenmodell,
- bisherige Schnittstelle wird deprecated oder verliert Support.

### Pipeline Builder

Der spätere Pipeline Builder muss Tool- und Schnittstellenentscheidungen als maschinenlesbare Evidence mitführen können. Eine Pipeline soll deshalb je Komponente mindestens Version/Identität, Zweck, Trust-/Lizenzstatus, Benchmark-Referenz, Entscheidung/ADR, kompatible Schnittstellen, Ressourcenprofil und Rollback-/Alternative referenzieren können.

Performance-Optimierung darf Security-, Lizenz- oder Evidence-Gates nicht umgehen. Umgekehrt sollen Schutzmechanismen so gewählt und gemessen werden, dass sie reale Risiken absichern, ohne unnötige Build-, CI- oder Runtime-Kosten zu erzeugen.

Verbindliche Detailregel:
- `docs/governance/TOOL-AND-ARCHITECTURE-BENCHMARKING.md`

## Docker Build- und Runtime-Modell

- Build-once / Promote-many: exakt das geprüfte Image wird veröffentlicht und weitergereicht; kein Rebuild zwischen Prüfung und Promotion.
- Multi-Stage Builds verwenden und Build-Werkzeuge aus dem Runtime-Image fernhalten.
- Vertrauenswürdige, möglichst kleine Base Images verwenden.
- Base Images mit konkreter Version **und Digest** pinnen; keine mutable `latest`-Referenz für freigaberelevante Builds.
- Dependencies aus Lockfiles deterministisch installieren; Install-Skripte nur wenn explizit erforderlich und geprüft.
- Runtime als non-root betreiben.
- Runtime nach Möglichkeit read-only, `cap-drop ALL` und `no-new-privileges`.
- Paketmanager, Compiler, Debugger und nicht benötigte Utilities aus dem Runtime-Image entfernen.
- Secrets niemals in Image-Layern, Dockerfile-`ARG`, statischen Assets oder Repository-Evidence hinterlegen. Build-Secrets nur über dafür vorgesehene Secret-Mounts; Production-Secrets ausschließlich zur Laufzeit.
- `.dockerignore` und minimalen Build-Kontext verwenden.
- Netzwerkzugriff in deterministischen Test-/Build-Schritten einschränken, wenn externe Zugriffe nicht erforderlich sind.
- Healthchecks müssen bounded sein und dürfen keine Secrets offenlegen.
- Persistente Daten gehören nicht in den austauschbaren App-Container.

## CI/CD- und Supply-Chain-Modell

- Drittanbieter-GitHub-Actions auf vollständige Commit-SHAs pinnen.
- Workflow-Permissions nach Least Privilege; Checkout-Credentials nicht unnötig persistieren.
- Source-, Build- und Runtime-Identität über Git SHA, OCI Digest und Provider-Deployment korrelieren.
- Vor Promotion: relevante Tests, Lint, Security-/Secret-/Misconfiguration-Scans, Lizenzprüfung und SBOM.
- Attestations und SBOM müssen an den **exakten Registry-Digest** gebunden sein.
- Security-Ausnahmen sind eng begrenzt, begründet, versioniert und mit Ablauf-/Review-Logik zu führen.
- Ein fehlender oder widersprüchlicher Nachweis führt zu BLOCKED/ESCALATED, nicht zu stillschweigender Freigabe.

## Production Deployment

1. Merge nur über geschützten `main` mit erforderlichen Checks.
2. Candidate aus dem bereits geprüften Image erzeugen.
3. GHCR ausschließlich über unveränderlichen Digest als Deployment-Identität verwenden.
4. Render-Image-Quelle gegen den attestierten GHCR-Digest zurücklesen.
5. Runtime-Digest und eingebetteten Source-SHA über Health/Evidence verifizieren.
6. Lizenz-/Redistribution-Gate, Main-Schutz, Image-Quelle, Runtime-Digest und Runtime-Identity müssen gemeinsam positiv sein.
7. Erst danach Production-Handoff beziehungsweise Domain-Umschaltung.
8. Rollback erfolgt auf einen zuvor attestierten bekannten Digest; kein spontaner Rebuild.
9. Auto-Deploy darf diese Handoff-Grenze nicht umgehen.

## Web-/API-Architektur

- Öffentliche Routing-, Auth-, Rate-Limit- und Security-Grenzen müssen explizit und testbar sein.
- Express darf als öffentliches Node.js-Gateway/Router eingesetzt werden.
- FastAPI wird für Python-/Analyse-/Scoring-Services standardmäßig intern angebunden; eine direkte öffentliche Exposition erfordert eine eigene Security- und Auth-Freigabe.
- Service-zu-Service-Kommunikation folgt Least Privilege, klaren Schemas, Timeouts, Größenlimits und fail-closed Fehlerbehandlung.
- Eingaben werden an der Trust Boundary validiert; interne Typannahmen ersetzen keine Runtime-Validierung.

## Evidenz und Release-Freigabe

Für eine Production-Freigabe müssen mindestens korrelierbar sein:

- Produkt-/Schema-Version, soweit relevant
- Source Git SHA
- OCI Image Digest
- SBOM
- Build-/Provenance-Attestation
- Lizenz-/Redistribution-Evidence
- Required Checks / Main Protection
- Provider-Deployment-Identität
- Runtime-Identität und Health

Die kanonischen Detailregeln bleiben in:
- `docs/governance/DOMAIN-RELEASE-GOVERNANCE.md`
- `docs/security/PRODUCTION-HANDOFF.md`
- `docs/security/DEPENDENCY-UPDATE-TRUST-MODEL.md`
- `docs/security/REMOTE-AI-CLOUD-BROWSER-SESSIONS.md`
- `docs/governance/TOOL-AND-ARCHITECTURE-BENCHMARKING.md`

Diese Root-Policy definiert die übergeordnete Arbeitsweise; die Detaildokumente dürfen sie verschärfen, aber nicht abschwächen.

## Build-, Runtime- und Trigger-Abhängigkeitsgrenzen

Abhängigkeiten werden nach ihrem tatsächlichen Ausführungszeitpunkt getrennt; ein gemeinsames Root-`package.json` ist **keine** automatische Runtime-Freigabe.

- **Build-Scope:** Compiler, Bundler, Vite-Plugins, Frontend-Bibliotheken und Build-Evidence dürfen im Build-Stage vorhanden sein, werden aber nicht allein deshalb in das Runtime-`node_modules` übernommen.
- **Runtime-Scope:** Das produktive Webservice-Image installiert ausschließlich die direkt für den Serverstart und seine dauerhaft aktiven Pfade benötigte, gepinnte Dependency-Closure aus `deploy/runtime/package.json` und `deploy/runtime/package-lock.json`.
- **Triggered/Postflight-Scope:** Werkzeuge für Migration, Evidence, Reports, Mail-Jobs, Benchmarks, Scans oder andere nicht dauerhaft benötigte Aufgaben sollen als eigene, versionierte Execution Unit mit eigenem Manifest/Lockfile ausgeführt werden, wenn sie nicht für den Serverstart benötigt werden. Sie werden nicht vorsorglich in das Runtime-Image aufgenommen.
- Ein Trigger darf keine fehlende Auth-, Secret-, Netzwerk-, Lizenz- oder Production-Grenze umgehen. Triggered Units erhalten Least-Privilege-Berechtigungen, bounded Inputs/Timeouts und eigene Evidence.
- Root-Lockfile, Runtime-Lockfile und weitere Execution-Unit-Lockfiles bleiben unabhängig scan- und updatepflichtig. Auslagerung bedeutet **nicht**, dass eine Dependency aus SBOM-, Lizenz-, CVE- oder Provenance-Evidence verschwindet.
- Jede Verschiebung zwischen Build, Runtime und Triggered/Postflight muss durch Import-/Reachability-Evidence, Tests, Lockfile-Diff und Rollback begründet werden.
- Nicht verwendete Dependencies werden entfernt statt im Runtime-Image bevorratet. Geplante zukünftige Komponenten werden erst aufgenommen, wenn ihr ausführbarer Pfad existiert und geprüft ist.
- Docker bleibt Build-once/Promote-many; Triggered/Postflight Units verändern niemals rückwirkend das attestierte Candidate-Image.


## Architekturentscheidungen, Repository-Konvergenz und Supply-Chain-Namenskonvention

### Owner-Dialog vor Architekturentscheidungen

Bei einer **wesentlichen Architekturänderung oder Architekturentscheidung** darf kein Agent unmittelbar eine Variante als neuen Standard implementieren. Vor der zustandsverändernden Architekturentscheidung ist dem Owner zuerst eine kurze Entscheidungsfrage mit **2–4 klar unterscheidbaren Optionen** zu stellen.

Für jede Option sind knapp anzugeben:
- Zweck und technische Grundidee,
- wichtigste Vorteile,
- wichtigste Risiken/Trade-offs,
- erwartete Auswirkung auf Security, Performance, Betrieb, Migration und Rollback,
- vorhandene bzw. noch fehlende CADS-/Benchmark-Evidence.

Anschließend ist eine **begründete Empfehlung** abzugeben. Die Empfehlung ist keine Freigabe: die Architekturmutation erfolgt erst auf Basis der Owner-Antwort und der bestehenden Security-/Lizenz-/Production-Gates. Reine Bugfixes innerhalb einer bereits freigegebenen Architektur, dokumentarische Korrekturen und eindeutig reversible Low-Risk-Wartung gelten nicht als neue Architekturentscheidung.

### Repository-Konvergenz statt Strukturwucherung

Repository-Wucherung, parallele Authorities, doppelte Contracts, ad-hoc Ordner, redundante Evidence-Pfade und funktional überlappende Tools sind aktiv zu vermeiden. Bevor neue Top-Level-Ordner, Plattformkomponenten, Contracts, Engines oder dauerhafte Adapter angelegt werden, ist zu prüfen, ob eine bestehende kanonische Struktur erweitert werden kann.

Priorität ist die schnellstmögliche Erstellung und anschließende Pflege einer **umfassenden, stabilen Basisarchitektur und Ordnerstruktur**. Strukturänderungen müssen:
- Current-Main und offene Arbeiten korrelieren,
- Ownership/Domain eindeutig benennen,
- kanonische vs. historische/superseded Pfade trennen,
- Migration und Rückweg dokumentieren,
- verwaiste Doppelstrukturen entfernen oder als superseded/non-authorizing markieren,
- nach Möglichkeit in kleinen reversiblen Schritten erfolgen.

### Feste Namenskonvention für die selbstheilende Software-Supply-Development-Chain

Die selbstheilende Software-Supply-Development-Chain verwendet als kanonischen Präfix:

`CAPITAL-AI-SH-SUPPLY-CHAIN`

Maschinenlesbare Contracts/Evidence verwenden die Form:

`CAPITAL_AI_SH_SUPPLY_CHAIN_<CAPABILITY>@<MAJOR>`

Beispiele:
- `CAPITAL_AI_SH_SUPPLY_CHAIN_DEPENDENCY_RECOVERY@1`
- `CAPITAL_AI_SH_SUPPLY_CHAIN_ARTIFACT_IDENTITY@1`
- `CAPITAL_AI_SH_SUPPLY_CHAIN_POST_MERGE_CORRELATION@1`
- `CAPITAL_AI_SH_SUPPLY_CHAIN_SUPERSESSION@1`

Work Packages und Dokumente verwenden die Form:

`[CAPITAL-AI-PLATFORM] SH-SUPPLY-CHAIN — <kurzer Zweck>`

Security-/Compliance-Gates bleiben fachlich der TRUST-Perspektive zugeordnet und dürfen durch die PLATFORM-Namenskonvention nicht herabgestuft werden. Jeder Domain-Chat darf diese Prüfungen nach der Regel zur domainübergreifenden ChatGPT-Arbeit übernehmen.

### DOCUMENTARY Supersession-/Command-Evidence

`DOCUMENTARY_EVIDENCE@1` und Nachfolger müssen bei zustands- oder autoritätsrelevanten Änderungen Supersession und Superseded-Zustände nachvollziehbar transportieren. Eine künftige Contract-Erweiterung muss mindestens korrelieren können:
- stabile Event-/Change-/Command-ID,
- Actor/Agent/App und autorisierende Owner-Entscheidung,
- Zeitpunkt,
- vorherige Authority/Version/Referenz,
- neue Authority/Version/Referenz,
- Status `SUPERSEDED` / `SUPERSESSION_EFFECTIVE` / `BLOCKED`,
- Grund und Scope,
- betroffene Domains/Contracts/Artefakte,
- sanitized Command-/Action-Identität bzw. Hash statt Secrets oder sensitiver Rohdaten,
- Rollback-/Reactivation-Referenz,
- Evidence-Refs und Main-/PR-/Commit-Korrelation.

Supersession darf historische Evidence nicht löschen oder nachträglich umdeuten. Historische Quellen bleiben erhalten, werden aber eindeutig als **SUPERSEDED / NON-AUTHORIZING** markiert. Operational Telemetry kann auf diese Evidence per ID korrelieren, darf sie aber nicht ersetzen.

### CADS-Kalibrierung

CADS darf aus historischen Ergebnissen lernen, aber Gewichte nicht intransparent oder nachträglich zugunsten eines Kandidaten verschieben. Selbstlernende Kalibrierung muss versioniert, reproduzierbar und reversibel sein und mindestens fünf Stufen unterscheiden:
1. `BASELINE` — vorab deklarierte Gewichte und Muss-Gates,
2. `OBSERVE` — reale Messwerte/Outcomes sammeln, noch keine Gewichtsänderung,
3. `CALIBRATE` — vorgeschlagene Gewichts-/Threshold-Anpassung aus historischen Fehlern und Erfolgen ableiten,
4. `CHALLENGE` — Gegenprüfung gegen Holdout-/Regression-/Security-Szenarien und Alternativmodelle,
5. `PROMOTE` — neue Profilversion nur nach reproduzierbarer Evidence und Owner-/Governance-Gate aktivieren.

Jede Kalibrierung speichert Ausgangsprofil, Trainings-/Beobachtungsfenster, verwendete Evidence, Änderung, erwarteten Effekt, tatsächlichen Effekt, Regressionen und Rollback-Profil. Security-, Lizenz-, Provenance- und funktionale Muss-Gates bleiben **nicht kompensierbar**.

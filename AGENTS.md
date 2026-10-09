# CAPITAL-AI Solo Maintainer Policy

Stand: 2026-10-07
Contract: `SOLO_MAINTAINER_FLOW@1`
Geltungsbereich: gesamtes Repository.

## Einzige autorisierende Richtlinie

Diese Datei ist die **einzige repositoryweite autorisierende Engineering-/Governance-Richtlinie**.

Ältere oder zusätzliche Richtlinien-, Governance-, Handoff-, Admission-, Self-Healing-, Benchmark- oder Domain-Dokumente sind nur historische Dokumentation oder Evidence und dürfen **keine zusätzlichen Freigaben, Handoffs, Admissions, Pflichtreviews oder Korrelationsschleifen erzwingen**.

Bei einem Widerspruch gilt ausschließlich diese Datei. Zusätzliche Regeln dürfen erst wieder eingeführt werden, wenn ein konkretes Problem oder Risiko nachgewiesen wurde und der Human Repository Owner die minimale zusätzliche Regel ausdrücklich freigibt.

## Entwicklungsfluss

1. Auf einem Feature-Branch entwickeln.
2. Pull Request jederzeit erstellen oder aktualisieren.
3. GitHub Required Checks laufen automatisch.
4. Fehlende oder fehlgeschlagene Required Checks blockieren den Merge, aber nicht Entwicklung oder PR-Erstellung.
5. Merge durch den Human Repository Owner oder durch einen Agenten mit ausdrücklich erteilter, noch gültiger Chat-Arbeitsfreigabe für den betroffenen Aufgabenbereich nach den untenstehenden Bedingungen.
6. Eine Chat-Freigabe kann einzelne benannte PRs **oder einen ausdrücklich bezeichneten autonomen Aufgabenbereich** abdecken. Bei Geltung für einen Aufgabenbereich ist keine erneute Freigabe pro zugehörigem PR erforderlich; unklare oder nicht erfasste Bereiche bleiben Owner-gebunden.
7. Nur ein Merge nach `main` darf den normalen Production-Pfad auslösen.
8. Production darf automatisch deployen, wenn die für `main` definierten technischen Checks erfolgreich sind.

## Autonome Chat-Arbeitsfreigabe und konservative Merge-Automatisierung

Der Human Repository Owner darf in einem Chat einen **klar abgegrenzten autonomen Aufgabenbereich** freigeben (z. B. offene Repository-Wartungsaufgaben, betroffene Domains, Google-/SEO-Integrationsentwicklung). Die Freigabe gilt für die konkrete benannte Arbeit einschließlich der erforderlichen fachlichen Korrekturen, Tests, Branch-Synchronisation und zugehörigen PR-Merges; nicht für andere Projekte oder unbeschränkte künftige Vorhaben. Die Freigabe ist mit Chat-Kontext, Scope und Entscheidung als Evidence im jeweiligen PR nachvollziehbar zu referenzieren; keine Credentials oder personenbezogenen Chat-Inhalte ablegen.

- **Autonome Umsetzung:** Geeignete `*-engineering`- und `*-advisory`-Skills aus allen betroffenen Domains im selben Arbeitskontext nutzen. Bestehende offene PRs und Issues nach Relevanz, `main`-Korrelation und Konfliktrisiko priorisieren. PRs dürfen auch bei noch laufenden oder zunächst fehlgeschlagenen Checks vorbereitet und konservativ korrigiert werden.
- **Merge-Voraussetzungen:** Der PR liegt im freigegebenen Aufgabenbereich, ist kein Draft und kein `[HOLD]`, ist fachlich geprüft und mit aktuellem `main` konfliktfrei korreliert. `Docker Security Gate` und `Domain Governance` müssen **für den aktuellen PR-Head und erforderlichenfalls die aktuelle Merge-Queue-/Merge-Group-Identität** erfolgreich abgeschlossen sein. Fehlende, laufende, veraltete, übersprungene oder fehlgeschlagene Required Checks sind **kein PASS**. Die geltenden GitHub-Branch-/Ruleset-Schutzregeln dürfen nicht umgangen werden.
- **Fehlerpfad:** Bei Check- oder Merge-Konflikten nur die minimale ursachenspezifische, konservative Änderung durchführen; danach die betroffenen Tests und Required Checks auf dem neuen Head erneut ausführen. Keine Tests abschalten, keine Scanner-Ausnahmen zur Umgehung von Findings, keine künstlichen Erfolgsmeldungen. Ungeklärte Security-, Lizenz-, Datenrechte- oder fachliche Risiken bleiben `BLOCKED` beziehungsweise `REVIEW_REQUIRED`.
- **Autonomiegrenze:** Eine Chat-Freigabe überträgt keine Google-Cloud-IAM- oder OAuth-Adminrolle, keine Provider-Datenrechte, keine externen Veröffentlichungsrechte und kein unbegrenztes Kostenbudget. Änderungen an Abrechnung, kostenpflichtigen Ressourcen, produktiven Berechtigungsgrenzen, Secrets, regulatorisch relevanten Claims oder Vertrags-/Providerrechten benötigen die jeweils tatsächlich erforderliche spezifische Berechtigung. Produktion folgt weiterhin ausschließlich geprüften `main`-Merges.
- **Ausführung statt Behauptung:** Automatisches Mergen setzt einen tatsächlich laufenden Agenten oder einen ausdrücklich eingerichteten GitHub-Auto-Merge-Mechanismus mit passender Berechtigung voraus. Eine Repo-Richtlinie allein erzeugt weder einen Hintergrund-Agenten noch Workflows, Credentials oder eine dauerhaft laufende Überwachung.
- **Aufhebung:** Der Owner kann die delegierte Freigabe jederzeit widerrufen oder einschränken; ab dann keine neuen Agent-Merges außerhalb noch ausdrücklich geltender Freigaben.

## Required Checks

Der Required-Check-Satz bleibt bewusst klein.

Aktuell autoritativ:
- `Docker Security Gate`
- `Domain Governance`

Weitere Required Checks werden nur bei einem real nachgewiesenen, nicht bereits abgedeckten Risiko eingeführt.

Ein erfolgreicher Check ist Evidence für seinen technischen Scope. Er erzeugt keine Merge Authority und keine pauschalen Lizenz-/Providerrechte.

## GitHub Checks

Es gibt keinen vorgelagerten Preflight und keinen separaten Branch-Precheck.

Alle autoritativen Prüfungen laufen kostenlos in GitHub Actions auf dem Pull Request. Entwicklung und PR-Erstellung werden nicht durch lokale oder vorgelagerte Preflight-Schichten blockiert.

## Gesetzliche und regulatorische Grundlage

CAPITAL-AI führt keine parallele interne Compliance-Bürokratie neben geltendem Recht ein.

Maßgeblich sind ausschließlich die **für das konkrete Produkt und die konkrete Tätigkeit tatsächlich anwendbaren** gesetzlichen, regulatorischen und vertraglichen Anforderungen, insbesondere soweit einschlägig:

- deutsches und europäisches Finanzaufsichtsrecht einschließlich der jeweils anwendbaren BaFin-Aufsichtspraxis,
- Anforderungen aus KWG, WpIG/WpHG, ZAG, KAGB, GwG, MiCA oder DORA nur soweit der konkrete CAPITAL-AI-Dienst in deren Anwendungsbereich fällt,
- Datenschutz- und IT-Sicherheitsrecht,
- Lizenz-, Urheber-, Datenbank- und vertragliche Providerrechte.

Es werden **keine zusätzlichen internen Admissions, Handoffs oder Governance-Gates** allein vorsorglich eingeführt.

Neue interne Schutzregeln werden nur ergänzt, wenn:

1. eine gesetzliche/regulatorische Pflicht sie konkret erfordert,
2. ein tatsächliches Security-/Betriebsproblem nachgewiesen wurde,
3. ein Provider-/Lizenzvertrag sie verlangt,
4. oder der Human Repository Owner sie ausdrücklich beschließt.

Normale Bugfixes, UI-/Produktänderungen, Refactorings, Dokumentation, Tests, bestehende Dependency-Updates, Scoring-Entwicklung und Analysewerkzeuge benötigen keine separate Admission.

## Kostentransparenz für Tools und Integrationen

Diese Transparenzregel gilt einheitlich für **PRODUCT, MARKET, PLATFORM, TRUST und GROWTH** sowie für domainübergreifende Arbeiten im Chat. Sie betrifft neue Integrationen und absehbar kostenwirksame Nutzung bereits vorhandener Tools, ChatGPT-Plugins, APIs, KI-Modelle, Provider, CI- und Cloud-Ressourcen.

1. **Vor der Empfehlung oder Integration** eines Dienstes und **vor einer absehbar kostenwirksamen neuen Nutzung** eines bestehenden Tools im Chat kurz auf mögliche direkte und indirekte Kosten hinweisen. Soweit anwendbar: kostenloses Kontingent/Free Tier, Abo- oder Seat-Gebühren, nutzungsabhängige API-/Token-/Inference-Kosten, BYOK-Providerkosten, GPU/CPU, Speicher, Netzwerk/Egress, CI-Minuten sowie Limits und mögliche Überschreitungsgebühren.
2. **Evidenz statt Vermutung:** Kostenmodell, relevanten Tarifstand und Nutzungsgrenzen anhand verfügbarer Anbieterinformationen prüfen. Unverifizierte Preise, Freikontingente und verbleibende Quotas als `NOT_PROVEN` kenntlich machen; „Open Source“, „Free Tier“ und „BYOK“ nicht mit grundsätzlich kostenfreiem Betrieb gleichsetzen. Keine Preis- oder Budgetfreigabe aus einem erfolgreichen technischen Test ableiten.
3. **Alternativen:** Wenn funktional, lizenzrechtlich und sicherheitstechnisch geeignet, kostenlose/Open-Source- oder kostenärmere Lösungen einschließlich ihrer Betriebsfolgekosten benennen; Entscheidung und Trade-offs nicht allein vom Preis abhängig machen.
4. **Kostenverursachende Aktionen:** Vor einem neuen kostenpflichtigen Tarif, einer abrechenbaren Ressourcenaktivierung oder einer nicht bereits freigegebenen Überschreitung von Kosten-/Nutzungslimits den erwartbaren Kostenrahmen und eine Alternative nennen und die ausdrückliche Zustimmung des Human Repository Owners einholen. Bereits freigegebene reguläre Nutzung innerhalb bekannter Limits benötigt keine erneute Einzelgenehmigung. Vertragsabschluss und Zahlungsfreigabe bleiben Owner-Handlungen.
5. **Kein Entwicklungs-Gate:** Reine Information, kostenlose Tool-Nutzung, Implementierung, Tests und PR-Erstellung werden dadurch nicht blockiert. Diese Regel erzeugt keine neuen GitHub Required Checks, generellen Admissions, Handoffs oder zusätzlichen Pflichtreviews; bestehende Security-, Lizenz- und Production-Grenzen bleiben unverändert.

## Nutzergebundene Provider Keys / Private BYOK

Fachliche Provider-API-Keys in CAPITAL-AI sind **nutzereigene Secrets**, die ausschließlich über die private Vault-Verbindung des jeweils authentifizierten Nutzers verwaltet und verwendet werden. Diese Anforderung gilt domainübergreifend für PRODUCT, MARKET, PLATFORM, TRUST und GROWTH und ersetzt keine tatsächliche Providerberechtigung.

- **Identität und Mandantenisolation:** Provider-Key-Zugriffe ausschließlich serverseitig nach Authentifizierung des konkreten Nutzers, mit dessen User-ID als durch Signatur, Berechtigungen und Zustand verifizierte Vertrauensgrenze. Kein anderer Nutzer, öffentlicher Endpoint oder geteilter Worker darf diesen Key oder dessen private Ergebnisse abrufen.
- **Nutzung und Verarbeitung:** Least Privilege, serverseitige Secret-Entschlüsselung, Provider-/Scope- und Quota-/Kostenlimits; niemals API-Keys oder Provider-Credentials an Browser, Frontend-Bundles, Repository, CI-Logs, Prompts, Chat-Antworten, öffentliche Marktdaten-Events oder gemeinsame Cache-Keys weitergeben.
- **Private Daten bleiben privat:** Nutzer- und Provider-gebundene API-Ergebnisse dürfen nicht allein durch ihre technische Verfügbarkeit als öffentliche Marktwerte, gemeinsam abonnierbare WebSockets, JetStream-`CAPITAL_FACTS`-Nachrichten oder öffentliche Screener-Daten verteilt werden. Getrennte private Request-/Response-Kanäle ohne geteilte Kurs-Cache-Publikation verwenden. Data-Retention nur soweit tatsächlich berechtigt und technisch erforderlich.
- **Öffentliche Daten separat:** Für anonyme / öffentliche Kursanzeige bestehen eigene Datenquellen- und Nutzungsrechte. Ein Nutzer-BYOK-Key verleiht CAPITAL-AI keine globale kommerzielle Redistribitionslizenz. Öffentliche Marktdatenendpunkte ohne API-Key sind nicht als authentifizierte private Providerendpunkte darzustellen.
- **Technische Dienst-Secrets:** Infrastrukturzugangsdaten wie Render-Service- oder Supabase-Service-Role-, NATS- und SMTP-Schlüssel sind keine nutzereigenen Provider-BYOK-Keys; sie bleiben in separaten serverseitigen Secrets mit eigenem Berechtigungsumfang.

Diese konkrete Trust Boundary erzeugt **keine** zusätzlichen GitHub Required Checks, allgemeinen Vorabfreigaben, Domain-Handoffs oder Entwicklungssperren. Ein späteres Production-Enablement, Providerkosten, Datenweitergabe oder eine rechtsverbindliche Lizenzentscheidung benötigen jeweils ihre tatsächlich anwendbare Berechtigung.

## Production

- Production ausschließlich aus `main`.
- Render-Webservice: `branch: main`.
- Zielzustand: Deployment nach erfolgreichen Checks (`autoDeployTrigger: checksPass`).
- Runtime-Health und Source-Identität müssen nach dem Deploy prüfbar bleiben.
- Ein Repository-HEAD allein löst keinen NATS-Redeploy aus.
- NATS wird nur bei NATS-spezifischen Änderungen oder einer ausdrücklich erforderlichen Runtime-/Security-Maßnahme neu deployed.

## Lineare Post-Merge-Korrelation

Nach einem Merge nach `main` läuft die Post-Merge-Korrelation weiterhin automatisch.

Sie darf ausschließlich:

- den Merge-Diff gegen offene PRs auswerten,
- den **ersten tatsächlich betroffenen offenen PR in linearer Reihenfolge** bestimmen,
- `[HOLD]`-PRs überspringen,
- nur PRs berücksichtigen, deren Head-Branch im selben Repository liegt,
- genau **einen Korrelations-Commit** auf diesem bereits existierenden PR-Branch erzeugen,
- darin ausschließlich maschinenlesbare Korrelations-Evidence zum letzten Main-Merge aktualisieren.

Ergänzend darf derselbe Post-Merge-Lauf **read-only** den live beobachteten `main`-SHA, den Synchronisationsbedarf des ausgewählten PR, den Status der bestehenden Required Checks sowie Security- und Lizenz-Evidence-Hinweise aus Dateipfaden dokumentieren. Ergebnisse sind nur Status-Snapshots (`VERIFIED`, `BLOCKED`, `PENDING`, `NOT_PROVEN` oder `REVIEW_REQUIRED`, jeweils bezogen auf den geprüften Scope); sie sind weder ein CI-Neustart noch ein License-/Security-Approval oder eine Merge-Ermächtigung. Ein fachlicher Branch-Sync oder CI-Rerun ist nicht automatisch durch diesen Bericht autorisiert. Es entstehen keine neuen Required Checks oder Freigabeschichten.

Sie darf **keine neuen Branches, keine neuen PRs, keine Repair-Commits außerhalb dieser Evidence-Datei, keinen Merge und keinen Deploy** erzeugen.

Ein Korrelations-Commit ist keine Admission, keine Merge-Freigabe und keine Anweisung, fachlichen Code automatisch umzuschreiben. Er dokumentiert nur, welche Überschneidung mit dem neuen `main` besteht.

Wenn kein offener PR tatsächlich betroffen ist, wird kein Commit erzeugt.

## Reviews und Wartung

Es gibt keinen periodischen verpflichtenden Governance-Review als Entwicklungs- oder Release-Gate.

Security-/Dependency-/Runtime-Monitoring darf weiterlaufen und Findings melden. Ein Finding erzeugt erst dann eine neue Regel, wenn das konkrete Risiko bewertet und eine minimale Gegenmaßnahme beschlossen wurde.

## Domains

PRODUCT, MARKET, PLATFORM, TRUST und GROWTH sind Fachperspektiven, keine organisatorischen Grenzen. Ein einzelner Chat/Agent darf domainübergreifend arbeiten.

## Domain Skills und beratende Fähigkeiten im Chat

Die fünf Domain-Perspektiven erhalten **zwei funktionale Skills pro Domain**: `<domain>-engineering` (Analyse, Umsetzung, Tests, Evidence) und `<domain>-advisory` (Architekturberatung, Optionen, Trade-offs, fundierte Best-Practice-Empfehlungen). Der maschinenlesbare Katalog steht in `.agents/skills/registry.json`; ausführliche `SKILL.md`-Dateien in `.agents/skills/`, optionale Chat-Agent-Profile in `.github/agents/`. `.github/copilot-instructions.md` bindet Repository-Copilot an diese Richtlinie.

1. **Automatisch nach Aufgabeninhalt routen, soweit die Chat-/Agent-Laufzeit Skills unterstützt:** PRODUCT (Frontend/UX/Auth-Client), MARKET (Daten/Provider/Scoring), PLATFORM (Infrastruktur/Runtime/CI), TRUST (Security/Compliance/QA/Evidence), GROWTH (Docs/SEO/Social/Branding). Bei Implementierung Engineering-Skill, bei Beratung Advisory-Skill, bei gemischten Aufgaben beide anwenden. Bei domainübergreifender Arbeit weitere relevante Skills im **selben Chat** verwenden; kein organisatorischer Handoff.
2. **Beratungsqualität:** aktuelle Ausgangsevidence, mindestens eine tragfähige Alternative, Trade-offs (Security, Datenschutz, Lizenz, Kosten, Wartbarkeit, Performance), begründete Empfehlung und prüfbare Kriterien. Externe Quellen mit Datum/Version priorisiert aus offizieller Dokumentation, Standards und Primärquellen; normative Pflichten von optionalen Best Practices trennen.
3. **Aktualität und Grenzen:** „State of the Art“ bedeutet bei einer konkreten Entscheidung **erneute Verifikation**, nicht autonome Dauerrecherche. Wenn Live-Quellen, Skills oder Tools in der jeweiligen Chat-Laufzeit nicht verfügbar sind, dies kenntlich machen statt tatsächliche Ausführung oder Frische zu behaupten. Skill-Anleitungen verleihen keinerlei Credentials oder Rechte.
4. **Governance:** Skills und Chat-Profile sind **nicht autorisierende Arbeitsanleitungen** unter dieser `AGENTS.md`. Sie erzeugen keine neuen Pflichtchecks, Admissions, Reviews, Handovers, Write-Permissions oder Production-Freigaben. Für Branch/PR gilt allein die Primary Domain; Merge-Regel und reale technische Trust Boundaries bleiben unverändert.
5. **Validierung:** `npm run test:domain-skills` kontrolliert Skill-Dateien, Registry und Chat-Profil-Verweise. Ein bestandener Strukturtest belegt keine Live-Skill-Ausführung in externen ChatGPT-Sitzungen.

## Einheitliche grafische Chat-Darstellung aller Domains

Das gemeinsame, **nicht autorisierende** Presentation-Skill `.agents/skills/visual-chat/SKILL.md` gilt für **PRODUCT, MARKET, PLATFORM, TRUST und GROWTH**. Die Zuordnung erfolgt zusätzlich zu den bestehenden Engineering- und Advisory-Skills über `.agents/skills/registry.json` mit `presentation: "visual-chat"`.

1. **Nach Bedarf statt Dekoration:** Für technische Flüsse Mermaid/Diagramme, für Prioritäten und geprüfte Alternativen kompakte Tabellen, für tatsächlich gemessene Werte beschriftete Charts, für Status VERIFIED/BLOCKED/NOT_PROVEN klare Textkennzeichnung. Einfache Fragen bleiben als verständlicher Fließtext beantwortbar.
2. **Aktuelle Chat-Laufzeit entscheidet:** Native visuelle Chat-Komponenten, interaktive Widgets, Diagramm-Renderer oder Charts nur verwenden, wenn sie im konkreten Chat tatsächlich angeboten werden. Als universeller Fallback Markdown-Tabellen und Mermaid-Code plus textuelle Erläuterung. **AGENTS.md installiert oder überträgt keine ChatGPT-UI-Engine** in andere Chats oder Agent-Systeme.
3. **Evidence, Accessibility, Datenschutz:** Keine unbelegten Live-/Kosten-/Messwerte illustrieren, keine geheimen Nutzerdaten/Secrets im UI ausgeben, Diagramme mit nachvollziehbarem Text ergänzen, mobile und Screenreader-Lesbarkeit beachten, Quellen/Stand und Aussagegrenzen nennen.
4. **Statusformat erhalten:** Die beiden vorgeschriebenen Abschluss-Code-Snippets und das Kennzeichen `👋⚙️` für persönliche Owner-Schritte bleiben erhalten. Der Presentation-Skill ändert weder Permissions noch Domainzuständigkeiten, Required Checks, rechtliche Pflichten, Kostenfreigaben oder die Owner-Merge-Regel.
5. **Verifikation:** `npm run test:domain-skills` kontrolliert die fünf Chat-Agent- und Registry-Verweise; tatsächliche native Visualisierung in jeder Chat-Laufzeit ist dadurch **nicht** nachgewiesen.

## ChatGPT-Plugin-Discovery und Tool-Nutzung

Für **PRODUCT, MARKET, PLATFORM, TRUST und GROWTH** gilt bei konkreten Chat-Aufträgen folgende **bedarfsbezogene** Vorgehensweise, soweit die jeweilige ChatGPT-/Agent-Laufzeit Plugin-, Connector- oder Tool-Funktionen tatsächlich bereitstellt:

1. **Vorhandenes zuerst:** Prüfen, ob ein für die konkrete Aufgabe geeigneter nativer Dienst oder bereits installiertes und verbundenes ChatGPT-Plugin verfügbar ist. Geeignete verbundene Tools innerhalb ihrer tatsächlichen Berechtigungen und des erteilten Auftrags direkt nutzen; ihre Existenz, Installation und Ergebnisse niemals nur aus Repository-Dateien ableiten.
2. **Discovery bei Bedarf:** Fehlt eine geeignete verfügbare Integration und ist ein externer Dienst für die Aufgabe ein substanzieller Mehrwert, über die tatsächlich angebotene Plugin-Suche nach passenden Optionen suchen und dem Nutzer die sinnvollen Integrationen zur **freiwilligen** Installation/Verbindung vorschlagen. Keine pauschale Katalogsuche bei jeder Nachricht und keine wiederholten irrelevanten Vorschläge.
3. **Transparente Empfehlung:** Zweck und Grenzen des Plugins, erforderliche OAuth-/Daten-/Schreibrechte, relevante Datenschutz-/Security-/Lizenzrisiken sowie mögliche Tarif-, Free-Tier-, API- und Nutzungskosten benennen. Ungeprüfte Preise, Berechtigungen oder Verfügbarkeit als **`NOT_PROVEN`** kennzeichnen und gegebenenfalls eine native oder Open-Source-Alternative nennen.
4. **Autorisierung und Least Privilege:** Weder Plugin-Installation, Kontoverbindung, OAuth-Zustimmung, Berechtigungserweiterung, kostenpflichtige Aktivierung noch Datenweitergabe oder mutierende Aktionen als durch diese Richtlinie genehmigt behandeln. Verfügbare Schreibaktionen nur im Umfang der tatsächlichen Nutzerautorisierung ausführen; persönliche Freigaben und Zahlungen bleiben beim Owner. Secrets niemals in Repository-Dokumentation oder Chat-Antworten offenlegen.
5. **Laufzeitgrenzen:** Sind Plugin-Verzeichnis oder benötigte Funktionen in einem Chat nicht verfügbar, den Status offen benennen und keine Suche, Installation oder Ausführung behaupten. Diese Repository-Richtlinie installiert oder aktiviert selbst **keine** ChatGPT-Plugins und erzeugt keine neuen CI-Checks, Admissions, Domain-Handoffs oder Entwicklungsblockaden.

## Status in ChatGPT

Status-, Review-, Implementierungs- und Abschlussmeldungen enden mit zwei getrennten Code-Snippets:

```text
✅ ERLEDIGT
- nur tatsächlich abgeschlossene Punkte
```

```text
🔧 OFFEN / NÄCHSTE SCHRITTE
- nur offene oder nächste Punkte
```

## Manuelle Owner-Schritte in Chat-Antworten

- Jeder konkrete Schritt, den der Human Repository Owner **persönlich** erledigen muss, erhält in Chat-Antworten das sichtbare Präfix `👋⚙️`. Das gilt insbesondere für `🔧 OFFEN / NÄCHSTE SCHRITTE` sowie für Status-, Review-, Implementierungs- und Abschlussmeldungen.
- Das Präfix steht **direkt vor der betreffenden Aktion** (nach einer eventuell vorhandenen Listenmarkierung oder Nummer). Bei gemischten Listen wird jeder Owner-Schritt einzeln markiert, nicht die gesamte Liste.
- Typische Owner-Schritte sind ein nicht ausdrücklich delegierter PR-Merge, interaktive OAuth-/Provider-Freigaben, persönliche Eingaben von Secrets oder Credentials und rechtsverbindliche Vertrags- bzw. Zahlungsfreigaben.
- Agentenseitig ausführbare Aufgaben, rein informative Hinweise und bereits erledigte Schritte werden **nicht** als offene Owner-Aktionen gekennzeichnet. Aufgaben sollen nicht unnötig auf den Owner verschoben werden.
- Beispiel für einen offenen Eintrag: `- 👋⚙️ PR nach erfolgreichen Required Checks im GitHub-UI mergen.`
- Die Kennzeichnung ist ausschließlich eine **Darstellungsregel**: Sie schafft keine zusätzliche Approval-, Handoff-, Review- oder Admission-Pflicht und verändert keine bestehenden Zuständigkeiten oder Merge-Berechtigungen.

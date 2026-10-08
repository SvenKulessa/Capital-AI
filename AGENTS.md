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
5. Merge regulär ausschließlich durch den Human Repository Owner.
6. Ein Agent darf nur nach ausdrücklicher Chat-Freigabe für den konkret bezeichneten PR mergen.
7. Nur ein Merge nach `main` darf den normalen Production-Pfad auslösen.
8. Production darf automatisch deployen, wenn die für `main` definierten technischen Checks erfolgreich sind.

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

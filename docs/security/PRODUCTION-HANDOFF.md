# Production-Handoff Gate

## Geltung nach der ChatGPT-Handoff-Regel

Nach der kanonischen `AGENTS.md`-ChatGPT-Handoff-Regel ist für Entwicklung in ChatGPT kein organisatorischer Domain-Handoff erforderlich. Derselbe Chat darf diesen technischen Production-Handoff bearbeiten. Der Production-Handoff bleibt jedoch als reale technische Release- und Evidence-Grenze vollständig verbindlich; seine Lizenz-, Main-Schutz-, Source-/Digest-, Provider- und Runtime-Gates werden durch die ChatGPT-Handoff-Regel weder ersetzt noch abgeschwächt.

Aktuelle korrelierte Abnahme: [AP-SEC-IMAGE vom 01.10.2026](AP-SEC-IMAGE-ABNAHME-20261001.md), weiterhin BLOCKED. Die folgenden Abschnitte dokumentieren den ursprünglichen Stand vom 30.09.2026.

Stand: 30.09.2026. Dieser Slice trennt Build-Sicherheit, Kandidaten-Publishing und Production-Handoff strikt.

## Aktueller Zustand

- Der bestehende Render-Webservice `Capital-AI` (`srv-dau1rp893c1s73cdhm1g`) ist Git-backed mit `runtime: docker`. Die aktuellen offiziellen Render-Dokumente erlauben den Wechsel einer bestehenden Service-Runtime per Dashboard, API oder Blueprint (https://render.com/docs/native-runtimes#changing-a-services-runtime). Die frühere Annahme einer zwingenden Neuanlage ist überholt. Der Wechsel auf eine Image-Quelle muss für diesen Service providerseitig zurückgelesen und vor Domain-Umschaltung validiert werden.
- Es wird durch diesen Slice **kein zusätzlicher kostenpflichtiger Render-Service erzeugt**.
- `docs/security/evidence/license-rights-review.json` steht weiterhin auf `REVIEW_OPEN`; deshalb bleibt jeder GHCR-Kandidat `deployEligible:false`.
- Am 30.09.2026 wurde Ruleset `24259174` als aktiv mit strengem Required Check `Docker Security Gate`, PR-Pflicht, Delete-/Force-Push-Schutz und ohne Bypass zurückgelesen. Der einmalige Admin-Bootstrap ist abgeschlossen; sein Workflow wird entfernt. Die laufende Readback-Validierung bleibt erhalten.

## Automatischer Sicherheitsvertrag

`.github/workflows/build-security.yml` läuft jetzt auf Pull Requests, Merge Queue, Push nach `main` und manuell. Der stabile Jobname für GitHub Required Status Checks lautet:

`Docker Security Gate`

Kandidaten-Publishing bleibt ausschließlich `workflow_dispatch` auf `main`.

Der `Production Handoff Gate` ist ein technischer Pipeline-Gate-Vertrag. Er liest die verbindlichen Nachweise und setzt **nur dann** `deployEligible:true`, wenn alle fünf Gates gleichzeitig erfüllt sind. Sind sie für die exakte Candidate-Identität terminal positiv, ist keine zusätzliche Owner-/Admission-Freigabe erforderlich:

1. `LICENSE_REDISTRIBUTION_REVIEW`: maschinenlesbare Lizenz-/Redistribution-Evidence ist `APPROVED`, `deployEligible:true` und exakt an den Source-SHA gebunden.
2. `MAIN_PROTECTION`: aktives Main-Ruleset enthält Delete-Schutz, Non-fast-forward-Schutz, Pull-Request-Pflicht, strikte Required Status Checks mit `Docker Security Gate` und keine Bypass-Akteure.
3. `RENDER_IMAGE_SOURCE`: Render-Service gehört zum Workspace AICapital und `imagePath` ist exakt der attestierte `ghcr.io/svenkulessa/capital-ai@sha256:...`-Digest.
4. `RUNTIME_DIGEST`: der aktive Render-Deploy meldet denselben `image.ref` und denselben `image.sha`.
5. `RUNTIME_IDENTITY`: `/healthz` meldet den beim GitHub-Build deterministisch direkt in `server/index.mjs` eingebetteten Source-SHA. Die Bindung erfolgt vor Scan und Docker-Build; dadurch liegt sie im bereits allow-gelisteten Docker-Kontext. Ein frei gesetzter Runtime-Env-Wert oder eine nachträglich gemountete Datei wird nicht als Build-Identität akzeptiert.

Der Workflow erzeugt weiterhin zuerst `candidate.json` mit `deployEligible:false`. Nur `scripts/verify-production-handoff.mjs` darf bei fünf positiven Gates ein separates `release.json` mit `deployEligible:true` erzeugen. Dieses vollständige PASS ist die technische Deployment-Autorität; eine zusätzliche menschliche Admission ist nicht erforderlich. Der nachfolgende Deployment-Job darf ausschließlich dieses gebundene `release.json` für dieselbe Source-/Artifact-Identität konsumieren.

## Einmaliger GitHub-Admin-Schritt

Für `main` ein aktives Branch-Ruleset anlegen:

- Ziel: `refs/heads/main` / Default Branch.
- Delete blockieren.
- Non-fast-forward blockieren.
- Pull Request erforderlich.
- Strict required status checks aktivieren.
- Required Check: `Docker Security Gate`.
- Keine Bypass-Akteure.

Der Production-Handoff-Workflow prüft diesen Zustand live über die GitHub Rulesets API. Eine Dokumentationsdatei oder ein erfolgreicher Workflow ersetzt den Provider-Schutz nicht.

## Render-Migration

Der existierende Git-backed Docker-Service bleibt bis zur Migration bestehen. Für digest-basiertes Deployment ist ein **image-backed** Service erforderlich. Bevorzugt wird der bestehende Service nach aktueller Provider-Dokumentation umgestellt; ein zusätzlicher Starter-Service wird nicht angelegt. Die verfügbare Connector-Schnittstelle enthält keine Operation zum Ändern der Image-Quelle. Eine vorbereitete YAML ist noch kein Beleg der Provider-Umstellung.

Vor und nach der Umstellung des bestehenden Services:

- Registry-Credential nur mit `read:packages`.
- Image-Quelle auf den vollständigen GHCR-Digest setzen, nicht auf `latest` oder einen beweglichen Tag.
- `RENDER_SERVICE_ID_TEST` und `RENDER_WORKSPACE_ID_TEST` auf diesen image-backed Zielservice setzen.
- `RENDER_API_KEY_TEST` bleibt ausschließlich GitHub Actions Secret.
- Den Kandidaten über den policy-definierten Pipeline-Pfad publishen und anschließend den Production-Handoff maschinenprüfbar verifizieren; eine zusätzliche Owner-Admission ist bei vollständigem Gate-PASS nicht erforderlich.

Solange einer dieser Nachweise fehlt, läuft, unbekannt oder negativ ist, ist der Zustand **BLOCKED** und es findet kein Deployment statt.

## Reihenfolge ohne zirkuläre Freigabe

Die fünf bestehenden Gates prüfen eine bereits laufende Candidate-Runtime; sie sind eine Abnahme, keine Berechtigung, ungeprüfte Images zu deployen. Vor einem Candidate-Testdeploy müssen exakter Main-SHA, Docker-Gate, attestierter Digest und Lizenzfreigabe positiv sein. Anschließend erfolgt der Testdeploy vor Übernahme der Produktionsdomains. Erst nach Runtime-Digest und imagegebundener Identität sowie real verifiziertem Supabase-Login, Session-Readback und Logout wird die Domainübergabe freigegeben. `candidate.json` bleibt dabei unverändert; `release.json` ist das getrennte Abnahmeergebnis. Aktuell fehlen Lizenzfreigabe und veröffentlichter GHCR-Kandidat, daher wird kein Testdeploy gestartet.

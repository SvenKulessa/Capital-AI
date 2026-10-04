# POST_MERGE_CORRELATION@2

Primary Domain: PLATFORM. Cross-Domain: TRUST.

Nach jedem Merge nach `main` wird anhand des tatsächlichen Dateidiffs entschieden, ob offene Arbeiten neu korreliert werden müssen. Ein neuer Repository-HEAD allein ist kein Deployment-Signal.

## supply_sh_chain Entscheidungslogik

Nach jedem erfolgreichen Merge nach `main` wird nicht pauschal jeder offene Branch aktualisiert. Der Workflow liest den tatsächlichen Merge-Diff, alle offenen PR-Dateien und den Abstand jedes PR-Heads zum neuen `main`.

Jeder offene PR erhält genau eine Aktionsklasse:

- `NO_ACTION` — kein relevanter Datei-/Boundary-Overlap und kein weiterer Handlungsbedarf.
- `CORRELATE_ONLY` — neuer Main muss als Evidence berücksichtigt werden, aber ein Branch-Update ist technisch nicht erforderlich.
- `SYNC_REQUIRED` — relevanter Overlap plus veralteter Branch; vor weiterer Bearbeitung gegen Current Main synchronisieren.
- `REPAIR_CANDIDATE` — ausschließlich ein bereits nach der 3er-Regel promotetes, deterministisches Low-Risk-Muster darf als automatischer Reparaturkandidat gelten.
- `MANUAL_REVIEW_REQUIRED` — Security-/Governance-/Workflow-/Container-/Auth-/Dependency-/Migration- oder andere mehrdeutige Grenzen.

### 3er-Regel — Promotion

Ein Fix-Fingerprint darf erst automatisierbar werden, wenn **drei unabhängige positive Validierungszyklen** desselben Reparaturmusters dokumentiert sind. Wiederholungen desselben Runs zählen nur einmal. Ändert sich der Fix-Fingerprint, beginnt der Zähler wieder bei null.

Vor 3/3 gilt immer `OBSERVE_ONLY`; insbesondere darf `SYNC_REQUIRED` nicht eigenmächtig zu einer Branch-Mutation eskalieren.

### 5er-Regel — Ausführung

Auch ein promotetes Muster darf nur verändert werden, wenn alle fünf Stufen positiv sind:

1. `DETECT` — exakten Merge-SHA, Main-SHA und betroffenen Scope binden.
2. `CORRELATE` — Datei-, Contract-, Runtime-, Evidence- und Dependency-Overlap gegen jeden offenen PR bestimmen.
3. `CLASSIFY` — genau eine Aktionsklasse und einen reproduzierbaren Fingerprint erzeugen.
4. `REMEDIATE` — nur promotete Low-Risk-Klassen; keine pauschale Konfliktauflösung.
5. `VERIFY` — Required Checks und betroffene Regressionen auf dem reparierten Head erneut verifizieren.

Fehlt eine Stufe, bleibt die Mutation gesperrt.

### Supply-Chain-Grenzen

Der Workflow darf offene PRs kommentieren und maschinenlesbare Evidence erzeugen. Branch-Updates oder Reparaturen sind nur bei promotierten Low-Risk-Mustern und vollständiger 5er-Gate-Kette zulässig. Secrets, Auth, DNS, Billing, Branch Protection, Lizenzfreigaben, Production-Handoff und Security-Policy-Relaxation bleiben immer manuell.

Ein neuer Repository-HEAD allein löst weder Deployment noch NATS-Redeploy aus.


## DOC-SH-02 — Dokumentations-PR-Vorschläge

Der promotete Fingerprint `STALE_CURRENT_MAIN_METADATA@1` darf nach der dokumentierten 3/3-Evidence ausschließlich einen **PR-Vorschlag** erzeugen. Die technische Trennung bleibt explizit:

- Der Korrelationsjob besitzt nur `contents: read` und erzeugt Drift-Report, Repair-Plan und Klassifikation.
- Nur `PR_PROPOSAL_CANDIDATE` darf den separaten Job mit `contents: write` aktivieren.
- Vor jeder Mutation wird der erwartete Main-SHA über die GitHub-Branch-Authority erneut gelesen; jede Abweichung beendet den Job.
- Der Patch ist auf exakt geplante Dateien und Source-Digests begrenzt. Security-, Governance-, Workflow-, Contract-, Deploy-, Runtime-, Secret-, Lizenz- und Production-Pfade sind ausgeschlossen.
- Nach dem Patch müssen die Dokumentations-/Korrelationsregressionen grün sein und der Drift-Report darf keine Findings mehr enthalten.
- Zulässige Mutation ist nur ein neuer `capital-ai-growth/docs-self-heal-<mainsha>` Branch plus Pull Request. Es existiert kein `gh pr merge`, kein Auto-Merge und keine Production-Authority.

Die 5er-Kette bleibt damit erhalten: `DETECT → CORRELATE → CLASSIFY → REMEDIATE → VERIFY`. Das finale Merge-Gate bleibt Branch Protection/Required Checks plus Review; der Self-Healing-Workflow darf dieses Gate nicht ersetzen.

## Fünfstufiger Self-Healing-Zyklus

1. **Detect** — Merge-SHA und geänderte Pfade gegen Dependency-, Container-, Workflow-, Contract- und Product-Grenzen klassifizieren.
2. **Correlate** — nur offene PRs/Arbeitspakete mit überlappenden Dateien, Contracts, Lockfiles, Runtime- oder Evidence-Abhängigkeiten gegen den neuen Main prüfen.
3. **Repair** — bekannte Low-Risk-Klassen dürfen einen Fix-Kandidaten erzeugen: stale Base/Projection, reproduzierbare Lockfile-Rekonstruktion, Evidence-/Source-SHA-Aktualisierung und konfliktfreie additive Dokumentationsdrift. Kein pauschales `ours/theirs`.
4. **Validate** — Regression, Domain Governance, Security-/Lizenzgates und betroffene fokussierte Tests müssen auf dem reparierten Head erneut grün sein.
5. **Learn/Promote** — ein Reparaturmuster wird erst nach mindestens drei unabhängigen positiven Validierungszyklen als automatische Invariante freigeschaltet. Ein geänderter Fix-Fingerprint beginnt wieder bei null.

## Fail-closed

Keine automatische Änderung an Secrets, Auth, DNS, Billing, Branch Protection, Provider-Verträgen oder Production-Handoff. Keine automatische Major-Dependency-Migration. Keine automatische Lizenz-/Security-Freigabe und kein Deployment.

NATS wird **niemals** allein wegen eines neuen Repository-HEADs neu deployed. Eine NATS-Aktion benötigt eine tatsächlich betroffene NATS-Konfiguration, ein Schema-/Runtime-Signal oder einen separat freigegebenen Deployment-Handoff.

## Lernspeicher

Je Fix-Klasse werden `patternId`, `triggerFingerprint`, `fixFingerprint`, `positiveValidationCount`, `lastValidatedMainSha`, `rollback` und `promotionState` geführt. Keine Secrets. Promotion erst ab drei positiven unabhängigen Zyklen.

## Fix-Klassen v1

- `BASELINE_STALE`: kanonische Main-/Source-SHA-Projektion erneuern.
- `LOCKFILE_CORRELATION`: nur deterministisch rekonstruierbare Dependency-/Lockfile-Drift.
- `EVIDENCE_SOURCE_STALE`: Evidence auf aktuellen Source-SHA korrelieren, ohne historische Evidence umzuschreiben.
- `ADDITIVE_DOC_DRIFT`: konfliktfreie additive Dokumentationskorrektur.
- `STACK_REORDER`: abhängige offene PRs nach Merge neu bewerten; keine automatische Major-Migration.

Jede unbekannte oder mehrdeutige Konfliktklasse bleibt `MANUAL_REVIEW_REQUIRED`.


## Lernkandidat: native Build-Tool-Binary-Vulnerabilities

Pattern-ID: `NATIVE_BUILD_TOOL_BINARY_VULNERABILITY@1`.

Dieses Muster trennt Scanner-, Betriebssystem-, Boundary- und eingebettete Compiler-/Toolchain-Ursachen, bevor eine Reparatur vorgeschlagen wird.

### DETECT

- Trivy-/SBOM-Finding an exakte Paket-, Binary-, OS- und Toolversion binden.
- Build-Stage und Runtime-Stage getrennt bewerten.
- Basisimage/Alpine-Version und Scanner-Version als Evidence erfassen; ein Versionsunterschied allein ist keine Ursache.
- Bei Go-basierten nativen Build-Tools zusätzlich `go version -m`, Binary-SHA-256 und `govulncheck -mode binary` erfassen.

### CORRELATE

Ein Finding darf nur dem nativen Build-Tool zugeordnet werden, wenn Scanner-Evidence, Binary-Buildinfo und Dependency-/Compiler-Version denselben Artefaktscope beschreiben. Browser-/Server-Boundary-Fehler werden separat behandelt. Ein bereits bestandener Boundary-Gate darf nicht als Ursache eines nachfolgenden Binary-CVE-Gates fortgeschrieben werden.

### CLASSIFY

- `OS_BASE_AFFECTED`: Finding stammt aus dem Basisimage/OS-Paket.
- `SCANNER_EVIDENCE_DRIFT`: Scanner-/DB-Evidence ist inkonsistent oder nicht reproduzierbar; niemals automatisch als NOT_AFFECTED behandeln.
- `BINARY_NOT_AFFECTED`: exakter Binary-Digest ist durch symbolbasierte Reachability und VEX belastbar als nicht betroffen klassifiziert.
- `BINARY_AFFECTED`: symbolbasierte Reachability bestätigt verwundbaren Code im exakten Binary.
- `INCONCLUSIVE`: Scope, Buildinfo, Digest oder Reachability-Evidence fehlt/widerspricht sich.

`BINARY_AFFECTED` und `INCONCLUSIVE` bleiben fail-closed blockierend.

### REMEDIATE

Für `BINARY_AFFECTED` ist **keine Suppression** zulässig. Der Reparaturkandidat darf ausschließlich auf ein offiziell/provenienzgeprüftes Artefakt wechseln, dessen eingebettete Toolchain die betroffenen Versionen tatsächlich ersetzt, oder auf eine separat benchmarkte kompatible Alternative. Danach müssen Lockfile, Integrity/Provenance und Binary-Digest neu gebunden werden.

Nicht zulässig:
- `.trivyignore`/Severity-Downgrade für bestätigte Reachability,
- `--ignore-unfixed` als Reparatur,
- Entfernen des Binaries nur vor dem Scan,
- VEX `NOT_AFFECTED` trotz `govulncheck`-Reachability,
- Upgrade von Alpine oder Trivy als Scheinfix, wenn das Finding aus einem eingebetteten Compiler-Binary stammt.

### VERIFY

Nach jedem Fix-Kandidaten erneut:
1. Boundary-/Funktionsregression,
2. Trivy Build-Stage,
3. Binary-Buildinfo + SHA-256,
4. symbolbasierte Reachability,
5. finaler Runtime-Scan,
6. SBOM/Provenance/Digest-Identität.

Erst wenn der reparierte Kandidat diese Kette vollständig positiv durchläuft, zählt er als **ein** positiver Self-Healing-Validierungszyklus. Drei Wiederholungen desselben CI-Laufs zählen nicht als drei unabhängige Zyklen.

### Aktuelle Evidence: TypeScript 7 / PR #65

Der erste reale Diagnosezyklus hat das Muster erkannt, aber **nicht positiv validiert**:

- Browser-Boundary nach Compatibility-Korrektur: PASS.
- Build-Basis: Node 26.10.0 auf Alpine 3.24.2; die HIGH-Findings wurden nicht als Alpine-Pakete klassifiziert.
- Scanner: Trivy 0.75.0; rohe Findings bleiben sichtbar.
- Native TS7-Compiler-Buildinfo: Go 1.26.4 und `golang.org/x/text v0.38.0`.
- Trivy Build-Stage: zehn HIGH-Findings blockierend.
- `govulncheck` am extrahierten TS7-Compiler: `AFFECTED`.
- Entscheidung: `BINARY_AFFECTED`; kein VEX-`NOT_AFFECTED`, keine Suppression, kein Merge.
- Zulässiger Fix: neues provenance-geprüftes TS7-Compiler-Artefakt mit gepatchter eingebetteter Go-/x/text-Version oder separat CADS-bewertete kompatible Alternative; anschließend vollständige Revalidierung.

Self-Healing-Promotion für `NATIVE_BUILD_TOOL_BINARY_VULNERABILITY@1`: **0/3 positive unabhängige Validierungszyklen**. Das Muster ist dokumentiert und regressionsfähig, aber noch nicht als autonome Reparaturregel freigeschaltet.

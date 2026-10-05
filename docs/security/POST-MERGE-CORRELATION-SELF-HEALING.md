# POST_MERGE_CORRELATION@3

Primary Domain: PLATFORM. Cross-Domain: TRUST.

Nach jedem Merge nach `main` wird anhand des tatsächlichen Dateidiffs entschieden, ob offene Arbeiten neu korreliert werden müssen. Ein neuer Repository-HEAD allein ist kein Deployment-Signal.

## supply_sh_chain Entscheidungslogik

Nach jedem erfolgreichen Merge nach `main` wird nicht pauschal jeder offene Branch aktualisiert. Der Workflow liest den tatsächlichen Merge-Diff, alle offenen PR-Dateien und den Abstand jedes PR-Heads zum neuen `main`.

Jeder offene PR erhält genau eine Aktionsklasse:

- `NO_ACTION` — kein relevanter Datei-/Boundary-Overlap und kein weiterer Handlungsbedarf.
- `CORRELATE_ONLY` — neuer Main muss als Evidence berücksichtigt werden, aber ein Branch-Update ist technisch nicht erforderlich.
- `SYNC_REQUIRED` — relevanter Overlap plus veralteter Branch; vor weiterer Bearbeitung gegen Current Main synchronisieren.
- `REPAIR_CANDIDATE` — ausschließlich ein explizit zugelassener, deterministischer Low-Risk-Fix-Fingerprint darf als automatischer Reparaturkandidat gelten.
- `MANUAL_REVIEW_REQUIRED` — Security-/Governance-/Workflow-/Container-/Auth-/Dependency-/Migration- oder andere mehrdeutige Grenzen.

### Explizite Reparaturzulassung

Ein deterministischer Low-Risk-Fix-Fingerprint ist standardmäßig **nicht zugelassen**. Eine automatische Reparatur darf nur dann überhaupt als Kandidat klassifiziert werden, wenn der exakte Fingerprint in der versionierten Pattern-State-Evidence mit `admissionState: "ADMITTED"` freigegeben ist. Ein geänderter Fingerprint fällt automatisch auf `NOT_ADMITTED` zurück.

Die Admission ist keine Security-, Lizenz-, Merge- oder Production-Freigabe. Sie erlaubt lediglich, einen eng begrenzten Reparaturkandidaten den nachfolgenden technischen Checks zu unterwerfen.

### Technische Mutationsbedingungen

Eine automatische Mutation bleibt gesperrt, solange nicht alle für den konkreten Reparaturkandidaten relevanten Bedingungen positiv sind:

- exakte Input-Identität aus Main-SHA, PR-Head und PR-Nummer,
- reproduzierbare Impact-Korrelation,
- deterministische Aktionsklassifikation,
- explizite Admission des exakten Fix-Fingerprints,
- revalidierte Required Checks für mutationsfähige Kandidaten,
- unveränderte Policy-Grenzen: kein Deploy, kein Production-Handoff, kein Secret-/Auth-/DNS-/Billing-/Branch-Protection-Bypass.

### Supply-Chain-Grenzen

Der Workflow darf offene PRs kommentieren und maschinenlesbare Evidence erzeugen. Branch-Updates oder Reparaturen sind nur bei explizit zugelassenen Low-Risk-Fingerprints und vollständig positiven technischen Checks zulässig. Secrets, Auth, DNS, Billing, Branch Protection, Lizenzfreigaben, Production-Handoff und Security-Policy-Relaxation bleiben immer manuell.

Ein neuer Repository-HEAD allein löst weder Deployment noch NATS-Redeploy aus.


## DOC-SH-02 — Dokumentations-PR-Vorschläge

Der explizit zugelassene Fingerprint `STALE_CURRENT_MAIN_METADATA@1` darf ausschließlich einen **PR-Vorschlag** erzeugen; seine Admission-Evidence muss versioniert und an den exakten Fingerprint gebunden sein. Die technische Trennung bleibt explizit:

- Der Korrelationsjob besitzt nur `contents: read` und erzeugt Drift-Report, Repair-Plan und Klassifikation.
- Nur `PR_PROPOSAL_CANDIDATE` darf den separaten Job mit `contents: write` aktivieren.
- Vor jeder Mutation wird der erwartete Main-SHA über die GitHub-Branch-Authority erneut gelesen; jede Abweichung beendet den Job.
- Der Patch ist auf exakt geplante Dateien und Source-Digests begrenzt. Security-, Governance-, Workflow-, Contract-, Deploy-, Runtime-, Secret-, Lizenz- und Production-Pfade sind ausgeschlossen.
- Nach dem Patch müssen die Dokumentations-/Korrelationsregressionen grün sein und der Drift-Report darf keine Findings mehr enthalten.
- Zulässige Mutation ist nur ein neuer `capital-ai-growth/docs-self-heal-<mainsha>` Branch plus Pull Request. Es existiert kein `gh pr merge`, kein Auto-Merge und keine Production-Authority.

Die technische Prüfkette bleibt damit erhalten: Identität und Scope binden, Auswirkungen korrelieren, Aktion deterministisch klassifizieren, Fingerprint-Admission prüfen, Reparatur begrenzen und Required Checks erneut verifizieren. Das finale Merge-Gate bleibt Branch Protection/Required Checks plus Review; der Self-Healing-Workflow darf dieses Gate nicht ersetzen.

## Self-Healing-Ablauf

- **Detect** — Merge-SHA und geänderte Pfade gegen Dependency-, Container-, Workflow-, Contract- und Product-Grenzen klassifizieren.
- **Correlate** — nur offene PRs/Arbeitspakete mit überlappenden Dateien, Contracts, Lockfiles, Runtime- oder Evidence-Abhängigkeiten gegen den neuen Main prüfen.
- **Classify** — genau eine reproduzierbare Aktionsklasse und den exakten Fix-Fingerprint erzeugen.
- **Admit** — automatische Reparatur nur für einen ausdrücklich zugelassenen Low-Risk-Fingerprint in Betracht ziehen.
- **Repair & Verify** — bekannten Low-Risk-Fix anwenden, anschließend Regression, Domain Governance, Security-/Lizenzgates und betroffene Required Checks auf dem reparierten Head neu verifizieren.

## Fail-closed

Keine automatische Änderung an Secrets, Auth, DNS, Billing, Branch Protection, Provider-Verträgen oder Production-Handoff. Keine automatische Major-Dependency-Migration. Keine automatische Lizenz-/Security-Freigabe und kein Deployment.

NATS wird **niemals** allein wegen eines neuen Repository-HEADs neu deployed. Eine NATS-Aktion benötigt eine tatsächlich betroffene NATS-Konfiguration, ein Schema-/Runtime-Signal oder einen separat freigegebenen Deployment-Handoff.

## Lernspeicher

Je Fix-Klasse werden `patternId`, `triggerFingerprint`, `fixFingerprint`, `admissionState`, `admissionEvidence`, `lastValidatedMainSha` und `rollback` geführt. Keine Secrets. Ein neuer oder geänderter Fix-Fingerprint ist standardmäßig `NOT_ADMITTED`.

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

Erst wenn der reparierte Kandidat diese Kette vollständig positiv durchläuft, kann die Evidence für eine explizite Fingerprint-Admission herangezogen werden. Wiederholungen desselben CI-Laufs erzeugen keine zusätzliche Autorität.

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

Self-Healing-Admission für `NATIVE_BUILD_TOOL_BINARY_VULNERABILITY@1`: **NOT_ADMITTED**. Das Muster ist dokumentiert und regressionsfähig, aber nicht als autonome Reparaturregel zugelassen.

# POST_MERGE_CORRELATION@1

Primary Domain: PLATFORM. Cross-Domain: TRUST.

Nach jedem Merge nach `main` wird anhand des tatsächlichen Dateidiffs entschieden, ob offene Arbeiten neu korreliert werden müssen. Ein neuer Repository-HEAD allein ist kein Deployment-Signal.

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

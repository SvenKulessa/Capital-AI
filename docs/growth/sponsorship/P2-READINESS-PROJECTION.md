# Sponsorship P2 — Readiness Projection

Baseline: `main@751dbbe4ddda72d00836284350e5655beb0ddaf9`.

## Aktueller maschinenlesbarer Zustand

P2 läuft als GROWTH-Arbeitsphase, während `SPONSORSHIP_P2_READINESS@1` weiterhin das TRUST-Gate stellt. Die GROWTH-Projektion darf dieses Gate nicht selbst auf PASS setzen.

### Bereits belegbar

- Evidence-Contracts sind in der Contract Registry registriert.
- Die Claim/Evidence-Matrix arbeitet default-deny.
- MARKET bindet Provider-/Dataset-/Use-Case-Rechte fail-closed an Aktivierungskohorten.
- TRUST besitzt reale OIDC-/Readback-Evidence; diese ist technische Evidence und kein Nachweis für Sponsorship- oder Market-Data-Rechte.
- Documentary kann Evidence deterministisch projizieren, ist aber keine kanonische Evidence-Quelle.

### Weiterhin offen / blockierend

- `licenseRightsVerified`: nicht global erfüllt; offene Provider-/Dataset-/Use-Case-Rechte bleiben REVIEW_REQUIRED/BLOCKED.
- `costAttributionVerified`: keine geplante Mittelverwendung wird als reale COST_EVIDENCE ausgegeben.
- `completeTestBundleVerified`: erst PASS, wenn die erforderlichen Evidence-Klassen referenziell geschlossen und digest-verifiziert gebündelt sind.
- `reproducibilityVerified`: benötigt reale reproduzierbare Experiment-Evidence.
- `claimTraceabilityVerified`: wird mit dem P2-Projektionsvalidator technisch vorbereitet; fachliche Claims benötigen weiterhin reale Evidence.

## Fail-closed Veröffentlichung

`npm run sponsorship:p2:check` prüft:
- eindeutige Claim-IDs,
- erlaubte Evidence-Zustände,
- default BLOCKED,
- Evidence-Referenzen für nicht blockierte Claims,
- vorhandene Repository-Referenzen bzw. immutable 40-stellige Main-SHAs,
- TRUST-Readiness bleibt BLOCKED, solange TRUST sie nicht verifiziert.

## Nächster P2-Exit

Der nächste belastbare Fortschritt ist kein manuelles Umschalten des Readiness-Vertrags, sondern ein **reales, referenziell geschlossenes Evidence Bundle** aus TRUST + MARKET + PLATFORM, das anschließend von GROWTH für Sponsorship projiziert werden kann.

Keine Sponsorship-Aktivierung, FUNDING.yml-, Billing-, Render-, DNS-, NATS-, Secret- oder Provider-Mutation in diesem Slice.

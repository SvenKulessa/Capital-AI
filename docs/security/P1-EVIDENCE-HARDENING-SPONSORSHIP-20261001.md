# P1 Evidence Hardening — Sponsorship / Research Funding

Stand: 2026-10-01  
Owner: TRUST  
Consumer: GROWTH  
Cross-Domain: MARKET, PLATFORM

## Entscheidung

Sponsorship P2 bleibt **BLOCKED**. Der Merge der Documentary Engine ist eine notwendige Projektionsbasis, aber keine vollständige Research-/Funding-Evidence.

## Kanonische Evidence-Kette

```text
SOURCE_PROVENANCE@1
        |
        +--> LICENSE_EVIDENCE@1
        |
        v
DATASET_EVIDENCE@1
        |
        v
EXPERIMENT_EVIDENCE@1
        |
        v
RESEARCH_EVIDENCE@1
        |
        +--> COST_EVIDENCE@1
        |
        v
CLAIM_EVIDENCE@1
        |
        v
EVIDENCE_BUNDLE@1
        |
        v
SPONSORSHIP_P2_READINESS@1
        |
        +--> DOCUMENTARY_EVIDENCE@1 / GROWTH projection
```

Documentary bleibt Consumer/Projektor und darf fehlende kanonische Evidence niemals durch Text ergänzen.

## P2 Exit-Gates

P2 darf erst freigegeben werden, wenn alle folgenden Gates durch ein vollständiges Test-Bundle nachgewiesen sind:

- alle Evidence-Contracts registriert und Schemas validiert,
- Source-/Dataset-Lineage vollständig und digest-gebunden,
- Forschungs- und Experiment-Run reproduzierbar,
- Lizenz-/Nutzungsrechte für den konkreten Forschungskontext verifiziert,
- Kosten einem Forschungsarbeitspaket nachvollziehbar zugeordnet,
- jede veröffentlichungsrelevante Behauptung auf Evidence-IDs zurückführbar,
- Bundle vollständig, referenziell geschlossen und digest-verifiziert,
- Redaction/Public-Safe-Projektion getrennt von kanonischer Evidence.

## Fail-Closed

`UNKNOWN`, `CONFLICTING`, fehlende Referenzen, fehlende Digests oder ungeklärte Rechte sind kein PASS. Forschungszweck erweitert keine Lizenzrechte. Ein grüner Build, Documentary-Merge oder Repository-HEAD ist allein kein Forschungsnachweis.

## Noch ausstehend

Dieser Hardening-Slice definiert und erzwingt die Contracts. Ein realer, vollständiger Test-Datensatz mit Source → Dataset → Experiment → Research → Claim → Cost → Bundle muss als nächster P1-Schritt erzeugt, reproduziert und verifiziert werden. Erst danach darf der P2-Readiness-Contract von BLOCKED auf PASS wechseln.

## Deployment

Keine Runtime-Änderung, kein Render-Deploy, kein DNS, kein NATS-Redeploy.

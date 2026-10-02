# Sponsorship P2 — Documentary Projection

Diese Datei definiert die GROWTH-Projektion; sie ist **keine kanonische Evidence**.

## Eingänge

1. kanonische Evidence-Contracts aus der Contract Registry,
2. reale MARKET-/TRUST-/PLATFORM-Evidence,
3. `CLAIM_EVIDENCE@1` für Aussagen,
4. `COST_EVIDENCE@1` für tatsächlich entstandene Kosten,
5. `EVIDENCE_BUNDLE@1` für referenziell geschlossene Bundles.

## Projektionsregel

```text
canonical evidence
      ↓
claim/evidence matrix
      ↓
redaction + public-safe classification
      ↓
sponsorship narrative / work-package report
      ↓
Documentary projection
```

Die Projektion darf Evidence zusammenfassen, aber keine fehlenden Fakten ergänzen. Planwerte bleiben Planwerte. `BLOCKED`, `UNKNOWN`, `CONFLICTING` und `REVIEW_REQUIRED` dürfen nicht als verifiziert dargestellt werden.

## P2-Gate

Der aktuelle `SPONSORSHIP_P2_READINESS@1`-Status bleibt maßgeblich. Diese GROWTH-Projektion ändert den TRUST-Status nicht und aktiviert weder FUNDING.yml noch Zahlungs-, Billing-, Provider- oder Sponsorship-Funktionen.

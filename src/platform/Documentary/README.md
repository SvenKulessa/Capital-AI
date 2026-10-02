# CAPITAL-AI Documentary Engine

Primary technical boundary: **PLATFORM**. Presentation consumer: **GROWTH**.

This directory implements the deterministic projection path defined by:

- `contracts/platform/DOCUMENTARY_EVIDENCE@1.yaml`
- `contracts/platform/CHANGE_PROPAGATION@1.yaml`
- `contracts/growth/GROWTH_PROJECTION@1.yaml`

The historical Enterprise prompts reference the Documentary Engine as the technical documentation/digital-twin component. This implementation does not create a competing ESS or ADR standard; the machine-readable contracts merged to `main` are authoritative for this slice.

## Flow

```text
documentary/evidence/*.json
        |
        v
validateDocumentaryEvidence()
        |
        v
digest / fail-closed checks
        |
        v
renderDocumentaryMarkdown()
        |
        +--> generated/documentary/<documentaryId>.json
        +--> generated/documentary/<documentaryId>.md
        +--> generated/documentary/index.json
```

Generated files are deterministic projections and are not canonical input. Historical evidence is immutable. Missing or `UNKNOWN` evidence is never promoted to success.

## Commands

- `npm run documentary:generate` — regenerate deterministic projections.
- `npm run documentary:check` — fail if generated output is missing, stale, unexpected, invalid, or digest-mismatched.

The current slice generates the engineering JSON/Markdown projection and chronology index only. Public publishing, roadmap mutation, architecture mutation, runtime deployment, DNS, billing, secrets and automatic repair remain out of scope.

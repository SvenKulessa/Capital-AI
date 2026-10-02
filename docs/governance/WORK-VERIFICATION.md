# WORK_VERIFICATION@1 — GitHub DevSecOps Verification

Status: backlog contract  
Domains: PRODUCT / MARKET / PLATFORM / TRUST / GROWTH

## Purpose

Work Verification is not a second CI system. It is the evidence projection proving that an intended work item traveled through the existing GitHub DevSecOps chain and that the released artifact is the tested artifact.

```
Repository
  ↓
Build
  ↓
SBOM
  ↓
Security Scan
  ↓
Attestation
  ↓
Immutable GHCR Digest
  ↓
Render Blueprint
  ↓
Runtime Readback
  ↓
Source SHA correlation
  ↓
Release Evidence
```

## Required identity

Every verification record correlates:
- domain and work-package ID;
- branch/PR;
- tested merge/base/source SHA;
- workflow run and required-check result;
- SBOM digest;
- OCI index/platform digest;
- provenance/attestation identity;
- Render deploy/runtime identity;
- Documentary evidence reference.

## Domain labels/projects

Canonical labels to provision in GitHub:
- `domain:product`
- `domain:market`
- `domain:platform`
- `domain:trust`
- `domain:growth`
- `work-verification`
- `release-evidence`
- `blocked`

Canonical Project views:
- CAPITAL-AI / PRODUCT
- CAPITAL-AI / MARKET
- CAPITAL-AI / PLATFORM
- CAPITAL-AI / TRUST
- CAPITAL-AI / GROWTH

This connector session cannot create GitHub Projects or repository labels when the corresponding administration action is unavailable, so provider provisioning remains an explicit follow-up rather than a false completed claim.

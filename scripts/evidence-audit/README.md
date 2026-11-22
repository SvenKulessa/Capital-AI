# Offline Evidence Audit CLI

No network calls, no customer credentials, no automatic repository mutations. This CLI consumes a **trusted, customer-authorized snapshot** of GitHub Actions metadata and generates `evidence.json` and `evidence.pdf`. It does not independently authenticate the snapshot or claim that other security controls passed.

## Input

```json
{
  "repository": "SvenKulessa/Capital-AI",
  "head_sha": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "checks": [
    {"name":"Docker Security Gate","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","status":"completed","conclusion":"success","run_id":123},
    {"name":"Domain Governance","head_sha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","status":"completed","conclusion":"success","run_id":124}
  ]
}
```

These are **illustrative inputs**, never actual CI evidence.

## Run

```sh
python3 scripts/evidence-audit/evidence_audit.py --snapshot /private/snapshot.json --out /private/audit-result
python3 -m unittest discover -s scripts/evidence-audit -p 'test_*.py' -v
```

Use a private output directory (0700), and remove the generated report according to the customer's retention policy. `VERIFIED` applies only to matching checks in the supplied snapshot; overall product release, identity, authenticity, rulesets and live behavior remain NOT_PROVEN without independent verification. No commercial checkout is enabled.

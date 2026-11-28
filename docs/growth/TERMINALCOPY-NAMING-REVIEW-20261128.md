# TerminalCopy — provisional product identity and research preparation

Scope: existing ai-smartcopy product only; independent trademark clearance NOT_PROVEN. No public launch, checkout, price change, provider activation or production deploy. The previous ShellCopy selection is superseded only as provisional display-name choice. Keep technical product ID ai-smartcopy, Acode plugin ID online.capitalai.acopybridge, command acopy and existing clipboard protocol/update path unchanged. SmartClip remains independent.

## Research evidence
The earlier research and validation artifacts from 2026-11-25 recorded 16 unreviewed digests; the earlier excerpt test rejected all 16. Do not transform historical digests into review grants or claim search volume from autocomplete. Fresh candidates in terminalcopy-naming-research-candidates.json are bounded paraphrases from public primary documentation, dated 2026-11-28. The TerminalCopy technical term also occurs in herdrify; NirCmd shellcopy is a different technical operation; Termux:API is a functional alternative. Exact and similar trademark results from DPMA, TMview and WIPO were not obtained (interactive search forms/challenge); classes 9 and 42 are starting points, not clearance. Official Android brand terms and CC BY attribution remain required. No claim to the Android robot or derivatives as an exclusive mark.

## Native private GIE import
From an existing authorized local checkout of this branch, reuse the existing Node CLI and private files. No provider acquisition, no new scheduler. Example (trusted local root; replace the directory with an actually private filesystem path, not shared Drive):

```sh
umask 077
WORK="$(mktemp -d /var/lib/acodex-security/terminalcopy-research.XXXXXX)" || exit 1
cp docs/growth/terminalcopy-naming-research-candidates.json "$WORK/records.json"
chmod 600 "$WORK/records.json"
printf '%s\n' '{"asOf":"2026-11-28","reviewGrants":[]}' > "$WORK/review.json"
node --input-type=module - "$WORK/records.json" <<'JS'
import {readFileSync} from 'node:fs';
import {researchDigest} from './scripts/growth/product-market-research.mjs';
for(const record of JSON.parse(readFileSync(process.argv[2],'utf8')).records)
  console.log(record.entityId, researchDigest(record));
JS
node scripts/growth/growth-intelligence-drafts.mjs --product-research "$WORK/records.json" "$WORK/review.json" > "$WORK/result.json"
```

Empty ledger is an intentional negative admission path. The existing contract requires separate digest-specific operator review. Independently approve exact digests and fresh as-of before using a nonempty ledger; no automated grant creation. Do not infer demand, authentication or sales from admission. Only admitted, source-bound records may be used for subsequent private product-opportunity graph input. Existing graph accepts the CAPITAL_AI_PRODUCT_OPPORTUNITY@1 envelope via --input, not the raw research result; do not feed naming JSON into the channel or conversion graph. No fabricated finance scenarios. Native full CLI and LangGraph were not run in this chat environment (repo checkout network/DNS unavailable; LangGraph not installed).

## Packaging and draft surfaces
Canonical preparation: scripts/platform/smartcopy-manifest-branding.json. Website and /pricing links informational only; Acode contributor avatar is platform-controlled. Product logo master hash and 160x160 PNG derivative pin in config. No private master/ZIP or product runtime source committed to public Git. Offline build script packages the existing pinned private 1.3.3 RC into 1.3.4; changes only display name, runtime name/version constants, documentation, icon and search keywords; price unchanged at zero (private local plugin manifest, not customer pricing). UNLICENSED is a private-test label, not customer terms. Native device and visual acceptance NOT_PROVEN. SEO and catalog text are staging configuration, not public routes. Do not merge or publish until rights and release authorization are separately established.

Package SHA-256: 4a6e1b9dfd03570f4a21303788fdc5f1f233bf3ea7b5ec4cb98ccf9b28c12c79. Offline tests: identity/runtime diff/icon/attribution/archive, deterministic rebuild, five negative config checks, no overwrite; seven simulated native tests passed. Drive download readback byte-identical. Rollback: retain original ZIP, restore prior version by Acode local installation if necessary; do not downgrade ACOPY wrapper.

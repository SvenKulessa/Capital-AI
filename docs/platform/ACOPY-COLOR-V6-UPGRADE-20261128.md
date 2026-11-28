# ACOPY color revision 6 — private runtime upgrade
Owner device evidence 2026-11-28: ANSI renderer displays green/red/yellow/cyan; direct pinned v6 candidate displays colors. Previous native clipboard readback and exit-code 7 preserved. This is owner-observed device evidence, not post-installation verification.

The private existing wrapper is not committed to public Git. The installer accepts its exact SHA-256 and changes exactly one expression, defaulting ACOPY_LOCAL_COLOR to 1. TTY, NO_COLOR, TERM=dumb, explicit ACOPY_LOCAL_COLOR=0, protocol 3, clipboard cleanup, ACK and exit handling remain unchanged. Wrapper output hash is pinned. No scheduler, startup changes, Android permissions, network transfer or commercial activation.

Use the existing guarded shared path for the candidate. Installer is scripts/platform/acopy-color-v6-upgrade.py (SHA-256 e0eba24d4c388a47eeb310b55ae45e559fd7ac97897b430d15e7e3d18af9fc65). Run directly in the foreground, not nested in acopy; --check then --apply. Known predecessor pins are from the original candidate installer; unknown predecessor or unexpected metadata blocks, never force. The local lock serializes cooperating installer processes; do not concurrently run a different updater. A successful apply backs up the original wrapper in /usr/local/bin/.acopy-pre-v6-<old SHA>.bak (0600) and atomically replaces the executable. --rollback <old SHA> restores exactly the pinned backup only from the new wrapper hash. Configuration readback failure triggers automatic rollback. Other filesystem errors require inspection, not a blind retry. No modification to existing integrity pins; verify subsequent existing startup checks separately.

Local container checks 7/7 passed on actual private v6 bytes: one-expression diff and resulting SHA; check/apply/idempotence/rollback; unknown active SHA rejected; corrupted source rejected; configuration failure auto-rollback; four ANSI colors and one mocked clipboard handoff with plain bytes and exit 7; NO_COLOR/explicit 0/TERM=dumb suppression. Device install, live clipboard of installed build, startup persistence and GitHub CI remain NOT_PROVEN. Drive delivery requires the existing global create-only lock; no publication of private wrapper.

## Owner device acceptance — 2026-11-28

Provenance: explicit owner report in the active chat, not an independently executed remote device probe.

| Check | Status |
|---|---|
| Installed wrapper revision 6 | VERIFIED (owner) |
| Installed wrapper SHA-256 equals expected pin `ea7b128613fd43ebbea2050fbb313eb3dd3b424c15aad055081340bff5efb576` | VERIFIED (owner) |
| Automatic local terminal colors | VERIFIED (owner) |
| System wrapper exit preservation (`SYSTEM_WRAPPER_EXIT=7`) | VERIFIED (owner terminal output) |
| Native clipboard ACK/readback | VERIFIED in earlier owner output; post-upgrade repeat NOT_PROVEN |
| Persistence across restart / existing startup integrity checks | NOT_PROVEN |
| Device backup and rollback readback | NOT_PROVEN; local regression only |

The earlier pre-installation status above is historical and superseded only for the three explicitly confirmed installed-wrapper checks. No raw private output, credentials or device identifiers added. No changes to clipboard transport, product release status, startup pins or pricing. CI/merge remain governed by the actual head checks.

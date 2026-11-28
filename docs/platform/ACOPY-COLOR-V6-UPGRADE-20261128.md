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

## ACOPY clipboard output contract — 2026-11-28

Owner pasted the complete pinned-wrapper diagnostic: SHA OK, revision 6, configuration, four status lines, LINE_01, LINE_02, a blank line, two-space-indented LINE_04, LINE_05, LINE_TEST=COMPLETE and ACOPY_COMMAND_EXIT=0. This verifies visible line fidelity in the device-to-chat path. It does not independently prove a new native ACK or restart.

For a related set of noninteractive, nonsensitive commands, use one outer invocation (no nested copying calls):

```sh
acopy /bin/sh -s <<'ACODE'
printf 'LINE_01\nLINE_02\n\n  LINE_04\nLINE_05\n'
ACODE
```

Preserve output bytes, order as observed in the merged pipe, LF, blank lines, indentation, tabs and UTF-8. Child buffering may affect the order in which bytes actually reach the pipe. Normalize CRLF to LF and strip SGR only; append the existing newline and actual ACOPY_COMMAND_EXIT metadata. Colors are local only. Bridge ACK and engine metadata are separate terminal diagnostics, not clipboard payload. Copy at most once per eligible completed command block; subsequent independent calls replace the clipboard. Empty, oversized (including metadata), non-UTF-8, secret-like and unsupported control-character output must not be copied. Never capture interactive authentication or secret-producing commands. Real non-TTY copying remains disabled.

### Repeatable offline regression

From the repository root in an authorized environment containing the private wrapper:

```sh
python3 -I -B scripts/platform/test_acopy_clipboard_v6.py --source /usr/local/bin/acopy
```

The original private candidate can also be supplied by path; the installer must derive exactly the pinned installed bytes before execution. Test harness and installer remain adjacent. A missing or unknown source fails, never silently passes. The private source is not distributed through GitHub or Actions. No new CI workflow or required check is created.

Actual local execution against private candidate SHA `01b3cf066828a4682549316f57f3d461fc0e466b6606fe21885d755bb6344075`, derived installed SHA `ea7b128613fd43ebbea2050fbb313eb3dd3b424c15aad055081340bff5efb576`: 9/9 unittest methods PASS, covering ordered STDOUT/STDERR writes, UTF-8, blank lines, tabs/indent, CRLF and ANSI cleanup, automatic colors and disable conditions, partial final line, exit 0/7, one simulated clipboard handoff, no previous-output mixing, empty/oversize/security filter rejection and real non-TTY gate. Tampered input rejected (exit 1). Clipboard callback mocked in contract tests: no live Android operation or network. Device restart and live post-upgrade ACK remain NOT_PROVEN.

Domain Governance run 46108440156 failed due solely to the original head branch naming pattern; Docker workflow 46108440161 succeeded on the previous head. The required format is capital-ai-platform/<purpose>-YYYYMMDD. A conforming successor branch/PR may be necessary because the connector cannot rename or retarget a PR head. No governance bypass or reuse of stale CI results.

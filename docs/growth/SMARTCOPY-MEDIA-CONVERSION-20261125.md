# AI-Smartcopy: channel campaign and private evidence workflow — 2026-11-25

Base main 71798d2c862e179570778ee8c50dff8766866697. Existing CLI --smartcopy-media accepts the two private product research inputs (absolute files, current owner, 0600); stdout contains a JSON draft with actual PNG base64. Redirect to a private file, not public storage or clipboard. Existing Resvg renderer, first-party logo/Universe kit, Content/Social manifest and MediaKit v5 quarantine are reused. MediaKit references are logical until materialized; no publication approval. Existing --smartcopy-conversion accepts a private candidate envelope and a separate scope file containing campaignId and releaseSha256. Only one-time EUR receipts, explicit purpose-specific consent, exact release/campaign, distinct pseudonymous subject/charge/receipt and fresh current reversal state. Full refunds/disputes require revoked license; partial refunds reduce candidate net paid amount; revoked or expired consent omitted. Net paid is not net revenue or accounting evidence. No real provider authentication, DB, entitlement update or live KPI. A separate authorized server adapter and #664 recovery are still necessary; no production activation. Existing fixed X campaign and SmartClip #916 are unchanged. New owner readback adds draft inventory counts only and accepts old snapshots.

Licensed context: projectLicensedProductResearch reuses assessContext with independent rights records and separately bound product mappings. It emits candidate records only; runProductMarketResearch still requires its independent digest review. Existing RAG/worker is not invoked, Firecrawl commercial/provider activation remains blocked; no external calls or automatic grants. No new network service, dependencies, scheduler or billing.

## Reviewed platform and competitive context
- https://docs.acode.app/docs/getting-started/publish-from-ci — publishing keys are scoped and expire, and submission remains subject to review. No key created. Prior Acode email is SmartClip-specific, not a contract grant for AI-Smartcopy.
- https://f-droid.org/packages/com.termux.api/ — shell access to system clipboard in a separate Termux environment. AI-Smartcopy must differentiate on the Acode terminal workflow, not exclusivity.
- https://docs.acode.app/user-guide/terminal — Acode provides built-in terminal; verify exact supported Alpine/Acode versions and fresh install before listing.
- https://developer.android.com/privacy-and-security/risks/secure-clipboard-handling — clipboard may expose sensitive data. No universal security or DLP claim. No clipboard payload collected.
- Demand volume, conversions, revenue, pricing validation and independent installation cohort remain NOT_PROVEN.

## Launch draft (no publishing)
P0 Website / SEO: title "AI-Smartcopy – Terminalausgaben in Acode gezielt kopieren". Description: "Technischer Pilot für einen nichtinteraktiven Terminalworkflow. Ausgabe nach Befehlsabschluss übernehmen und nativen Clipboard-Readback prüfen. Kompatibilität und Freigaben stehen noch aus." No purchase button.
P0 Acode listing: free distribution candidate; owner must verify exact rights, platform policy and customer release. No external mobile checkout.
P0 YouTube: 45-second draft — 0–5 problem, 5–18 synthetic acopy command, 18–30 output and exit code, 30–40 native readback on supported test device, 40–45 private-pilot limitations. No third-party audio or private logs.
P0 Community: "Ich entwickle einen Acode-Terminalworkflow, der geeignete Befehlsausgaben nach Abschluss kopiert. Welche Acode-Version und Terminalumgebung nutzt ihr?" Manufacturer disclosure, moderator-approved channel only.
P1 X: "AI-Smartcopy: Befehl starten, synthetische Ausgabe übernehmen, Clipboard-Readback prüfen. Technische Vorschau, noch kein öffentliches Release." No API spend.
P1 Reddit showcase/DEV: transparent development report, tested configuration and caveats; current rules first.
P1 Product Hunt/AlternativeTo: only once genuinely usable, no incentivized votes. HN human-authored only; no generated text.
P1 TikTok: original demo, commercial disclosure and rights review; no automatic posting.

Tests added to existing Growth/owner test entrypoints, including real PNG and MediaKit intake, rights-bound context, candidate refund/consent denials and old/new owner snapshot. Full tests and CI must be read back on exact head. Rollback revert the source PR; no schema or provider state changed.

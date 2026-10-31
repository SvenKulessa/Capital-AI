# Notion sign-in icon · brand provenance and limit

Date: 2026-10-15
Scope: `src/features/auth/LoginPage.tsx` · decorative Notion icon, 24x24 vector path scaled to same 28px height as existing Google and X icons.

- **Design reference:** [Simple Icons / Notion SVG](https://github.com/simple-icons/simple-icons/blob/develop/icons/notion.svg), originally published in the open Simple Icons icon catalog. The SVG vector path is embedded locally; no remote asset or user tracking request is added.
- **Notion trademark:** The Notion name and associated brand remain the property of their respective owners. Display identifies a third-party OAuth sign-in option; it is not a partnership, endorsement, Marketplace listing, or sublicensing of brand assets.
- **Use:** Single-color icon with localized accessible sign-in/register labels, equal-sized tap target and an unobtrusive border. Source code comments retain attribution link.
- **Provider authority:** Identity is obtained through configured Notion provider of Supabase; the Learning Hub content integration is separate and does not share its token or scopes.
- **Release limitation:** No claim of actual production Notion OAuth sign-in until provider callback, Supabase identities, session/MFA, legal notice and mobile runtime readback are verified. Disable the option or revert PR if these checks fail.

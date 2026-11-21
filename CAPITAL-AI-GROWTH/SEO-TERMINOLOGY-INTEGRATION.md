# SEO terminology integration

Authority remains `AGENTS.md`. Canonical public architecture/governance definitions remain in `shared/architecture-governance-vocabulary.mjs` and are merged into the public vocabulary by `src/data/vocabularyData.ts`.

SEO must not maintain a second glossary. `shared/seo-governance-vocabulary.mjs` is a read-only projection that derives aliases and search keywords from the canonical governance vocabulary plus bounded category-level search context.

## Boundaries

- Search visibility is public and independent of user skill level.
- Vocabulary `level` describes knowledge depth; it is not an authorization decision.
- SEO projection does not decide subscription entitlement.
- Subscription/entitlement logic must stay in the existing server-side access contracts.
- SEO projection does not decide `INDEX`, `NOINDEX`, `PRIVATE` or `BLOCKED`; `shared/seo-indexing-policy.mjs` remains responsible for indexing classification.
- Canonical routes/content remain governed by `shared/seo-content-manifest.mjs`.
- Metadata/JSON-LD remain governed by `shared/seo-metadata.mjs`.
- Runtime verification remains in the existing SEO readback path.

## Search context

The projection connects governance vocabulary with search intent by category. Examples include `enterprise technology`, `control plane`, `trust infrastructure`, `evidence first`, `data provenance`, `agent architecture` and `controlled execution`. These are discovery hints, not product, compliance, production or security claims.

## Duplicate prevention

Do not add another manually maintained SEO terminology catalog. New definitions belong in the canonical vocabulary source; SEO-specific aliases/keywords should be derived or added as bounded search facets without copying definitions.

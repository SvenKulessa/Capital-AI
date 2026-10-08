FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS crypto-base
# Keep a security floor while allowing newer patches from the base image's Alpine branch.
# Build and runtime reuse this one resolved layer instead of fetching two package indexes.
RUN apk add --no-cache 'libcrypto3>=3.5.8-r0' 'libssl3>=3.5.8-r0' 'zlib>=1.3.2-r1'

FROM crypto-base AS build
WORKDIR /app
RUN npm install --global npm@12.2.0 --ignore-scripts --no-audit --no-fund \
    && rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn* /usr/local/bin/pnpm* /root/.npm
COPY deploy/npm-security-patches/package.json deploy/npm-security-patches/package-lock.json /opt/npm-security-patches/
COPY deploy/social-media/ffmpeg-build-profile.json ./deploy/social-media/ffmpeg-build-profile.json
COPY scripts/harden-npm-toolchain.mjs /opt/harden-npm-toolchain.mjs
RUN npm ci --prefix /opt/npm-security-patches --ignore-scripts --no-audit --no-fund \
    && node /opt/harden-npm-toolchain.mjs /usr/local/lib/node_modules/npm /opt/npm-security-patches/node_modules \
    && rm -rf /opt/npm-security-patches /opt/harden-npm-toolchain.mjs /root/.npm
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && rm -rf /root/.npm /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
# All subsequent validation is offline. Node's script runner needs no npm/cache transport.
# Remove the installer itself, including vulnerable bundled http-cache-semantics, before validation.
COPY index.html vite.config.ts tsconfig.json OPEN_SOURCE_LICENSES.md ./
COPY AGENTS.md ./AGENTS.md
COPY .agents/skills ./.agents/skills
COPY .github/agents ./.github/agents
COPY .github/copilot-instructions.md ./.github/copilot-instructions.md
COPY src ./src
COPY ["Chat Buddy/src", "./Chat Buddy/src"]
COPY ["Chat Buddy/README.md", "./Chat Buddy/README.md"]
COPY CAPITAL-AI-PRODUCT/badge.svg ./CAPITAL-AI-PRODUCT/badge.svg
COPY CAPITAL-AI-TRUST/badge.svg ./CAPITAL-AI-TRUST/badge.svg
COPY CAPITAL-AI-MARKET/badge.svg ./CAPITAL-AI-MARKET/badge.svg
COPY CAPITAL-AI-GROWTH/badge.svg ./CAPITAL-AI-GROWTH/badge.svg
COPY CAPITAL-AI-PLATFORM/badge.svg ./CAPITAL-AI-PLATFORM/badge.svg
COPY contracts ./contracts
COPY packages/benchmark-core ./packages/benchmark-core
COPY apps/cads-github-app/marketplace-plans.production.json apps/cads-github-app/github-app-registration.production.example.json ./apps/cads-github-app/
COPY documentary/evidence ./documentary/evidence
COPY generated/documentary ./generated/documentary
COPY public/branding/capital-ai-logo.jpg ./public/branding/capital-ai-logo.jpg
COPY public/branding/asset-pack ./public/branding/asset-pack
COPY public/branding/badges ./public/branding/badges
COPY public/branding/social ./public/branding/social
COPY public/fonts ./public/fonts
COPY public/bootstrap-failure.js ./public/bootstrap-failure.js
COPY server/index.mjs server/advisor.ts server/http-security.mjs server/mta-sts.mjs server/mta-sts.test.mjs server/well-known.mjs server/well-known.test.mjs server/locale-html.test.mjs server/shadow-evidence-store.mjs server/auth-security.mjs server/auth-security.test.mjs ./server/
COPY server/prompt-injection-guard.mjs server/prompt-injection-guard.test.mjs server/billing-catalog.mjs server/vocabulary-checkout.mjs server/vocabulary-quant-pro-index.mjs server/vocabulary-checkout.test.mjs server/subscription-checkout.mjs server/subscription-checkout.test.mjs server/cads-marketplace.mjs server/cads-marketplace.test.mjs server/cads-commerce.mjs server/cads-commerce.test.mjs server/benchmark-runs.mjs server/benchmark-runs.test.mjs server/benchmark-store.mjs server/benchmark-store.test.mjs server/public-artifact-policy.mjs server/public-artifact-policy.test.mjs ./server/
COPY server/repository-tool-catalog.mjs server/repository-tool-catalog.test.mjs server/chat-buddy-keys.mjs server/chat-buddy-learn.mjs ./server/
COPY server/advisor-security.test.mjs ./server/
COPY server/nats-auth.mjs server/provider-query-state.mjs server/private-provider-query.mjs server/private-provider-query.test.mjs server/provider-query-state.test.mjs ./server/
COPY server/growth-ai-gateway.ts server/growth-ai-gateway.test.ts ./server/
COPY server/social-media/provider-adapter.mjs server/social-media/provider-adapter.test.mjs server/social-media/provider-store.mjs server/social-media/provider-store.test.mjs server/social-media/provider-readback.mjs server/social-media/provider-readback.test.mjs server/social-media/oauth-callback.mjs server/social-media/oauth-callback.test.mjs server/social-media/asset-readback.mjs server/social-media/asset-readback.test.mjs server/social-media/provider-external-readback.mjs server/social-media/provider-external-readback.test.mjs ./server/social-media/
COPY scripts/cads-marketplace-migration.test.mjs scripts/cads-marketplace-production-manifest.test.mjs scripts/provider-query-guard-migration.test.mjs scripts/billing-catalog.test.mjs scripts/stripe-catalog-readback.test.mjs scripts/stripe-three-purchase-e2e.mjs scripts/stripe-three-purchase-e2e.test.mjs scripts/stripe-subscription-sync-migration.test.mjs scripts/benchmark-ledger-migration.test.mjs scripts/benchmark-cost-calibration.test.mjs scripts/blueprint-evidence-contract.test.mjs scripts/supabase-auth-config.mjs scripts/supabase-auth-config.test.mjs scripts/seo-content-manifest.test.mjs scripts/seo-source-provenance-drift.test.mjs scripts/refresh-seo-source-provenance.mjs scripts/merge-milestone.mjs scripts/merge-milestone.test.mjs scripts/seo-metadata.test.mjs scripts/locale-policy.test.mjs scripts/finance-source-target-manifest.test.mjs scripts/validate-finance-source-target-manifest.mjs scripts/social-engine-completion-gate.test.mjs scripts/validate-social-engine-completion-gate.mjs ./scripts/
COPY supabase/email-templates ./supabase/email-templates
COPY supabase/migrations/20261005010039_legal_policy_evidence_store_isolated.sql supabase/migrations/20261005155500_fix_registration_consent_null.sql supabase/migrations/20261006072600_sync_stripe_subscription_catalog_v2.sql supabase/migrations/20261006080124_benchmark_run_usage_ledger.sql supabase/migrations/20261006131500_enable_binance_user_provider_vault.sql supabase/migrations/20261006210500_cads_marketplace_paid_entitlements.sql supabase/migrations/20261007214554_provider_query_guard.sql ./supabase/migrations/
COPY supabase/proposals/provider_query_guard.sql ./supabase/proposals/provider_query_guard.sql
COPY scripts/documentation-drift.mjs scripts/documentation-drift.test.mjs ./scripts/
COPY scripts/domain-skills.test.mjs ./scripts/domain-skills.test.mjs
COPY scripts/branding-assets.test.mjs scripts/license-evidence.mjs scripts/license-evidence.test.mjs scripts/social-tool-license-evidence.test.mjs scripts/validate-social-tool-license-evidence.mjs scripts/frontend-security.test.mjs scripts/verify-browser-boundary.mjs scripts/validate-frontend-boundaries.mjs scripts/validate-contract-suites.mjs scripts/validate-growth-contracts.mjs scripts/validate-evidence-hardening.mjs scripts/generate-documentary.mjs scripts/benchmark-scoring-capacity.mjs ./scripts/
COPY shared ./shared
COPY contracts/private-provider-query-operations.json ./contracts/private-provider-query-operations.json
COPY CAPITAL-AI-GROWTH/finance-social-market-source-target-manifest.json CAPITAL-AI-GROWTH/social-engine-completion-gate.json CAPITAL-AI-GROWTH/social-media-tool-admission.yaml CAPITAL-AI-GROWTH/FINANCE-SOCIAL-MARKET-MIGRATION-WORKPACKAGE-20261005.yaml ./CAPITAL-AI-GROWTH/
COPY CAPITAL-AI-GROWTH/social-tool-license-evidence-20261006.json ./CAPITAL-AI-GROWTH/social-tool-license-evidence-20261006.json
COPY CAPITAL-AI-GROWTH/social-renderer-worker-evidence-20261008.json ./CAPITAL-AI-GROWTH/social-renderer-worker-evidence-20261008.json
COPY server/market.mjs server/market-spot-ingestion.mjs server/open-source-market-policy.mjs server/ecb-reference-rates.mjs server/ecb-reference-rates.LICENSE.txt server/ecb-reference-rates.test.mjs server/auth.mjs server/user-provider-vault.mjs server/user-provider-vault.test.mjs server/kraken-order-dry-run.mjs server/kraken-order-dry-run.test.mjs server/uniswap-trading.mjs server/uniswap-trading.test.mjs ./server/
COPY docs/security/BYOK-USER-PRIVATE-DATA.md ./docs/security/BYOK-USER-PRIVATE-DATA.md
COPY docs/licenses ./docs/licenses
COPY docs/security/evidence/license-rights-review.json ./docs/security/evidence/license-rights-review.json
COPY docs/security/evidence/stripe-catalog-readback-20261006.json ./docs/security/evidence/stripe-catalog-readback-20261006.json
COPY docs/security/evidence/benchmark-cost-calibration-20261006.json ./docs/security/evidence/benchmark-cost-calibration-20261006.json
COPY docs/market-data/PRODUCTION-WEB-01-MARKET-20261005.yaml ./docs/market-data/PRODUCTION-WEB-01-MARKET-20261005.yaml
COPY docs/market-data/evidence/source-rights-admission-ecb-reference-rates-20261005.json ./docs/market-data/evidence/source-rights-admission-ecb-reference-rates-20261005.json
COPY docs/market-data/evidence/source-admission-ecb-reference-rates-20261006.json docs/market-data/evidence/instrument-manifest-20261005.json ./docs/market-data/evidence/
COPY scripts/ecb-reference-admission.test.mjs ./scripts/ecb-reference-admission.test.mjs
COPY scripts/license-engine.mjs ./scripts/license-engine.mjs
# Offline createApp integration tests require the same runtime module closure.
COPY server/index.mjs server/market.mjs server/market-spot-ingestion.mjs server/open-source-market-policy.mjs server/ecb-reference-rates.mjs server/auth.mjs server/auth-security.mjs server/subscription-entitlements.mjs server/user-provider-vault.mjs server/nats-auth.mjs server/provider-query-state.mjs server/private-provider-query.mjs server/kraken-order-dry-run.mjs server/uniswap-trading.mjs server/telegram.mjs server/privacy.mjs server/http-security.mjs server/mta-sts.mjs server/well-known.mjs server/mobile-scorer.mjs server/scorer-proxy.mjs server/scorer-bus.mjs server/observability.mjs server/cads-observability.mjs server/vocabulary-checkout.mjs server/vocabulary-quant-pro-index.mjs server/subscription-checkout.mjs server/cads-marketplace.mjs server/cads-commerce.mjs server/benchmark-runs.mjs server/benchmark-store.mjs server/public-artifact-policy.mjs server/chat-buddy-keys.mjs server/chat-buddy-learn.mjs ./server/
COPY server/infrastructure.mjs server/scorer-bus.mjs ./server/
COPY server/market-spot-ingestion.test.mjs ./server/
RUN --network=none node --test server/repository-tool-catalog.test.mjs \
    && node --test server/mta-sts.test.mjs server/well-known.test.mjs server/auth-security.test.mjs scripts/supabase-auth-config.test.mjs scripts/seo-content-manifest.test.mjs scripts/seo-source-provenance-drift.test.mjs \
    && node --test scripts/locale-policy.test.mjs server/locale-html.test.mjs \
    && node --import tsx --test src/i18n/messages.test.ts src/i18n/landingSectionCopy.test.ts src/i18n/legalAvailability.test.ts \
    && node --test server/prompt-injection-guard.test.mjs server/vocabulary-checkout.test.mjs server/subscription-checkout.test.mjs server/cads-marketplace.test.mjs server/cads-commerce.test.mjs server/benchmark-runs.test.mjs server/benchmark-store.test.mjs server/public-artifact-policy.test.mjs scripts/cads-marketplace-migration.test.mjs scripts/cads-marketplace-production-manifest.test.mjs scripts/provider-query-guard-migration.test.mjs scripts/billing-catalog.test.mjs \
    && node --test server/user-provider-vault.test.mjs server/private-provider-query.test.mjs server/provider-query-state.test.mjs server/kraken-order-dry-run.test.mjs server/uniswap-trading.test.mjs scripts/stripe-catalog-readback.test.mjs scripts/stripe-three-purchase-e2e.test.mjs scripts/benchmark-ledger-migration.test.mjs scripts/benchmark-cost-calibration.test.mjs \
    && node --import tsx --test server/advisor-security.test.mjs scripts/blueprint-evidence-contract.test.mjs \
    && node --import tsx --test scripts/merge-milestone.test.mjs \
    && node --test scripts/branding-assets.test.mjs \
    && CAPITAL_AI_REQUIRE_INSTALLED_LICENSE_EVIDENCE=true node --test scripts/license-evidence.test.mjs \
    && node scripts/license-evidence.mjs \
    && node --import tsx --test scripts/frontend-security.test.mjs \
    && node --run lint && node --run test && node --run build \
    && node scripts/verify-browser-boundary.mjs \
    && CAPITAL_AI_BENCHMARK_ENV=isolated-nonproduction node --import tsx scripts/benchmark-scoring-capacity.mjs > /app/scoring-capacity.json

FROM crypto-base AS production-deps
WORKDIR /runtime
COPY deploy/runtime/package.json deploy/runtime/package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && rm -rf /root/.npm

FROM crypto-base AS runtime
ENV NODE_ENV=production PORT=10000
WORKDIR /app
COPY ["Chat Buddy/README.md", "./Chat Buddy/README.md"]
COPY --from=build /app/dist ./dist
COPY --from=build /app/CAPITAL-AI-PRODUCT/badge.svg ./CAPITAL-AI-PRODUCT/badge.svg
COPY docs/licenses/CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-LICENSE-1.0.md ./docs/licenses/CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-LICENSE-1.0.md
COPY --from=build /app/scoring-capacity.json ./evidence/scoring-capacity.json
COPY --from=build /app/packages/benchmark-core ./packages/benchmark-core
COPY --from=build /app/contracts/private-provider-query-operations.json ./contracts/private-provider-query-operations.json
COPY server/index.mjs server/market.mjs server/market-spot-ingestion.mjs server/open-source-market-policy.mjs server/ecb-reference-rates.mjs server/auth.mjs server/auth-security.mjs server/subscription-entitlements.mjs server/user-provider-vault.mjs server/nats-auth.mjs server/provider-query-state.mjs server/private-provider-query.mjs server/kraken-order-dry-run.mjs server/uniswap-trading.mjs server/telegram.mjs server/privacy.mjs server/http-security.mjs server/mta-sts.mjs server/well-known.mjs server/mobile-scorer.mjs server/scorer-proxy.mjs server/scorer-bus.mjs server/observability.mjs server/cads-observability.mjs server/vocabulary-checkout.mjs server/vocabulary-quant-pro-index.mjs server/subscription-checkout.mjs server/cads-marketplace.mjs server/cads-commerce.mjs server/benchmark-runs.mjs server/benchmark-store.mjs server/public-artifact-policy.mjs server/chat-buddy-keys.mjs server/chat-buddy-learn.mjs ./server/
COPY server/social-media/provider-adapter.mjs server/social-media/provider-store.mjs server/social-media/oauth-callback.mjs ./server/social-media/
COPY --from=production-deps /runtime/node_modules ./node_modules
COPY server/repository-tool-catalog.mjs ./server/
COPY server/infrastructure.mjs ./server/
COPY server/billing-catalog.mjs ./server/
COPY scripts/verify-private-brokers.mjs ./scripts/
COPY shared ./shared
COPY docs/licenses/node-v26.10.0-LICENSE.txt ./licenses/Node-LICENSE.txt
COPY server/ecb-reference-rates.LICENSE.txt ./licenses/ECB-Reference-Rate-Adapter-MIT.txt
RUN rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /usr/local/bin/pnpm* /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn* \
    && chmod -R a-w /app
USER 1000:1000
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server/index.mjs"]

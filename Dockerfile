FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS crypto-base
# Keep a security floor while allowing newer patches from the base image's Alpine branch.
# Build and runtime reuse this one resolved layer instead of fetching two package indexes.
RUN apk add --no-cache 'libcrypto3>=3.5.8-r0' 'libssl3>=3.5.8-r0'

FROM crypto-base AS build
WORKDIR /app
RUN npm install --global npm@12.2.0 --ignore-scripts --no-audit --no-fund \
    && rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn* /usr/local/bin/pnpm* /root/.npm
COPY deploy/npm-security-patches/package.json deploy/npm-security-patches/package-lock.json /opt/npm-security-patches/
COPY scripts/harden-npm-toolchain.mjs /opt/harden-npm-toolchain.mjs
RUN npm ci --prefix /opt/npm-security-patches --ignore-scripts --no-audit --no-fund \
    && node /opt/harden-npm-toolchain.mjs /usr/local/lib/node_modules/npm /opt/npm-security-patches/node_modules \
    && rm -rf /opt/npm-security-patches /opt/harden-npm-toolchain.mjs /root/.npm
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund \
    && rm -rf /root/.npm /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
# All subsequent validation is offline. Node's script runner needs no npm/cache transport.
# Remove the installer itself, including vulnerable bundled http-cache-semantics, before validation.
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY CAPITAL-AI-PRODUCT/badge.svg ./CAPITAL-AI-PRODUCT/badge.svg
COPY CAPITAL-AI-TRUST/badge.svg ./CAPITAL-AI-TRUST/badge.svg
COPY CAPITAL-AI-MARKET/badge.svg ./CAPITAL-AI-MARKET/badge.svg
COPY CAPITAL-AI-GROWTH/badge.svg ./CAPITAL-AI-GROWTH/badge.svg
COPY CAPITAL-AI-PLATFORM/badge.svg ./CAPITAL-AI-PLATFORM/badge.svg
COPY contracts ./contracts
COPY packages/benchmark-core ./packages/benchmark-core
COPY documentary/evidence ./documentary/evidence
COPY generated/documentary ./generated/documentary
COPY public/branding/capital-ai-logo.jpg ./public/branding/capital-ai-logo.jpg
COPY public/branding/asset-pack ./public/branding/asset-pack
COPY public/branding/badges ./public/branding/badges
COPY public/fonts ./public/fonts
COPY public/bootstrap-failure.js ./public/bootstrap-failure.js
COPY server/advisor.ts server/http-security.mjs server/mta-sts.mjs server/mta-sts.test.mjs server/well-known.mjs server/well-known.test.mjs server/shadow-evidence-store.mjs server/auth-security.mjs server/auth-security.test.mjs ./server/
COPY server/prompt-injection-guard.mjs server/prompt-injection-guard.test.mjs server/billing-catalog.mjs server/vocabulary-checkout.mjs server/vocabulary-quant-pro-index.mjs server/vocabulary-checkout.test.mjs ./server/
COPY server/advisor-security.test.mjs ./server/
COPY scripts/billing-catalog.test.mjs scripts/supabase-auth-config.mjs scripts/supabase-auth-config.test.mjs scripts/seo-content-manifest.test.mjs scripts/seo-metadata.test.mjs ./scripts/
COPY supabase/email-templates ./supabase/email-templates
COPY scripts/documentation-drift.mjs scripts/documentation-drift.test.mjs ./scripts/
COPY scripts/branding-assets.test.mjs scripts/license-evidence.mjs scripts/license-evidence.test.mjs scripts/frontend-security.test.mjs scripts/verify-browser-boundary.mjs scripts/validate-frontend-boundaries.mjs scripts/validate-contract-suites.mjs scripts/validate-growth-contracts.mjs scripts/validate-evidence-hardening.mjs scripts/generate-documentary.mjs scripts/benchmark-scoring-capacity.mjs ./scripts/
COPY shared ./shared
COPY docs/licenses ./docs/licenses
COPY docs/security/evidence/license-rights-review.json ./docs/security/evidence/license-rights-review.json
COPY docs/market-data/PRODUCTION-WEB-01-MARKET-20261005.yaml ./docs/market-data/PRODUCTION-WEB-01-MARKET-20261005.yaml
COPY docs/market-data/evidence/source-rights-admission-ecb-reference-rates-20261005.json ./docs/market-data/evidence/source-rights-admission-ecb-reference-rates-20261005.json
COPY scripts/license-engine.mjs ./scripts/license-engine.mjs
RUN --network=none node --test server/mta-sts.test.mjs server/well-known.test.mjs server/auth-security.test.mjs scripts/supabase-auth-config.test.mjs scripts/seo-content-manifest.test.mjs \
    && node --test server/prompt-injection-guard.test.mjs server/vocabulary-checkout.test.mjs scripts/billing-catalog.test.mjs \
    && node --import tsx --test server/advisor-security.test.mjs \
    && node --test scripts/branding-assets.test.mjs \
    && node --test scripts/license-evidence.test.mjs \
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
COPY --from=build /app/dist ./dist
COPY --from=build /app/CAPITAL-AI-PRODUCT/badge.svg ./CAPITAL-AI-PRODUCT/badge.svg
COPY docs/licenses/CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-LICENSE-1.0.md ./docs/licenses/CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-LICENSE-1.0.md
COPY --from=build /app/scoring-capacity.json ./evidence/scoring-capacity.json
COPY server/index.mjs server/market.mjs server/open-source-market-policy.mjs server/auth.mjs server/auth-security.mjs server/user-provider-vault.mjs server/telegram.mjs server/privacy.mjs server/http-security.mjs server/mta-sts.mjs server/well-known.mjs server/mobile-scorer.mjs server/scorer-proxy.mjs server/scorer-bus.mjs server/observability.mjs server/cads-observability.mjs server/vocabulary-checkout.mjs server/vocabulary-quant-pro-index.mjs ./server/
COPY --from=production-deps /runtime/node_modules ./node_modules
COPY server/infrastructure.mjs ./server/
COPY server/billing-catalog.mjs ./server/
COPY scripts/verify-private-brokers.mjs ./scripts/
COPY shared ./shared
COPY docs/licenses/node-v26.10.0-LICENSE.txt ./licenses/Node-LICENSE.txt
RUN rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /usr/local/bin/pnpm* /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn* \
    && chmod -R a-w /app
USER 1000:1000
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server/index.mjs"]

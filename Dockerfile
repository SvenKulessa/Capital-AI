FROM node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS crypto-base
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
RUN npm ci --ignore-scripts --no-audit --no-fund && rm -rf /root/.npm
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
COPY public/branding/capital-ai-logo.jpg ./public/branding/capital-ai-logo.jpg
COPY public/branding/asset-pack ./public/branding/asset-pack
COPY server/advisor.ts server/http-security.mjs server/mta-sts.mjs server/mta-sts.test.mjs ./server/
COPY scripts/branding-assets.test.mjs scripts/license-evidence.mjs scripts/license-evidence.test.mjs scripts/frontend-security.test.mjs scripts/verify-browser-boundary.mjs scripts/validate-contract-suites.mjs ./scripts/
COPY shared ./shared
COPY docs/licenses ./docs/licenses
COPY docs/security/evidence/license-rights-review.json ./docs/security/evidence/license-rights-review.json
COPY scripts/license-engine.mjs ./scripts/license-engine.mjs
RUN --network=none node --test server/mta-sts.test.mjs \
    && node --test scripts/branding-assets.test.mjs \
    && node --test scripts/license-evidence.test.mjs \
    && node scripts/license-evidence.mjs \
    && node --import tsx --test scripts/frontend-security.test.mjs \
    && npm run lint && npm test && npm run build \
    && node scripts/verify-browser-boundary.mjs

FROM build AS production-deps
RUN npm prune --omit=dev --ignore-scripts --no-audit --no-fund && rm -rf /root/.npm

FROM crypto-base AS runtime
ENV NODE_ENV=production PORT=10000
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server/index.mjs server/market.mjs server/auth.mjs server/telegram.mjs server/privacy.mjs server/http-security.mjs server/mta-sts.mjs ./server/
COPY --from=production-deps /app/node_modules ./node_modules
COPY server/infrastructure.mjs ./server/
COPY scripts/verify-private-brokers.mjs ./scripts/
COPY shared ./shared
COPY docs/licenses/node-v24.19.0-LICENSE.txt ./licenses/Node-LICENSE.txt
RUN rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /usr/local/bin/pnpm* /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn* \
    && chmod -R a-w /app
USER 1000:1000
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server/index.mjs"]

FROM node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS build
WORKDIR /app
RUN apk add --no-cache libcrypto3=3.5.8-r0 libssl3=3.5.8-r0 \
    && npm install --global npm@11.20.0 --ignore-scripts --no-audit --no-fund \
    && rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /opt/yarn* /usr/local/bin/yarn* /usr/local/bin/pnpm*
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src
RUN --network=none npm run lint && npm test && npm run build

FROM node:24.19.0-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS runtime
ENV NODE_ENV=production PORT=10000
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server/index.mjs server/market.mjs ./server/
RUN apk add --no-cache libcrypto3=3.5.8-r0 libssl3=3.5.8-r0 \
    && rm -rf /usr/local/lib/node_modules/corepack /usr/local/bin/corepack /usr/local/bin/pnpm* /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn* /usr/local/bin/yarn* \
    && chmod -R a-w /app
USER 1000:1000
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz',{signal:AbortSignal.timeout(3000)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server/index.mjs"]

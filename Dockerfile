# syntax=docker/dockerfile:1.7

FROM node:24.18.0-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml .npmrc ./
RUN corepack enable pnpm && corepack prepare pnpm@10.23.0 --activate
RUN --mount=type=secret,id=npm_token \
  NODE_AUTH_TOKEN="$(cat /run/secrets/npm_token)" \
  pnpm install --frozen-lockfile

FROM base AS builder
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN rm -f .npmrc
RUN corepack enable pnpm && corepack prepare pnpm@10.23.0 --activate
RUN pnpm build

FROM node:24.18.0-bookworm-slim AS runner
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=3000
WORKDIR /app
RUN groupadd --gid 1001 nodeapp && useradd --uid 1001 --gid nodeapp --shell /usr/sbin/nologin --create-home nodeapp
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/standalone ./
COPY --from=builder --chown=nodeapp:nodeapp /app/.next/static ./.next/static
USER 1001:1001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "server.js"]

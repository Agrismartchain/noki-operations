# syntax=docker/dockerfile:1.7

FROM node:24.22.2-trixie-slim@sha256:54f84b4cf8432b21aaffd5d3ce8d41e12cea0d10d33c09d2f3c9879d49d6b446 AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml .npmrc ./
COPY vendor ./vendor
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

# Runtime: distroless Node.js 24 on Debian 13 (no shell, no package manager, no npm/corepack/yarn).
# Index digest pinned (linux/amd64 manifest: sha256:1dfdd0613f3163fe913861ded2540584525b281d65541749726c7d3906382c06).
# The image ENTRYPOINT is already /nodejs/bin/node, so CMD only carries the script.
FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:b8cec4b2f2126ff7bd034ec9ac207ffb3272667dfdc48376e3b035d3270549ba AS runner
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  HOSTNAME=0.0.0.0 \
  PORT=3000
WORKDIR /app
COPY --from=builder --chown=1001:1001 /app/.next/standalone ./
COPY --from=builder --chown=1001:1001 /app/.next/static ./.next/static
USER 1001:1001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["server.js"]

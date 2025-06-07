FROM oven/bun:1-alpine AS base

FROM base AS deps
RUN mkdir -p /app && chown bun:bun /app
USER bun
WORKDIR /app
COPY --chown=bun:bun package.json ./
USER root
RUN bun install --no-progress

FROM base AS builder
RUN mkdir -p /data && chown bun:bun /data && chmod 700 /data
USER bun
WORKDIR /app
COPY --chown=bun:bun --from=deps /app/node_modules ./node_modules
COPY --chown=bun:bun . .

RUN bun run deploy


CMD ["bun", "run", "dev"]

FROM oven/bun:1-alpine AS runner
USER bun
WORKDIR /app

ENV TZ="Europe/Berlin"
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/budget.db"
ENV BETTER_AUTH_SECRET=
ENV VITE_BETTER_AUTH_URL=

COPY --chown=bun:bun --from=builder /app/.output ./
COPY --chown=bun:bun --from=builder /app/src/generated/prisma/libquery*.so.node ./server/
COPY --chown=bun:bun healthcheck.js ./healthcheck.js 

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 CMD bun run /app/healthcheck.js || exit 1

CMD ["bun", "run", "server/index.mjs"]
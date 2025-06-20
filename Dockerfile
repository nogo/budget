FROM oven/bun:1-alpine AS base

FROM base AS deps
RUN mkdir -p /app && chown bun:bun /app
USER bun
WORKDIR /app
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --no-progress --frozen-lockfile

FROM base AS builder
RUN mkdir -p /data && chown bun:bun /data && chmod 700 /data
USER bun
WORKDIR /app
COPY --chown=bun:bun --from=deps /app/node_modules ./node_modules
COPY --chown=bun:bun . .
RUN bunx --bun prisma generate
RUN bunx --bun vite build --mode production
RUN bun run postbuild

FROM oven/bun:1-alpine AS runner
RUN mkdir -p /data && chown bun:bun /data
USER bun
WORKDIR /app

ENV TZ="Europe/Berlin"
ENV NODE_ENV=production

COPY --chown=bun:bun --from=builder /app/.output ./

VOLUME ["/data"]
EXPOSE 3000

CMD ["bun", "run", "server/index.mjs"]
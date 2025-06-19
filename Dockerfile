FROM oven/bun:1-alpine AS base

FROM base AS deps
RUN apk add --no-cache build-base python3
RUN mkdir -p /app && chown bun:bun /app
USER bun
WORKDIR /app
COPY --chown=bun:bun package.json bun.lock ./
USER root
RUN bun install --no-progress

FROM base AS builder
RUN mkdir -p /data && chown bun:bun /data && chmod 700 /data
USER bun
WORKDIR /app
COPY --chown=bun:bun --from=deps /app/node_modules ./node_modules
COPY --chown=bun:bun . .
RUN bunx prisma generate
RUN bunx --bun vite build --mode production

CMD ["bun", "run", "dev"]

FROM oven/bun:1-alpine AS runner
USER bun
WORKDIR /app

ENV TZ="Europe/Berlin"
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/budget.db"
ENV BETTER_AUTH_SECRET=
ENV VITE_LOCALE="de-DE"
ENV VITE_CURRENCY="EUR"
ENV VITE_BETTER_AUTH_URL=

COPY --chown=bun:bun --from=builder /app/.output ./

EXPOSE 3000

CMD ["bun", "run", "server/index.mjs"]
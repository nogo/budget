FROM node:24-alpine AS base

FROM base AS deps
RUN apk add --no-cache build-base python3
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN mkdir -p /app && chown node:node /app
USER node
WORKDIR /app
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
USER root
RUN pnpm install --frozen-lockfile --prod=false

FROM base AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN mkdir -p /data && chown node:node /data && chmod 700 /data
USER node
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .
RUN pnpm prisma generate
RUN pnpm build

CMD ["pnpm", "dev"]

FROM node:24-alpine AS runner
USER node
WORKDIR /app

ENV TZ="Europe/Berlin"
ENV NODE_ENV=production
ENV DATABASE_URL="file:/data/budget.db"
ENV BETTER_AUTH_SECRET=
ENV VITE_LOCALE="de-DE"
ENV VITE_CURRENCY="EUR"
ENV VITE_BETTER_AUTH_URL=

COPY --chown=node:node --from=builder /app/.output ./

EXPOSE 3000

CMD ["node", "run", "server/index.mjs"]
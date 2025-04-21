FROM node:23-slim@sha256:dfb18d8011c0b3a112214a32e772d9c6752131ffee512e974e59367e46fcee52 AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate && pnpm build --preset node-server

FROM builder AS deploy
WORKDIR /app
COPY --from=deps /app /app

FROM node:23-slim@sha256:dfb18d8011c0b3a112214a32e772d9c6752131ffee512e974e59367e46fcee52 AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data
COPY --from=builder /app/.output ./.output
COPY .env.example .env

EXPOSE 3000
USER nodejs

CMD ["node", "--env-file=.env", ".output/server/index.mjs"]
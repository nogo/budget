FROM node:23-alpine@sha256:86703151a18fcd06258e013073508c4afea8e19cd7ed451554221dd00aea83fc AS base

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
RUN pnpm prisma generate
RUN pnpm build --preset node-server

FROM node:23-alpine@sha256:86703151a18fcd06258e013073508c4afea8e19cd7ed451554221dd00aea83fc AS runner
WORKDIR /app

ENV NODE_ENV=production
RUN addgroup --system --gid 1001 node && \
    adduser --system --uid 1001 node

COPY --chown=1001:1001 --from=builder /app/.output /app/build
COPY --chown=1001:1001 --from=builder /app/src/generated/db/libquery*.so.node /app/build/server/

VOLUME [ "/app/data" ]
EXPOSE 3000
USER node

CMD ["node", "--env-file-if-exists=data/.env", "build/server/index.mjs"]
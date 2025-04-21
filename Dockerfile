FROM node:23-alpine@sha256:86703151a18fcd06258e013073508c4afea8e19cd7ed451554221dd00aea83fc AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS deps
USER node
WORKDIR /app
COPY --chown=node:node package.json pnpm-lock.yaml* pnpm-workspace.yaml ./
USER root
RUN pnpm install --frozen-lockfile

FROM base AS builder
USER node
WORKDIR /app
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node . .

USER root
RUN mkdir -p /data && chown -R node:node /data

ENV NODE_ENV=production
RUN pnpm prisma generate
RUN pnpm build --preset node-server

FROM node:23-alpine@sha256:86703151a18fcd06258e013073508c4afea8e19cd7ed451554221dd00aea83fc AS runner
USER node
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node --from=builder /app/.output ./
COPY --chown=node:node --from=builder /app/src/generated/db/libquery*.so.node ./server/

VOLUME [ "/data" ]
EXPOSE 3000

CMD ["node", "--env-file-if-exists=/data/.env", "server/index.mjs"]
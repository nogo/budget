FROM oven/bun:1-alpine AS base

FROM base AS deps
RUN mkdir -p /app && chown bun:bun /app
USER bun
WORKDIR /app
COPY --chown=bun:bun package.json bun.lock ./
RUN bun install --no-progress

FROM base AS builder
RUN mkdir -p /data && chown bun:bun /data && chmod 700 /data
USER bun
WORKDIR /app
COPY --chown=bun:bun --from=deps /app/node_modules ./node_modules
COPY --chown=bun:bun . .

# Define build args for environment variables
ARG VITE_LOCALE
ARG VITE_CURRENCY
ARG VITE_BETTER_AUTH_URL
ARG VITE_AUTH_ALLOW_REGISTRATION
ARG VITE_AUTH_DEFAULT_USER
ARG VITE_AUTH_DEFAULT_EMAIL
ARG VITE_AUTH_DEFAULT_PASSWORD

# Set environment variables for build
ENV VITE_LOCALE=$VITE_LOCALE
ENV VITE_CURRENCY=$VITE_CURRENCY
ENV VITE_BETTER_AUTH_URL=$VITE_BETTER_AUTH_URL
ENV VITE_AUTH_ALLOW_REGISTRATION=$VITE_AUTH_ALLOW_REGISTRATION
ENV VITE_AUTH_DEFAULT_USER=$VITE_AUTH_DEFAULT_USER
ENV VITE_AUTH_DEFAULT_EMAIL=$VITE_AUTH_DEFAULT_EMAIL
ENV VITE_AUTH_DEFAULT_PASSWORD=$VITE_AUTH_DEFAULT_PASSWORD

RUN bunx --bun prisma generate
RUN bunx --bun vite build --mode production

FROM oven/bun:1-alpine AS runner
RUN mkdir -p /data && chown bun:bun /data
USER bun
WORKDIR /app

ENV TZ="Europe/Berlin"
ENV NODE_ENV=production

COPY --chown=bun:bun --from=builder /app/.output ./

VOLUME ["/data"]
EXPOSE 4000

CMD ["bun", "run", "server/index.mjs"]
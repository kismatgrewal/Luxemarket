# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# LuxeMarket — multi-stage image for the Next.js app.
# Produces a small runtime image from Next.js "standalone" output.
#
# NOTE: the standalone runtime stage requires `output: "standalone"` in
# next.config.mjs so that `next build` emits `.next/standalone`. If it is not
# yet enabled, add `output: "standalone"` to the config object.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=20

# --- Base: Node + pnpm via Corepack -----------------------------------------
FROM node:${NODE_VERSION}-alpine AS base
# libc compat for Prisma's engine binaries on Alpine.
RUN apk add --no-cache libc6-compat
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# --- Dependencies: install with a cached pnpm store -------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- Build: generate Prisma client + compile the app ------------------------
FROM base AS builder
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# `pnpm build` runs `prisma generate && next build`.
RUN pnpm build

# --- Runtime: minimal image running the standalone server -------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Run as an unprivileged user.
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# Public assets and the standalone server output.
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Prisma schema + generated engine, for `migrate deploy` and runtime queries.
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma

USER nextjs
EXPOSE 3000

# The standalone build emits server.js at the app root.
CMD ["node", "server.js"]

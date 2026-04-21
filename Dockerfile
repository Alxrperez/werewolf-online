# ─── Stage 1: Install all workspace dependencies ─────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

# Copy workspace manifests first for better layer caching
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/client/package.json ./packages/client/

RUN npm ci --ignore-scripts

# ─── Stage 2: Build shared + client + server ──────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# npm workspaces hoists all deps to the root node_modules — no per-package copies needed.
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
COPY packages/client ./packages/client

# Build shared first (server and client depend on its dist/)
RUN npm run build --workspace=packages/shared

# Build server TypeScript
RUN npm run build --workspace=packages/server

# Build client (Vite, produces packages/client/dist/)
RUN npm run build --workspace=packages/client

# ─── Stage 3: Lean production image ───────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy only what the server needs at runtime
COPY --from=builder /app/packages/server/dist ./packages/server/dist
COPY --from=builder /app/packages/server/package.json ./packages/server/
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/packages/shared/package.json ./packages/shared/
# Static client build (served by nginx, but copy here for possible SSR)
COPY --from=builder /app/packages/client/dist ./packages/client/dist

COPY package.json ./
COPY --from=deps /app/node_modules ./node_modules

# Expose server port (override with PORT env var)
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/ping || exit 1

CMD ["node", "packages/server/dist/index.js"]

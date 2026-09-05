# ============================================================
# AURA-BTC: Frontend Dashboard Dockerfile (Next.js 15)
# Exposes Port 3000
# ============================================================

FROM node:20-alpine AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

# Copy package manifests and install all dependencies (including devDependencies)
COPY package.json package-lock.json* bun.lock* ./
RUN npm install --include=dev

# Copy application source code
COPY . .

# Build production bundle
RUN npm run build

# Stage 2: Minimal Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]

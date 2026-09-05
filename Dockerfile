# ============================================================
# AURA-BTC: Unified Standalone Dockerfile
# Single container running Frontend (3000) + Backend (8000) + DuckDB Studio (8080)
# 100% Offline & Air-Gapped
# ============================================================

# Stage 1: Build Next.js Dashboard
FROM node:20-alpine AS frontend-builder
WORKDIR /build-frontend
ENV NEXT_TELEMETRY_DISABLED=1
COPY aura-btc-dashboard/package.json aura-btc-dashboard/package-lock.json* aura-btc-dashboard/bun.lock* ./
RUN npm install --include=dev
COPY aura-btc-dashboard/ .
RUN npm run build

# Stage 2: Final Runtime Image (Python + Node Runtime)
FROM python:3.11-slim

WORKDIR /app

# Install Node.js runtime and utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
RUN pip install --no-cache-dir \
    "fastapi>=0.110.0" \
    "uvicorn[standard]>=0.28.0" \
    "duckdb>=0.10.0" \
    "pandas>=2.2.0" \
    "numpy>=1.26.0" \
    "networkx>=3.2.0" \
    "scikit-learn>=1.4.0" \
    "joblib>=1.3.0" \
    "pydantic>=2.6.0" \
    "python-multipart>=0.0.9"

# Copy Python codebase
COPY src/ /app/src/
COPY data/schema.sql /app/data/schema.sql
COPY models/ /app/models/
COPY sample_data/ /app/sample_data/
COPY scripts/ /app/scripts/
COPY pyproject.toml /app/pyproject.toml
RUN mkdir -p /app/data/uploads

# Copy Next.js production build from Stage 1
COPY --from=frontend-builder /build-frontend/package.json /app/aura-btc-dashboard/package.json
COPY --from=frontend-builder /build-frontend/node_modules /app/aura-btc-dashboard/node_modules
COPY --from=frontend-builder /build-frontend/.next /app/aura-btc-dashboard/.next
COPY --from=frontend-builder /build-frontend/public /app/aura-btc-dashboard/public

# Create universal orchestrator entrypoint
RUN echo '#!/bin/bash\n\
echo "============================================================"\n\
echo "  AURA-BTC: Starting Unified Offline Intelligence Engine    "\n\
echo "============================================================"\n\
python -m uvicorn src.db_dashboard:app --host 0.0.0.0 --port 8080 &\n\
echo "[OK] DuckDB Studio running on http://0.0.0.0:8080"\n\
python -m uvicorn src.api.main:app --host 0.0.0.0 --port 8000 &\n\
echo "[OK] Core Backend API running on http://0.0.0.0:8000"\n\
cd /app/aura-btc-dashboard && npx next start -p 3000 -H 0.0.0.0\n\
' > /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 3000
EXPOSE 8000
EXPOSE 8080

ENTRYPOINT ["/app/entrypoint.sh"]

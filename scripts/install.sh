#!/bin/bash
set -e
echo "============================================"
echo "  AURA-BTC: Offline Installation"
echo "============================================"

# Install Python dependencies
echo "[1/3] Installing Python dependencies with uv..."
uv sync --all-extras

# Create required directories
echo "[2/3] Creating directories..."
mkdir -p data models data/uploads

echo "[3/3] Installation complete!"
echo ""
echo "Next steps:"
echo "  1. ./scripts/train.sh    # Ingest sample data + train ML models"
echo "  2. ./scripts/start.sh    # Launch the platform"

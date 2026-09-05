#!/bin/bash
set -e
echo "============================================"
echo "  AURA-BTC: Starting Platform"
echo "============================================"

# Kill any existing processes on our ports
kill $(lsof -t -i:8000) 2>/dev/null || true

# Start backend
echo "[1/1] Starting FastAPI backend on http://127.0.0.1:8000..."
uv run uvicorn src.api.main:app --host 127.0.0.1 --port 8000 --reload &
BACKEND_PID=$!

sleep 2

echo ""
echo "============================================"
echo "  AURA-BTC is running!"
echo "  Backend API: http://127.0.0.1:8000"
echo "  API Docs:    http://127.0.0.1:8000/docs"
echo "  Press Ctrl+C to stop"
echo "============================================"

# Trap for clean shutdown
trap "echo 'Shutting down...'; kill $BACKEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait

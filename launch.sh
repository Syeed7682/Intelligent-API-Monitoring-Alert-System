#!/usr/bin/env bash

# Exit on error
set -e

echo "=================================================="
echo " Starting Intelligent API Monitoring & Alert System"
echo "=================================================="

# Check node & npm
command -v node >/dev/null 2>&1 || { echo >&2 "Node.js is required but not installed. Aborting."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is required but not installed. Aborting."; exit 1; }

# Install backend dependencies if not present
if [ ! -d "backend/node_modules" ]; then
  echo "[1/3] Installing backend dependencies..."
  (cd backend && npm install)
fi

# Install frontend dependencies if not present
if [ ! -d "frontend/node_modules" ]; then
  echo "[1/3] Installing frontend dependencies..."
  (cd frontend && npm install)
fi

echo "[2/3] Launching Backend server (http://localhost:3001)..."
(cd backend && npm run dev) &
BACKEND_PID=$!

echo "[3/3] Launching Frontend dashboard (http://localhost:5173)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "=================================================="
echo " System is live!"
echo " -> Frontend Dashboard : http://localhost:5173"
echo " -> Backend API        : http://localhost:3001"
echo " -> Health Endpoint    : http://localhost:3001/health"
echo " Press [Ctrl+C] to stop all services."
echo "=================================================="

# Graceful cleanup on exit
cleanup() {
  echo ""
  echo "Stopping services..."
  kill "$BACKEND_PID" 2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

wait

#!/usr/bin/env bash
# Run the Appointment Board (backend + frontend) with a single command.
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# --- 1. Backend setup ---
if [ ! -d "$BACKEND/venv" ]; then
  echo ">>> Creating Python virtualenv..."
  python3 -m venv "$BACKEND/venv"
fi

echo ">>> Installing backend dependencies (if needed)..."
"$BACKEND/venv/bin/python" -m pip install -q -r "$BACKEND/requirements.txt"

# --- 2. Frontend setup ---
if [ ! -d "$FRONTEND/node_modules" ]; then
  echo ">>> Installing frontend dependencies (npm install)..."
  (cd "$FRONTEND" && npm install --no-audit --no-fund)
fi

# --- 3. Launch both servers ---
echo ">>> Starting backend on http://localhost:8000"
"$BACKEND/venv/bin/python" -m uvicorn main:app --reload --port 8000 --app-dir "$BACKEND" &
BACKEND_PID=$!

echo ">>> Starting frontend on http://localhost:3000"
(cd "$FRONTEND" && npm start) &
FRONTEND_PID=$!

# --- 4. Clean shutdown on Ctrl+C ---
trap 'echo; echo ">>> Shutting down..."; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0' INT TERM

echo
echo "=========================================================="
echo "  Appointment Board is running!"
echo "  Frontend:  http://localhost:3000"
echo "  Backend:   http://localhost:8000"
echo "  API docs:  http://localhost:8000/docs"
echo "  Press Ctrl+C to stop everything."
echo "=========================================================="

wait

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"
BACKEND_DIR="$ROOT_DIR/Backend"

mkdir -p "$RUN_DIR"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

is_running() {
  local pid_file="$1"
  [ -f "$pid_file" ] && kill -0 "$(cat "$pid_file")" 2>/dev/null
}

wait_for_pid_on_port() {
  local port="$1"
  for _ in $(seq 1 20); do
    pid=$(lsof -ti "tcp:$port" 2>/dev/null | head -1 || true)
    if [ -n "$pid" ]; then
      echo "$pid"
      return 0
    fi
    sleep 0.5
  done
  return 1
}

# ---- Backend ----
if is_running "$BACKEND_PID_FILE"; then
  echo "✔ Backend already running (PID $(cat "$BACKEND_PID_FILE"))"
else
  echo "▶ Starting Backend (node server.js) on port 4000..."
  (cd "$BACKEND_DIR" && nohup node server.js > "$BACKEND_LOG" 2>&1 &)
  BACKEND_PID=$(wait_for_pid_on_port 4000 || true)
  if [ -n "$BACKEND_PID" ]; then
    echo "$BACKEND_PID" > "$BACKEND_PID_FILE"
  fi
fi

# ---- Frontend static server ----
if is_running "$FRONTEND_PID_FILE"; then
  echo "✔ Frontend already running (PID $(cat "$FRONTEND_PID_FILE"))"
else
  echo "▶ Starting Frontend (python3 -m http.server 8000)..."
  (cd "$ROOT_DIR" && nohup python3 -m http.server 8000 > "$FRONTEND_LOG" 2>&1 &)
  FRONTEND_PID=$(wait_for_pid_on_port 8000 || true)
  if [ -n "$FRONTEND_PID" ]; then
    echo "$FRONTEND_PID" > "$FRONTEND_PID_FILE"
  fi
fi

echo ""
echo "============================================================"
if curl -s -o /dev/null -w "" --max-time 5 http://localhost:4000/api/health; then
  echo "✅ Backend:  http://localhost:4000  (API)"
else
  echo "⚠️  Backend:  http://localhost:4000  (ยังเชื่อมต่อไม่ได้ ดู $BACKEND_LOG)"
fi

if curl -s -o /dev/null -w "" --max-time 5 http://localhost:8000/; then
  echo "✅ Frontend: http://localhost:8000/Fronend/index.html"
else
  echo "⚠️  Frontend: http://localhost:8000  (ยังเชื่อมต่อไม่ได้ ดู $FRONTEND_LOG)"
fi
echo "============================================================"
echo "หยุดเซิร์ฟเวอร์ทั้งคู่ได้ด้วยคำสั่ง: ./stop.sh"

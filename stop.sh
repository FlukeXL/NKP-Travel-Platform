#!/bin/bash
# ============================================================
# stop.sh — stops both servers started by start.sh.
# ============================================================

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RUN_DIR="$ROOT_DIR/.run"

BACKEND_PID_FILE="$RUN_DIR/backend.pid"
FRONTEND_PID_FILE="$RUN_DIR/frontend.pid"

stop_one() {
  local name="$1"
  local pid_file="$2"
  if [ -f "$pid_file" ]; then
    local pid
    pid="$(cat "$pid_file")"
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null
      echo "🛑 หยุด $name (PID $pid) แล้ว"
    else
      echo "• $name ไม่ได้รันอยู่แล้ว"
    fi
    rm -f "$pid_file"
  else
    echo "• ไม่พบ $name ที่กำลังรัน (ไม่มี PID file)"
  fi
}

stop_one "Backend" "$BACKEND_PID_FILE"
stop_one "Frontend" "$FRONTEND_PID_FILE"

# Fallback: also kill anything still bound to the ports, in case the
# PID files were missing/stale (e.g. server started another way).
for port in 4000 8000; do
  pid=$(lsof -ti tcp:$port 2>/dev/null || true)
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null && echo "🛑 หยุดโปรเซสที่ค้างอยู่บนพอร์ต $port (PID $pid) แล้ว"
  fi
done

if pkill -f "pinggy.io" 2>/dev/null; then
  echo "🛑 ปิดท่อ Public Link (Pinggy) แล้ว"
fi


#!/bin/bash
echo "🔍 PORT AND PROCESS MONITOR"
echo "============================"

check_port() {
    PORT=$1
    SERVICE=$2
    echo "Port $PORT ($SERVICE):"
    PIDS=$(lsof -ti:$PORT 2>/dev/null)
    if [ -z "$PIDS" ]; then
        echo "  ✅ Free"
    else
        PID_COUNT=$(echo "$PIDS" | wc -l | tr -d ' ')
        if [ "$PID_COUNT" -gt 1 ]; then
            echo "  ⚠️  WARNING: $PID_COUNT processes on this port!"
        fi
        for PID in $PIDS; do
            PROC_NAME=$(ps -p $PID -o comm= 2>/dev/null)
            echo "  PID $PID: $PROC_NAME"
        done
    fi
    echo ""
}

check_port 8000 "Python Backend"
check_port 3020 "Node Backend"
check_port 5173 "Frontend/Vite"

# Health check
echo "Health Check:"
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "  ✅ Backend responding"
else
    echo "  ❌ Backend not responding"
fi

# Summary
PORT_8000_COUNT=$(lsof -ti:8000 2>/dev/null | wc -l | tr -d ' ')
if [ "$PORT_8000_COUNT" -gt 2 ]; then
    echo "⚠️  PROBLEM: Multiple processes on port 8000"
    echo "Run: lsof -ti:8000 | xargs kill -9"
fi

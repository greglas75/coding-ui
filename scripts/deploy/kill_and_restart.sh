#!/bin/bash
echo "🔥 AGGRESSIVE CLEANUP AND RESTART"
echo "=================================="

# Kill by port
for PORT in 8000 8001 3020 5173 3000; do
    echo "Checking port $PORT..."
    PIDS=$(lsof -ti:$PORT)
    if [ ! -z "$PIDS" ]; then
        echo "  Killing PIDs on port $PORT: $PIDS"
        echo $PIDS | xargs kill -9 2>/dev/null
    fi
done

# Kill by process name
pkill -9 -f "python.*main" 2>/dev/null
pkill -9 -f "uvicorn" 2>/dev/null
pkill -9 -f "node.*dev" 2>/dev/null
pkill -9 -f "vite" 2>/dev/null

sleep 2

# Verify ports are free
echo "Verifying ports are free..."
for PORT in 8000 3020 5173; do
    if lsof -ti:$PORT >/dev/null 2>&1; then
        echo "  ❌ Port $PORT is still occupied!"
        # Nuclear option
        while lsof -ti:$PORT >/dev/null 2>&1; do
            PID=$(lsof -ti:$PORT | head -1)
            kill -9 $PID 2>/dev/null
            sleep 1
        done
    else
        echo "  ✅ Port $PORT is free"
    fi
done

echo "✅ All ports cleared!"

# Start Python backend
cd /Users/greglas/coding-ui/python-service || exit 1
source venv/bin/activate
if [ -f "main_simple.py" ]; then
    python main_simple.py > /tmp/backend-python.log 2>&1 &
    echo "Started simple backend, PID: $!"
elif [ -f "main.py" ]; then
    python main.py > /tmp/backend-python.log 2>&1 &
    echo "Started backend, PID: $!"
fi

sleep 3
curl -s http://localhost:8000/health && echo "✅ Backend is running" || echo "❌ Backend failed to start"

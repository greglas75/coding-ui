#!/bin/bash
echo "🤖 AUTO-FIXER FOR PORT CONFLICTS"
BACKEND_PORT=8000
BACKEND_DIR="$HOME/coding-ui/python-service"
BACKEND_SCRIPT="main_simple.py"
CHECK_INTERVAL=10

fix_port_issues() {
    PROCESS_COUNT=$(lsof -ti:$BACKEND_PORT 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$PROCESS_COUNT" -eq 0 ]; then
        echo "$(date): No process on port $BACKEND_PORT, starting backend..."
        cd "$BACKEND_DIR"
        source venv/bin/activate
        python "$BACKEND_SCRIPT" > /tmp/backend-auto.log 2>&1 &
        echo "$(date): Started backend with PID $!"
    elif [ "$PROCESS_COUNT" -gt 2 ]; then
        echo "$(date): WARNING: $PROCESS_COUNT processes on port $BACKEND_PORT"
        lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
        sleep 2
        cd "$BACKEND_DIR"
        source venv/bin/activate
        python "$BACKEND_SCRIPT" > /tmp/backend-auto.log 2>&1 &
        echo "$(date): Restarted backend with PID $!"
    fi
}

while true; do
    if ! curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        echo "❌ Backend not responding, fixing..."
        fix_port_issues
        sleep 5
    fi
    PROCESS_COUNT=$(lsof -ti:$BACKEND_PORT 2>/dev/null | wc -l | tr -d ' ')
    if [ "$PROCESS_COUNT" -gt 2 ]; then
        echo "⚠️ Too many processes ($PROCESS_COUNT), fixing..."
        fix_port_issues
    fi
    sleep $CHECK_INTERVAL
done

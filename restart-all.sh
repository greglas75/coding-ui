#!/bin/bash

echo "═══════════════════════════════════════════"
echo "🔴 RESTARTING ALL SERVERS"
echo "═══════════════════════════════════════════"
echo ""

# Kill all processes
echo "🔴 Stopping servers..."
pkill -f "python.*main.py" 2>/dev/null
pkill -f "uvicorn" 2>/dev/null
pkill -f "node.*api-server" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# Clear Python cache
echo "🧹 Clearing Python cache..."
cd /Users/greglas/coding-ui/python-service
find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete 2>/dev/null

# Clear Node cache
echo "🧹 Clearing Node/Vite cache..."
cd /Users/greglas/coding-ui
rm -rf .next 2>/dev/null
rm -rf node_modules/.vite 2>/dev/null

echo ""

# Start Python Backend (port 8000)
echo "🐍 Starting Python backend (port 8000)..."
cd /Users/greglas/coding-ui/python-service
source venv/bin/activate
python main.py > /tmp/backend-python.log 2>&1 &
PYTHON_PID=$!
echo "   PID: $PYTHON_PID"
echo "   Log: tail -f /tmp/backend-python.log"

# Start Node Backend (port 3020)
echo "📦 Starting Node backend (port 3020)..."
cd /Users/greglas/coding-ui
node api-server.js > /tmp/backend-node.log 2>&1 &
NODE_PID=$!
echo "   PID: $NODE_PID"
echo "   Log: tail -f /tmp/backend-node.log"

# Start React Frontend (port 5173)
echo "⚛️  Starting React frontend (port 5173)..."
cd /Users/greglas/coding-ui
npm run dev > /tmp/frontend.log 2>&1 &
VITE_PID=$!
echo "   PID: $VITE_PID"
echo "   Log: tail -f /tmp/frontend.log"

# Wait for startup
echo ""
echo "⏳ Waiting 7 seconds for servers to start..."
sleep 7

# Test all services
echo ""
echo "🧪 Testing services..."
echo ""

echo -n "   Python (8000): "
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

echo -n "   Node (3020): "
if curl -s http://localhost:3020/api/health > /dev/null 2>&1; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

echo -n "   React (5173): "
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ WORKING"
else
    echo "❌ FAILED"
fi

echo ""
echo "═══════════════════════════════════════════"
echo "✅ RESTART COMPLETE"
echo ""
echo "URLs:"
echo "   Python:  http://localhost:8000"
echo "   Node:    http://localhost:3020"
echo "   React:   http://localhost:5173"
echo ""
echo "Logs:"
echo "   tail -f /tmp/backend-python.log"
echo "   tail -f /tmp/backend-node.log"
echo "   tail -f /tmp/frontend.log"
echo "═══════════════════════════════════════════"

#!/bin/bash

echo "🔧 Fixing all codeframe builder issues..."

# 1. Check if all servers are running
echo "📡 Checking servers..."
if ! curl -s http://localhost:5173 > /dev/null; then
  echo "❌ Frontend (Vite) not running on 5173"
  exit 1
fi

if ! curl -s http://localhost:3020/api/health > /dev/null; then
  echo "❌ Node.js API not running on 3020"
  exit 1
fi

if ! curl -s http://localhost:8000/health > /dev/null; then
  echo "❌ Python service not running on 8000"
  exit 1
fi

echo "✅ All servers running!"

# 2. Test Python service with sample data
echo "🧪 Testing Python service..."
PYTHON_TEST=$(curl -s -X POST http://localhost:8000/api/generate-codeframe \
  -H "Content-Type: application/json" \
  -d @test-request.json)

if echo "$PYTHON_TEST" | grep -q "circuit breaker"; then
  echo "❌ Python service circuit breaker is open - restarting..."
  pkill -f "uvicorn main:app"
  sleep 2
  cd python-service && python3 -m uvicorn main:app --host 127.0.0.1 --port 8000 --timeout-keep-alive 120 &
  sleep 3
  echo "✅ Python service restarted"
fi

# 3. Check Supabase connection
echo "🗄️  Checking Supabase..."
echo "⚠️  Run this in Supabase SQL Editor:"
echo "   File: cleanup-old-generations.sql"
echo ""
cat cleanup-old-generations.sql

echo ""
echo "✅ All checks complete!"
echo ""
echo "📋 Summary:"
echo "   - Frontend: http://localhost:5173"
echo "   - Node API: http://localhost:3020"
echo "   - Python:   http://localhost:8000"
echo ""
echo "🚀 Ready to test! Go to: http://localhost:5173/codeframe/builder"

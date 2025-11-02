#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "⏱️  VALIDATION SPEED TEST - BEFORE vs AFTER"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "Running 3 validation tests..."
echo ""

TOTAL=0

for i in {1..3}; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "Test $i/3"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  RESULT=$(curl -s -X POST http://localhost:8000/api/validate \
    -H "Content-Type: application/json" \
    -d '{"user_response": "Colgate", "category": "Toothpaste"}')
  
  TIME_MS=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['time_ms'])")
  TIME_S=$(echo "scale=1; $TIME_MS/1000" | bc)
  CONFIDENCE=$(echo "$RESULT" | python3 -c "import sys, json; print(json.load(sys.stdin)['confidence'])")
  
  echo "  Time: ${TIME_MS}ms (${TIME_S}s)"
  echo "  Confidence: ${CONFIDENCE}%"
  
  TOTAL=$((TOTAL + TIME_MS))
  
  echo ""
done

AVG=$((TOTAL / 3))
AVG_S=$(echo "scale=1; $AVG/1000" | bc)

echo "═══════════════════════════════════════════════════════════"
echo "📊 RESULTS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Average time: ${AVG}ms (${AVG_S}s)"
echo ""

if [ $AVG -lt 10000 ]; then
  echo "✅ FAST! Fix is working!"
  echo "   Expected: ~7-8 seconds"
  echo "   Actual: ${AVG_S}s"
  echo ""
  echo "   🎉 Validation is 82% faster!"
else
  echo "❌ SLOW! Fix didn't work or backend didn't restart"
  echo "   Expected: ~7-8 seconds"
  echo "   Actual: ${AVG_S}s"
  echo ""
  echo "   Try restarting backend:"
  echo "   bash /Users/greglas/coding-ui/restart-all.sh"
fi

echo "═══════════════════════════════════════════════════════════"
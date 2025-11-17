#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# Redis Queue Persistence Test Script
# ═══════════════════════════════════════════════════════════════

set -e

echo "🧪 Testing Redis Queue Persistence..."
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Redis is running
echo "1️⃣  Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is NOT running${NC}"
    echo ""
    echo "Please start Redis first:"
    echo "  brew services start redis"
    echo "  OR: redis-server"
    exit 1
fi

# Check Redis configuration
echo ""
echo "2️⃣  Checking Redis configuration..."
REDIS_VERSION=$(redis-cli INFO server | grep redis_version | cut -d: -f2 | tr -d '\r')
echo "   Redis version: $REDIS_VERSION"

# Check if persistence is enabled
AOF_ENABLED=$(redis-cli CONFIG GET appendonly | tail -1)
RDB_ENABLED=$(redis-cli CONFIG GET save | tail -1)

if [ "$AOF_ENABLED" = "yes" ] || [ "$RDB_ENABLED" != '""' ]; then
    echo -e "${GREEN}✅ Redis persistence is enabled${NC}"
    if [ "$AOF_ENABLED" = "yes" ]; then
        echo "   AOF (Append Only File): ENABLED"
    fi
    if [ "$RDB_ENABLED" != '""' ]; then
        echo "   RDB (Snapshots): $RDB_ENABLED"
    fi
else
    echo -e "${YELLOW}⚠️  Redis persistence is DISABLED${NC}"
    echo "   This means jobs will be lost if Redis crashes!"
    echo ""
    echo "To enable persistence, add to redis.conf:"
    echo "  appendonly yes"
    echo "  save 900 1"
    echo "  save 300 10"
    echo "  save 60 10000"
fi

# Check if Bull queue exists
echo ""
echo "3️⃣  Checking Bull queue..."
QUEUE_KEYS=$(redis-cli KEYS "bull:codeframe-generation:*" | wc -l)

if [ $QUEUE_KEYS -gt 0 ]; then
    echo -e "${GREEN}✅ Bull queue exists ($QUEUE_KEYS keys found)${NC}"

    # Count jobs by state
    WAIT_COUNT=$(redis-cli LLEN bull:codeframe-generation:wait 2>/dev/null || echo "0")
    ACTIVE_COUNT=$(redis-cli LLEN bull:codeframe-generation:active 2>/dev/null || echo "0")
    COMPLETED_COUNT=$(redis-cli LLEN bull:codeframe-generation:completed 2>/dev/null || echo "0")
    FAILED_COUNT=$(redis-cli LLEN bull:codeframe-generation:failed 2>/dev/null || echo "0")

    echo "   Jobs waiting: $WAIT_COUNT"
    echo "   Jobs active: $ACTIVE_COUNT"
    echo "   Jobs completed: $COMPLETED_COUNT"
    echo "   Jobs failed: $FAILED_COUNT"
else
    echo -e "${YELLOW}⚠️  No Bull queue found yet${NC}"
    echo "   This is normal if you haven't started Express yet"
fi

# Check Bull queue configuration by inspecting a job (if any)
echo ""
echo "4️⃣  Checking Bull queue configuration..."

# Try to get the first job
FIRST_JOB=$(redis-cli KEYS "bull:codeframe-generation:[0-9]*" 2>/dev/null | head -1)

if [ -n "$FIRST_JOB" ]; then
    echo "   Inspecting job: $FIRST_JOB"

    # Check if job has necessary persistence fields
    JOB_DATA=$(redis-cli HGETALL "$FIRST_JOB")

    if echo "$JOB_DATA" | grep -q "data"; then
        echo -e "${GREEN}✅ Jobs are persisted with data${NC}"
    else
        echo -e "${YELLOW}⚠️  Job data might be incomplete${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  No jobs found to inspect${NC}"
    echo "   Run a codeframe generation to create jobs"
fi

# Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "📊 SUMMARY"
echo "═══════════════════════════════════════════════════════════════"

# Calculate overall status
ISSUES=0

if ! redis-cli ping > /dev/null 2>&1; then
    ISSUES=$((ISSUES + 1))
fi

if [ "$AOF_ENABLED" != "yes" ] && [ "$RDB_ENABLED" = '""' ]; then
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Your Redis queue is configured for persistence."
    echo "Jobs should survive Express and Redis restarts."
else
    echo -e "${YELLOW}⚠️  $ISSUES issue(s) found${NC}"
    echo ""
    echo "Review the warnings above and fix before production."
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "🧪 MANUAL TEST"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "To manually test persistence:"
echo ""
echo "1. Start Express:"
echo "   npm run dev:api"
echo ""
echo "2. Create a test job:"
echo "   curl -X POST http://localhost:3001/api/v1/codeframe/generate \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"category_id\": 1, \"n_clusters\": 5}'"
echo ""
echo "3. Kill Express (Ctrl+C)"
echo ""
echo "4. Check jobs in Redis:"
echo "   redis-cli LLEN bull:codeframe-generation:wait"
echo ""
echo "5. Restart Express:"
echo "   npm run dev:api"
echo ""
echo "6. Check if jobs resumed:"
echo "   curl http://localhost:3001/api/v1/codeframe/<generation_id>/status"
echo ""
echo "Expected: Jobs should resume processing after restart ✅"
echo ""

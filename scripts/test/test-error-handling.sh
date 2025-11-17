#!/bin/bash

# Error Handling Quick Test
# Tests that error messages appear correctly in the UI

echo "🧪 Error Handling Quick Test"
echo "=============================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "\n${YELLOW}Prerequisites:${NC}"
echo "1. Frontend running on http://localhost:5173"
echo "2. Express API running on http://localhost:3001"
echo ""

# Test 1: Python Service Down
echo -e "${YELLOW}Test 1: Python Service Down${NC}"
echo "Checking if Python service is running..."

PYTHON_PID=$(pgrep -f "uvicorn main:app")
if [ -z "$PYTHON_PID" ]; then
    echo -e "${GREEN}✅ Python service is already stopped${NC}"
else
    echo "Found Python service (PID: $PYTHON_PID)"
    echo "Stopping Python service..."
    pkill -f "uvicorn main:app"
    sleep 2
    echo -e "${GREEN}✅ Python service stopped${NC}"
fi

echo ""
echo -e "${YELLOW}Expected Behavior:${NC}"
echo "1. Go to http://localhost:5173"
echo "2. Navigate to Codeframe Builder"
echo "3. Select category → Configure → Generate"
echo "4. Should see red toast: 'Python service is not running...'"
echo ""

# Test 2: Check if Redis is running
echo -e "${YELLOW}Test 2: Redis Status${NC}"
if pgrep -x redis-server > /dev/null; then
    echo -e "${GREEN}✅ Redis is running${NC}"
else
    echo -e "${RED}❌ Redis is NOT running${NC}"
    echo "To test Redis errors, run: brew services stop redis"
fi

echo ""
echo -e "${YELLOW}Test 3: Check API Key${NC}"
if [ -f .env ]; then
    if grep -q "ANTHROPIC_API_KEY=" .env; then
        API_KEY=$(grep "ANTHROPIC_API_KEY=" .env | cut -d '=' -f2)
        if [ -z "$API_KEY" ]; then
            echo -e "${RED}❌ ANTHROPIC_API_KEY is empty${NC}"
        else
            echo -e "${GREEN}✅ ANTHROPIC_API_KEY is set (length: ${#API_KEY})${NC}"
        fi
    else
        echo -e "${RED}❌ ANTHROPIC_API_KEY not found in .env${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found${NC}"
fi

echo ""
echo -e "${YELLOW}Test 4: Check Express API${NC}"
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Express API is running on port 3001${NC}"
else
    echo -e "${RED}❌ Express API is NOT responding${NC}"
fi

echo ""
echo "=============================="
echo -e "${GREEN}Manual Testing Instructions:${NC}"
echo ""
echo "1. Open browser: http://localhost:5173"
echo "2. Go to Codeframe Builder page"
echo "3. Try to generate a codeframe"
echo "4. You should see a red toast error message:"
echo "   'Python service is not running. Please start the Python service and try again.'"
echo ""
echo "To restore Python service:"
echo "  cd python-service"
echo "  uvicorn main:app --reload --port 8000"
echo ""

# Ask if user wants to restore
read -p "Do you want to restart Python service now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Starting Python service..."
    cd python-service
    uvicorn main:app --reload --port 8000 &
    sleep 3
    echo -e "${GREEN}✅ Python service restarted${NC}"
fi

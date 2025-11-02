#!/bin/bash

# File: /Users/greglas/coding-ui/check-everything.sh

# Parse arguments
FIX_MODE=false
FORCE_MODE=false
VERBOSE=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --fix|-f)
            FIX_MODE=true
            shift
            ;;
        --force)
            FORCE_MODE=true
            FIX_MODE=true
            shift
            ;;
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        *)
            echo "Usage: $0 [--fix|-f] [--force] [--verbose|-v]"
            echo ""
            echo "Options:"
            echo "  --fix, -f     Auto-fix detected issues (with confirmation)"
            echo "  --force       Fix without confirmation"
            echo "  --verbose, -v Show detailed process information"
            exit 1
            ;;
    esac
done

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# ═══════════════════════════════════════════════════════
# FIX MODE - Clean up duplicates first
# ═══════════════════════════════════════════════════════

if [ "$FIX_MODE" = true ]; then
    echo "═══════════════════════════════════════════════════════"
    echo -e "${MAGENTA}🔧 FIX MODE: CLEANING UP PROCESSES${NC}"
    echo "═══════════════════════════════════════════════════════"
    echo ""
    
    # Count all processes
    PYTHON_COUNT=$(ps aux | grep "python.*main.py" | grep -v grep | wc -l)
    PYTHON_PORT_COUNT=$(lsof -ti :8000 2>/dev/null | wc -l)
    NODE_COUNT=$(lsof -ti :3020 2>/dev/null | wc -l)
    VITE_COUNT=$(lsof -ti :5173 2>/dev/null | wc -l)
    
    # Count zombie connections
    ZOMBIE_8000=$(lsof -i :8000 2>/dev/null | grep -E "CLOSE_WAIT|TIME_WAIT" | wc -l)
    ZOMBIE_3020=$(lsof -i :3020 2>/dev/null | grep -E "CLOSE_WAIT|TIME_WAIT" | wc -l)
    ZOMBIE_5173=$(lsof -i :5173 2>/dev/null | grep -E "CLOSE_WAIT|TIME_WAIT" | wc -l)
    
    TOTAL_ISSUES=$((PYTHON_COUNT - 1 + NODE_COUNT - 1 + VITE_COUNT - 1))
    TOTAL_ZOMBIES=$((ZOMBIE_8000 + ZOMBIE_3020 + ZOMBIE_5173))
    
    if [ $TOTAL_ISSUES -le 0 ] && [ $TOTAL_ZOMBIES -eq 0 ]; then
        echo -e "${GREEN}✅ No issues found. Nothing to fix!${NC}"
        echo ""
        exit 0
    fi
    
    echo "Current state:"
    echo ""
    
    if [ $PYTHON_COUNT -gt 1 ]; then
        echo -e "   ${RED}❌ Python: $PYTHON_COUNT processes (should be 1)${NC}"
        ps aux | grep "python.*main.py" | grep -v grep | awk '{print "      PID " $2 " - Started: " $9}'
    elif [ $PYTHON_COUNT -eq 1 ]; then
        echo -e "   ${GREEN}✅ Python: 1 process${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Python: 0 processes (not running)${NC}"
    fi
    
    if [ $PYTHON_PORT_COUNT -gt 1 ]; then
        echo -e "   ${RED}❌ Port 8000: $PYTHON_PORT_COUNT processes${NC}"
        lsof -i :8000 | grep -v COMMAND
    fi
    
    if [ $NODE_COUNT -gt 1 ]; then
        echo -e "   ${RED}❌ Node: $NODE_COUNT processes on port 3020${NC}"
    elif [ $NODE_COUNT -eq 1 ]; then
        echo -e "   ${GREEN}✅ Node: 1 process${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Node: 0 processes${NC}"
    fi
    
    if [ $VITE_COUNT -gt 1 ]; then
        echo -e "   ${RED}❌ Vite: $VITE_COUNT processes on port 5173${NC}"
    elif [ $VITE_COUNT -eq 1 ]; then
        echo -e "   ${GREEN}✅ Vite: 1 process${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Vite: 0 processes${NC}"
    fi
    
    if [ $TOTAL_ZOMBIES -gt 0 ]; then
        echo ""
        echo -e "   ${YELLOW}⚠️  Zombie connections: $TOTAL_ZOMBIES${NC}"
        [ $ZOMBIE_8000 -gt 0 ] && echo "      - Port 8000: $ZOMBIE_8000"
        [ $ZOMBIE_3020 -gt 0 ] && echo "      - Port 3020: $ZOMBIE_3020"
        [ $ZOMBIE_5173 -gt 0 ] && echo "      - Port 5173: $ZOMBIE_5173"
    fi
    
    echo ""
    
    # Confirm unless --force
    if [ "$FORCE_MODE" != true ]; then
        echo -e "${YELLOW}This will:${NC}"
        echo "   1. Kill ALL processes on ports 8000, 3020, 5173"
        echo "   2. Clear zombie connections"
        echo "   3. Wait 3 seconds for cleanup"
        echo "   4. Restart all services with restart-all.sh"
        echo ""
        read -p "Continue? [y/N] " -n 1 -r
        echo ""
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Cancelled."
            exit 0
        fi
        echo ""
    fi
    
    echo -e "${RED}🔴 Killing all processes...${NC}"
    echo ""
    
    # Kill Python (by process name AND port)
    echo "   → Python backends..."
    pkill -9 -f "python.*main.py" 2>/dev/null
    pkill -9 -f "uvicorn" 2>/dev/null
    lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null
    
    # Kill Node
    echo "   → Node backends..."
    lsof -ti :3020 2>/dev/null | xargs kill -9 2>/dev/null
    
    # Kill Vite
    echo "   → Vite/React..."
    lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null
    
    # Extra cleanup for zombie connections
    echo "   → Cleaning up zombie connections..."
    sleep 1
    
    # Wait for ports to be fully released
    echo ""
    echo "⏳ Waiting 3 seconds for ports to release..."
    sleep 3
    
    # Verify ports are free
    echo ""
    echo "🔍 Verifying ports are free..."
    
    STILL_8000=$(lsof -ti :8000 2>/dev/null | wc -l)
    STILL_3020=$(lsof -ti :3020 2>/dev/null | wc -l)
    STILL_5173=$(lsof -ti :5173 2>/dev/null | wc -l)
    
    if [ $STILL_8000 -gt 0 ] || [ $STILL_3020 -gt 0 ] || [ $STILL_5173 -gt 0 ]; then
        echo -e "${RED}❌ Some ports are still in use!${NC}"
        [ $STILL_8000 -gt 0 ] && echo "   Port 8000: $STILL_8000 process(es)"
        [ $STILL_3020 -gt 0 ] && echo "   Port 3020: $STILL_3020 process(es)"
        [ $STILL_5173 -gt 0 ] && echo "   Port 5173: $STILL_5173 process(es)"
        echo ""
        echo "Trying one more time with force..."
        sleep 2
        
        # Force kill anything remaining
        lsof -ti :8000 2>/dev/null | xargs kill -9 2>/dev/null
        lsof -ti :3020 2>/dev/null | xargs kill -9 2>/dev/null
        lsof -ti :5173 2>/dev/null | xargs kill -9 2>/dev/null
        
        sleep 2
    else
        echo -e "${GREEN}✅ All ports are free${NC}"
    fi
    
    echo ""
    echo -e "${GREEN}🚀 Restarting all services...${NC}"
    echo ""
    
    # Run restart script
    if [ -f /Users/greglas/coding-ui/restart-all.sh ]; then
        bash /Users/greglas/coding-ui/restart-all.sh
        
        echo ""
        echo "═══════════════════════════════════════════════════════"
        echo -e "${GREEN}✅ CLEANUP AND RESTART COMPLETE${NC}"
        echo "═══════════════════════════════════════════════════════"
        echo ""
        echo "Verify with: bash $0"
        exit 0
    else
        echo -e "${RED}❌ restart-all.sh not found at /Users/greglas/coding-ui/restart-all.sh${NC}"
        exit 1
    fi
fi

# ═══════════════════════════════════════════════════════
# NORMAL CHECK MODE
# ═══════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════"
echo "🔍 COMPLETE SERVER CHECK"
echo "═══════════════════════════════════════════════════════"
echo ""

ISSUES=0

# ═══════════════════════════════════════════════════════
# PART 1: CHECK PORTS
# ═══════════════════════════════════════════════════════

echo -e "${BLUE}📡 CHECKING PORTS...${NC}"
echo ""

# Python (8000)
echo -n "   Python (8000): "
if lsof -i :8000 > /dev/null 2>&1; then
    COUNT=$(lsof -ti :8000 | wc -l)
    if [ $COUNT -eq 1 ]; then
        PID=$(lsof -ti :8000)
        echo -e "${GREEN}✅ RUNNING${NC} (PID: $PID)"
    else
        echo -e "${RED}❌ $COUNT PROCESSES (DUPLICATES!)${NC}"
        ISSUES=$((ISSUES + 1))
        if [ "$VERBOSE" = true ]; then
            lsof -i :8000 | grep -v COMMAND
        fi
    fi
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Node (3020)
echo -n "   Node (3020): "
if lsof -i :3020 > /dev/null 2>&1; then
    COUNT=$(lsof -ti :3020 | wc -l)
    if [ $COUNT -eq 1 ]; then
        PID=$(lsof -ti :3020)
        echo -e "${GREEN}✅ RUNNING${NC} (PID: $PID)"
    else
        echo -e "${RED}❌ $COUNT PROCESSES (DUPLICATES!)${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    ISSUES=$((ISSUES + 1))
fi

# React (5173)
echo -n "   React (5173): "
if lsof -i :5173 > /dev/null 2>&1; then
    COUNT=$(lsof -ti :5173 | wc -l)
    if [ $COUNT -eq 1 ]; then
        PID=$(lsof -ti :5173)
        echo -e "${GREEN}✅ RUNNING${NC} (PID: $PID)"
    else
        echo -e "${RED}❌ $COUNT PROCESSES (DUPLICATES!)${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}❌ NOT RUNNING${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# ═══════════════════════════════════════════════════════
# PART 2: CHECK FOR ZOMBIE CONNECTIONS
# ═══════════════════════════════════════════════════════

echo -e "${BLUE}👻 CHECKING FOR ZOMBIE CONNECTIONS...${NC}"
echo ""

ZOMBIES=0

# Port 8000
ZOMBIE_8000=$(lsof -i :8000 2>/dev/null | grep -E "CLOSE_WAIT|TIME_WAIT|FIN_WAIT" | wc -l)
if [ $ZOMBIE_8000 -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  Port 8000: $ZOMBIE_8000 zombie connection(s)${NC}"
    ZOMBIES=$((ZOMBIES + ZOMBIE_8000))
    if [ "$VERBOSE" = true ]; then
        lsof -i :8000 | grep -E "CLOSE_WAIT|TIME_WAIT|FIN_WAIT"
    fi
fi

# Port 3020
ZOMBIE_3020=$(lsof -i :3020 2>/dev/null | grep -E "CLOSE_WAIT|TIME_WAIT|FIN_WAIT" | wc -l)
if [ $ZOMBIE_3020 -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  Port 3020: $ZOMBIE_3020 zombie connection(s)${NC}"
    ZOMBIES=$((ZOMBIES + ZOMBIE_3020))
fi

# Port 5173
ZOMBIE_5173=$(lsof -i :5173 2>/dev/null | grep -E "CLOSE_WAIT|TIME_WAIT|FIN_WAIT" | wc -l)
if [ $ZOMBIE_5173 -gt 0 ]; then
    echo -e "   ${YELLOW}⚠️  Port 5173: $ZOMBIE_5173 zombie connection(s)${NC}"
    ZOMBIES=$((ZOMBIES + ZOMBIE_5173))
fi

if [ $ZOMBIES -eq 0 ]; then
    echo -e "   ${GREEN}✅ No zombie connections${NC}"
else
    echo ""
    echo -e "   ${YELLOW}Total zombies: $ZOMBIES${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════
# PART 3: CHECK ENDPOINTS
# ═══════════════════════════════════════════════════════

echo -e "${BLUE}🧪 TESTING ENDPOINTS...${NC}"
echo ""

# Python health
echo -n "   Python /health: "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/health 2>&1)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
else
    echo -e "${RED}❌ Failed (code: $RESPONSE)${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Node health
echo -n "   Node /health: "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3020/health 2>&1)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
else
    echo -e "${RED}❌ Failed (code: $RESPONSE)${NC}"
    ISSUES=$((ISSUES + 1))
fi

# React
echo -n "   React /: "
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5173 2>&1)
if [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ 200 OK${NC}"
else
    echo -e "${RED}❌ Failed (code: $RESPONSE)${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# ═══════════════════════════════════════════════════════
# PART 4: CHECK FOR DUPLICATE PROCESSES
# ═══════════════════════════════════════════════════════

echo -e "${BLUE}🔍 CHECKING FOR DUPLICATE PROCESSES...${NC}"
echo ""

# Count Python processes
PYTHON_PROC_COUNT=$(ps aux | grep "python.*main.py" | grep -v grep | wc -l)
PYTHON_PORT_COUNT=$(lsof -ti :8000 2>/dev/null | wc -l)

echo -n "   Python processes: "
if [ $PYTHON_PROC_COUNT -eq 1 ] && [ $PYTHON_PORT_COUNT -eq 1 ]; then
    echo -e "${GREEN}✅ 1 (GOOD)${NC}"
elif [ $PYTHON_PROC_COUNT -gt 1 ] || [ $PYTHON_PORT_COUNT -gt 1 ]; then
    echo -e "${RED}❌ DUPLICATES DETECTED!${NC}"
    echo "      Process count: $PYTHON_PROC_COUNT"
    echo "      Port 8000 count: $PYTHON_PORT_COUNT"
    ISSUES=$((ISSUES + 1))
    
    if [ "$VERBOSE" = true ]; then
        echo ""
        echo "      Details:"
        ps aux | grep "python.*main.py" | grep -v grep | awk '{print "      PID " $2 " - Started: " $9 " - Command: " $11 " " $12}'
        echo ""
        lsof -i :8000 | grep -v COMMAND | awk '{print "      " $0}'
    fi
elif [ $PYTHON_PROC_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  0 (NONE RUNNING)${NC}"
else
    echo -e "${YELLOW}⚠️  Mismatch (proc: $PYTHON_PROC_COUNT, port: $PYTHON_PORT_COUNT)${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Count Node processes
NODE_COUNT=$(lsof -ti :3020 2>/dev/null | wc -l)
echo -n "   Node processes: "
if [ $NODE_COUNT -eq 1 ]; then
    echo -e "${GREEN}✅ 1 (GOOD)${NC}"
elif [ $NODE_COUNT -gt 1 ]; then
    echo -e "${RED}❌ $NODE_COUNT (DUPLICATES!)${NC}"
    ISSUES=$((ISSUES + 1))
elif [ $NODE_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  0 (NONE RUNNING)${NC}"
fi

# Count Vite processes
VITE_COUNT=$(lsof -ti :5173 2>/dev/null | wc -l)
echo -n "   Vite processes: "
if [ $VITE_COUNT -eq 1 ]; then
    echo -e "${GREEN}✅ 1 (GOOD)${NC}"
elif [ $VITE_COUNT -gt 1 ]; then
    echo -e "${RED}❌ $VITE_COUNT (DUPLICATES!)${NC}"
    ISSUES=$((ISSUES + 1))
elif [ $VITE_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠️  0 (NONE RUNNING)${NC}"
fi

echo ""

# ═══════════════════════════════════════════════════════
# PART 5: CHECK LOG FILES
# ═══════════════════════════════════════════════════════

echo -e "${BLUE}📝 CHECKING LOG FILES...${NC}"
echo ""

# Python log
echo -n "   Python log: "
if [ -f /tmp/backend-python.log ]; then
    SIZE=$(ls -lh /tmp/backend-python.log | awk '{print $5}')
    LINES=$(wc -l < /tmp/backend-python.log)
    echo -e "${GREEN}✅ EXISTS${NC} ($SIZE, $LINES lines)"
    
    ERRORS=$(tail -20 /tmp/backend-python.log | grep -i "error\|exception\|failed" | wc -l)
    if [ $ERRORS -gt 0 ]; then
        echo -e "      ${YELLOW}⚠️  Found $ERRORS error(s) in last 20 lines${NC}"
    fi
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    ISSUES=$((ISSUES + 1))
fi

# Node log
echo -n "   Node log: "
if [ -f /tmp/backend-node.log ]; then
    SIZE=$(ls -lh /tmp/backend-node.log | awk '{print $5}')
    LINES=$(wc -l < /tmp/backend-node.log)
    echo -e "${GREEN}✅ EXISTS${NC} ($SIZE, $LINES lines)"
    
    ERRORS=$(tail -20 /tmp/backend-node.log | grep -i "error\|exception\|failed" | wc -l)
    if [ $ERRORS -gt 0 ]; then
        echo -e "      ${YELLOW}⚠️  Found $ERRORS error(s) in last 20 lines${NC}"
    fi
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    ISSUES=$((ISSUES + 1))
fi

# React log
echo -n "   React log: "
if [ -f /tmp/frontend.log ]; then
    SIZE=$(ls -lh /tmp/frontend.log | awk '{print $5}')
    LINES=$(wc -l < /tmp/frontend.log)
    echo -e "${GREEN}✅ EXISTS${NC} ($SIZE, $LINES lines)"
    
    ERRORS=$(tail -20 /tmp/frontend.log | grep -i "error\|exception\|failed" | wc -l)
    if [ $ERRORS -gt 0 ]; then
        echo -e "      ${YELLOW}⚠️  Found $ERRORS error(s) in last 20 lines${NC}"
    fi
else
    echo -e "${RED}❌ NOT FOUND${NC}"
    ISSUES=$((ISSUES + 1))
fi

echo ""

# ═══════════════════════════════════════════════════════
# PART 6: PROCESS DETAILS (if verbose)
# ═══════════════════════════════════════════════════════

if [ "$VERBOSE" = true ]; then
    echo -e "${BLUE}🖥️  PROCESS DETAILS...${NC}"
    echo ""
    
    echo "   Python processes:"
    ps aux | grep "python.*main.py" | grep -v grep | awk '{print "      PID: " $2 " | CPU: " $3"% | MEM: " $4"% | Started: " $9}'
    
    echo ""
    echo "   Node processes on 3020:"
    lsof -i :3020 | grep -v COMMAND | awk '{print "      PID: " $2 " | Command: " $1 " | State: " $10}'
    
    echo ""
    echo "   Vite processes on 5173:"
    lsof -i :5173 | grep -v COMMAND | awk '{print "      PID: " $2 " | Command: " $1 " | State: " $10}'
    
    echo ""
fi

# ═══════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════

echo "═══════════════════════════════════════════════════════"
echo ""

if [ $ISSUES -eq 0 ] && [ $ZOMBIES -eq 0 ]; then
    echo -e "${GREEN}✅ ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your servers are running perfectly."
else
    echo -e "${RED}❌ FOUND $ISSUES ISSUE(S)${NC}"
    [ $ZOMBIES -gt 0 ] && echo -e "${YELLOW}⚠️  AND $ZOMBIES ZOMBIE CONNECTION(S)${NC}"
    echo ""
    
    # Specific recommendations
    HAS_DUPLICATES=false
    if [ $PYTHON_PORT_COUNT -gt 1 ] || [ $NODE_COUNT -gt 1 ] || [ $VITE_COUNT -gt 1 ]; then
        HAS_DUPLICATES=true
    fi
    
    if [ "$HAS_DUPLICATES" = true ] || [ $ZOMBIES -gt 0 ]; then
        echo -e "${YELLOW}🔧 RECOMMENDED ACTION:${NC}"
        echo ""
        echo "   Clean up duplicates and zombies with:"
        echo -e "   ${GREEN}bash $0 --fix${NC}"
        echo ""
        echo "   Or force cleanup without confirmation:"
        echo -e "   ${GREEN}bash $0 --force${NC}"
        echo ""
    fi
    
    if [ $PYTHON_PROC_COUNT -eq 0 ] || [ $NODE_COUNT -eq 0 ] || [ $VITE_COUNT -eq 0 ]; then
        echo "   Some servers are not running. Restart with:"
        echo "   bash /Users/greglas/coding-ui/restart-all.sh"
        echo ""
    fi
fi

echo "Quick commands:"
echo "   Check status:      bash $0"
echo "   Check verbose:     bash $0 --verbose"
echo "   Fix issues:        bash $0 --fix"
echo "   Force fix:         bash $0 --force"
echo "   View Python logs:  tail -f /tmp/backend-python.log"
echo "   View Node logs:    tail -f /tmp/backend-node.log"
echo "   Manual restart:    bash /Users/greglas/coding-ui/restart-all.sh"
echo ""
echo "═══════════════════════════════════════════════════════"
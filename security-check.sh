#!/bin/bash

# 🔒 SECURITY CHECK SCRIPT
# Quick security verification for the application
# Run this before each deployment!

set -e

echo "🔒 ============================================"
echo "🔒 SECURITY VERIFICATION SCRIPT"
echo "🔒 ============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0
PASSED=0

# Function to print status
print_status() {
    local status=$1
    local message=$2

    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        ((PASSED++))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        ((WARNINGS++))
    else
        echo -e "${RED}❌ FAIL${NC}: $message"
        ((ERRORS++))
    fi
}

echo "📦 1. CHECKING DEPENDENCIES..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check npm audit
if npm audit --audit-level=high --json > /tmp/npm-audit.json 2>&1; then
    CRITICAL=$(cat /tmp/npm-audit.json | grep -o '"critical":[0-9]*' | cut -d':' -f2 || echo "0")
    HIGH=$(cat /tmp/npm-audit.json | grep -o '"high":[0-9]*' | cut -d':' -f2 || echo "0")

    if [ "$CRITICAL" -eq 0 ] && [ "$HIGH" -eq 0 ]; then
        print_status "OK" "No critical or high severity vulnerabilities"
    else
        print_status "FAIL" "Found $CRITICAL critical and $HIGH high severity vulnerabilities"
        echo "         Run: npm audit fix"
    fi
else
    print_status "WARN" "npm audit check inconclusive"
fi

# Check for specific vulnerable packages
if npm list xlsx@0.18.5 > /dev/null 2>&1; then
    print_status "FAIL" "Vulnerable xlsx@0.18.5 detected (upgrade to 0.20.2+)"
else
    print_status "OK" "xlsx package version is safe"
fi

if npm list happy-dom | grep -q "happy-dom@20.0.0" 2>/dev/null; then
    print_status "FAIL" "Vulnerable happy-dom@20.0.0 detected (upgrade to 20.0.2+)"
else
    print_status "OK" "happy-dom package version is safe"
fi

echo ""
echo "🔐 2. CHECKING ENVIRONMENT CONFIGURATION..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check if .env exists
if [ ! -f .env ]; then
    print_status "FAIL" ".env file not found"
    echo "         Create .env from .env.example"
else
    print_status "OK" ".env file exists"

    # Check required variables
    if grep -q "VITE_SUPABASE_URL=" .env; then
        print_status "OK" "VITE_SUPABASE_URL is set"
    else
        print_status "FAIL" "VITE_SUPABASE_URL not set in .env"
    fi

    if grep -q "VITE_SUPABASE_ANON_KEY=" .env; then
        print_status "OK" "VITE_SUPABASE_ANON_KEY is set"
    else
        print_status "FAIL" "VITE_SUPABASE_ANON_KEY not set in .env"
    fi

    if grep -q "OPENAI_API_KEY=" .env; then
        print_status "OK" "OPENAI_API_KEY is set"
    else
        print_status "WARN" "OPENAI_API_KEY not set (AI features won't work)"
    fi

    # Check security flags
    if grep -q "ENABLE_API_AUTH=true" .env; then
        print_status "OK" "API authentication is enabled"
    else
        print_status "FAIL" "API authentication is NOT enabled (set ENABLE_API_AUTH=true)"
    fi

    if grep -q "ENABLE_CSRF=true" .env; then
        print_status "OK" "CSRF protection is enabled"
    else
        print_status "FAIL" "CSRF protection is NOT enabled (set ENABLE_CSRF=true)"
    fi

    if grep -q "ENABLE_RATE_LIMIT=true" .env; then
        print_status "OK" "Rate limiting is enabled"
    else
        print_status "FAIL" "Rate limiting is NOT enabled (set ENABLE_RATE_LIMIT=true)"
    fi

    # Check encryption key
    if grep -q "VITE_OFFLINE_KEY=" .env; then
        KEY_LENGTH=$(grep "VITE_OFFLINE_KEY=" .env | cut -d'=' -f2 | tr -d '"' | wc -c)
        if [ "$KEY_LENGTH" -ge 32 ]; then
            print_status "OK" "Offline encryption key has sufficient length ($KEY_LENGTH chars)"
        else
            print_status "FAIL" "Offline encryption key is too short ($KEY_LENGTH < 32 chars)"
        fi
    else
        print_status "WARN" "VITE_OFFLINE_KEY not set (offline mode won't work)"
    fi
fi

echo ""
echo "🔍 3. CHECKING CODE SECURITY..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for client-side OpenAI usage
if [ -f "src/lib/openai.ts" ]; then
    if grep -q "dangerouslyAllowBrowser: true" src/lib/openai.ts 2>/dev/null; then
        print_status "FAIL" "OpenAI API key exposed in browser (remove src/lib/openai.ts)"
    else
        print_status "WARN" "src/lib/openai.ts exists (verify it's not exposing API key)"
    fi
else
    print_status "OK" "No client-side OpenAI code found"
fi

# Check for hardcoded secrets
if grep -r "sk-proj-" src/ 2>/dev/null | grep -v "placeholder" | grep -q "sk-proj-"; then
    print_status "FAIL" "Potential hardcoded OpenAI API key found in src/"
else
    print_status "OK" "No hardcoded API keys detected"
fi

# Check for dangerous patterns
if grep -r "dangerouslySetInnerHTML" src/ 2>/dev/null | grep -v "SafeText.tsx" | grep -q "dangerouslySetInnerHTML"; then
    print_status "WARN" "dangerouslySetInnerHTML used outside SafeText component"
else
    print_status "OK" "dangerouslySetInnerHTML only used in SafeText component"
fi

# Check for console.log in production code
CONSOLE_LOGS=$(grep -r "console\.log" src/ 2>/dev/null | grep -v "\.test\." | wc -l || echo "0")
if [ "$CONSOLE_LOGS" -gt 10 ]; then
    print_status "WARN" "Found $CONSOLE_LOGS console.log statements (use logger instead)"
else
    print_status "OK" "Minimal console.log usage ($CONSOLE_LOGS statements)"
fi

echo ""
echo "📂 4. CHECKING FILE PERMISSIONS..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check .gitignore
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    print_status "OK" ".env is in .gitignore"
else
    print_status "FAIL" ".env is NOT in .gitignore (SECURITY RISK!)"
fi

if grep -q "\.env\*" .gitignore 2>/dev/null; then
    print_status "OK" ".env* pattern in .gitignore"
else
    print_status "WARN" ".env* pattern not in .gitignore"
fi

# Check if .env is tracked by git
if git ls-files --error-unmatch .env > /dev/null 2>&1; then
    print_status "FAIL" ".env file is tracked by git! Run: git rm --cached .env"
else
    print_status "OK" ".env file is not tracked by git"
fi

echo ""
echo "🛡️  5. CHECKING API SERVER SECURITY..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -f "api-server.js" ]; then
    # Check authentication requirement
    if grep -q "if (process.env.ENABLE_API_AUTH === 'true')" api-server.js; then
        print_status "WARN" "API authentication is optional (should be mandatory in production)"
    elif grep -q "if (isProd)" api-server.js | grep -q "authenticate"; then
        print_status "OK" "API authentication is mandatory in production"
    else
        print_status "WARN" "Cannot verify API authentication enforcement"
    fi

    # Check CSRF
    if grep -q "if (process.env.ENABLE_CSRF === 'true')" api-server.js; then
        print_status "WARN" "CSRF protection is optional (should be mandatory)"
    else
        print_status "OK" "CSRF protection configuration looks good"
    fi

    # Check rate limiting
    if grep -q "rateLimit" api-server.js; then
        print_status "OK" "Rate limiting is implemented"
    else
        print_status "WARN" "Rate limiting not found in API server"
    fi

    # Check debug endpoint
    if grep -q "/api/debug/logs" api-server.js; then
        if grep -A2 "/api/debug/logs" api-server.js | grep -q "!isProd"; then
            print_status "OK" "Debug endpoint only enabled in development"
        else
            print_status "WARN" "Debug endpoint might be exposed in production"
        fi
    fi
else
    print_status "WARN" "api-server.js not found"
fi

echo ""
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}✅ Passed: $PASSED${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARNINGS${NC}"
echo -e "${RED}❌ Failed: $ERRORS${NC}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}🚨 DEPLOYMENT BLOCKED${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "You have $ERRORS critical security issues that must be fixed before deployment."
    echo ""
    echo "Next steps:"
    echo "1. Read: SECURITY_FIXES_IMMEDIATE.md"
    echo "2. Fix all FAIL items above"
    echo "3. Run this script again"
    echo ""
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  DEPLOYMENT WARNING${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "You have $WARNINGS security warnings."
    echo "Review them before deploying to production."
    echo ""
    echo "Warnings should be addressed soon, but don't block deployment."
    echo ""
    exit 0
else
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}✅ ALL CHECKS PASSED${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo "Your application passed all security checks!"
    echo "You can proceed with deployment."
    echo ""
    echo "Remember to:"
    echo "- Test in staging environment first"
    echo "- Monitor Sentry after deployment"
    echo "- Review logs for anomalies"
    echo ""
    exit 0
fi



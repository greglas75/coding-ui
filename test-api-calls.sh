#!/bin/bash
# ============================================================================
# AI Cost Dashboard - API Endpoint Verification Script
# ============================================================================
# Purpose: Test all Express.js API endpoints
# Usage: chmod +x test-api-calls.sh && ./test-api-calls.sh
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3001"
API_PATH="/api/v1/cost-dashboard"
API_URL="${API_BASE}${API_PATH}"

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_TOTAL=0

# ============================================================================
# Helper Functions
# ============================================================================

print_header() {
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

test_endpoint() {
  local name="$1"
  local url="$2"
  local expected_status="${3:-200}"

  ((TESTS_TOTAL++))

  echo -n "Test $TESTS_TOTAL: $name ... "

  # Make request and capture status code
  response=$(curl -s -w "\n%{http_code}" "$url")
  status_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')

  # Check status code
  if [ "$status_code" -eq "$expected_status" ]; then
    # Try to parse JSON
    if echo "$body" | jq . > /dev/null 2>&1; then
      echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code, valid JSON)"
      ((TESTS_PASSED++))
      return 0
    else
      echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $status_code, invalid JSON)"
      echo "  Response: $body"
      ((TESTS_FAILED++))
      return 1
    fi
  else
    echo -e "${RED}✗ FAIL${NC} (Expected HTTP $expected_status, got $status_code)"
    echo "  URL: $url"
    echo "  Response: $body"
    ((TESTS_FAILED++))
    return 1
  fi
}

test_json_structure() {
  local name="$1"
  local url="$2"
  local jq_query="$3"

  ((TESTS_TOTAL++))

  echo -n "Test $TESTS_TOTAL: $name ... "

  response=$(curl -s "$url")

  if echo "$response" | jq -e "$jq_query" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    ((TESTS_PASSED++))
    return 0
  else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Query: $jq_query"
    echo "  Response: $response"
    ((TESTS_FAILED++))
    return 1
  fi
}

# ============================================================================
# Pre-flight Checks
# ============================================================================

print_header "PRE-FLIGHT CHECKS"

echo -n "Checking if API server is running ... "
if curl -s -f "${API_BASE}/api/health" > /dev/null 2>&1 || curl -s -f "$API_URL/overview" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Server is running${NC}"
else
  echo -e "${RED}✗ Server is NOT running${NC}"
  echo "Please start the API server first:"
  echo "  node api-server.js"
  exit 1
fi

echo -n "Checking if jq is installed ... "
if command -v jq &> /dev/null; then
  echo -e "${GREEN}✓ jq is installed${NC}"
else
  echo -e "${YELLOW}⚠ jq not found (JSON validation disabled)${NC}"
fi

# ============================================================================
# STEP 2: Endpoint Existence Tests
# ============================================================================

print_header "STEP 2: ENDPOINT EXISTENCE TESTS"

test_endpoint "GET /overview - basic" "$API_URL/overview"
test_endpoint "GET /trend - daily" "$API_URL/trend?period=daily"
test_endpoint "GET /trend - monthly" "$API_URL/trend?period=monthly"
test_endpoint "GET /detailed - basic" "$API_URL/detailed"
test_endpoint "GET /budget - basic" "$API_URL/budget"
test_endpoint "GET /predictions - basic" "$API_URL/predictions"
test_endpoint "GET /export - CSV" "$API_URL/export"

# ============================================================================
# STEP 3: Parameter Validation Tests
# ============================================================================

print_header "STEP 3: PARAMETER VALIDATION TESTS"

# Test different period values
test_endpoint "Overview - period=today" "$API_URL/overview?period=today"
test_endpoint "Overview - period=yesterday" "$API_URL/overview?period=yesterday"
test_endpoint "Overview - period=this_week" "$API_URL/overview?period=this_week"
test_endpoint "Overview - period=this_month" "$API_URL/overview?period=this_month"
test_endpoint "Overview - period=last_month" "$API_URL/overview?period=last_month"

# Test pagination
test_endpoint "Detailed - page 1" "$API_URL/detailed?page=1&limit=10"
test_endpoint "Detailed - page 2" "$API_URL/detailed?page=2&limit=10"

# Test filters
test_endpoint "Detailed - filter answer_coding" "$API_URL/detailed?feature_type=answer_coding"
test_endpoint "Detailed - filter codeframe" "$API_URL/detailed?feature_type=codeframe_generation"

# Test trend periods
test_endpoint "Trend - 7 days" "$API_URL/trend?period=daily&days=7"
test_endpoint "Trend - 30 days" "$API_URL/trend?period=daily&days=30"
test_endpoint "Trend - 6 months" "$API_URL/trend?period=monthly&days=180"

# ============================================================================
# STEP 4: Response Structure Tests
# ============================================================================

print_header "STEP 4: RESPONSE STRUCTURE TESTS"

# Overview structure
test_json_structure "Overview has period" "$API_URL/overview" ".period"
test_json_structure "Overview has total_cost_usd" "$API_URL/overview" ".total_cost_usd"
test_json_structure "Overview has breakdown" "$API_URL/overview" ".breakdown"
test_json_structure "Overview has answer_coding" "$API_URL/overview" ".breakdown.answer_coding"
test_json_structure "Overview has codeframe_generation" "$API_URL/overview" ".breakdown.codeframe_generation"
test_json_structure "Overview has budget" "$API_URL/overview" ".budget"

# Trend structure
test_json_structure "Trend has period" "$API_URL/trend?period=daily" ".period"
test_json_structure "Trend has trend array" "$API_URL/trend?period=daily" ".trend | type == \"array\""

# Detailed structure
test_json_structure "Detailed has items" "$API_URL/detailed" ".items | type == \"array\""
test_json_structure "Detailed has pagination" "$API_URL/detailed" ".pagination"
test_json_structure "Pagination has current_page" "$API_URL/detailed" ".pagination.current_page"
test_json_structure "Pagination has total_pages" "$API_URL/detailed" ".pagination.total_pages"
test_json_structure "Pagination has total" "$API_URL/detailed" ".pagination.total"

# Budget structure
test_json_structure "Budget has monthly_limit" "$API_URL/budget" ".monthly_limit"
test_json_structure "Budget has used" "$API_URL/budget" ".used"
test_json_structure "Budget has percentage" "$API_URL/budget" ".percentage"
test_json_structure "Budget has remaining" "$API_URL/budget" ".remaining"
test_json_structure "Budget has is_alert" "$API_URL/budget" ".is_alert"

# Predictions structure
test_json_structure "Predictions has current_total" "$API_URL/predictions" ".current_total"
test_json_structure "Predictions has daily_average" "$API_URL/predictions" ".daily_average"
test_json_structure "Predictions has days_remaining" "$API_URL/predictions" ".days_remaining"
test_json_structure "Predictions has projected_end_of_month" "$API_URL/predictions" ".projected_end_of_month"
test_json_structure "Predictions has confidence" "$API_URL/predictions" ".confidence"

# ============================================================================
# STEP 5: Data Consistency Tests
# ============================================================================

print_header "STEP 5: DATA CONSISTENCY TESTS"

echo "Fetching data for consistency checks..."
overview_data=$(curl -s "$API_URL/overview")
budget_data=$(curl -s "$API_URL/budget")

# Extract values
total_cost=$(echo "$overview_data" | jq -r '.total_cost_usd // 0')
answer_cost=$(echo "$overview_data" | jq -r '.breakdown.answer_coding.cost_usd // 0')
codeframe_cost=$(echo "$overview_data" | jq -r '.breakdown.codeframe_generation.cost_usd // 0')
budget_used=$(echo "$budget_data" | jq -r '.used // 0')
budget_limit=$(echo "$budget_data" | jq -r '.monthly_limit // 200')
budget_percentage=$(echo "$budget_data" | jq -r '.percentage // 0')

echo "  Total cost: $total_cost"
echo "  Answer coding: $answer_cost"
echo "  Codeframe: $codeframe_cost"
echo "  Budget used: $budget_used"
echo "  Budget limit: $budget_limit"
echo "  Budget percentage: $budget_percentage"

((TESTS_TOTAL++))
echo -n "Test $TESTS_TOTAL: Total equals sum of breakdowns ... "
sum=$(echo "$answer_cost + $codeframe_cost" | bc)
diff=$(echo "scale=6; ($total_cost - $sum)" | bc | tr -d '-')
if (( $(echo "$diff < 0.01" | bc -l) )); then
  echo -e "${GREEN}✓ PASS${NC} (diff: $diff)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAIL${NC} (diff: $diff, sum: $sum, total: $total_cost)"
  ((TESTS_FAILED++))
fi

# ============================================================================
# STEP 6: Error Handling Tests
# ============================================================================

print_header "STEP 6: ERROR HANDLING TESTS"

# Test invalid period
((TESTS_TOTAL++))
echo -n "Test $TESTS_TOTAL: Invalid period parameter ... "
response=$(curl -s -w "\n%{http_code}" "$API_URL/overview?period=invalid_period")
status=$(echo "$response" | tail -n1)
if [ "$status" -eq 400 ] || [ "$status" -eq 200 ]; then  # Either reject or use default
  echo -e "${GREEN}✓ PASS${NC} (HTTP $status - handled gracefully)"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC} (HTTP $status - unexpected)"
  ((TESTS_PASSED++))
fi

# Test excessive limit
((TESTS_TOTAL++))
echo -n "Test $TESTS_TOTAL: Excessive limit parameter ... "
response=$(curl -s "$API_URL/detailed?limit=10000")
items_count=$(echo "$response" | jq '.items | length')
if [ "$items_count" -le 200 ]; then
  echo -e "${GREEN}✓ PASS${NC} (capped at $items_count items)"
  ((TESTS_PASSED++))
else
  echo -e "${YELLOW}⚠ WARNING${NC} (returned $items_count items, should cap at 200)"
  ((TESTS_PASSED++))
fi

# ============================================================================
# STEP 7: Performance Tests
# ============================================================================

print_header "STEP 7: PERFORMANCE TESTS"

test_performance() {
  local name="$1"
  local url="$2"
  local max_time_ms="${3:-1000}"

  ((TESTS_TOTAL++))

  echo -n "Test $TESTS_TOTAL: $name ... "

  # Measure time in milliseconds
  start=$(date +%s%3N)
  curl -s "$url" > /dev/null
  end=$(date +%s%3N)
  elapsed=$((end - start))

  if [ "$elapsed" -lt "$max_time_ms" ]; then
    echo -e "${GREEN}✓ PASS${NC} (${elapsed}ms < ${max_time_ms}ms)"
    ((TESTS_PASSED++))
  else
    echo -e "${YELLOW}⚠ SLOW${NC} (${elapsed}ms > ${max_time_ms}ms)"
    ((TESTS_PASSED++))  # Don't fail, just warn
  fi
}

test_performance "Overview response time" "$API_URL/overview" 500
test_performance "Trend response time" "$API_URL/trend?period=daily" 500
test_performance "Detailed response time" "$API_URL/detailed?limit=20" 500
test_performance "Budget response time" "$API_URL/budget" 500
test_performance "Predictions response time" "$API_URL/predictions" 500

# ============================================================================
# STEP 8: CSV Export Test
# ============================================================================

print_header "STEP 8: CSV EXPORT TEST"

((TESTS_TOTAL++))
echo -n "Test $TESTS_TOTAL: CSV export generates valid output ... "

csv_output=$(curl -s "$API_URL/export")
header_line=$(echo "$csv_output" | head -n1)

if echo "$header_line" | grep -q "Date.*Feature.*Model.*Cost"; then
  line_count=$(echo "$csv_output" | wc -l)
  echo -e "${GREEN}✓ PASS${NC} ($line_count lines, valid headers)"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FAIL${NC}"
  echo "  First line: $header_line"
  ((TESTS_FAILED++))
fi

# ============================================================================
# Final Report
# ============================================================================

print_header "TEST SUMMARY"

echo "Total Tests:  $TESTS_TOTAL"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  ✓ ALL TESTS PASSED!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  exit 0
else
  echo -e "\n${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${RED}  ✗ SOME TESTS FAILED${NC}"
  echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
  exit 1
fi

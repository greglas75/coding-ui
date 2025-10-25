# 🧪 Error Handling Test Plan

**Date**: 2025-10-21
**Component**: CodeframeBuilderPage
**Status**: ✅ **READY FOR TESTING**

---

## 📋 OVERVIEW

This test plan verifies that all error scenarios show user-friendly toast messages instead of silent failures.

**Changes Made**:
- ✅ Added `getErrorMessage()` function to parse all error types
- ✅ Added toast.error() in `handleGenerate()` catch block
- ✅ Added toast.error() in Step3Processing `onError` callback
- ✅ User automatically returns to configuration step on error

---

## 🎯 TEST SCENARIOS

### Test 1: Python Service Down

**Simulate**:
```bash
# Stop Python service
cd python-service
# If running, kill it:
pkill -f "uvicorn main:app"
```

**Steps**:
1. Open app: `http://localhost:5173`
2. Navigate to Codeframe Builder
3. Select category with uncategorized answers
4. Click "Configure" → "Generate"

**Expected Result**:
```
Toast Error (red):
Title: "Python service is not running. Please start the Python service and try again."
Description: "Please fix the issue and try again"
Duration: 6 seconds

UI: Returns to Step 2 (Configure)
```

**Actual Error Message**:
- Console: `Error: connect ECONNREFUSED 127.0.0.1:8000`
- User sees: Friendly message above

---

### Test 2: Invalid ANTHROPIC_API_KEY

**Simulate**:
```bash
# Edit .env
cd /Users/greglas/coding-ui
nano .env

# Change:
ANTHROPIC_API_KEY=sk-ant-invalid-key-12345
```

**Steps**:
1. Restart Python service (to load new .env)
2. Open app: `http://localhost:5173`
3. Navigate to Codeframe Builder
4. Select category → Configure → Generate

**Expected Result**:
```
Toast Error (red):
Title: "Invalid API key. Please check your ANTHROPIC_API_KEY configuration."
Description: "Please fix the issue and try again"
Duration: 6 seconds

UI: Returns to Step 2 (Configure)
```

**Actual Error Message**:
- API Response: `401 Unauthorized` or `Invalid API key`
- User sees: Friendly message above

---

### Test 3: Claude API Rate Limit (429)

**Simulate**:
This is harder to test without actually hitting rate limits. Two options:

**Option A: Mock the response**
```bash
# Modify python-service/services/claude_client.py temporarily
# In send_request(), add before actual API call:

if True:  # Force 429 for testing
    raise httpx.HTTPStatusError(
        "Rate limit exceeded",
        request=None,
        response=type('obj', (object,), {'status_code': 429})()
    )
```

**Option B: Rapid fire requests**
```bash
# In browser console:
for (let i = 0; i < 10; i++) {
  // Click Generate button rapidly
}
```

**Expected Result**:
```
Toast Error (red):
Title: "Too many requests. Please wait a moment and try again."
Description: "Please fix the issue and try again"
Duration: 6 seconds

UI: Returns to Step 2 (Configure)
```

---

### Test 4: Redis Connection Failed

**Simulate**:
```bash
# Stop Redis
brew services stop redis

# Or kill Redis process:
pkill -f redis-server
```

**Steps**:
1. Restart Express (to trigger Redis connection on startup)
2. Open app: `http://localhost:5173`
3. Navigate to Codeframe Builder
4. Select category → Configure → Generate

**Expected Result**:
```
Toast Error (red):
Title: "Redis connection failed. Background jobs may not work. Please check Redis service."
Description: "Please fix the issue and try again"
Duration: 6 seconds

UI: Returns to Step 2 (Configure)
```

**Note**: With graceful degradation, some operations might still work. The error might occur during job queuing.

---

### Test 5: Not Enough Answers (<50)

**Simulate**:
```bash
# Option A: Use SQL to reduce answer count
# Connect to Supabase and run:

UPDATE answers
SET assigned_code_id = NULL
WHERE category_id = 'your-category-id'
LIMIT 45;

# Or Option B: Create a new category with <50 answers
```

**Steps**:
1. Open app: `http://localhost:5173`
2. Navigate to Codeframe Builder
3. Select category with <50 uncategorized answers
4. Click "Configure" → "Generate"

**Expected Result**:
```
Toast Error (red):
Title: "Not enough answers to generate codeframe. Please add at least 50 uncategorized answers."
Description: "Please fix the issue and try again"
Duration: 6 seconds

UI: Returns to Step 2 (Configure)
```

**Actual Error Message**:
- API Response: `400 Bad Request: Minimum 50 answers required`
- User sees: Friendly message above

---

## 🔄 ADDITIONAL ERROR SCENARIOS

### Test 6: Network Error (Airplane Mode)

**Simulate**:
```bash
# Enable airplane mode on Mac
# Or disconnect WiFi
```

**Expected Result**:
```
Toast Error (red):
Title: "Cannot connect to server. Please check your internet connection and try again."
Description: "Please fix the issue and try again"
```

---

### Test 7: Server Error (500)

**Simulate**:
```bash
# In python-service, force a 500 error:
# Modify python-service/routes/codeframe.py

@router.post("/generate")
async def generate_codeframe(...):
    raise HTTPException(status_code=500, detail="Internal server error")
```

**Expected Result**:
```
Toast Error (red):
Title: "Server error occurred. Please try again in a few moments."
Description: "Please fix the issue and try again"
```

---

### Test 8: Timeout Error

**Simulate**:
```bash
# Add delay in Python service:
import asyncio
await asyncio.sleep(120)  # Longer than timeout
```

**Expected Result**:
```
Toast Error (red):
Title: "Request timed out. The server is taking too long to respond. Please try again."
Description: "Please fix the issue and try again"
```

---

## ✅ SUCCESS CRITERIA

For each test:
- ✅ Toast message appears (red error toast)
- ✅ Message is user-friendly (no technical jargon)
- ✅ Duration is 6 seconds
- ✅ Includes actionable description
- ✅ User returns to Step 2 (Configure) automatically
- ✅ Console.error still logs technical details for debugging

---

## 🧹 CLEANUP AFTER TESTING

After completing tests, restore normal state:

```bash
# 1. Restore valid API key in .env
ANTHROPIC_API_KEY=sk-ant-your-real-key

# 2. Restart Redis
brew services start redis

# 3. Restart Python service
cd python-service
uvicorn main:app --reload --port 8000

# 4. Restart Express
cd ..
node api-server.js

# 5. Remove any test modifications from code
git checkout python-service/services/claude_client.py
git checkout python-service/routes/codeframe.py

# 6. Verify app works normally
npm run dev
```

---

## 📊 TEST RESULTS TEMPLATE

Copy this table and fill in results:

| Test | Status | Toast Shown? | Message Correct? | UI Reset? | Notes |
|------|--------|--------------|------------------|-----------|-------|
| 1. Python down | ⬜ | ⬜ | ⬜ | ⬜ | |
| 2. Invalid API key | ⬜ | ⬜ | ⬜ | ⬜ | |
| 3. Rate limit (429) | ⬜ | ⬜ | ⬜ | ⬜ | |
| 4. Redis down | ⬜ | ⬜ | ⬜ | ⬜ | |
| 5. <50 answers | ⬜ | ⬜ | ⬜ | ⬜ | |
| 6. Network error | ⬜ | ⬜ | ⬜ | ⬜ | |
| 7. Server error (500) | ⬜ | ⬜ | ⬜ | ⬜ | |
| 8. Timeout | ⬜ | ⬜ | ⬜ | ⬜ | |

**Overall Status**: ⬜ PASS / ⬜ FAIL

---

## 🎯 QUICK TEST SCRIPT

Run this to quickly test the most critical scenarios:

```bash
#!/bin/bash
# quick-error-test.sh

echo "🧪 Testing Error Handling..."

# Test 1: Python service down
echo -e "\n1️⃣ Testing Python service down..."
pkill -f "uvicorn main:app"
echo "✅ Python stopped. Now test in UI."
read -p "Press Enter when done..."

# Test 2: Redis down
echo -e "\n2️⃣ Testing Redis down..."
brew services stop redis
echo "✅ Redis stopped. Now test in UI."
read -p "Press Enter when done..."

# Cleanup
echo -e "\n🧹 Cleaning up..."
brew services start redis
cd python-service && uvicorn main:app --reload --port 8000 &
echo "✅ Services restarted."
```

---

## 📚 DOCUMENTATION REFERENCE

- **Implementation**: `src/pages/CodeframeBuilderPage.tsx` (lines 37-113)
- **Error Parser**: `getErrorMessage()` function (lines 37-94)
- **Toast Library**: `sonner` (already installed)
- **Security Audit**: `COMPLETE_SECURITY_PERFORMANCE_AUDIT.md`

---

## 🎉 EXPECTED OUTCOME

**Before Error Handling**:
- ❌ User sees "Processing..." forever
- ❌ No feedback when errors occur
- ❌ Must check console to debug
- ❌ Poor user experience

**After Error Handling**:
- ✅ Clear error messages in UI
- ✅ Actionable instructions
- ✅ Automatic recovery (returns to config step)
- ✅ Professional UX

---

**Test Plan Created By**: Claude Code
**Date**: 2025-10-21
**Status**: ✅ **READY FOR EXECUTION**

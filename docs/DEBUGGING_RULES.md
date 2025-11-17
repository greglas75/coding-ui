# Debugging Rules - READ BEFORE EVERY FIX

## 🔴 The Golden Rule

**If you've tried the same fix 2+ times and got the same error:**  
**STOP. You're fixing the wrong thing. Read the logs from scratch.**

---

## 📋 Pre-Debug Checklist

Before touching ANY code:

```bash
# 1. Read the ACTUAL error (not what you think it is)
tail -100 /tmp/python-service.log

# 2. Verify current code state
git status
git diff

# 3. Check if this was already debugged
cat DEBUGGING_LOG.md | grep -i "similar error"
```

---

## 🔍 Debugging Protocol (Follow In Order)

### Step 1: Identify Root Cause vs Symptom

Ask yourself:
- [ ] Is this the actual error or just a symptom?
- [ ] Example: CORS error might be symptom of 500 backend error
- [ ] Read the FULL error stack trace (not just first line)
- [ ] When did it last work? What changed since then?

**Common mistake:** Fixing CORS when backend is actually returning 500.

```bash
# Check if backend is actually working:
curl -I http://localhost:8001/endpoint

# If returns 500 → Fix backend FIRST, ignore CORS
# If returns 200 but browser shows CORS → Then fix CORS
```

### Step 2: Form Clear Hypothesis

Write down (literally):
```
PROBLEM: [exact error message from logs]

LIKELY CAUSE: [your hypothesis about root cause]

WHY I THINK SO: [reasoning based on evidence]

TEST TO VERIFY: [how to check if hypothesis is correct]
```

**Example:**
```
PROBLEM: TypeError: 'NoneType' object cannot be converted to 'SchemaSerializer'

LIKELY CAUSE: Pydantic models defined after app = FastAPI()

WHY I THINK SO: FastAPI docs say models must be defined before app creation

TEST TO VERIFY: Check line numbers - models should be < app line number
```

### Step 3: Make MINIMAL Change

**Rules:**
- [ ] Change ONE thing only
- [ ] Make smallest possible change that tests hypothesis
- [ ] Don't refactor while debugging
- [ ] Don't "improve" other code at the same time

### Step 4: Test IMMEDIATELY

```bash
# Don't make multiple changes then test
# Test after EACH change

# For API endpoints:
curl -X POST http://localhost:8001/test-endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'

# Check response code:
echo $?  # 0 = success, non-zero = failure

# Check NEW errors (not old ones):
tail -30 /tmp/python-service.log | grep "$(date +%H:%M)"
```

### Step 5: Verify Error Changed

**Critical:** Check if error message is DIFFERENT or GONE.

```bash
# Compare before/after
echo "OLD ERROR: [paste here]"
echo "NEW ERROR: [paste here]"

# If IDENTICAL → Your fix didn't work, try different approach
# If DIFFERENT → Progress! Continue debugging
# If GONE → Success! Update docs
```

---

## 🚨 Common Pitfalls (coding-ui Specific)

### 1. Pydantic + FastAPI Serialization Error

**Error:**
```
TypeError: 'NoneType' object cannot be converted to 'SchemaSerializer'
```

**Root Cause:** Models defined AFTER `app = FastAPI()`

**How to Find:**
```bash
# Check order in main.py:
grep -n "class.*BaseModel\|app = FastAPI" python-service/main.py

# Output should show models BEFORE app:
# 50:class MyRequest(BaseModel):     ← Model line
# 54:class MyResponse(BaseModel):    ← Model line
# 120:app = FastAPI()                ← App line

# If app line < model line = WRONG ORDER
```

**Fix:**
```python
# ✅ CORRECT:
from pydantic import BaseModel

class RequestModel(BaseModel):
    field: str

app = FastAPI()

# ❌ WRONG:
app = FastAPI()

class RequestModel(BaseModel):  # TOO LATE!
    field: str
```

**Verification:**
```bash
# After fix, test endpoint:
curl -X POST http://localhost:8001/endpoint \
  -H "Content-Type: application/json" \
  -d '{"field": "test"}'

# Should return 200 with JSON response
```

### 2. CORS Errors (False Alarms)

**Symptom:** Browser shows CORS error

**First check:** Is backend actually returning 200?

```bash
# Check response code:
curl -I http://localhost:8001/endpoint

# Response codes:
# 200 OK → Backend works, might need CORS config
# 500 Internal → Backend broken, fix THAT first
# 404 Not Found → Route doesn't exist
```

**Common mistake:** Adding CORS middleware when backend is returning 500.

**Fix order:**
1. Fix backend error (make it return 200)
2. THEN add CORS if still needed

### 3. Server Not Restarting with Changes

**Symptom:** Code changed but error is identical

**Check:**
```bash
# 1. Is uvicorn actually reloading?
ps aux | grep uvicorn

# 2. Check file timestamp:
ls -la python-service/main.py
# Timestamp should be recent

# 3. Check if --reload flag is set:
ps aux | grep uvicorn | grep reload
```

**Fix:**
```bash
# Force restart:
pkill -f "uvicorn.*main:app"

# Start fresh:
cd python-service
uvicorn main:app --reload --port 8001 --log-level debug

# Verify reload works:
# Edit main.py (add comment)
# Should see "Reloading..." in terminal
```

### 4. Import Errors

**Error:** `ModuleNotFoundError: No module named 'X'`

**Common causes:**
```bash
# 1. Wrong virtual environment:
which python
# Should show: /path/to/venv/bin/python
# If shows /usr/bin/python → wrong env

# 2. Package not installed:
pip list | grep package-name

# 3. Circular imports:
# Check if A imports B and B imports A
```

### 5. Port Already in Use

**Error:** `Address already in use`

**Find what's using port:**
```bash
# Check what's on port 8001:
lsof -i :8001

# Kill it:
kill -9 [PID]

# Or change port:
uvicorn main:app --reload --port 8002
```

---

## 📊 Attempt Tracking (MANDATORY)

After EACH failed attempt, log it:

```bash
cat >> DEBUGGING_LOG.md << 'EOF'

## Attempt [N] - $(date +"%Y-%m-%d %H:%M:%S")

**Error:** [exact error message from logs]

**What I tried:** [description of fix attempt]

**Result:** [what happened - same error? different error? partial success?]

**Why it might have failed:** [your analysis]

**Next approach:** [if you have one]

---
EOF
```

**After 3 attempts:**
```bash
# Read your log and analyze patterns:
cat DEBUGGING_LOG.md

# Ask yourself:
# - Am I repeating the same fix?
# - Is error message EXACTLY the same each time?
# - Am I looking in the wrong file/place?
# - Should I ask Greg?
```

---

## 🎯 Issue-Specific Guides

### FastAPI Endpoint Returns 404

**Checklist:**
```bash
# 1. Route defined?
grep "@app.post\|@app.get" python-service/main.py | grep "/your-endpoint"

# 2. Server restarted with new route?
# Should see reload message in terminal

# 3. Path is EXACT (case-sensitive)?
curl -X POST http://localhost:8001/exact-path  # Not /Exact-Path

# 4. Router included?
grep "app.include_router" python-service/main.py
```

### Python Type Errors

**Error:** `'NoneType' object has no attribute 'X'`

**Debug:**
```python
# Add print/logging BEFORE the error line:
print(f"DEBUG: variable = {variable}, type = {type(variable)}")

# Common causes:
# - Function returned None instead of expected value
# - Variable not initialized
# - Optional field is None but code assumes it exists
```

### Database Connection Issues

**Checklist:**
```bash
# 1. Connection string format:
echo $DATABASE_URL
# Should be: postgresql://user:pass@host:port/db

# 2. Can you connect outside app?
psql $DATABASE_URL  # Test connection

# 3. Firewall/network:
ping database-host
telnet database-host 5432
```

---

## 💾 Saving Progress (Don't Lose Work)

When stuck on a bug:

```bash
# 1. Commit current state (even if broken):
git add -A
git commit -m "WIP: Debugging [issue] - attempt [N]

Trying: [what you're trying]
Error: [current error]
Next: [what to try next]
"

# 2. Document in PROJECT_CONTEXT.md:
cat >> PROJECT_CONTEXT.md << 'EOF'

### [DATE] - Debugging [Issue Description]

**Symptoms:** [what's broken]
**Attempted fixes:** 
1. [attempt 1] → [result]
2. [attempt 2] → [result]
3. [attempt 3] → [result]

**Current status:** Still debugging
**Next steps:** [plan]
**Ask Greg if:** [conditions]

EOF
```

---

## 🆘 When to Ask for Help

Stop debugging and ask Greg if:

| Condition | Action |
|-----------|--------|
| Same error 3+ times | Ask Greg for guidance |
| Error makes no sense | Share full logs with Greg |
| Possible architecture issue | Discuss with Greg before changing |
| Bug in external library | Ask Greg if workaround acceptable |
| Time spent > 30 min | Update Greg on progress |
| Not sure about fix impact | Ask Greg before implementing |

**How to ask effectively:**

```
Hi Greg,

I've been debugging [issue] for [time].

ERROR:
[exact error message]

TRIED:
1. [attempt 1] → [result]
2. [attempt 2] → [result]
3. [attempt 3] → [result]

HYPOTHESIS:
I think the issue might be [hypothesis], because [reasoning].

QUESTION:
[specific question - not "what should I do?"]

LOGS:
[relevant log excerpt]
```

---

## 🔄 After Successful Fix

Document the solution:

```bash
# 1. Update DEBUGGING_LOG.md with solution:
cat >> DEBUGGING_LOG.md << 'EOF'

## ✅ SOLVED - [DATE]

**Final solution:** [what fixed it]

**Root cause:** [what was actually wrong]

**Why previous attempts failed:** [analysis]

**Lesson learned:** [what to remember]

**Prevention:** [how to avoid in future]

EOF

# 2. Update PROJECT_CONTEXT.md:
# Add to "Recent Fixes" section

# 3. Commit with clear message:
git add -A
git commit -m "[Component] Fix [issue]

Root cause: [explanation]
Solution: [what was changed]
Testing: [how verified]
"
```

---

## 📚 Debugging Resources

### Log Locations
- Python service: `/tmp/python-service.log`
- Frontend (if applicable): Browser console
- System: `journalctl -u [service]`

### Useful Commands
```bash
# Watch logs in real-time:
tail -f /tmp/python-service.log

# Search logs for error:
grep -i "error" /tmp/python-service.log | tail -20

# Check recent logs with timestamp:
tail -50 /tmp/python-service.log | grep "$(date +%Y-%m-%d)"

# Find when error first appeared:
grep -n "specific error message" /tmp/python-service.log | head -1
```

### Debug Mode
```bash
# Start with verbose logging:
uvicorn main:app --reload --port 8001 --log-level debug

# Add debug logging in code:
import logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.debug(f"Variable state: {variable}")
```

---

## 🎓 Learning from Debugging

After solving each bug:

**Ask yourself:**
1. What was the actual root cause?
2. Why did I initially misdiagnose it?
3. What pattern should I recognize next time?
4. How can I prevent this type of bug?

**Update these files:**
- `DEBUGGING_RULES.md` - Add pattern to recognize
- `.claude/instructions.md` - Add to "Never Do" list
- `PROJECT_CONTEXT.md` - Document the fix

---

## 🔥 Emergency Debugging (System Down)

If service is completely broken:

```bash
# 1. Check if service is running:
ps aux | grep uvicorn

# 2. Check what's in logs:
tail -100 /tmp/python-service.log

# 3. Try starting fresh:
cd python-service
pkill -f uvicorn
rm -f *.pyc  # Clear compiled Python
uvicorn main:app --reload --port 8001

# 4. If still broken, check syntax:
python -m py_compile main.py

# 5. Test imports:
python -c "import main"
```

---

*Remember: Good debugging is systematic, not random. Follow the protocol!*

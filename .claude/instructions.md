# Claude Code Instructions - coding-ui (TGM Research)

## 🎯 ALWAYS READ FIRST
Before doing ANYTHING:
1. `cat PROJECT_CONTEXT.md` - Check current project state
2. If debugging: `cat DEBUGGING_RULES.md`
3. Before commit: `cat .github/AI_CHECKLIST.md`

## 🔴 CRITICAL: Self-Verification Protocol

### After EVERY Change - Test Immediately:
```bash
# 1. For Python service changes:
curl -X POST http://localhost:8001/[endpoint] \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 2. Check logs for NEW errors (not old ones):
tail -30 /tmp/python-service.log | grep "$(date +%H:%M)"

# 3. Verify success:
if [ $? -eq 0 ]; then
  echo "✅ Change successful"
else
  echo "❌ Change failed - STOP and check logs"
  tail -50 /tmp/python-service.log
fi
```

### If Same Error Appears 2+ Times:
```bash
# STOP and document
cat >> DEBUGGING_LOG.md << EOF

## Failed Attempt $(date +"%Y-%m-%d %H:%M")
**Error:** [exact error message from logs]
**What I tried:** [description of the fix]
**Result:** Same error appeared again
**Hypothesis why it failed:** [your analysis]

EOF

# Then re-read the logs from scratch:
tail -100 /tmp/python-service.log
```

**Rule:** After 3 identical errors → ASK GREG. Don't try the same thing 10 times.

## 🏗️ Project Architecture - TGM Research Translation System

### Translation Pipeline (Multi-pass Polish)
```
Input Text
    ↓
[Pass 1] Initial analysis + base translation
    ↓
[Pass 2] Style improvement (receives Pass 1 output)
    ↓
[Pass 3] Quality aggregation (receives Pass 1 + Pass 2 outputs)
    ↓
Final Output + Quality Report
```

### ⚠️ CRITICAL ARCHITECTURE RULES:

**Pass 3 Design:**
- ❌ Pass 3 is NOT a translator
- ❌ Pass 3 does NOT execute translation
- ✅ Pass 3 ONLY aggregates quality metrics from Pass 1 & Pass 2
- ✅ Pass 3 receives already-processed results
- ✅ Pass 3 weights quality dimensions and formats reports

**Code Organization:**
- `MODULE_NOTES/` = Language-specific content (Polish rules, examples, linguistic knowledge)
- `prompts/` = Universal structural logic (flow, structure, variables)
- ❌ NEVER hardcode language-specific content in prompt files
- ✅ ALWAYS use variables/parameters for language content
- ✅ Pass 3 should have MINIMAL linguistic knowledge (it works with processed results)

### Tech Stack

**Backend:**
- Python FastAPI (`python-service/main.py`)
- Port: 8001
- Logs: `/tmp/python-service.log`

**Frontend:**
- React 19 + TypeScript
- Next.js 15
- Supabase backend

**AI Integration:**
- Multi-provider: OpenAI, Claude (Anthropic), Gemini, DeepL
- Handlebars templates for modular prompts
- 96+ languages support

**Other Systems:**
- Fraud detection (Cloudflare Workers)
- Mouse trajectory analysis
- Bot detection (AdsPower patterns)

## 🚨 COMMON MISTAKES - DO NOT REPEAT

### 1. Pydantic + FastAPI (Most Common!)

**Error:** `TypeError: 'NoneType' object cannot be converted to 'SchemaSerializer'`

**Cause:** Pydantic models defined AFTER `app = FastAPI()`

**Fix:**
```python
# ✅ CORRECT ORDER:
from fastapi import FastAPI
from pydantic import BaseModel

# 1. Models FIRST
class MyRequest(BaseModel):
    field: str

class MyResponse(BaseModel):
    result: str

# 2. App SECOND
app = FastAPI(
    title="Python Service API"
)

# 3. Routes LAST
@app.post("/endpoint")
def endpoint(request: MyRequest) -> MyResponse:
    return MyResponse(result="ok")
```

**Verification:**
```bash
# Line numbers: models should be BEFORE app
grep -n "class.*BaseModel\|app = FastAPI" python-service/main.py

# Example output (correct):
# 50:class MyRequest(BaseModel):
# 54:class MyResponse(BaseModel):
# 120:app = FastAPI()

# If app line number < model line number = WRONG!
```

### 2. CORS Errors (Check Backend First!)

**Don't fix CORS if backend is broken:**
```bash
# 1. First check if backend returns 200:
curl -I http://localhost:8001/endpoint

# If 500 → Fix backend error FIRST
# If 200 but still CORS → Then fix CORS config

# 2. Check actual error in logs:
tail -50 /tmp/python-service.log
```

### 3. Server Not Restarting

**Your changes aren't being applied:**
```bash
# Check if uvicorn is actually reloading:
ps aux | grep uvicorn

# Force restart:
pkill -f "uvicorn.*main:app"
cd python-service
uvicorn main:app --reload --port 8001 --log-level debug

# Verify file changed:
ls -la python-service/main.py
```

## 📋 Coding Standards

### Python (FastAPI)
```python
# Always include type hints
def process_translation(
    text: str,
    source_lang: str,
    target_lang: str
) -> dict[str, Any]:
    """Process translation with quality checks.
    
    Args:
        text: Text to translate
        source_lang: Source language code (e.g., 'en')
        target_lang: Target language code (e.g., 'pl')
    
    Returns:
        Dict with translation and quality metrics
    """
    pass

# Error handling
try:
    result = risky_operation()
except SpecificError as e:
    logger.error(f"Operation failed: {e}")
    raise HTTPException(status_code=500, detail=str(e))
```

### Handlebars Templates (Translation Prompts)
```handlebars
{{! Universal logic in prompt file }}
You are a {{role}} for {{target_language}}.

{{! Language-specific content from MODULE_NOTES }}
{{{language_specific_rules}}}

{{! Dynamic content via variables }}
Source text: {{source_text}}
Context: {{context}}
```

### Git Commits
```
[Component] Brief description

- What changed (specific files/functions)
- Why it changed (reason/issue)
- Impact (what this affects)

Closes: #issue-number (if applicable)
```

## 🧪 Testing Checklist

Before saying "done":

```bash
# 1. Does endpoint respond?
curl -X POST http://localhost:8001/test-pinecone \
  -H "Content-Type: application/json" \
  -d '{"index_name": "test-index"}'

# 2. Check response code
echo $?  # Should be 0

# 3. Any errors in logs?
tail -20 /tmp/python-service.log | grep -i error

# 4. Test edge cases
curl -X POST http://localhost:8001/endpoint \
  -H "Content-Type: application/json" \
  -d '{}'  # Empty request

curl -X POST http://localhost:8001/endpoint \
  -H "Content-Type: application/json" \
  -d '{"invalid": "field"}'  # Invalid data
```

## 📝 Documentation Updates

After EVERY session:
```bash
# Update PROJECT_CONTEXT.md with changes
cat >> PROJECT_CONTEXT.md << EOF

### $(date +%Y-%m-%d) - [Brief description]
**Changed:** [list of modified files]
**Reason:** [why the change was needed]
**Result:** [outcome - success/partial/failed]
**Next steps:** [what's left to do]

EOF

# Commit with proper message
git add -A
git commit -m "[Component] Description

- Bullet points of changes
- Why they were made
- Impact on system"
```

## 💡 Greg's Communication Style

- **Languages:** Fluent Polish & English (code-switches naturally)
- **Technical level:** Expert - no hand-holding needed
- **Prefers:** Direct answers with code examples
- **Avoid:** Long explanations, corporate speak, obvious statements
- **When stuck:** After 3 attempts, ask for guidance (don't keep trying same thing)

## 🚫 Never Do This

1. **Repeat same fix 3+ times without checking if it worked**
2. **Commit without testing**
3. **Hardcode language-specific content in universal prompts**
4. **Define Pydantic models after app creation**
5. **Make architecture changes without asking Greg**
6. **Skip reading error logs (don't assume what error is)**
7. **Use print() for debugging (use proper logging)**

## ⚡ Quick Reference Commands

```bash
# Start Python service
cd python-service
uvicorn main:app --reload --port 8001

# Watch logs in real-time
tail -f /tmp/python-service.log

# Test endpoint
curl -X POST http://localhost:8001/[endpoint] \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'

# Check what's running
ps aux | grep uvicorn
lsof -i :8001

# Git workflow
git status
git diff
git add -p  # Add interactively
git commit -m "[Component] Message"

# Check Python syntax
python -m py_compile python-service/main.py
```

## 🔧 Troubleshooting Quick Guide

| Problem | Check | Solution |
|---------|-------|----------|
| 404 Not Found | Route defined? Server restarted? | Verify @app.post("/path") and restart uvicorn |
| 500 Internal Error | Check logs! | `tail -50 /tmp/python-service.log` |
| Pydantic Error | Model placement | Move models BEFORE `app = FastAPI()` |
| CORS Error | Is backend 200 first? | Fix backend error before CORS config |
| Import Error | Virtual env active? | `which python` should show venv |
| Port in use | Something on :8001? | `lsof -i :8001` then kill or change port |

## 🆘 When to Ask Greg

Immediately ask if:
- [ ] Architecture decision needed
- [ ] Same error after 3 attempts
- [ ] Unclear business logic
- [ ] Breaking API change
- [ ] Database schema modification
- [ ] New external dependency
- [ ] Security concern

**How to ask:**
```
I'm working on [task]. I've tried:
1. [attempt 1] → [result]
2. [attempt 2] → [result]
3. [attempt 3] → [result]

All showing: [exact error]

I think the issue is [hypothesis], but wanted to check with you before [proposed action].
```

## 🎯 Remember

- **Test immediately after every change**
- **Read logs, don't guess**
- **Document decisions in PROJECT_CONTEXT.md**
- **Use checklist before committing**
- **Ask after 3 failed attempts**

---

*Last updated: 2025-10-25*
*For project-specific context, see PROJECT_CONTEXT.md*

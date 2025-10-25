# Debugging Log - coding-ui

This file tracks debugging attempts and their outcomes. It helps identify patterns and prevents repeating the same mistakes.

---

## 📖 How to Use This Log

### When to Add Entry
- After EACH failed debugging attempt
- After 3 identical errors (mandatory)
- When switching debugging approaches

### Entry Format
```
## Attempt [N] - [DATE TIME]

**Error:** [exact error message]
**What I tried:** [description]
**Result:** [outcome]
**Why it failed:** [analysis]
**Next approach:** [plan]

---
```

### When to Clear
- After issue is resolved (move to "Solved" section)
- After 30 days if no longer relevant
- Keep solved issues for reference

---

## ✅ Solved Issues (Reference)

### 2025-10-25: Pydantic Serialization Error

**Error:**
```
TypeError: 'NoneType' object cannot be converted to 'SchemaSerializer'
```

**Attempts:**
1. Restarted server → Same error
2. Checked CORS config → Same error  
3. Reinstalled dependencies → Same error
4. [Multiple similar attempts...]
10. Finally checked model placement → SOLVED

**Root Cause:**
- Pydantic models defined AFTER `app = FastAPI()` in main.py
- Models were on line 293, app creation on line 379

**Solution:**
- Moved all BaseModel classes BEFORE app creation
- Standard FastAPI pattern: imports → models → app → routes

**Lesson Learned:**
- ALWAYS verify fix actually changed something
- Don't repeat same fix 10 times
- Read FastAPI docs for standard patterns
- Test immediately after each change

**Prevention:**
- Keep models at top of file (after imports)
- Use grep to check order: `grep -n "class.*BaseModel\|app = FastAPI" main.py`
- Added to .claude/instructions.md as common mistake

---

## 🔄 Active Debugging Sessions

_Active debugging attempts will appear below._
_Update this section in real-time as you debug._

---

## 📊 Debugging Statistics

**Total sessions:** 1  
**Average attempts per issue:** 10 (too high!)  
**Most common mistake:** Not testing changes immediately  
**Lessons learned:** 1

---

## 💡 Patterns Identified

### Pattern 1: Repeating Same Fix
**Symptom:** Error message is identical across multiple attempts  
**Root cause:** Fix didn't actually apply (server not restarted, wrong file, etc.)  
**Solution:** Verify change took effect before trying again

### Pattern 2: Fixing Symptoms Not Root Cause
**Symptom:** Fixing one error reveals another immediately  
**Root cause:** Looking at wrong part of stack trace  
**Solution:** Read FULL error trace, not just last line

---

## 🎯 Quick Reference

### Before Adding Log Entry
```bash
# Get exact error:
tail -50 /tmp/python-service.log

# Check what changed:
git diff

# Verify current state:
grep -n "suspicious pattern" relevant-file.py
```

### After Solving Issue
```bash
# Move to "Solved" section
# Document solution
# Update .claude/instructions.md if pattern found
# Update PROJECT_CONTEXT.md with fix
```

---

*This log should be read before starting any debugging session.*  
*If you see repeated patterns → STOP and try different approach.*

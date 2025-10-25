# AI Pre-Commit Checklist

**⚠️ DO NOT COMMIT WITHOUT COMPLETING THIS CHECKLIST ⚠️**

---

## ✅ Mandatory Checks (All Must Pass)

### 1. Testing ✓

```bash
# Did you actually test the changed functionality?
[ ] YES - Test completed
[ ] NO  - GO TEST IT NOW

# What test did you run?
# Command used:
# _________________________________________________

# Result:
# _________________________________________________

# Response code (should be 200 for success):
# _________________________________________________
```

**For Python/API changes:**
```bash
# Test the endpoint:
curl -X POST http://localhost:8001/[your-endpoint] \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# Check logs for errors:
tail -30 /tmp/python-service.log

# Verify response:
# [ ] Returns 200 OK
# [ ] JSON response is valid
# [ ] No errors in logs
```

### 2. Code Quality ✓

```bash
# Remove debugging artifacts:
[ ] No print() statements left
[ ] No commented-out code blocks
[ ] No TODO comments (or documented why they're there)
[ ] No hardcoded credentials/secrets

# Code style:
[ ] Follows existing patterns in file
[ ] Type hints added (Python)
[ ] Docstrings for new functions
[ ] Error handling included
```

### 3. Architecture Compliance ✓

**For Translation System:**
```bash
[ ] Pass 3 only aggregates (doesn't translate)
[ ] Language-specific rules in MODULE_NOTES (not hardcoded)
[ ] Pydantic models BEFORE app = FastAPI()
[ ] No duplication of Pass 1/2 logic
```

**For FastAPI changes:**
```bash
[ ] Models defined before app creation
[ ] Type hints on all parameters
[ ] Error responses defined (HTTPException)
[ ] CORS configured if needed
```

### 4. Logs & Errors ✓

```bash
# Check for NEW errors (not old ones):
tail -50 /tmp/python-service.log | grep -i error

# Verify:
[ ] No new errors introduced
[ ] No new warnings introduced
[ ] Logs show expected behavior
[ ] No stack traces (unless expected)
```

### 5. Files Changed ✓

```bash
# Review what you're committing:
git status
git diff

# Verify:
[ ] Only relevant files included
[ ] No accidental changes (auto-formatting, whitespace)
[ ] No sensitive data (keys, passwords, tokens)
[ ] No large files (logs, data dumps)
```

---

## 📝 Documentation Updates (Required)

### Update PROJECT_CONTEXT.md:

```bash
cat >> PROJECT_CONTEXT.md << EOF

### $(date +%Y-%m-%d) - [Brief Description]

**Changed:** 
- [File 1]: [What changed]
- [File 2]: [What changed]

**Why:** [Reason for changes]

**Impact:** [What this affects]

**Testing:** [How verified]

EOF
```

**Checklist:**
```bash
[ ] SESSION LOG updated with date and changes
[ ] Description is clear and specific
[ ] Impact on other systems noted
[ ] Testing method documented
```

---

## 🎯 Self-Check Questions (Answer Honestly)

### Question 1: Did I Actually Test This?

```
Answer: [ ] Yes, manually tested
        [ ] No → STOP, GO TEST NOW
        
If yes, describe test:
_________________________________________________
```

### Question 2: Do I Understand What I Changed?

```
Answer: [ ] Yes, I can explain each change
        [ ] No → STOP, REVIEW THE DIFF

Explanation in one sentence:
_________________________________________________
```

### Question 3: Could This Break Something Else?

```
Answer: [ ] No, change is isolated
        [ ] Maybe → TEST RELATED FEATURES
        [ ] Yes → DID YOU TEST THOSE FEATURES?

Related features tested:
_________________________________________________
```

### Question 4: Is This the Minimal Change?

```
Answer: [ ] Yes, smallest change needed
        [ ] No → SIMPLIFY BEFORE COMMITTING

Could this be smaller/simpler?
_________________________________________________
```

### Question 5: Did Same Error Appear Multiple Times?

```
Answer: [ ] No, first attempt worked
        [ ] Yes, but fixed now
        [ ] Yes, still seeing it → STOP, DON'T COMMIT

If yes, how many attempts?
_________________________________________________

Did you document attempts in DEBUGGING_LOG.md?
[ ] Yes
[ ] No → DO IT NOW
```

---

## 🔴 STOP Conditions (Do NOT Commit If Any True)

```bash
[ ] Same error appeared 2+ times (you're fixing wrong thing)
[ ] Haven't tested the change at all
[ ] Error logs show NEW errors after your change
[ ] Not sure what files you modified
[ ] Changes affect architecture (need Greg's approval first)
[ ] Breaking changes to API (need Greg's approval)
[ ] Large refactor mixed with bug fix (separate them)
[ ] Hardcoded values that should be configurable
```

**If ANY stop condition is true → FIX IT BEFORE COMMITTING**

---

## 📋 Commit Message Quality

### Format (Use This Template):

```
[Component] Brief description (max 50 chars)

- What changed (specific file/function)
- Why it changed (reason/issue)
- Impact (what this affects)
- Testing (how verified)

Closes: #issue-number (if applicable)
```

### Examples:

**✅ Good:**
```
[Translation] Redesign Pass 3 as quality aggregator

- Removed translation execution from Pass 3
- Pass 3 now receives Pass 1+2 outputs
- Focuses on quality dimension weighting
- Tested with Polish multi-pass pipeline

Impact: Simplifies multi-language support
```

**✅ Good:**
```
[Python Service] Fix Pydantic serialization error

- Moved BaseModel classes before app creation
- Updated models on lines 50-60 (was line 293)
- Tested /test-pinecone endpoint → returns 200

Fixes: TypeError NoneType serialization
```

**❌ Bad:**
```
Fixed bug
```

**❌ Bad:**
```
Updated main.py with changes
```

**❌ Bad:**
```
WIP stuff, will finish later
```

---

## 🧪 Pre-Commit Testing Script

Run this before every commit:

```bash
#!/bin/bash
echo "🔍 Pre-commit checks..."

# 1. Check Python syntax
echo "Checking Python syntax..."
find . -name "*.py" -exec python -m py_compile {} \; 2>/dev/null
if [ $? -ne 0 ]; then
    echo "❌ Python syntax errors found"
    exit 1
fi

# 2. Check for debug prints
echo "Checking for debug statements..."
git diff --cached | grep -E "^\+.*print\(|^\+.*console\.log" && {
    echo "⚠️  Debug statements found. Remove them or confirm intentional."
    read -p "Continue? (y/n) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
}

# 3. Check for TODOs
echo "Checking for TODOs..."
git diff --cached | grep -E "^\+.*TODO|^\+.*FIXME" && {
    echo "⚠️  TODO/FIXME found. Document or remove."
    read -p "Continue? (y/n) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
}

# 4. Check if service is running
echo "Checking if service responds..."
curl -s http://localhost:8001/health > /dev/null || {
    echo "⚠️  Service not responding. Start it?"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
}

echo "✅ Pre-commit checks passed"
```

**To install:**
```bash
# Save to .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

---

## 🎯 Quality Gates

### For Production Code

```bash
[ ] Tested on real data (not just "test" strings)
[ ] Error handling for edge cases
[ ] Logs don't show warnings
[ ] No hardcoded values
[ ] Type hints complete
[ ] Docstrings added
[ ] Greg reviewed if architecture change
```

### For Experiments/WIP

```bash
[ ] Marked as [WIP] in commit message
[ ] Won't break existing features
[ ] Documented what's incomplete
[ ] In separate branch (not main)
```

---

## 🔧 Quick Verification Commands

```bash
# Python syntax check:
python -m py_compile python-service/main.py

# Check imports work:
python -c "import sys; sys.path.insert(0, 'python-service'); import main"

# Test endpoint:
curl -I http://localhost:8001/[endpoint]

# Check logs:
tail -20 /tmp/python-service.log | grep -i error

# Verify no secrets:
git diff | grep -iE "password|api_key|secret|token"
```

---

## 💡 Final Sanity Check

**Before clicking "commit":**

```
1. Can I explain this change in one sentence? 
   _________________________________________________

2. Did I test it?
   _________________________________________________

3. Does it solve the original problem?
   _________________________________________________

4. Did I document it in PROJECT_CONTEXT.md?
   _________________________________________________

5. Is the commit message clear?
   _________________________________________________

If ALL answers are YES → OK TO COMMIT
If ANY answer is NO → FIX IT FIRST
```

---

## 📞 Ask Greg Before Committing If:

```bash
[ ] Architecture decision
[ ] Database schema change
[ ] Breaking API change
[ ] New external dependency
[ ] Significant performance change
[ ] Security-related change
[ ] Changes affect multiple systems
```

**How to ask:**
```
"I'm about to commit [description]. 

Changes:
- [list]

Impact:
- [what this affects]

Should I proceed or do you want to review first?"
```

---

## ✅ Commit Checklist Summary

```bash
BEFORE COMMIT:
[ ] Tested and works
[ ] Logs are clean
[ ] Code quality checks passed
[ ] Documentation updated
[ ] Git diff reviewed
[ ] Commit message is clear
[ ] No stop conditions true

COMMIT MESSAGE:
[ ] Starts with [Component]
[ ] Describes what/why/impact
[ ] References issue if applicable

AFTER COMMIT:
[ ] Verify commit went through: git log -1
[ ] Push if ready: git push
```

---

## 🚀 Post-Commit Actions

After successful commit:

```bash
# 1. Verify commit:
git log -1 --stat

# 2. Tag if milestone:
git tag -a v1.x.x -m "Description"

# 3. Push (if ready):
git push origin main

# 4. Update team (if applicable):
# Notify in Slack/Discord/etc.
```

---

**Remember: Quality > Speed. Take 2 extra minutes to verify.**

**A good commit is:**
- ✅ Tested
- ✅ Documented  
- ✅ Reviewable
- ✅ Revertible
- ✅ Understandable

---

*This checklist exists because we've learned these lessons the hard way.*
*Use it. Every. Single. Time.*

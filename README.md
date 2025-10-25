# AI Assistant System - Installation Guide for coding-ui

**Created:** 2025-10-25  
**For:** TGM Research coding-ui project  
**Owner:** Greg

---

## 🎯 What This Is

Complete instruction system for AI assistants (Claude Code, Claude Chat) to work effectively on the coding-ui project with:
- Project context and architecture
- Debugging protocols
- Pre-commit checklists
- Continuous memory across sessions

**Problem it solves:** AI repeating same mistakes, not remembering project context, trying same fix 10 times.

---

## 📁 Files Created

```
coding-ui-template/
├── .claude/
│   └── instructions.md          # Main instructions for Claude Code
├── .github/
│   └── AI_CHECKLIST.md          # Pre-commit checklist
├── PROJECT_CONTEXT.md           # Current project state
├── DEBUGGING_RULES.md           # Debugging protocols
├── DEBUGGING_LOG.md             # Track debugging attempts
└── README.md                    # This file
```

---

## 🚀 Installation (Copy to Your Project)

### Step 1: Navigate to Your Project

```bash
cd /Users/greglas/coding-ui
# Or wherever your coding-ui project actually is
```

### Step 2: Copy Template Files

```bash
# Copy the template structure (FROM WHEREVER YOU SAVED IT)
cp -r /home/claude/coding-ui-template/.claude .
cp -r /home/claude/coding-ui-template/.github .
cp /home/claude/coding-ui-template/PROJECT_CONTEXT.md .
cp /home/claude/coding-ui-template/DEBUGGING_RULES.md .
cp /home/claude/coding-ui-template/DEBUGGING_LOG.md .
```

### Step 3: Verify Installation

```bash
ls -la coding-ui/
# Should see:
# .claude/
# .github/
# PROJECT_CONTEXT.md
# DEBUGGING_RULES.md
# DEBUGGING_LOG.md
```

### Step 4: Git (Optional but Recommended)

```bash
# Add to git but don't track LOG file:
echo "DEBUGGING_LOG.md" >> .gitignore

# Commit the instruction files:
git add .claude/ .github/ PROJECT_CONTEXT.md DEBUGGING_RULES.md
git commit -m "[Setup] Add AI assistant instruction system

- Claude Code instructions
- Project context documentation
- Debugging protocols
- Pre-commit checklist
"
```

---

## 📖 How to Use

### For Claude Code (Command Line)

**Claude Code automatically reads `.claude/instructions.md` when you start!**

```bash
# Just start working:
cd /Users/greglas/coding-ui
claude-code "Fix the Pinecone endpoint"

# Claude Code will:
# 1. Read .claude/instructions.md
# 2. Check PROJECT_CONTEXT.md
# 3. Follow debugging rules
# 4. Test immediately
# 5. Update documentation
```

### For Claude Chat (Web Interface)

**At start of conversation, say:**

```
"Read PROJECT_CONTEXT.md from my coding-ui project and help me with [task]"
```

Claude will:
1. Read the context file
2. Understand current project state
3. Apply proper patterns
4. Follow debugging protocols

### During Debugging

**After 2 failed attempts:**

```bash
# Claude should automatically update DEBUGGING_LOG.md
cat DEBUGGING_LOG.md  # Review attempts

# If not updating, remind:
"Document this attempt in DEBUGGING_LOG.md"
```

### Before Committing

**Claude should check `.github/AI_CHECKLIST.md` automatically.**

If not:
```
"Check AI_CHECKLIST.md before committing"
```

---

## 🔄 Keeping It Updated

### After Each Session

Claude should automatically update `PROJECT_CONTEXT.md`:

```markdown
### 2025-10-25 Evening
**Changed:** [files]
**Reason:** [why]
**Result:** [outcome]
**Next:** [what's next]
```

### Manual Update (If Needed)

```bash
# Add session notes:
cat >> PROJECT_CONTEXT.md << EOF

### $(date +%Y-%m-%d) - [Your Session Notes]
**Changed:** [what you worked on]
**Status:** [completed/in-progress]
**Next:** [what's next]

EOF
```

### When Architecture Changes

**Update these files:**
1. `PROJECT_CONTEXT.md` - Document new architecture
2. `.claude/instructions.md` - Add new rules if needed
3. `DEBUGGING_RULES.md` - Add new patterns if discovered

---

## 🎯 File Purposes

### `.claude/instructions.md`
**Purpose:** Main instructions for Claude Code  
**When to read:** Automatically at session start  
**Update when:** New patterns discovered, architecture changes

**Key sections:**
- Self-verification protocol
- Architecture rules (Pass 1/2/3)
- Common mistakes (Pydantic, CORS, etc.)
- Testing protocols
- Greg's preferences

### `PROJECT_CONTEXT.md`
**Purpose:** Current project state and history  
**When to read:** Before starting any work  
**Update when:** After every significant session

**Key sections:**
- Current focus (what you're working on)
- System architecture
- Recent issues & fixes
- Decision log
- Session log

### `DEBUGGING_RULES.md`
**Purpose:** Systematic debugging protocols  
**When to read:** When debugging any issue  
**Update when:** New debugging patterns found

**Key sections:**
- Golden rule (stop after 2 identical errors)
- Debugging protocol (5 steps)
- Common pitfalls (specific to coding-ui)
- Attempt tracking

### `.github/AI_CHECKLIST.md`
**Purpose:** Pre-commit verification  
**When to read:** Before EVERY commit  
**Update when:** New quality gates needed

**Key sections:**
- Mandatory checks (testing, quality, architecture)
- Self-check questions
- Stop conditions
- Commit message format

### `DEBUGGING_LOG.md`
**Purpose:** Track debugging attempts  
**When to read:** Before debugging, after 3 failed attempts  
**Update when:** Each failed debugging attempt

**Key sections:**
- Active debugging sessions
- Solved issues (for reference)
- Patterns identified

---

## 🔧 Customization

### Add Your Own Rules

Edit `.claude/instructions.md`:

```markdown
## My Custom Rules

### Project-Specific Pattern
- When doing X, always do Y first
- Never combine Z with W
```

### Add New Debugging Patterns

Edit `DEBUGGING_RULES.md`:

```markdown
### [New Issue Type]

**Symptom:** [description]
**Root Cause:** [explanation]
**Fix:** [solution]
**Verification:** [how to test]
```

---

## 📊 Effectiveness Metrics

Track if this system is working:

### Before System
- ❌ Same error 10+ times
- ❌ No context between sessions
- ❌ Unclear what was tried
- ❌ No verification of fixes

### After System
- ✅ Stop after 2-3 attempts
- ✅ Full project context available
- ✅ All attempts documented
- ✅ Immediate testing required

---

## 🆘 Troubleshooting

### "Claude isn't reading the files"

**For Claude Code:**
```bash
# Verify .claude/instructions.md exists:
ls -la .claude/instructions.md

# Check file is readable:
cat .claude/instructions.md | head -20
```

**For Claude Chat:**
```bash
# Explicitly tell Claude to read:
"Please read .claude/instructions.md and PROJECT_CONTEXT.md from /Users/greglas/coding-ui"
```

### "Files not found"

```bash
# Check you're in right directory:
pwd
# Should show: /Users/greglas/coding-ui (or your actual path)

# List files:
ls -la | grep -E "PROJECT_CONTEXT|DEBUGGING"
```

### "Claude still repeating mistakes"

**Remind Claude explicitly:**
```
"Check DEBUGGING_RULES.md - you've tried this fix 2 times already. What does the golden rule say?"
```

---

## 🔄 Version History

### v1.0 - 2025-10-25 (Initial)
- Created full instruction system
- Documented Pass 3 architecture redesign
- Added Pydantic placement issue
- Established debugging protocols

### Future Improvements
- [ ] Add automated tests for common mistakes
- [ ] Create git hooks for automatic checks
- [ ] Add integration with CI/CD
- [ ] Create dashboard for debugging stats

---

## 📞 Support

**Created by:** Greg (with Claude)  
**For questions:** Just ask Claude to check these files  
**Updates:** Edit files directly, commit changes

---

## 🎓 Philosophy

**This system is based on:**
1. **Test immediately** - Don't make 5 changes then test
2. **Document everything** - Future you will thank you
3. **Stop repeating** - Same error twice? Different approach.
4. **Context matters** - Project history prevents mistakes
5. **Checklists work** - Pre-flight checks save hours

---

## ✅ Quick Start Checklist

```bash
[ ] Files copied to coding-ui directory
[ ] .claude/instructions.md readable
[ ] PROJECT_CONTEXT.md has current info
[ ] Tested with Claude Code or Claude Chat
[ ] Files committed to git (except DEBUGGING_LOG.md)
```

---

**You're all set! The system is ready to use.**

**Next time you code:**
1. Claude reads instructions automatically (Claude Code)
2. Or you say "check PROJECT_CONTEXT.md" (Claude Chat)
3. Work proceeds with full context
4. Documentation updates automatically
5. No more repeating mistakes!

---

*"The best code is code that doesn't need to be debugged twice."*

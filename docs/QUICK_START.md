# Quick Start Guide - AI Assistant System

**For:** coding-ui project  
**5-minute setup**

---

## 🚀 Installation (2 minutes)

### Option 1: Automatic (Recommended)

```bash
# 1. Go to where you saved the template:
cd /home/claude/coding-ui-template

# 2. Run installer with YOUR project path:
./install.sh /Users/greglas/coding-ui
```

Done! Skip to "Usage" section.

### Option 2: Manual

```bash
# 1. Go to your project:
cd /Users/greglas/coding-ui

# 2. Copy files:
cp -r /home/claude/coding-ui-template/.claude .
cp -r /home/claude/coding-ui-template/.github .
cp /home/claude/coding-ui-template/*.md .

# 3. Don't track log file:
echo "DEBUGGING_LOG.md" >> .gitignore
```

---

## 📖 Usage (3 minutes)

### With Claude Code

**Just start working - it reads automatically:**

```bash
cd /Users/greglas/coding-ui
claude-code "fix the Pinecone endpoint"
```

Claude Code will:
- ✅ Read `.claude/instructions.md` automatically
- ✅ Check `PROJECT_CONTEXT.md` for current state
- ✅ Follow debugging rules
- ✅ Test immediately
- ✅ Update documentation

### With Claude Chat (Web)

**At start of conversation:**

```
"Read PROJECT_CONTEXT.md from my coding-ui project and help me with [task]"
```

---

## 🎯 Key Files (What They Do)

| File | Purpose | When Used |
|------|---------|-----------|
| `.claude/instructions.md` | Main rules for Claude | Automatic (Claude Code) |
| `PROJECT_CONTEXT.md` | Current project state | Before starting work |
| `DEBUGGING_RULES.md` | How to debug | When fixing bugs |
| `.github/AI_CHECKLIST.md` | Pre-commit checks | Before every commit |
| `DEBUGGING_LOG.md` | Track attempts | During debugging |

---

## 💡 Common Scenarios

### Scenario 1: Starting a New Task

**Say:**
```
"Check PROJECT_CONTEXT.md then help me add a new translation endpoint"
```

Claude will:
1. Read current context
2. Follow architecture rules (Pass 1/2/3)
3. Create code
4. Test immediately
5. Update docs

### Scenario 2: Debugging an Issue

**Say:**
```
"Help me debug the Pinecone error - check DEBUGGING_RULES.md first"
```

Claude will:
1. Read debugging protocol
2. Check logs systematically
3. Document each attempt
4. Stop after 2 identical errors
5. Suggest different approach

### Scenario 3: Before Committing

**Say:**
```
"Review my changes using AI_CHECKLIST.md"
```

Claude will:
1. Check if tested
2. Verify code quality
3. Confirm architecture compliance
4. Check commit message format
5. Update PROJECT_CONTEXT.md

---

## 🔧 Customization

### Update Project Context

```bash
# Edit the file:
nano PROJECT_CONTEXT.md

# Update "Current Focus" section with what you're working on
# Claude will read this next time
```

### Add New Rules

```bash
# Edit instructions:
nano .claude/instructions.md

# Add to "Never Do" section or "Common Mistakes"
```

---

## 🐛 Troubleshooting

### Problem: "Claude isn't following rules"

**Solution:**
```
"Read .claude/instructions.md and PROJECT_CONTEXT.md before continuing"
```

### Problem: "Same error 5 times"

**Solution:**
```
"Check DEBUGGING_RULES.md - what does the golden rule say?"
```

### Problem: "Files not found"

**Solution:**
```bash
# Verify you're in the right directory:
pwd  # Should show: /Users/greglas/coding-ui

# List files:
ls -la | grep -E "claude|PROJECT"
```

---

## ✅ Success Checklist

After installation, verify:

```bash
[ ] Files exist in coding-ui directory
[ ] Claude Code starts and reads instructions
[ ] Or Claude Chat can read PROJECT_CONTEXT.md
[ ] You understand each file's purpose
```

Test it:
```bash
cd /Users/greglas/coding-ui
claude-code "What's the current project focus?"

# Should respond with info from PROJECT_CONTEXT.md
```

---

## 📊 Before vs After

### Before System ❌
- Same error 10+ times
- No context between sessions  
- Unclear what was tried
- No verification

### After System ✅
- Stop after 2-3 attempts
- Full context available
- All attempts documented
- Immediate testing

---

## 🎓 Key Principles

1. **Test immediately** after every change
2. **Read context** before starting work
3. **Document attempts** while debugging
4. **Use checklist** before committing
5. **Stop repeating** same fix

---

## 📞 Need Help?

**For file locations:**
```bash
find /Users/greglas/coding-ui -name "PROJECT_CONTEXT.md"
```

**For detailed docs:**
```bash
cat /Users/greglas/coding-ui/README.md
```

**For Claude:**
```
"I'm having trouble with the AI system files. Let's troubleshoot together."
```

---

## 🚀 You're Ready!

**Next command:**
```bash
cd /Users/greglas/coding-ui
claude-code "What should we work on next?"
```

**Or in chat:**
```
"Read PROJECT_CONTEXT.md and tell me what's the current focus"
```

---

*Questions? Just ask Claude to check the README.md!*

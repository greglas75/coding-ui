# Security Guidelines

## 🔒 Critical Security Rules

### NEVER Commit These to Git:

❌ **Environment variables** (`.env` files)
❌ **API keys and secrets** 
❌ **Database passwords**
❌ **Private keys** (`.pem`, `.key` files)
❌ **Certificates**
❌ **Access tokens**
❌ **Service account credentials**

### ✅ Always Use Environment Variables

**Bad (NEVER do this):**
```javascript
const apiKey = "sk-1234567890abcdef";  // ❌ NEVER!
const dbPassword = "MyPassword123";     // ❌ NEVER!
```

**Good:**
```javascript
const apiKey = process.env.OPENAI_API_KEY;       // ✅ Correct
const dbPassword = process.env.SUPABASE_DB_PASSWORD;  // ✅ Correct
```

## Environment Variable Setup

### 1. Copy .env.example to .env

```bash
cp .env.example .env
```

### 2. Fill in your actual credentials

Edit `.env` and replace placeholder values:

```bash
# ❌ Don't use placeholders
OPENAI_API_KEY=your-key-here

# ✅ Use actual key
OPENAI_API_KEY=sk-proj-abc123xyz789...
```

### 3. Verify .env is gitignored

```bash
git status .env
# Should show: "Ignored files"
```

## Pre-Commit Checklist

Before every commit, check:

```bash
# 1. No secrets in staged files
git diff --cached | grep -iE "(api_key|password|secret|token).*=.*['\"]"

# 2. No .env files staged
git status | grep ".env"

# 3. Check for common secret patterns
git diff --cached | grep -E "sk-[a-zA-Z0-9]{20,}"
```

## If You Accidentally Commit a Secret

### If NOT yet pushed to GitHub:

1. **Remove from current code** (use env vars)
2. **Amend the commit:**
   ```bash
   git add .
   git commit --amend
   ```
3. **Or rebase to edit history:**
   ```bash
   git rebase -i HEAD~5  # Edit the problematic commit
   ```

### If ALREADY pushed to GitHub:

🚨 **CRITICAL - Act immediately:**

1. **Rotate the secret** (change password, regenerate API key)
2. **Remove from git history:**
   ```bash
   # Use BFG Repo Cleaner or git filter-repo
   git filter-repo --replace-text <(echo "OLD_SECRET==>REMOVED")
   ```
3. **Force push** (coordinate with team):
   ```bash
   git push --force-with-lease
   ```
4. **Notify affected services**
5. **Monitor for unauthorized access**

## Secrets Management

### Development

- Use `.env` file (gitignored)
- Never share `.env` via Slack/email
- Use password manager for team sharing

### Production

- Use environment variables in hosting platform:
  - Vercel: Project Settings → Environment Variables
  - Railway: Project → Variables
  - AWS: Systems Manager Parameter Store
  - Supabase: Project Settings → API

### CI/CD

- Use repository secrets:
  - GitHub Actions: Repository → Settings → Secrets
  - GitLab CI: Settings → CI/CD → Variables

## API Key Storage

### Frontend (React)

API keys exposed to frontend should be **restricted**:

```typescript
// Use VITE_ prefix for frontend env vars
const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;

// ⚠️ Frontend keys are visible to users!
// Always restrict keys in provider console:
// - Google: Restrict by HTTP referrer
// - OpenAI: Restrict by domain
```

### Backend (Node/Python)

```javascript
// Node
const apiKey = process.env.OPENAI_API_KEY;

# Python
import os
api_key = os.getenv('OPENAI_API_KEY')
```

## Database Security

### Connection Strings

❌ **Never in code:**
```javascript
const db = "postgresql://user:password@host:5432/db"  // NEVER!
```

✅ **Use env vars:**
```javascript
const db = process.env.DATABASE_URL  // Correct
```

### Backup Scripts

Use environment variables:
```bash
PGPASSWORD="$SUPABASE_DB_PASSWORD" pg_dump ...  # ✅ Good
PGPASSWORD="actual-password" pg_dump ...        # ❌ Bad
```

## Security Scanning

### Automated Tools

```bash
# Install git-secrets
brew install git-secrets

# Setup
git secrets --install
git secrets --register-aws

# Scan repo
git secrets --scan
```

### Manual Checks

```bash
# Search for potential secrets
grep -r "password\|api_key\|secret" --include="*.js" --include="*.ts"

# Check for hardcoded IPs
grep -r "[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}\.[0-9]\{1,3\}"
```

## Common Vulnerabilities

### 1. SQL Injection

❌ **Bad:**
```javascript
db.query(`SELECT * FROM users WHERE id = ${userId}`)  // NEVER!
```

✅ **Good:**
```javascript
db.query('SELECT * FROM users WHERE id = $1', [userId])  // Parameterized
```

### 2. XSS (Cross-Site Scripting)

❌ **Bad:**
```javascript
div.innerHTML = userInput  // NEVER!
```

✅ **Good:**
```javascript
div.textContent = userInput  // Safe
// Or use DOMPurify for rich text
```

### 3. Path Traversal

❌ **Bad:**
```javascript
fs.readFile(`./uploads/${filename}`)  // NEVER!
```

✅ **Good:**
```javascript
const safePath = path.join('./uploads', path.basename(filename))
fs.readFile(safePath)
```

## Incident Response

If a secret is leaked:

1. ✅ **Rotate immediately** - Don't wait
2. ✅ **Review access logs** - Check for unauthorized use
3. ✅ **Remove from git history**
4. ✅ **Update documentation**
5. ✅ **Notify team**
6. ✅ **Post-mortem** - How to prevent recurrence

## Security Contacts

- Security issues: [Create issue](https://github.com/your-repo/issues)
- Urgent vulnerabilities: security@your-domain.com

---

**Last Updated:** 2025-11-17
**Version:** 1.0

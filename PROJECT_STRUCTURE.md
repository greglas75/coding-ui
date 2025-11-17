# Project Structure Guidelines

This document defines the organization standards for the coding-ui project.

## Directory Structure

```
/
├── src/                      # React application source code
│   ├── components/           # React components
│   ├── hooks/                # Custom React hooks
│   ├── stores/               # Zustand state management stores
│   ├── services/             # API services and utilities
│   └── types/                # TypeScript type definitions
│
├── server/                   # Express server code
│   ├── routes/               # API route handlers
│   ├── middleware/           # Express middleware
│   ├── services/             # Backend services
│   └── utils/                # Server utilities
│
├── scripts/                  # Utility scripts
│   ├── migrations/           # Database migration scripts
│   ├── deploy/               # Deployment scripts
│   ├── backup/               # Backup and restore scripts
│   ├── debug/                # Debugging and diagnostic scripts
│   └── test/                 # Test runner scripts
│
├── docs/                     # All project documentation
│   ├── archive/              # Historical documentation
│   ├── examples/             # Code examples and guides
│   └── sql/                  # SQL documentation
│
├── tests/                    # Unit and integration tests
├── e2e/                      # End-to-end Playwright tests
├── supabase/                 # Supabase configuration
│   └── migrations/           # Supabase SQL migrations
│
├── public/                   # Static assets
├── uploads/                  # User uploaded files
├── backups/                  # Database backups
├── logs/                     # Application logs (gitignored)
│
├── .github/                  # GitHub workflows and configs
├── node_modules/             # Dependencies (gitignored)
└── dist/                     # Build output (gitignored)
```

## File Organization Rules

### Root Directory

**✅ KEEP in root:**
- Configuration files (e.g., `*.config.js`, `*.config.ts`)
- Package manager files (`package.json`, `package-lock.json`)
- TypeScript configs (`tsconfig*.json`)
- Main entry points (`index.html`, `api-server.js`)
- Essential docs (`README.md`)
- Environment configs (`.env*`, `.gitignore`)

**❌ DO NOT place in root:**
- Documentation files (→ `/docs/`)
- Utility scripts (→ `/scripts/`)
- Log files (→ `/logs/`)
- Test files (→ `/tests/` or `/e2e/`)
- Backup files (→ `/backups/`)

### Scripts Directory (`/scripts/`)

Organize scripts by purpose:

- **`/scripts/migrations/`** - Database migration scripts
  - Examples: `apply-migration.js`, `run-model-columns-migration.js`

- **`/scripts/deploy/`** - Deployment and setup scripts
  - Examples: `deploy.sh`, `install.sh`, `restart-all.sh`

- **`/scripts/backup/`** - Backup and restore utilities
  - Examples: `backup-database.sh`, `backup-supabase.sh`

- **`/scripts/debug/`** - Debugging and diagnostic tools
  - Examples: `debug-api-keys.js`, `check_failed_jobs.cjs`

- **`/scripts/test/`** - Test runner and verification scripts
  - Examples: `test-api-calls.sh`, `security-check.sh`

### Documentation (`/docs/`)

- All `.md` files except `README.md` belong in `/docs/`
- Use subdirectories to organize by topic:
  - `/docs/archive/` - Historical documentation
  - `/docs/examples/` - Code examples and integration guides
  - `/docs/sql/` - SQL-related documentation

### Tests

- **Unit/Integration tests** → `/tests/`
- **E2E tests** → `/e2e/`
- **Test utilities** → `/tests/utils/`
- **Test fixtures** → `/tests/fixtures/`

### Logs

- All log files go in `/logs/` (gitignored)
- Examples: `*.log`, `test-run.log`, `vite-dev.log`

### Backups

- Database backups → `/backups/`
- Code backups → Use git branches/tags instead
- Old code versions should be removed, not stored in the repository

## Naming Conventions

### Files

- **React Components**: PascalCase (e.g., `CodeframeTree.tsx`)
- **Utilities/Services**: camelCase (e.g., `authService.ts`)
- **Scripts**: kebab-case (e.g., `backup-database.sh`)
- **Test files**: `*.spec.ts` or `*.test.ts`
- **Config files**: lowercase with dots (e.g., `vite.config.ts`)

### Directories

- Use lowercase with hyphens for multi-word dirs (e.g., `test-results/`)
- Keep directory names short and descriptive

## Import Path Standards

### Absolute Imports

Use absolute imports from `src/` in React code:

```typescript
// Good
import { useAuth } from '@/hooks/useAuth'
import { CodeframeTree } from '@/components/CodeframeTree'

// Avoid
import { useAuth } from '../../../hooks/useAuth'
```

### Script Imports

Scripts should use relative paths from their location:

```javascript
// In /scripts/migrations/apply-migration.js
const config = require('../../server/config')
```

## Package.json Scripts

When adding scripts that reference files in `/scripts/`:

```json
{
  "scripts": {
    "deploy": "./scripts/deploy/deploy.sh",
    "backup": "./scripts/backup/backup-database.sh",
    "migrate": "node scripts/migrations/apply-migration.js"
  }
}
```

## Git Practices

### Ignored Directories

The following should always be gitignored:
- `/logs/` - Runtime logs
- `/node_modules/` - Dependencies
- `/dist/` - Build output
- `/.env*` - Environment variables
- `/uploads/` - User uploaded content

### What to Commit

- Source code
- Configuration files
- Documentation
- Scripts (except temporary debug scripts)
- Migration files
- Test files

### What NOT to Commit

- Log files
- Build artifacts
- Environment variables
- Node modules
- Temporary files
- User uploads
- Old backup versions of code

## Migration Guide

When moving files:

1. **Check references**: Search for imports/requires of the file
2. **Update package.json**: Update any npm scripts referencing the file
3. **Update documentation**: Update any docs mentioning the file path
4. **Test**: Verify the app still builds and runs
5. **Use git mv**: Preserve file history with `git mv old/path new/path`

## Maintenance

### Regular Cleanup

- Remove old log files (older than 30 days)
- Clean up temporary debug scripts
- Archive outdated documentation
- Remove deprecated code instead of commenting it out

### Before Committing

Always check:
```bash
# Verify structure
ls -la | grep "\.js$\|\.sh$\|\.md$"

# No misplaced files in root
# No log files being committed
# Scripts are in /scripts/
```

## Questions?

If uncertain about where a file should go:
1. Check this document
2. Look for similar files in the project
3. When in doubt, ask or create an issue

---

**Last Updated**: 2025-11-17
**Version**: 1.0

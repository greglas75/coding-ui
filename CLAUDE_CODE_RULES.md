# 🔴 SERVER MANAGEMENT RULES

## THREE SERVERS:
1. Python backend - port 8000 (auto-reload enabled)
2. Node backend - port 3020 (manual restart needed)
3. React frontend - port 5173 (Vite HMR enabled)

## AFTER MAKING CHANGES:

### Python files (.py):
- → Auto-reload handles it (wait 0.5s)
- → Just save and test
- → **NO manual restart needed**

### Node files (api-server.js, etc.):
- → Need manual restart
- → Run: `bash /Users/greglas/coding-ui/restart-all.sh`

### React files (.tsx, .ts, .jsx):
- → Vite HMR handles it (instant)
- → Just save, browser auto-updates
- → **NO restart needed**

## WHEN TO USE RESTART SCRIPT:
- Cache corruption
- Environment variables changed
- Dependencies added (pip install / npm install)
- Server stopped responding
- Auto-reload failed

## MANDATORY TESTING:
After ANY changes, test the affected service:

```bash
# Python backend
curl http://localhost:8000/health

# Node backend
curl http://localhost:3020/api/health

# React frontend
curl -I http://localhost:5173
```

## CONFIRMATION FORMAT:
Every implementation must end with:

```
✅ Changes applied
- Files modified: [list]
- Python (8000): [tested/auto-reloaded]
- Node (3020): [tested/restarted if needed]
- React (5173): [tested/HMR updated]
```

**If you don't test and confirm, task is INCOMPLETE.**

## QUICK COMMANDS:
```bash
# Restart all servers
bash /Users/greglas/coding-ui/restart-all.sh

# Or use alias (after setup)
rr

# View all logs
tail -f /tmp/backend-python.log /tmp/backend-node.log /tmp/frontend.log

# Test all services
curl http://localhost:8000/health && curl http://localhost:3020/api/health && curl -I http://localhost:5173
```

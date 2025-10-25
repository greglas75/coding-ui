# ⚡ Quick Redis Persistence Test

**Time**: 5 minutes
**Status**: Ready to test

---

## 🚀 Quick Start (macOS)

### 1. Install Redis (if needed)

```bash
brew install redis
```

### 2. Start Redis

```bash
# Option A: Start as service (recommended)
brew services start redis

# Option B: Run in foreground
redis-server
```

### 3. Run automated test

```bash
./test-redis-persistence.sh
```

---

## ✅ Expected Output

```
🧪 Testing Redis Queue Persistence...

1️⃣  Checking Redis...
✅ Redis is running

2️⃣  Checking Redis configuration...
   Redis version: 7.0.x
✅ Redis persistence is enabled
   AOF (Append Only File): ENABLED

3️⃣  Checking Bull queue...
⚠️  No Bull queue found yet
   This is normal if you haven't started Express yet

4️⃣  Checking Bull queue configuration...
⚠️  No jobs found to inspect
   Run a codeframe generation to create jobs

═══════════════════════════════════════════════════════════════
📊 SUMMARY
═══════════════════════════════════════════════════════════════
✅ All checks passed!

Your Redis queue is configured for persistence.
Jobs should survive Express and Redis restarts.
```

---

## 🧪 Manual Test (Full Test)

### Terminal 1: Start Express

```bash
npm run dev:api
```

Wait for: `🚀 API server running on http://localhost:3001`

### Terminal 2: Start a generation

```bash
curl -X POST http://localhost:3001/api/v1/codeframe/generate \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "n_clusters": 5,
    "config": {
      "target_language": "en"
    }
  }'
```

**Save the `generation_id` from response!**

### Terminal 1: Kill Express (Ctrl+C or Command+C)

Press Ctrl+C to stop the server.

### Terminal 3: Check Redis has the jobs

```bash
redis-cli LLEN bull:codeframe-generation:wait
# Should return: 5 (or number of remaining jobs)

redis-cli LLEN bull:codeframe-generation:active
# Should return: 0 (no active jobs since Express is down)
```

### Terminal 1: Restart Express

```bash
npm run dev:api
```

**Watch the console** - You should see:
```
[Bull] Queue initialized
[Bull] Processing job <ID>
```

### Terminal 2: Check status

```bash
curl http://localhost:3001/api/v1/codeframe/<your-generation-id>/status
```

**Expected**:
- ✅ `status: "processing"` or `"completed"`
- ✅ Jobs resumed after restart
- ✅ No data loss

---

## ❌ If Test Fails

### Problem: "Redis is NOT running"

```bash
# Start Redis
brew services start redis

# OR run in foreground
redis-server
```

### Problem: "Jobs disappeared after restart"

This means the old configuration was in effect. Make sure:

1. You're running the **latest** code (with the fix)
2. Express was restarted **after** the code change
3. Redis persistence is enabled

```bash
# Check Redis persistence
redis-cli CONFIG GET appendonly
# Should return: "appendonly" "yes"
```

### Problem: "Connection refused"

```bash
# Check if Redis is actually running
ps aux | grep redis-server

# Check Redis port
redis-cli -p 6379 ping
```

---

## 📊 What Changed?

**Before** (❌ Jobs could be lost):
```javascript
const codeframeQueue = new Bull('codeframe-generation', {
  redis: process.env.REDIS_URL || 'redis://localhost:6379'
});
```

**After** (✅ Jobs persist):
```javascript
const codeframeQueue = new Bull('codeframe-generation', {
  redis: {
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null,  // ← CRITICAL
    retryStrategy: (times) => Math.min(times * 50, 2000),
  },
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
  },
});
```

**Key Change**: `maxRetriesPerRequest: null`

Without this, jobs can be lost during Redis reconnection!

---

## 🎯 Success Criteria

- ✅ Redis starts successfully
- ✅ Express connects to Redis
- ✅ Jobs are created in Redis
- ✅ Jobs survive Express restart
- ✅ Jobs resume processing after restart
- ✅ Status endpoint works correctly

---

**Next Steps**: See `TEST_REDIS_PERSISTENCE.md` for advanced testing

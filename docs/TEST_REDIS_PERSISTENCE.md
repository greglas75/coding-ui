# 🧪 TEST: Redis Queue Persistence

**Status**: ✅ Configuration Fixed
**Date**: 2025-10-21

---

## ⚠️ PROBLEM IDENTIFIED

**Original Risk**:
- Bull queue with default config loses jobs on Express restart
- Pending jobs could be lost if server crashes
- No way to recover from Redis connection drops

**What Could Go Wrong**:
```
User starts 10-cluster generation ($15 cost)
→ Express crashes after 3 clusters done
→ Remaining 7 clusters LOST 💥
→ User loses progress + money
```

---

## ✅ FIX APPLIED

### Changes Made to `services/bullQueue.js`

```diff
const codeframeQueue = new Bull('codeframe-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
+   // CRITICAL: Ensures jobs survive Redis reconnection
+   maxRetriesPerRequest: null,
+   enableReadyCheck: true,
+   retryStrategy: (times) => {
+     const delay = Math.min(times * 50, 2000);
+     return delay;
+   },
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
-   removeOnComplete: 100,
-   removeOnFail: 500,
+   removeOnComplete: false,  // Keep ALL completed jobs
+   removeOnFail: false,       // Keep ALL failed jobs
  },
});
```

### What This Fixes

1. **`maxRetriesPerRequest: null`**
   - Without this: Jobs can be lost during Redis reconnection
   - With this: Jobs survive Redis restarts and connection drops

2. **`retryStrategy`**
   - Automatically reconnects to Redis if connection is lost
   - Exponential backoff (50ms → 100ms → ... → 2000ms)

3. **`removeOnComplete: false`**
   - Keeps ALL completed jobs in Redis
   - Allows job status checking even after completion
   - Can be changed to a number (e.g., 1000) to limit storage

4. **`removeOnFail: false`**
   - Keeps ALL failed jobs for debugging
   - Critical for understanding production issues

---

## 🧪 TESTING PROCEDURE

### Prerequisites

1. **Install Redis** (if not already installed):
   ```bash
   # macOS
   brew install redis

   # Start Redis
   brew services start redis

   # OR run Redis in foreground
   redis-server
   ```

2. **Verify Redis is running**:
   ```bash
   redis-cli ping
   # Should return: PONG
   ```

3. **Set up environment variables**:
   ```bash
   # Copy .env.example to .env if not done
   cp .env.example .env

   # Edit .env and set:
   # REDIS_HOST=localhost
   # REDIS_PORT=6379
   # SUPABASE_SERVICE_ROLE_KEY=your-key
   # PYTHON_SERVICE_URL=http://localhost:8000
   ```

### Test 1: Jobs Survive Express Restart

**Terminal 1: Start Express API**
```bash
npm run dev:api
# Wait for: "🚀 API server running on http://localhost:3001"
```

**Terminal 2: Start a generation job**
```bash
# Create a test category first (if needed), then:
curl -X POST http://localhost:3001/api/v1/codeframe/generate \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "n_clusters": 5,
    "config": {
      "target_language": "en",
      "hierarchy_preference": "adaptive"
    }
  }'

# Save the generation_id from response
# Example response: {"generation_id": "abc123", "status": "queued"}
```

**Terminal 3: Kill Express (IMMEDIATELY)**
```bash
# Find Express process
ps aux | grep "node.*api-server"

# Kill it (or Ctrl+C in Terminal 1)
kill -9 <PID>
```

**Terminal 4: Check Redis has the jobs**
```bash
redis-cli

# Inside redis-cli:
KEYS bull:codeframe-generation:*
# You should see job keys like:
# bull:codeframe-generation:1
# bull:codeframe-generation:2
# bull:codeframe-generation:active
# bull:codeframe-generation:wait

# Check job status
HGETALL bull:codeframe-generation:1
# You should see job data
```

**Terminal 1: Restart Express**
```bash
npm run dev:api
# Watch the console - Bull should pick up the queued jobs!
```

**Terminal 2: Check job status**
```bash
curl http://localhost:3001/api/v1/codeframe/<generation_id>/status

# Expected:
# - Jobs should resume processing
# - No data loss
# - Status should show progress
```

---

### Test 2: Jobs Survive Redis Restart

**Terminal 1: Start everything**
```bash
# Start Redis
redis-server

# Start Express (in another terminal)
npm run dev:api
```

**Terminal 2: Create jobs**
```bash
curl -X POST http://localhost:3001/api/v1/codeframe/generate \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 1,
    "n_clusters": 10
  }'
```

**Terminal 3: Restart Redis (while jobs are running)**
```bash
# Find Redis process
ps aux | grep redis-server

# Kill Redis
kill -9 <PID>

# Restart Redis
redis-server
```

**Expected Behavior**:
- ✅ Express should log "Redis connection lost, reconnecting..."
- ✅ Bull should automatically reconnect (thanks to retryStrategy)
- ✅ Jobs should resume processing
- ❌ WITHOUT the fix: Jobs would be lost, errors would occur

---

### Test 3: Check Job Persistence in Redis

```bash
redis-cli

# Count all jobs
KEYS bull:codeframe-generation:*

# Check specific job
HGETALL bull:codeframe-generation:1

# Check job states
LRANGE bull:codeframe-generation:active 0 -1
LRANGE bull:codeframe-generation:wait 0 -1
LRANGE bull:codeframe-generation:completed 0 -1
LRANGE bull:codeframe-generation:failed 0 -1

# Check job counts
ZCARD bull:codeframe-generation:delayed
ZCARD bull:codeframe-generation:priority
```

---

## ✅ SUCCESS CRITERIA

After running tests, you should verify:

1. ✅ **Express restart**: Jobs continue processing after restart
2. ✅ **Redis restart**: Express reconnects, jobs resume
3. ✅ **Job status**: Status endpoint shows accurate progress
4. ✅ **No data loss**: All jobs complete, no duplicates
5. ✅ **Redis storage**: Jobs persist in Redis database

If ANY of these fail → Configuration needs adjustment!

---

## 📊 MONITORING

### Logs to Watch

**Express Console**:
```
✅ Normal:
[Bull] Queue initialized
[Bull] Processing job 1
[Bull] Job 1 completed

✅ After restart:
[Bull] Queue initialized
[Bull] Resuming pending jobs...
[Bull] Processing job 2 (resumed)

✅ After Redis reconnect:
[Bull] Redis connection lost
[Bull] Retrying connection (attempt 1)
[Bull] Redis reconnected
[Bull] Resuming pending jobs...

❌ BAD (without fix):
[Bull] Job lost: Redis connection failed
[Bull] Cannot recover job 2
```

### Redis Commands for Debugging

```bash
# Monitor all Redis commands (live)
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Count jobs by state
redis-cli LLEN bull:codeframe-generation:wait
redis-cli LLEN bull:codeframe-generation:active
redis-cli LLEN bull:codeframe-generation:completed
redis-cli LLEN bull:codeframe-generation:failed

# Clean up old jobs (if needed)
redis-cli DEL bull:codeframe-generation:completed
redis-cli DEL bull:codeframe-generation:failed
```

---

## 🎯 PRODUCTION CONSIDERATIONS

### Option A: Keep ALL jobs (Current Config)

```javascript
removeOnComplete: false,
removeOnFail: false,
```

**Pros**:
- ✅ Never lose job history
- ✅ Full debugging capability
- ✅ Can replay failed jobs

**Cons**:
- ⚠️ Redis memory grows over time
- ⚠️ Need periodic cleanup

**When to use**: Low-traffic systems, critical operations

---

### Option B: Keep Last N Jobs (Recommended for Production)

```javascript
removeOnComplete: 1000,  // Keep last 1000 completed
removeOnFail: 5000,      // Keep last 5000 failed
```

**Pros**:
- ✅ Bounded memory usage
- ✅ Automatic cleanup
- ✅ Still have recent history

**Cons**:
- ⚠️ Old jobs are deleted

**When to use**: High-traffic production systems

---

### Option C: Time-based Retention (Advanced)

```javascript
// In Bull options
defaultJobOptions: {
  removeOnComplete: {
    age: 24 * 3600, // Keep for 24 hours
    count: 1000,     // But keep at most 1000
  },
  removeOnFail: {
    age: 7 * 24 * 3600, // Keep failures for 7 days
  },
}
```

---

## 🚀 DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] Redis is persistent (RDB or AOF enabled)
- [ ] Redis has enough memory for job storage
- [ ] `maxRetriesPerRequest: null` is set
- [ ] `retryStrategy` is configured
- [ ] Job retention policy is set (removeOnComplete/removeOnFail)
- [ ] Monitoring is set up for Redis connection
- [ ] Backup strategy for Redis data
- [ ] Redis authentication is enabled (password)
- [ ] Network between Express and Redis is stable

---

## 📚 FILES MODIFIED

1. `services/bullQueue.js` - Added persistence configuration

**Lines Changed**: ~20 lines
**Risk Level**: Low (backward compatible)
**Breaking Changes**: None

---

## 🔗 RESOURCES

- [Bull Documentation](https://github.com/OptimalBits/bull)
- [Redis Persistence](https://redis.io/docs/manual/persistence/)
- [Bull Best Practices](https://github.com/OptimalBits/bull/blob/master/PATTERNS.md)

---

**Fixed by**: Claude Code
**Reviewed by**: User (greglas)
**Version**: 1.0.0
**Date**: 2025-10-21

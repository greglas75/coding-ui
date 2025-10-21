# 🛡️ Claude API Protection Mechanisms - Test Guide

## ✅ IMPLEMENTED PROTECTIONS

### 1. Express Rate Limiting (Layer 1)
**Location**: `routes/codeframe.js`
```javascript
generationRateLimiter = {
  windowMs: 60 * 1000,  // 1 minute
  max: 5,               // Max 5 generations per minute
}
```

### 2. Python Rate Limiting (Layer 2)  
**Location**: `python-service/services/claude_client.py`
```python
class ClaudeConfig:
    rate_limit_calls: int = 10      # Max 10 API calls
    rate_limit_window: int = 60     # Per 60 seconds
```

**Implementation**: Thread-safe sliding window algorithm

### 3. Circuit Breaker (Layer 3)
```python
circuit_breaker_fail_threshold: int = 5    # Open after 5 failures
circuit_breaker_timeout: int = 60          # Block for 60 seconds
```

**Behavior**:
- CLOSED (normal) → allows all requests
- OPEN (failure) → blocks all requests for 60s
- HALF-OPEN (recovery) → tries 1 request to test

### 4. Retry Logic (Layer 4)
```python
@retry(
    retry=retry_if_exception_type((RateLimitError, APIConnectionError)),
    wait=wait_exponential(multiplier=1, min=2, max=30),
    stop=stop_after_attempt(3)
)
```

**Backoff**: 2s → 4s → 8s (exponential)

### 5. Cost Protection (Layer 5)
```python
max_cost_per_generation_usd: float = 5.0
```

**Aborts** if single generation exceeds $5.00

---

## 🧪 HOW TO TEST

### Test 1: Rate Limiting

```bash
cd python-service

# Create test script
python3 << 'PYTEST'
import time
from services.claude_client import RateLimiter

limiter = RateLimiter(max_calls=3, time_window=10)

print("Testing 3 calls/10s limit:")
for i in range(5):
    if limiter.acquire():
        print(f"✅ Call {i+1} allowed")
    else:
        wait = limiter.wait_time()
        print(f"❌ Call {i+1} BLOCKED - wait {wait:.1f}s")
PYTEST
```

**Expected**:
```
✅ Call 1 allowed
✅ Call 2 allowed
✅ Call 3 allowed
❌ Call 4 BLOCKED - wait 10.0s
❌ Call 5 BLOCKED - wait 10.0s
```

### Test 2: End-to-End (3 Generations)

```bash
# Terminal 1: Start Python service
cd python-service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Monitor logs
tail -f <logs>

# Terminal 3: Trigger 3 generations rapidly
curl -X POST http://localhost:3001/api/v1/codeframe/generate \
  -H "Content-Type: application/json" \
  -d '{"category_id": 1, "algorithm_config": {}}'

# Wait 1 second, repeat 2 more times
```

**Expected Behavior**:
1. **Request 1-5**: ✅ Accepted (Express allows 5/min)
2. **Request 6+**: ❌ HTTP 429 "Too many requests"

In Python logs:
```
INFO: Generating codeframe...
WARNING: Rate limit: 9/10 calls used
WARNING: Rate limit: 10/10 calls used
ERROR: Rate limit exceeded! Must wait 52.3s
```

### Test 3: Cost Protection

Modify config temporarily:
```python
# In claude_client.py __init__
config = ClaudeConfig(
    max_cost_per_generation_usd=0.01  # Very low for testing
)
```

Try generation → Should abort with:
```
ERROR: COST LIMIT EXCEEDED! $1.45 > $0.01
RuntimeError: Cost limit exceeded
```

---

## 💰 COST ESTIMATES

### Claude Sonnet 4.5 Pricing
- Input: **$3** per 1M tokens
- Output: **$15** per 1M tokens

### Typical Generation Costs

| Scenario | Input Tokens | Output Tokens | Cost |
|----------|-------------|---------------|------|
| 1 cluster (50 responses) | ~2,500 | ~1,500 | **$0.03** |
| 10 clusters | ~25,000 | ~15,000 | **$0.30** |
| 100 clusters | ~250,000 | ~150,000 | **$3.00** |

### Safety Limits

| Protection | Limit | Prevents |
|------------|-------|----------|
| Express rate limit | 5/min | User spam |
| Python rate limit | 10 calls/min | API abuse |
| Cost limit | $5/generation | Runaway costs |
| Circuit breaker | 5 failures | Cascade failures |

**Example Attack Scenario**:
```
User tries to spam 100 generations:
├─ Express: Blocks after 5 requests (5 allowed)
├─ Python: Processes max 10 API calls/min
└─ Cost: Max $5 per generation × 10 = $50/min

Without protection: 100 × $3 = $300 (disaster!)
With protection: $50/min maximum (contained)
```

---

## 📊 MONITORING

### Logs to Watch

```bash
# Python service
grep "Rate limit" logs/python-service.log
grep "COST LIMIT" logs/python-service.log
grep "Circuit breaker" logs/python-service.log

# Express
grep "Too many" logs/express.log
grep "generation" logs/express.log | grep "429"
```

### Metrics to Track

1. **API Calls per minute**: Should never exceed 10
2. **Average cost per generation**: Should be ~$0.30 for 10 clusters
3. **Rate limit hits**: Should be rare (only during abuse)
4. **Circuit breaker opens**: Should be 0 (indicates API issues)

---

## ⚙️ CONFIGURATION

### Adjust Limits (if needed)

```python
# python-service/services/claude_client.py

@dataclass
class ClaudeConfig:
    # RATE LIMITING
    rate_limit_calls: int = 10        # ← Increase to 20 for high traffic
    rate_limit_window: int = 60
    
    # COST PROTECTION
    max_cost_per_generation_usd: float = 5.0  # ← Increase if large categories
    
    # CIRCUIT BREAKER
    circuit_breaker_fail_threshold: int = 5   # ← Decrease to 3 for faster response
    circuit_breaker_timeout: int = 60         # ← Increase to 120 for stability
```

### Production Recommendations

```python
# For production with moderate traffic:
ClaudeConfig(
    rate_limit_calls=20,              # Higher limit
    rate_limit_window=60,
    max_cost_per_generation_usd=10.0, # Handle large categories
    circuit_breaker_fail_threshold=3, # Fail faster
    circuit_breaker_timeout=120       # Longer recovery
)
```

---

## 🚨 TROUBLESHOOTING

### Issue: "Rate limit exceeded" errors

**Symptom**: Users getting blocked unexpectedly

**Fix**:
```python
# Increase limits
rate_limit_calls: int = 20  # Was 10
```

### Issue: Circuit breaker keeps opening

**Symptom**: All requests blocked intermittently

**Diagnosis**:
```bash
grep "Circuit breaker OPEN" logs/*.log
```

**Possible causes**:
1. Claude API is down → Wait it out
2. Network issues → Check connectivity
3. Invalid API key → Verify ANTHROPIC_API_KEY

**Fix**: Increase timeout or lower fail threshold

### Issue: Cost limit triggered for normal use

**Symptom**: Valid generations being aborted

**Fix**:
```python
max_cost_per_generation_usd: float = 10.0  # Was 5.0
```

---

## ✅ DEPLOYMENT CHECKLIST

Before deploying to production:

- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Set `ANTHROPIC_API_KEY` in environment
- [ ] Test rate limiting with script above
- [ ] Test 3 rapid generations end-to-end
- [ ] Monitor logs for first 24 hours
- [ ] Adjust limits based on actual usage
- [ ] Set up cost alerts in Anthropic dashboard
- [ ] Document any custom configuration changes

---

## 📈 SUCCESS METRICS

After deployment, verify:

1. **0 circuit breaker opens** (stable API)
2. **< 5 rate limit hits per day** (normal traffic)
3. **Average cost < $1 per generation** (typical 10 clusters)
4. **No cost limit aborts** (limits set appropriately)

If these metrics hold, protections are working correctly!

---

**Last Updated**: 2025-10-21  
**Version**: 1.0.0  
**Status**: ✅ PRODUCTION READY

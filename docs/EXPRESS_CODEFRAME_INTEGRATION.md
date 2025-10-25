# Express.js Codeframe Integration

## Overview

Express.js API endpoints for AI Codeframe Builder, integrating with the Python microservice and managing background job processing with Bull queue.

## Architecture

```
┌─────────────────┐
│ React Frontend  │
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────────────────────┐
│  Express.js Backend (api-server.js)│
│  Port: 3001                      │
├─────────────────────────────────┤
│  Routes: /api/v1/codeframe/*    │
│  • POST /generate               │
│  • GET /:id/status              │
│  • GET /:id/hierarchy           │
│  • PATCH /:id/hierarchy         │
│  • POST /:id/apply              │
└────────┬───────────┬────────────┘
         │           │
         │           ↓
         │    ┌─────────────┐
         │    │   Redis     │
         │    │  Bull Queue │
         │    └─────────────┘
         ↓
┌───────────────────┐
│ Python Service    │
│ Port: 8000        │
└───────────────────┘
         ↓
┌───────────────────┐
│ Claude Sonnet 4.5 │
└───────────────────┘
```

## Files Created

### 1. **services/bullQueue.js**
Bull queue configuration for background job processing.

**Key Features:**
- Processes cluster codeframe generation jobs
- Retry logic (3 attempts with exponential backoff)
- Job progress tracking
- Error handling and logging
- Saves results to Supabase

**Queue Configuration:**
- Redis connection
- Job retry: 3 attempts, exponential backoff
- Keeps last 100 completed jobs
- Keeps last 500 failed jobs

### 2. **services/codeframeService.js**
Business logic for codeframe generation.

**Key Methods:**
- `startGeneration()` - Start async codeframe generation
- `getStatus()` - Check generation progress
- `getHierarchy()` - Get hierarchical tree structure
- `updateHierarchy()` - Rename, merge, move, delete nodes
- `applyCodeframe()` - Assign codes to answers
- `ensureEmbeddings()` - Cache embeddings for performance

**Features:**
- Embedding caching (SHA256 hash for invalidation)
- Cluster-based processing
- MECE validation
- Hierarchical code management

### 3. **routes/codeframe.js**
API endpoint definitions.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/codeframe/generate` | Start generation (async, returns 202) |
| GET | `/api/v1/codeframe/:id/status` | Check status & progress |
| GET | `/api/v1/codeframe/:id/hierarchy` | Get full hierarchy tree |
| PATCH | `/api/v1/codeframe/:id/hierarchy` | Update hierarchy (merge/rename/etc) |
| POST | `/api/v1/codeframe/:id/apply` | Apply codes to answers |
| DELETE | `/api/v1/codeframe/:id` | Delete generation |
| GET | `/api/v1/codeframe/category/:id/generations` | List all generations |
| GET | `/api/v1/codeframe/health` | Health check |

**Rate Limiting:**
- Generation: 5 req/min
- Other endpoints: 30 req/min

**Middlewares:**
- Feature flag check
- Python service health check
- Request validation (Zod schemas)

### 4. **utils/codeframeHelpers.js**
Helper utilities and validation schemas.

**Zod Schemas:**
- `generateCodeframeSchema` - Validate generation requests
- `updateHierarchySchema` - Validate hierarchy updates
- `applyCodeframeSchema` - Validate apply requests

**Helper Functions:**
- `validateRequest()` - Validate with Zod, return 400 on error
- `checkPythonServiceHealth()` - Ping Python service
- `estimateGenerationCost()` - Calculate Claude API cost
- `formatHierarchyTree()` - Build tree from flat nodes
- `formatErrorResponse()` - Standardized error responses

## API Usage Examples

### 1. Start Generation

```bash
curl -X POST http://localhost:3001/api/v1/codeframe/generate \
  -H "Content-Type: application/json" \
  -d '{
    "category_id": 123,
    "algorithm_config": {
      "min_cluster_size": 5,
      "hierarchy_preference": "adaptive"
    },
    "target_language": "en"
  }'
```

**Response (202 Accepted):**
```json
{
  "generation_id": "uuid",
  "status": "processing",
  "n_clusters": 8,
  "n_answers": 250,
  "estimated_time_seconds": 40,
  "poll_url": "/api/v1/codeframe/{uuid}/status",
  "cost_estimate": {
    "n_clusters": 8,
    "estimated_cost_usd": 0.18
  }
}
```

### 2. Check Status

```bash
curl http://localhost:3001/api/v1/codeframe/{uuid}/status
```

**Response:**
```json
{
  "generation_id": "uuid",
  "status": "completed",
  "progress": 100,
  "n_clusters": 8,
  "n_completed": 8,
  "n_failed": 0,
  "processing_time_ms": 45000,
  "result": {
    "n_themes": 8,
    "n_codes": 35,
    "mece_score": 87.5,
    "total_cost_usd": 0.18
  }
}
```

### 3. Get Hierarchy

```bash
curl http://localhost:3001/api/v1/codeframe/{uuid}/hierarchy
```

**Response:**
```json
{
  "generation_id": "uuid",
  "hierarchy": [
    {
      "id": "node-1",
      "name": "Athletic Sportswear",
      "level": 1,
      "node_type": "theme",
      "children": [
        {
          "id": "node-2",
          "name": "Nike",
          "level": 2,
          "node_type": "code",
          "cluster_size": 87,
          "confidence": "high",
          "children": []
        }
      ]
    }
  ]
}
```

### 4. Update Hierarchy (Rename)

```bash
curl -X PATCH http://localhost:3001/api/v1/codeframe/{uuid}/hierarchy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "rename",
    "node_id": "node-2",
    "new_name": "Nike (All)"
  }'
```

### 5. Merge Nodes

```bash
curl -X PATCH http://localhost:3001/api/v1/codeframe/{uuid}/hierarchy \
  -H "Content-Type: application/json" \
  -d '{
    "action": "merge",
    "node_ids": ["node-2", "node-3"],
    "target_name": "Nike & Jordan"
  }'
```

### 6. Apply Codeframe

```bash
curl -X POST http://localhost:3001/api/v1/codeframe/{uuid}/apply \
  -H "Content-Type: application/json" \
  -d '{
    "auto_confirm_threshold": 0.9,
    "overwrite_existing": false
  }'
```

## Environment Variables

Add to `.env`:

```bash
# Python microservice URL
PYTHON_SERVICE_URL=http://localhost:8000

# Redis for Bull queue
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Supabase service role key (bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Feature flag
ENABLE_CODEFRAME_FEATURE=true
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

**New dependencies added:**
- `bull@^4.12.0` - Background job processing
- `axios@^1.6.5` - HTTP client for Python service
- `ioredis@^5.3.2` - Redis client

### 2. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using Homebrew (macOS)
brew install redis
redis-server
```

### 3. Start Python Service

```bash
cd python-service
uvicorn main:app --reload --port 8000
```

### 4. Start Express Server

```bash
npm run dev:api
```

### 5. Verify Setup

```bash
# Check Express health
curl http://localhost:3001/api/health

# Check codeframe health
curl http://localhost:3001/api/v1/codeframe/health
```

Expected response:
```json
{
  "status": "healthy",
  "feature_enabled": true,
  "python_service": "healthy",
  "python_service_url": "http://localhost:8000"
}
```

## Testing

### Run Tests

```bash
npm test tests/codeframe.test.js
```

### Test Coverage

Tests cover:
- ✅ All API endpoints
- ✅ Request validation
- ✅ Error handling
- ✅ Helper functions
- ✅ Hierarchy tree building

### Manual Testing Flow

1. **Start generation:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/codeframe/generate \
     -H "Content-Type: application/json" \
     -d '{"category_id": 1}'
   ```

2. **Poll status** (every 2-3 seconds):
   ```bash
   curl http://localhost:3001/api/v1/codeframe/{uuid}/status
   ```

3. **When complete, get hierarchy:**
   ```bash
   curl http://localhost:3001/api/v1/codeframe/{uuid}/hierarchy
   ```

4. **Edit hierarchy** (optional):
   ```bash
   curl -X PATCH http://localhost:3001/api/v1/codeframe/{uuid}/hierarchy \
     -d '{"action": "rename", "node_id": "...", "new_name": "New Name"}'
   ```

5. **Apply to answers:**
   ```bash
   curl -X POST http://localhost:3001/api/v1/codeframe/{uuid}/apply
   ```

## Error Handling

All endpoints return standardized error responses:

```json
{
  "error": "Error message",
  "status": "error",
  "validation_errors": [...]  // If validation failed
}
```

**HTTP Status Codes:**
- `200` - Success
- `202` - Accepted (async operation started)
- `400` - Bad request (validation failed)
- `404` - Not found
- `429` - Rate limit exceeded
- `500` - Internal server error
- `503` - Service unavailable (Python service down)

## Bull Queue Monitoring

### View Jobs in Redis

```bash
redis-cli
> KEYS bull:codeframe-generation:*
```

### Bull Board (Optional)

Install Bull Board for UI:

```bash
npm install @bull-board/express
```

Add to `api-server.js`:

```javascript
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
createBullBoard({
  queues: [new BullAdapter(codeframeQueue)],
  serverAdapter,
});

app.use('/admin/queues', serverAdapter.getRouter());
```

Visit: `http://localhost:3001/admin/queues`

## Performance Considerations

### Timeouts

- Python service calls: 2 minutes
- Embedding generation: 1 minute
- Status check: Standard (30s)

### Caching

- Answer embeddings cached in `answer_embeddings` table
- Cache invalidation: SHA256 hash of text
- Reuse cached embeddings for repeated generations

### Rate Limits

**Generation endpoint:**
- 5 requests per minute per IP
- Prevents abuse of expensive Claude API

**Other endpoints:**
- 30 requests per minute per IP

## Troubleshooting

### Python Service Unavailable

**Error:**
```json
{
  "error": "AI Codeframe service is temporarily unavailable",
  "status": "service_unavailable"
}
```

**Solutions:**
1. Check Python service is running: `curl http://localhost:8000/health`
2. Check PYTHON_SERVICE_URL in `.env`
3. Review Python service logs

### Redis Connection Failed

**Error:**
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solutions:**
1. Start Redis: `redis-server`
2. Check REDIS_HOST/REDIS_PORT in `.env`
3. Verify Redis is running: `redis-cli ping` (should return PONG)

### Jobs Not Processing

**Symptoms:**
- Status stuck at "processing"
- No progress updates

**Solutions:**
1. Check Bull queue logs in console
2. Verify Redis is running
3. Check Python service availability
4. Review job failure logs: `redis-cli KEYS bull:codeframe-generation:failed`

### Supabase RLS Errors

**Error:**
```
new row violates row-level security policy
```

**Solutions:**
1. Use SUPABASE_SERVICE_ROLE_KEY (not anon key)
2. Verify RLS policies are set up correctly
3. Check user owns the category

## Production Deployment

### Environment Setup

```bash
# Required
PYTHON_SERVICE_URL=https://your-python-service.com
REDIS_HOST=your-redis-host
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENABLE_CODEFRAME_FEATURE=true

# Optional
NODE_ENV=production
```

### Scaling Considerations

**Horizontal Scaling:**
- Multiple Express instances can share same Redis queue
- Bull handles job distribution automatically
- Use Redis cluster for high availability

**Vertical Scaling:**
- Increase Bull concurrency for faster processing
- Add more Python service instances behind load balancer

### Monitoring

**Metrics to track:**
- Generation success rate
- Average processing time
- Queue depth
- Python service health
- Claude API costs

**Logging:**
- All requests logged with request ID
- Job start/complete/fail logged
- Errors logged with stack traces (dev only)

## Cost Management

### Tracking Costs

All generations store:
- `ai_input_tokens`
- `ai_output_tokens`
- `ai_cost_usd`

Query total costs:

```sql
SELECT
  DATE(created_at) as date,
  SUM(ai_cost_usd) as total_cost,
  COUNT(*) as num_generations
FROM codeframe_generations
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Cost Optimization

1. **Cache embeddings** - Reuse for repeat generations
2. **Cluster efficiently** - Reduce number of Claude API calls
3. **Set minimums** - Require min 50 answers before generation
4. **Rate limiting** - Prevent excessive usage

## Security

### Authentication

Currently uses session-based auth from existing Express setup.

**TODO:** Add explicit auth middleware to codeframe routes.

### Authorization

- Users can only access their own categories' generations
- RLS policies enforce ownership at database level
- Service role key used for backend operations

### Input Validation

All inputs validated with Zod schemas:
- Type checking
- Range validation
- Required fields
- Sanitization

### Rate Limiting

Prevents abuse:
- Generation: 5/min
- Other endpoints: 30/min
- Global: 100/min (prod) or 300/min (dev)

## Next Steps

1. **Frontend Integration** - Build React UI for codeframe editor
2. **Webhooks** - Add webhook notifications for completion
3. **Streaming** - Stream progress updates via WebSocket
4. **Analytics** - Dashboard for generation metrics
5. **Export** - Export codeframe to Excel/CSV

## Support

**Issues:**
- Check logs: `console.log` output from Express
- Check Bull jobs: Bull Board UI
- Check Python service: `python-service/` logs

**Contact:**
- Review this documentation
- Check inline code comments
- Refer to test files for examples

---

**Version:** 1.0.0
**Last Updated:** 2025-01-01
**Maintainer:** TGM Research Development Team

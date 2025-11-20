# Redis Caching Setup

## 🎯 Benefits

- **60-80% Cost Reduction** - Cached validations avoid Claude API calls
- **95% Faster** - 50ms vs 2-5 seconds for cached brands
- **Consistent Results** - Same brand always gets same validation

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
cd python-service
docker-compose up -d redis
```

Verify Redis is running:
```bash
docker-compose ps
docker-compose logs redis
```

### Option 2: Local Redis Installation

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Windows (WSL):**
```bash
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list
sudo apt-get update
sudo apt-get install redis
sudo service redis-server start
```

## 📦 Install Python Dependencies

```bash
cd python-service
pip install -r requirements.txt
```

This installs `redis==5.0.1`

## ⚙️ Configuration

Set environment variables (optional):

```bash
export REDIS_HOST=localhost
export REDIS_PORT=6379
```

Defaults:
- Host: `localhost`
- Port: `6379`
- DB: `0`
- TTL: `30 days` (2,592,000 seconds)

## 🧪 Test Redis Connection

```python
from redis_cache import RedisCache

cache = RedisCache()
print(cache.get_stats())
# Output: {'enabled': True, 'total_entries': 0, 'host': 'localhost', 'port': 6379}
```

## 📊 Cache Statistics

Check cache stats via API endpoint (if implemented):
```bash
curl http://localhost:8000/api/cache/stats
```

Or use Redis CLI:
```bash
redis-cli
> KEYS validation:*
> DBSIZE
> INFO memory
```

## 🗑️ Clear Cache

Clear all cached validations:
```python
from redis_cache import RedisCache

cache = RedisCache()
cache.clear_all()
```

Or use Redis CLI:
```bash
redis-cli FLUSHDB
```

## 🔧 Advanced Configuration

Edit `docker-compose.yml` to customize:
- Memory limit (default: 256MB)
- Eviction policy (default: allkeys-lru)
- Persistence (default: appendonly)

## 🐛 Troubleshooting

**Cache not working:**
- Check Redis is running: `docker-compose ps` or `redis-cli ping`
- Check logs: `docker-compose logs redis`
- Verify Python can connect: `python -c "import redis; redis.Redis().ping()"`

**Memory issues:**
- Increase `maxmemory` in docker-compose.yml
- Check memory usage: `redis-cli INFO memory`
- Clear old entries: `redis-cli FLUSHDB`

## 📈 Expected Impact

**Before Redis:**
- 1000 validations/month
- $0.02 per validation (Claude API)
- **Total: $20/month**

**After Redis (60% cache hit rate):**
- 600 cached (free)
- 400 API calls ($0.02 each)
- **Total: $8/month**
- **Savings: $12/month (60%)**

Higher cache hit rates = even more savings!

## 🔐 Production Considerations

1. **Redis Password**: Set `requirepass` in redis.conf
2. **SSL/TLS**: Use `rediss://` connection string
3. **Monitoring**: Set up Redis monitoring (RedisInsight, Datadog)
4. **Backups**: Configure RDB snapshots or AOF
5. **Scaling**: Use Redis Cluster for high traffic

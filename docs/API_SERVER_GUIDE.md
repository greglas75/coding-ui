# 🔌 API Server Guide

Complete guide for the Express API server that powers GPT testing and advanced filtering.

---

## 📖 Overview

The API server (`api-server.js`) provides backend endpoints for:
- 🧪 **GPT Template Testing** - Test categorization prompts with OpenAI
- 🔍 **Advanced Filtering** - Server-side answer filtering
- 💚 **Health Checks** - Monitor server status

---

## 🚀 Quick Start

### Start the Server

```bash
# Development
node api-server.js

# Or with npm script (if configured)
npm run server

# With environment variables
OPENAI_API_KEY=sk-your-key node api-server.js
```

### Verify It's Running

```bash
# Check health endpoint
curl http://localhost:3001/api/health

# Expected response:
{
  "status": "OK",
  "timestamp": "2025-10-07T12:00:00.000Z",
  "supabaseConfigured": true
}
```

---

## ⚙️ Configuration

### Environment Variables

Create `.env` file in project root:

```env
# Required for Supabase features
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here

# Required for real GPT testing (optional for demo mode)
OPENAI_API_KEY=sk-your-openai-key-here

# Optional: Custom port
PORT=3001
```

### Load Environment Variables

```bash
# Option 1: Use dotenv
npm install dotenv
node -r dotenv/config api-server.js

# Option 2: Export manually
export OPENAI_API_KEY=sk-your-key
export VITE_SUPABASE_URL=https://...
node api-server.js
```

---

## 📡 API Endpoints

### 1️⃣ **POST /api/gpt-test** - Test GPT Templates

Test categorization prompts with OpenAI.

#### Request:
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a brand expert..."
    },
    {
      "role": "user",
      "content": "Nike shoes are great"
    }
  ],
  "max_completion_tokens": 500,
  "temperature": 0,
  "top_p": 0.1
}
```

#### Response (Success):
```json
{
  "id": "chatcmpl-ABC123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o-mini",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "{\"brand\": \"Nike\", \"confidence\": 0.95}"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 12,
    "total_tokens": 57
  }
}
```

#### Response (Error):
```json
{
  "error": "Invalid API key",
  "type": "AuthenticationError",
  "timeMs": 150
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:3001/api/gpt-test \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o-mini",
    "messages": [
      {"role": "system", "content": "You are a helpful assistant."},
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

---

### 2️⃣ **POST /api/answers/filter** - Filter Answers

Advanced server-side filtering with Supabase.

#### Request:
```json
{
  "search": "Nike",
  "types": ["whitelist", "categorized"],
  "status": "Confirmed",
  "codes": ["Nike", "Adidas"],
  "language": "en",
  "country": "Poland",
  "categoryId": 1
}
```

#### Response:
```json
{
  "success": true,
  "count": 42,
  "results": [
    {
      "id": 123,
      "answer_text": "Nike shoes",
      "general_status": "whitelist",
      "selected_code": "Nike",
      ...
    }
  ],
  "mode": "supabase"
}
```

#### cURL Example:
```bash
curl -X POST http://localhost:3001/api/answers/filter \
  -H "Content-Type: application/json" \
  -d '{
    "categoryId": 1,
    "types": ["whitelist"],
    "search": "Nike"
  }'
```

---

### 3️⃣ **GET /api/health** - Health Check

Monitor server status.

#### Response:
```json
{
  "status": "OK",
  "timestamp": "2025-10-07T12:00:00.000Z",
  "supabaseConfigured": true
}
```

#### cURL Example:
```bash
curl http://localhost:3001/api/health
```

---

## 🎨 Demo Mode vs Production Mode

### Demo Mode (No API Key)

**When:** `OPENAI_API_KEY` is not set or equals `'demo-key'`

**Behavior:**
- Returns mock GPT responses
- Simulates 800ms API delay
- Shows demo content in response
- No OpenAI API calls made
- **Cost:** $0

**Use For:**
- Development without API key
- UI testing
- Demo purposes
- Avoiding API costs during development

---

### Production Mode (With API Key)

**When:** Valid `OPENAI_API_KEY` is set

**Behavior:**
- Calls actual OpenAI API
- Real GPT responses
- Actual token usage
- Real latency measurements
- **Cost:** Based on token usage

**Use For:**
- Production deployment
- Real template testing
- Accurate response validation
- Final quality checks

---

## 📊 Logging

### Console Output Examples

#### GPT Test Request:
```
🧪 [GPT Test] Request: {
  model: 'gpt-4o-mini',
  messageCount: 2,
  maxTokens: 500,
  temperature: 0,
  topP: 0.1
}
```

#### GPT Test Success:
```
✅ [GPT Test] Success: {
  model: 'gpt-4o-mini',
  finishReason: 'stop',
  promptTokens: 45,
  completionTokens: 12,
  totalTokens: 57,
  timeMs: 850
}
```

#### GPT Test Error:
```
❌ [GPT Test] Failed after 150ms: {
  error: 'Incorrect API key provided',
  type: 'AuthenticationError',
  stack: 'Error: Incorrect API key...'
}
```

---

## 🔒 Security

### CORS Configuration

```javascript
// Current: Allow all origins (development)
app.use(cors());

// Production: Restrict origins
app.use(cors({
  origin: ['https://yourdomain.com', 'https://app.yourdomain.com'],
  credentials: true
}));
```

### API Key Protection

```javascript
// ✅ GOOD - Server-side only
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ❌ BAD - Never in frontend
const apiKey = "sk-...";  // DON'T DO THIS
```

### Rate Limiting (Recommended)

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## 🧪 Testing the Server

### Test GPT Endpoint

```javascript
// test-gpt.js
const response = await fetch('http://localhost:3001/api/gpt-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are helpful.' },
      { role: 'user', content: 'Hello!' }
    ]
  })
});

const data = await response.json();
console.log(data);
```

### Test Filter Endpoint

```javascript
// test-filter.js
const response = await fetch('http://localhost:3001/api/answers/filter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    categoryId: 1,
    types: ['whitelist'],
    search: 'Nike'
  })
});

const data = await response.json();
console.log(`Found ${data.count} results`);
```

---

## 🐛 Troubleshooting

### Server Won't Start

**Problem:** Port already in use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 node api-server.js
```

---

### OpenAI API Errors

**Problem:** Authentication failed

**Solution:**
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Should start with 'sk-'
# If not set:
export OPENAI_API_KEY=sk-your-key-here

# Restart server
node api-server.js
```

---

### CORS Errors

**Problem:** Frontend can't connect

**Solution:**
```javascript
// In api-server.js
app.use(cors({
  origin: 'http://localhost:5173',  // Your Vite dev server
  credentials: true
}));
```

---

### Supabase Connection Issues

**Problem:** Filter endpoint returns errors

**Solution:**
```bash
# Check environment variables
echo $VITE_SUPABASE_URL
echo $VITE_SUPABASE_ANON_KEY

# Verify in Supabase dashboard:
# Settings → API → Project URL and anon key
```

---

## 📈 Monitoring

### Log Analysis

```bash
# Watch logs in real-time
node api-server.js | grep "GPT Test"

# Count successful requests
node api-server.js | grep "✅" | wc -l

# Count errors
node api-server.js | grep "❌" | wc -l
```

### Performance Metrics

Track these in production:
- Average response time
- Total token usage
- Error rate
- Most used models

---

## 🚀 Production Deployment

### Using PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start server
pm2 start api-server.js --name "tgm-api"

# View logs
pm2 logs tgm-api

# Restart
pm2 restart tgm-api

# Stop
pm2 stop tgm-api

# Auto-start on reboot
pm2 startup
pm2 save
```

---

### Using Docker

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY api-server.js ./

EXPOSE 3001

CMD ["node", "api-server.js"]
```

```bash
# Build
docker build -t tgm-api .

# Run
docker run -p 3001:3001 \
  -e OPENAI_API_KEY=sk-your-key \
  -e VITE_SUPABASE_URL=https://... \
  tgm-api
```

---

### Using Systemd (Linux)

```ini
# /etc/systemd/system/tgm-api.service
[Unit]
Description=TGM API Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/tgm-coding-ui
ExecStart=/usr/bin/node api-server.js
Restart=always
Environment="OPENAI_API_KEY=sk-your-key"
Environment="VITE_SUPABASE_URL=https://..."

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable tgm-api
sudo systemctl start tgm-api

# Check status
sudo systemctl status tgm-api

# View logs
sudo journalctl -u tgm-api -f
```

---

## 📚 API Reference

### Dependencies

```json
{
  "express": "^4.18.0",
  "cors": "^2.8.5",
  "openai": "^4.20.0",
  "@supabase/supabase-js": "^2.38.0"
}
```

### Install

```bash
npm install express cors openai @supabase/supabase-js
```

---

## 🎯 Example Integration

### From React Component

```tsx
// Test GPT prompt
async function testPrompt(template: string, model: string, message: string) {
  const response = await fetch('http://localhost:3001/api/gpt-test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: template },
        { role: 'user', content: message }
      ],
      max_completion_tokens: 500,
      temperature: 0,
      top_p: 0.1
    })
  });

  const data = await response.json();
  
  if (response.ok) {
    console.log('Success:', data.choices[0].message.content);
    console.log('Tokens:', data.usage.total_tokens);
  } else {
    console.error('Error:', data.error);
  }
}
```

---

## 🎉 Summary

### ✅ Features

✅ **GPT Testing** - Real OpenAI API integration  
✅ **Demo Mode** - Works without API key  
✅ **Advanced Filtering** - Supabase integration  
✅ **Health Checks** - Monitor status  
✅ **Detailed Logging** - Track requests/responses  
✅ **Error Handling** - Clear error messages  
✅ **CORS Support** - Frontend integration  

### 🎯 Benefits

- Fast template testing
- No frontend API key exposure
- Detailed performance metrics
- Easy to deploy
- Production-ready

---

**API Server ready to use!** 🚀

---

## 📞 Support

### Common Issues

1. **Port in use** → Change port or kill process
2. **API key invalid** → Check OpenAI dashboard
3. **CORS error** → Add frontend origin to CORS config
4. **Supabase error** → Verify environment variables

### Logs Location

```bash
# stdout/stderr
node api-server.js > api.log 2>&1

# PM2 logs
pm2 logs tgm-api

# Systemd logs
journalctl -u tgm-api
```

---

**Happy coding!** ✨


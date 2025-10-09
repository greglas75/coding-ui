# 🧪 GPT Template Testing Guide

Complete guide for testing GPT categorization templates in-app.

---

## 📖 Overview

The GPT Template Testing feature allows you to test your categorization prompts directly from the Edit Category modal, with real-time feedback on responses, latency, and token usage.

---

## 🎯 How It Works

### Workflow

```
┌─────────────────────────────────────────┐
│ 1. Edit Category Settings               │
│    └─ Enter/Edit GPT Template           │
├─────────────────────────────────────────┤
│ 2. Click "🧪 Test Prompt"               │
│    └─ Opens TestPromptModal             │
├─────────────────────────────────────────┤
│ 3. Enter Test Message                   │
│    └─ e.g., "Nike shoes are great"      │
├─────────────────────────────────────────┤
│ 4. Click "Run Test" (or press Enter)    │
│    └─ Sends request to backend          │
├─────────────────────────────────────────┤
│ 5. Backend calls OpenAI API             │
│    └─ Uses your template + test message │
├─────────────────────────────────────────┤
│ 6. Display Results                      │
│    ├─ Request tab: Shows JSON sent      │
│    ├─ Response tab: Shows GPT response  │
│    └─ Stats: Time + Token usage         │
└─────────────────────────────────────────┘
```

---

## 🧩 Components

### 1️⃣ **TestPromptModal.tsx**

Main testing interface component.

#### Props:
```tsx
interface TestPromptModalProps {
  open: boolean;         // Control visibility
  onClose: () => void;   // Close handler
  template: string;      // GPT system prompt
  model: string;         // AI model (e.g., 'gpt-4o')
}
```

#### Features:
- ✅ Read-only template display
- ✅ Editable test message input
- ✅ Language and Country fields
- ✅ Request/Response tabs
- ✅ JSON syntax highlighting
- ✅ Performance metrics (time, tokens)
- ✅ Loading indicator
- ✅ Error handling
- ✅ ESC key to close
- ✅ Enter key to run test

---

### 2️⃣ **Backend Endpoint** (`/api/gpt-test`)

Located in `/api-server.js`

#### Request Format:
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a brand categorization expert..."
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

#### Response Format:
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1234567890,
  "model": "gpt-4o-mini",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "{ \"brand\": \"Nike\", \"confidence\": 0.95 }"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 25,
    "total_tokens": 75
  }
}
```

---

## 📱 UI Components

### TestPromptModal Layout

```
┌────────────────────────────────────────────┐
│ 🧪 GPT Template Testing         Model: ... │  ← Header
│                                      [✕]   │
├────────────────────────────────────────────┤
│ GPT Template:                              │  ← Read-only
│ ┌────────────────────────────────────────┐ │
│ │ You are a brand expert...              │ │
│ │ ...                                    │ │
│ └────────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│ Language: [English] | Country: [Poland ▾] │  ← Config
├────────────────────────────────────────────┤
│ User's message: [Nike shoes...] [▶ Run]   │  ← Input
├────────────────────────────────────────────┤
│ [Request] [Response]                       │  ← Tabs
├────────────────────────────────────────────┤
│ ┌────────────────────────────────────────┐ │
│ │ {                                      │ │  ← JSON
│ │   "model": "gpt-4o",                   │ │
│ │   "messages": [...]                    │ │
│ │ }                                      │ │
│ └────────────────────────────────────────┘ │
├────────────────────────────────────────────┤
│ Time: 1.2s  Tokens: 75  ✓ Success         │  ← Stats
└────────────────────────────────────────────┘
```

---

## 🚀 Usage

### From Edit Category Modal

```tsx
// 1. Open Edit Category Settings
<button onClick={() => openEditModal(category)}>
  Edit Settings
</button>

// 2. In modal, find "GPT Template" section
// 3. Click "🧪 Test Prompt" button below template

// 4. TestPromptModal opens automatically
<TestPromptModal
  open={testModalOpen}
  onClose={() => setTestModalOpen(false)}
  template={form.template}
  model={form.model}
/>
```

---

### Example Test Flow

#### Step 1: Enter Template
```
You are a luxury brand categorization expert.
Your task is to identify brand names from user messages.
Return JSON: { "brand": "...", "confidence": 0.0-1.0 }
```

#### Step 2: Configure Test
- Language: `English`
- Country: `Poland`
- Message: `I love Nike shoes`

#### Step 3: Run Test (Click ▶ or press Enter)

#### Step 4: View Request (JSON)
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are a luxury brand categorization expert..."
    },
    {
      "role": "user",
      "content": "I love Nike shoes"
    }
  ],
  "max_completion_tokens": 500,
  "temperature": 0,
  "top_p": 0.1
}
```

#### Step 5: View Response (JSON)
```json
{
  "id": "chatcmpl-ABC123",
  "choices": [{
    "message": {
      "content": "{ \"brand\": \"Nike\", \"confidence\": 0.95 }"
    }
  }],
  "usage": {
    "prompt_tokens": 45,
    "completion_tokens": 12,
    "total_tokens": 57
  }
}
```

#### Step 6: Check Stats
```
Time: 0.8s
Tokens: 57
```

---

## ⚙️ Backend Configuration

### Environment Variables

```env
# Required for production GPT testing
OPENAI_API_KEY=sk-your-key-here

# Optional: Will use demo mode if not set
```

### Demo Mode

If `OPENAI_API_KEY` is not set, the backend returns mock responses:

```json
{
  "id": "chatcmpl-demo",
  "object": "chat.completion",
  "model": "gpt-4o-mini",
  "choices": [{
    "message": {
      "content": "This is a demo response. Set OPENAI_API_KEY for real GPT."
    }
  }],
  "usage": {
    "prompt_tokens": 50,
    "completion_tokens": 25,
    "total_tokens": 75
  }
}
```

---

## 🎨 Visual Features

### JSON Syntax Highlighting

```css
/* Terminal-style display */
bg-gray-900 dark:bg-black
text-green-400           /* JSON text */
font-mono text-xs        /* Monospace font */
```

### Loading State

```tsx
{isLoading ? (
  <>
    <LoadingSpinner />
    Running...
  </>
) : (
  <>
    <Play icon />
    Run Test
  </>
)}
```

### Tab Indicators

```tsx
{activeTab === "request" && (
  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>
)}
```

---

## 🧪 Testing Different Scenarios

### Test 1: Simple Brand Detection

**Template:**
```
Identify the brand name from the user's message.
Return only the brand name.
```

**Test Message:**
```
Nike shoes are amazing
```

**Expected Response:**
```
Nike
```

---

### Test 2: JSON Response

**Template:**
```
Extract brand and confidence.
Return: { "brand": "...", "confidence": 0.0-1.0 }
```

**Test Message:**
```
Adidas running shoes
```

**Expected Response:**
```json
{
  "brand": "Adidas",
  "confidence": 0.95
}
```

---

### Test 3: Multi-Brand

**Template:**
```
Identify all brands mentioned.
Return: { "brands": ["..."], "primary": "..." }
```

**Test Message:**
```
Nike is better than Adidas but not as good as Puma
```

**Expected Response:**
```json
{
  "brands": ["Nike", "Adidas", "Puma"],
  "primary": "Nike"
}
```

---

## 📊 Performance Metrics

### Typical Response Times

| Model | Avg Time | Token Usage | Cost/1K |
|-------|----------|-------------|---------|
| gpt-4.1-nano | 0.3-0.5s | 30-50 | $0.001 |
| gpt-4.1-mini | 0.5-0.8s | 50-80 | $0.003 |
| gpt-4o-mini | 0.8-1.2s | 60-100 | $0.005 |
| gpt-4o | 1.5-2.5s | 80-150 | $0.015 |
| gpt-5 | 2-3s | 100-200 | $0.030 |

### Optimization Tips

1. **Keep templates concise**
   - Shorter templates = fewer prompt tokens
   - Target: <200 tokens

2. **Limit completion tokens**
   - Set `max_completion_tokens: 100` for simple responses
   - Default: 500

3. **Use appropriate model**
   - Simple tasks: gpt-4.1-nano
   - Complex tasks: gpt-4o or gpt-5

---

## 🔧 Customization

### Add New Test Fields

```tsx
// In TestPromptModal.tsx
const [customField, setCustomField] = useState('');

// In form
<input
  value={customField}
  onChange={(e) => setCustomField(e.target.value)}
  placeholder="Custom field..."
/>

// In payload
const payload = {
  ...
  metadata: {
    language,
    country,
    customField
  }
};
```

---

### Customize JSON Display

```tsx
// Add syntax highlighting
import SyntaxHighlighter from 'react-syntax-highlighter';

<SyntaxHighlighter language="json" style={darkTheme}>
  {responseJson}
</SyntaxHighlighter>
```

---

### Save Test History

```tsx
const [testHistory, setTestHistory] = useState([]);

function saveTest() {
  setTestHistory(prev => [{
    message: userMessage,
    response: responseJson,
    stats,
    timestamp: new Date()
  }, ...prev]);
}
```

---

## 🐛 Troubleshooting

### Issue: Connection Refused

**Problem:** Cannot connect to backend API

**Solution:**
```bash
# Make sure API server is running
node api-server.js

# Or start with npm script
npm run server
```

**Check:** Verify endpoint URL matches:
```tsx
const res = await fetch("http://localhost:3001/api/gpt-test", ...);
```

---

### Issue: Invalid API Key

**Problem:** OpenAI API key error

**Solution:**
```bash
# Set environment variable
export OPENAI_API_KEY=sk-your-key-here

# Or add to .env
OPENAI_API_KEY=sk-your-key-here

# Restart server
node api-server.js
```

---

### Issue: Timeout

**Problem:** Request takes too long

**Solution:**
```tsx
// Add timeout to fetch
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s

const res = await fetch(url, {
  ...options,
  signal: controller.signal
});

clearTimeout(timeoutId);
```

---

## 📈 Best Practices

### 1. Test Template Changes

Before saving template changes:
1. Click "🧪 Test Prompt"
2. Try multiple test messages
3. Verify response format
4. Check token usage
5. Save if satisfied

---

### 2. Iterative Refinement

```
Test 1: Generic template → Check response
  ↓
Refine: Add more specificity
  ↓
Test 2: Updated template → Check improvement
  ↓
Refine: Adjust tone/format
  ↓
Test 3: Final version → Verify consistency
  ↓
Save ✓
```

---

### 3. Cost Management

```
Before testing:
- Estimate token usage
- Use gpt-4.1-nano for initial tests
- Limit max_completion_tokens

After testing:
- Review total tokens
- Calculate cost: tokens / 1000 * price_per_1k
- Adjust model if needed
```

---

## 🎯 Integration

### In EditCategoryModal

```tsx
import { TestPromptModal } from './TestPromptModal';

export function EditCategoryModal({ category, onSave }) {
  const [testModalOpen, setTestModalOpen] = useState(false);
  const [form, setForm] = useState({
    template: category.template || '',
    model: 'gpt-4.1-nano'
  });

  return (
    <div>
      {/* GPT Template Section */}
      <textarea
        value={form.template}
        onChange={(e) => setForm({...form, template: e.target.value})}
      />
      
      {/* Test Button */}
      <button onClick={() => setTestModalOpen(true)}>
        🧪 Test Prompt
      </button>

      {/* Test Modal */}
      <TestPromptModal
        open={testModalOpen}
        onClose={() => setTestModalOpen(false)}
        template={form.template}
        model={form.model}
      />
    </div>
  );
}
```

---

## 📊 Example Templates

### Template 1: Simple Brand Extraction

```
You are a brand identification expert.
Identify the brand name from the user's message.
Return only the brand name, nothing else.
```

**Test:** "Gucci bag is expensive"  
**Expected:** "Gucci"

---

### Template 2: JSON Response

```
You are a brand categorization assistant.
Extract the brand name and your confidence level.
Return JSON format: { "brand": "...", "confidence": 0.0-1.0 }
```

**Test:** "Nike Air Max 90"  
**Expected:** 
```json
{
  "brand": "Nike",
  "confidence": 0.98
}
```

---

### Template 3: Multi-Field Response

```
Analyze the user's message for:
1. Brand name
2. Product category
3. Sentiment (positive/negative/neutral)

Return JSON:
{
  "brand": "...",
  "category": "...",
  "sentiment": "...",
  "confidence": 0.0-1.0
}
```

**Test:** "Dior perfume smells amazing"  
**Expected:**
```json
{
  "brand": "Dior",
  "category": "Fragrance",
  "sentiment": "positive",
  "confidence": 0.92
}
```

---

## 🔐 Security & Privacy

### API Key Protection

```javascript
// NEVER expose API key in frontend
// ❌ BAD
const apiKey = "sk-your-key";

// ✅ GOOD - Keep in backend only
// api-server.js
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});
```

### Data Privacy

- ✅ Test messages are NOT stored in database
- ✅ Only sent to OpenAI API
- ✅ Responses not logged (unless you add logging)
- ✅ Use demo mode for sensitive data testing

---

## 📚 Advanced Features

### 1. Compare Multiple Models

```tsx
const models = ['gpt-4.1-nano', 'gpt-4o-mini', 'gpt-4o'];
const results = [];

for (const model of models) {
  const result = await testPrompt(template, model, message);
  results.push({ model, ...result });
}

// Compare: time, tokens, accuracy
```

---

### 2. Batch Testing

```tsx
const testMessages = [
  'Nike shoes',
  'Adidas bag',
  'Gucci wallet'
];

for (const msg of testMessages) {
  const result = await testPrompt(template, model, msg);
  console.log(`${msg} → ${result.response}`);
}
```

---

### 3. A/B Template Testing

```tsx
const templateA = "Extract brand name...";
const templateB = "Identify the brand from...";

const resultA = await testPrompt(templateA, model, message);
const resultB = await testPrompt(templateB, model, message);

// Compare responses
```

---

## 🎉 Summary

### ✅ Features

✅ **In-app testing** - No need for external tools  
✅ **Real-time results** - Instant feedback  
✅ **Performance metrics** - Time and token usage  
✅ **JSON viewer** - Formatted request/response  
✅ **Error handling** - Clear error messages  
✅ **Keyboard shortcuts** - ESC to close, Enter to run  
✅ **Dark mode** - Full theme support  
✅ **Demo mode** - Works without API key  

### 🎯 Benefits

- **Faster iteration** - Test templates instantly
- **Better accuracy** - Refine based on real responses
- **Cost awareness** - See token usage before production
- **No context switching** - Stay in your dashboard

---

## 📞 Support

### Common Questions

**Q: Do I need an OpenAI API key?**  
A: No - demo mode works without a key. But for real testing, yes.

**Q: Are test messages stored?**  
A: No - they're only sent to the API, not saved in database.

**Q: Which model should I use?**  
A: Start with gpt-4.1-nano for testing, upgrade if needed for accuracy.

**Q: How much does testing cost?**  
A: Very little - typical test uses 50-100 tokens (~$0.0005 per test).

---

**Happy testing!** 🧪


# AI Codeframe Generation Service

FastAPI microservice for generating survey codeframes using Claude Sonnet 4.5, sentence-transformers, and HDBSCAN clustering.

## Overview

This service generates qualitative research codeframes by:
1. **Embedding** survey responses using sentence-transformers (all-MiniLM-L6-v2)
2. **Clustering** similar responses using HDBSCAN algorithm
3. **Theme extraction** using Claude Sonnet 4.5 with chain-of-thought reasoning
4. **MECE validation** to ensure codes are mutually exclusive and collectively exhaustive

## Project Structure

```
python-service/
├── main.py                    # FastAPI application
├── requirements.txt           # Python dependencies
├── Dockerfile                # Container configuration
├── .env.example              # Environment variables template
├── test_request.json         # Example API request
├── prompts/
│   └── system_prompt.xml     # Claude system prompt
├── services/
│   ├── embedder.py           # Embedding generation
│   ├── clusterer.py          # HDBSCAN clustering
│   ├── claude_client.py      # Claude API integration
│   └── mece_validator.py     # MECE validation
└── tests/
    └── test_pipeline.py      # Unit tests
```

## Quick Start

### 1. Prerequisites

- Python 3.11+
- Anthropic API key

### 2. Setup

```bash
cd python-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
```

### 3. Run Service

```bash
# Development mode (with auto-reload)
uvicorn main:app --reload --port 8000

# Production mode
python main.py
```

The service will be available at `http://localhost:8000`

### 4. Test the API

```bash
# Health check
curl http://localhost:8000/health

# Generate codeframe
curl -X POST http://localhost:8000/api/generate-codeframe \
  -H "Content-Type: application/json" \
  -d @test_request.json
```

## API Endpoints

### `GET /health`

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "codeframe-generation",
  "version": "1.0.0"
}
```

### `POST /api/generate-codeframe`

Generate a codeframe for survey response cluster.

**Request Body:**
```json
{
  "cluster_texts": [
    {
      "id": 1,
      "text": "I love Nike shoes",
      "language": "en"
    }
  ],
  "category_name": "Athletic Footwear Brands",
  "category_description": "Survey about shoe brand preferences",
  "target_language": "en",
  "existing_codes": [],
  "hierarchy_preference": "adaptive",
  "algorithm_config": {
    "min_cluster_size": 5,
    "min_samples": 3
  }
}
```

**Response:**
```json
{
  "theme": {
    "name": "Athletic Sportswear Brands",
    "description": "Responses about athletic shoe brands",
    "confidence": "high"
  },
  "codes": [
    {
      "name": "Nike",
      "description": "Nike brand mentions",
      "confidence": "high",
      "example_texts": [
        {
          "id": "1",
          "text": "I love Nike shoes"
        }
      ],
      "sub_codes": []
    }
  ],
  "hierarchy_depth": "flat",
  "mece_score": 87.5,
  "mece_issues": [],
  "processing_time_ms": 2340,
  "usage": {
    "input_tokens": 3500,
    "output_tokens": 800
  },
  "cost_usd": 0.022
}
```

## Running Tests

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ --cov=services --cov-report=html

# Run specific test file
pytest tests/test_pipeline.py -v
```

## Docker Deployment

### Build Image

```bash
docker build -t codeframe-service .
```

### Run Container

```bash
docker run -d \
  -p 8000:8000 \
  -e ANTHROPIC_API_KEY=your_key_here \
  --name codeframe-service \
  codeframe-service
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Anthropic API key |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-5-20251022` | Claude model ID |
| `PORT` | No | `8000` | Service port |
| `LOG_LEVEL` | No | `INFO` | Logging level |

## Architecture

### Embedding Generation
- **Model**: `all-MiniLM-L6-v2` (384 dimensions)
- **Features**: Fast, multilingual, normalized embeddings
- **Caching**: Model loaded once at startup

### Clustering
- **Algorithm**: HDBSCAN (density-based clustering)
- **Default params**: `min_cluster_size=5`, `min_samples=3`
- **Benefits**: No need to specify number of clusters

### Claude Integration
- **Model**: Claude Sonnet 4.5 (oct 2024)
- **Temperature**: 0.3 (balanced creativity/consistency)
- **Max tokens**: 4096
- **Output**: Structured XML parsed to JSON

### MECE Validation
- **Exclusivity**: Checks code overlap via cosine similarity
  - Warning threshold: 0.70
  - Error threshold: 0.85
- **Exhaustiveness**: Checks response coverage
  - Coverage threshold: 0.30
  - Gap threshold: 0.10
- **Score**: 0-100, combines both dimensions

## Cost Estimation

Claude Sonnet 4.5 pricing (as of Oct 2024):
- Input: $3 per million tokens
- Output: $15 per million tokens

**Example costs:**
- 50 responses, 15 words each: ~$0.02-0.03 per request
- 100 responses, 20 words each: ~$0.04-0.06 per request

## Performance

Typical processing times:
- 20-50 responses: 1-3 seconds
- 50-100 responses: 3-6 seconds
- 100+ responses: 6-12 seconds

**Bottlenecks:**
1. Claude API call (~80% of time)
2. Embedding generation (~15% of time)
3. MECE validation (~5% of time)

## Integration with Express Backend

To integrate with your Express.js backend:

```javascript
// api-server.js
const axios = require('axios');

const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

app.post('/api/categories/:id/generate-codeframe', async (req, res) => {
  try {
    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/api/generate-codeframe`,
      {
        cluster_texts: req.body.cluster_texts,
        category_name: req.body.category_name,
        category_description: req.body.category_description,
        target_language: req.body.target_language || 'en',
        existing_codes: req.body.existing_codes || [],
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error calling Python service:', error);
    res.status(500).json({ error: 'Failed to generate codeframe' });
  }
});
```

## Troubleshooting

### Service won't start
- Check that Python 3.11+ is installed: `python --version`
- Verify all dependencies installed: `pip list`
- Check `.env` file exists with valid `ANTHROPIC_API_KEY`

### Claude API errors
- Verify API key is valid
- Check API quota/rate limits
- Review logs for specific error messages

### Poor MECE scores
- Increase cluster size (more responses = better themes)
- Adjust overlap thresholds in MECE validation
- Review system prompt for improvements

### Memory issues
- Sentence-transformer model uses ~200MB RAM
- Each request uses ~50-100MB during processing
- Consider horizontal scaling for high load

## Next Steps

1. **Update system prompt**: Replace `prompts/system_prompt.xml` with your optimized version
2. **Load test**: Test with production data volumes
3. **Monitor costs**: Track token usage and costs in production
4. **Optimize**: Cache embeddings for repeated analyses

## License

Internal use only - TGM Research Coding & AI Categorization Dashboard

---

**Questions?** Contact the development team or check the main project README.

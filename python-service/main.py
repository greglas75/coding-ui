"""
FastAPI microservice for AI codeframe generation.
"""
import asyncio
import hashlib
import logging
import os
import time
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager
from concurrent.futures import ThreadPoolExecutor
from functools import partial

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from services.embedder import EmbeddingService
from services.clusterer import ClusteringService, ClusterConfig
from services.claude_client import ClaudeClient, ClaudeConfig
from services.mece_validator import MECEValidator
from services.brand_extractor import BrandExtractor
from services.google_search_client import GoogleSearchClient
from services.brand_cache import get_cache
from services.brand_codeframe_builder import BrandCodeframeBuilder, BrandCodeframe
from services.brand_context_fetcher import BrandContextFetcher
from services.openai_embedder import OpenAIEmbedder
from supabase import create_client, Client
import numpy as np

# Multi-source validation imports
try:
    from validators.multi_source_validator import MultiSourceValidator
    import openai
    from pinecone import Pinecone
    import numpy as np
except ImportError as e:
    logger.warning(f"Multi-source validation dependencies not available: {e}")
    MultiSourceValidator = None
    openai = None
    Pinecone = None
    np = None

# Load environment variables from parent directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Pydantic models for request/response
class ClusterText(BaseModel):
    """Individual text item in a cluster."""
    id: int
    text: str
    language: str = "en"


class AlgorithmConfig(BaseModel):
    """Configuration for clustering algorithm."""
    min_cluster_size: int = Field(default=5, ge=2)
    min_samples: int = Field(default=3, ge=1)


class EmbeddingText(BaseModel):
    """Text item for embedding generation."""
    id: int
    text: str


class EmbeddingRequest(BaseModel):
    """Request body for embedding generation."""
    texts: List[EmbeddingText]


class EmbeddingItem(BaseModel):
    """Single embedding result."""
    id: int
    embedding: List[float]
    text_hash: str


class EmbeddingResponse(BaseModel):
    """Response for embedding generation."""
    embeddings: List[EmbeddingItem]


class ClusterConfigRequest(BaseModel):
    """Configuration for clustering."""
    min_cluster_size: int = Field(default=5, ge=2)
    min_samples: int = Field(default=3, ge=1)


class ClusterRequest(BaseModel):
    """Request body for clustering."""
    answer_ids: List[int]
    config: ClusterConfigRequest


class ClusterTexts(BaseModel):
    """Texts within a cluster."""
    id: int
    text: str
    language: str = "en"


class ClusterData(BaseModel):
    """Data for a single cluster."""
    texts: List[ClusterTexts]
    size: int
    confidence: float


class ClusterResponse(BaseModel):
    """Response for clustering."""
    n_clusters: int
    noise_count: int
    clusters: Dict[str, ClusterData]


class CodeframeRequest(BaseModel):
    """Request body for codeframe generation."""
    cluster_texts: List[ClusterText]
    category_name: str
    category_description: str
    target_language: str = "en"
    existing_codes: Optional[List[str]] = None
    hierarchy_preference: str = "adaptive"
    algorithm_config: Optional[AlgorithmConfig] = None
    anthropic_api_key: Optional[str] = None  # API key from Settings page


class CodeExample(BaseModel):
    """Example text for a code."""
    id: str
    text: str


class Code(BaseModel):
    """Individual code in the codeframe."""
    name: str
    description: str
    confidence: str
    example_texts: List[CodeExample]
    sub_codes: List['Code'] = []
    frequency_estimate: Optional[str] = None


class Theme(BaseModel):
    """Theme information."""
    name: str
    description: str
    confidence: str


class Usage(BaseModel):
    """Token usage and cost information."""
    input_tokens: int
    output_tokens: int


class MECEIssueResponse(BaseModel):
    """MECE validation issue."""
    type: str
    severity: str
    message: str
    details: Dict[str, Any]


class CodeframeResponse(BaseModel):
    """Response for codeframe generation."""
    theme: Theme
    codes: List[Code]
    hierarchy_depth: str
    mece_score: float
    mece_issues: List[MECEIssueResponse]
    processing_time_ms: int
    usage: Usage
    cost_usd: float


# Brand extraction models
class BrandExtractionRequest(BaseModel):
    """Request body for brand extraction."""
    texts: List[str]
    min_confidence: float = Field(default=0.3, ge=0.0, le=1.0)


class BrandCandidateResponse(BaseModel):
    """Response model for a brand candidate."""
    name: str
    normalized_name: str
    confidence: float
    source_text: str
    position_start: int
    position_end: int


class BrandExtractionResponse(BaseModel):
    """Response for brand extraction."""
    brands: List[BrandCandidateResponse]
    total_texts_processed: int
    processing_time_ms: int


class BrandNormalizationRequest(BaseModel):
    """Request body for brand normalization."""
    brand_name: str
    threshold: float = Field(default=0.8, ge=0.0, le=1.0)


class BrandNormalizationResponse(BaseModel):
    """Response for brand normalization."""
    original: str
    normalized: str
    known_brand_match: Optional[str] = None
    match_confidence: float
    processing_time_ms: int


class BrandValidationRequest(BaseModel):
    """Request body for brand validation."""
    brand_name: str
    context: Optional[str] = None  # e.g., "toothpaste", "mobile payment app"
    use_google_search: bool = True
    use_google_images: bool = True


class BrandValidationResponse(BaseModel):
    """Response for brand validation."""
    brand_name: str
    is_valid: bool
    confidence: float
    reasoning: str
    evidence: Dict[str, Any]
    processing_time_ms: int


# Brand Codeframe models
class AnswerText(BaseModel):
    """Answer text for brand codeframe generation."""
    id: int
    text: str


class BrandCodeframeRequest(BaseModel):
    """Request body for brand codeframe generation."""
    answers: List[AnswerText]
    category_name: str
    category_description: Optional[str] = ""
    target_language: str = "en"
    min_confidence: Optional[float] = None
    enable_enrichment: bool = True
    generation_id: Optional[str] = None  # For progress tracking
    # API keys from Settings (override environment variables)
    google_api_key: Optional[str] = None
    google_cse_cx_id: Optional[str] = None
    pinecone_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None


class BrandCodeframeResponse(BaseModel):
    """Response for brand codeframe generation with 3-group categorization."""
    theme_name: str
    theme_description: str
    theme_confidence: str
    hierarchy_depth: str

    # 3 groups for manual review workflow
    verified_brands: List[Dict[str, Any]]  # High confidence + Google verified
    needs_review: List[Dict[str, Any]]      # Medium confidence or unverified
    spam_invalid: List[Dict[str, Any]]       # Low confidence or gibberish

    mece_score: float
    mece_issues: List[Dict[str, Any]]
    processing_time_ms: int
    total_brands_found: int
    verified_count: int
    review_count: int
    spam_count: int
    total_mentions: int


class ConfirmBrandRequest(BaseModel):
    """Request body for confirming a brand."""
    brand_name: str
    normalized_name: str
    category_id: int
    confidence: float


class ConfirmBrandResponse(BaseModel):
    """Response for confirming a brand."""
    success: bool
    brand_name: str
    message: str


class EnrichBrandsRequest(BaseModel):
    """Request body for enriching brands."""
    brands: List[Dict[str, str]]  # List of {name, normalized_name}
    category_context: Optional[str] = None


class EnrichBrandsResponse(BaseModel):
    """Response for enriching brands."""
    enriched_brands: List[Dict[str, Any]]
    processing_time_ms: int


class PineconeTestRequest(BaseModel):
    """Request body for Pinecone connection test."""
    pinecone_api_key: str
    index_name: str = "tgm-brand-embeddings"


class PineconeTestResponse(BaseModel):
    """Response for Pinecone connection test."""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None


# Initialize services at startup
claude_client: Optional[ClaudeClient] = None
mece_validator: Optional[MECEValidator] = None
google_search_client: Optional[GoogleSearchClient] = None
brand_context_fetcher: Optional[BrandContextFetcher] = None
supabase: Optional[Client] = None

# Thread pool executor for CPU-bound operations
# max_workers=2 to prevent overwhelming the system during concurrent codeframe builds
cpu_executor: ThreadPoolExecutor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="codeframe-worker")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle handler for FastAPI app."""
    global claude_client, mece_validator, brand_extractor, google_search_client, brand_context_fetcher, brand_codeframe_builder, supabase

    logger.info("Initializing services...")

    # Initialize Supabase client
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if supabase_url and supabase_key:
        supabase = create_client(supabase_url, supabase_key)
        logger.info("Supabase client initialized")
    else:
        logger.warning("Supabase credentials not found, clustering will not work")

    # Initialize Claude client
    try:
        claude_config = ClaudeConfig(
            model=os.getenv("CLAUDE_MODEL", "claude-3-5-haiku-20241022"),  # Changed to Haiku 3.5 - 10x cheaper!
            temperature=0.3,
            max_tokens=4096
        )
        claude_client = ClaudeClient(config=claude_config)
        logger.info("Claude client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Claude client: {e}")
        raise

    # Initialize MECE validator
    mece_validator = MECEValidator()
    logger.info("MECE validator initialized")

    # BrandExtractor is now created per-request with embedder and claude_client
    # (removed global initialization - see /brand-codeframe endpoint)

    # Initialize Google Search Client
    google_search_client = GoogleSearchClient()
    if google_search_client.is_configured():
        logger.info("Google Search client initialized and configured")
    else:
        logger.warning("Google Search client initialized but not configured (missing API keys)")

    # Initialize Brand Context Fetcher
    brand_context_fetcher = BrandContextFetcher(
        google_search_client=google_search_client
    )
    logger.info("Brand context fetcher initialized")

    # OpenAI Embedder and Brand Codeframe Builder are now created per-request
    # (removed global initialization - see /brand-codeframe endpoint)

    # Pre-load sentence-transformer model
    logger.info("Pre-loading sentence-transformer model...")
    EmbeddingService.get_model()
    logger.info("Model loaded successfully")

    logger.info("All services initialized. Ready to serve requests.")

    yield

    logger.info("Shutting down services...")

    # Shutdown thread pool executor gracefully
    logger.info("Shutting down CPU executor...")
    cpu_executor.shutdown(wait=True, cancel_futures=False)
    logger.info("CPU executor shut down successfully")


# Create FastAPI app
app = FastAPI(
    title="Codeframe Generation API",
    description="AI-powered codeframe generation using Claude Sonnet 4.5",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
# ✅ FIX: allow_origins=["*"] + allow_credentials=True is INVALID per CORS spec
# Using specific origins list to enable credentials properly
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",  # Vite dev server
    "http://localhost:3020",  # Node backend
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,  # ✅ Specific origins instead of wildcard
    allow_credentials=True,          # Now valid with specific origins
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "codeframe-generation-and-brand-extraction",
        "version": "1.1.0"
    }


@app.get("/api/brand-cache/stats")
async def get_brand_cache_stats():
    """Get brand validation cache statistics."""
    cache = get_cache()
    stats = cache.get_stats()
    return {
        "cache_stats": stats,
        "status": "ok"
    }


@app.post("/api/brand-cache/clear")
async def clear_brand_cache():
    """Clear all brand validation cache entries."""
    cache = get_cache()
    cache.clear()
    return {
        "message": "Brand cache cleared successfully",
        "status": "ok"
    }


@app.post("/api/test-pinecone", response_model=PineconeTestResponse)
async def test_pinecone_connection(request: PineconeTestRequest):
    """
    Test Pinecone connection with provided API key.

    This endpoint:
    1. Validates the Pinecone API key
    2. Checks if the index exists
    3. Verifies index dimensions (should be 3072 for text-embedding-3-large)
    4. Tests basic connectivity
    """
    try:
        logger.info(f"🔍 Testing Pinecone connection for index: {request.index_name}")

        # Initialize OpenAI embedder with Pinecone
        embedder = OpenAIEmbedder(
            api_key=None,  # OpenAI key not needed for just testing Pinecone connection
            pinecone_api_key=request.pinecone_api_key
        )

        if not embedder.pc:
            return PineconeTestResponse(
                success=False,
                message="Failed to initialize Pinecone client. Check your API key.",
                details={"error": "Pinecone client initialization failed"}
            )

        # List available indexes
        try:
            existing_indexes = embedder.pc.list_indexes().names()
            logger.info(f"📋 Available indexes: {existing_indexes}")
        except Exception as e:
            logger.error(f"❌ Failed to list indexes: {e}")
            return PineconeTestResponse(
                success=False,
                message=f"Failed to list indexes: {str(e)}",
                details={"error": str(e), "error_type": type(e).__name__}
            )

        # Check if requested index exists
        if request.index_name not in existing_indexes:
            return PineconeTestResponse(
                success=True,  # Connection works, but index doesn't exist yet (will be created on first use)
                message=f"Connection successful! Index '{request.index_name}' does not exist yet - it will be created automatically on first brand extraction.",
                details={
                    "available_indexes": existing_indexes,
                    "index_exists": False
                }
            )

        # Get index info
        try:
            index_info = embedder.pc.describe_index(request.index_name)
            dimension = index_info.dimension
            metric = index_info.metric

            logger.info(f"✅ Index info: dimension={dimension}, metric={metric}")

            # Check if dimensions are correct
            expected_dimension = 3072
            dimension_ok = dimension == expected_dimension

            if not dimension_ok:
                return PineconeTestResponse(
                    success=True,
                    message=f"Connection successful, but index has incorrect dimensions ({dimension} vs {expected_dimension}). The index will be recreated automatically with correct dimensions.",
                    details={
                        "index_exists": True,
                        "current_dimension": dimension,
                        "expected_dimension": expected_dimension,
                        "metric": metric,
                        "will_recreate": True
                    }
                )

            # Try to connect to the index
            try:
                index = embedder.pc.Index(request.index_name)
                stats = index.describe_index_stats()

                # Extract primitive values from stats to avoid serialization issues
                total_vectors = 0
                namespaces_count = 0

                try:
                    if hasattr(stats, 'total_vector_count') and stats.total_vector_count is not None:
                        total_vectors = int(stats.total_vector_count)
                except:
                    pass

                try:
                    if hasattr(stats, 'namespaces') and stats.namespaces:
                        namespaces_count = len(stats.namespaces)
                except:
                    pass

                return PineconeTestResponse(
                    success=True,
                    message=f"Connection successful! Index '{request.index_name}' is ready.",
                    details={
                        "index_exists": True,
                        "dimension": int(dimension),
                        "metric": str(metric),
                        "total_vector_count": total_vectors,
                        "namespaces_count": namespaces_count
                    }
                )
            except Exception as e:
                logger.error(f"❌ Failed to connect to index: {e}")
                return PineconeTestResponse(
                    success=False,
                    message=f"Failed to connect to index: {str(e)}",
                    details={"error": str(e), "error_type": type(e).__name__}
                )

        except Exception as e:
            logger.error(f"❌ Failed to describe index: {e}")
            return PineconeTestResponse(
                success=False,
                message=f"Failed to get index information: {str(e)}",
                details={"error": str(e), "error_type": type(e).__name__}
            )

    except Exception as e:
        logger.error(f"❌ Pinecone test failed: {e}")
        return PineconeTestResponse(
            success=False,
            message=f"Connection test failed: {str(e)}",
            details={"error": str(e), "error_type": type(e).__name__}
        )


@app.post("/api/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(request: EmbeddingRequest):
    """
    Generate embeddings for text inputs.

    This endpoint:
    1. Receives a list of texts with IDs
    2. Generates embeddings using sentence-transformers
    3. Returns embeddings with text hashes for caching
    """
    try:
        logger.info(f"Generating embeddings for {len(request.texts)} texts")

        if not request.texts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="texts cannot be empty"
            )

        # Extract texts
        texts = [item.text for item in request.texts]

        # Generate embeddings using the embedding service
        embeddings = EmbeddingService.generate_embeddings(texts)

        # Build response with text hashes
        embedding_items = []
        for i, embedding in enumerate(embeddings):
            text_hash = hashlib.sha256(request.texts[i].text.encode('utf-8')).hexdigest()
            embedding_items.append(EmbeddingItem(
                id=request.texts[i].id,
                embedding=embedding.tolist(),
                text_hash=text_hash
            ))

        logger.info(f"Successfully generated {len(embedding_items)} embeddings")

        return EmbeddingResponse(embeddings=embedding_items)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {str(e)}"
        )


@app.post("/api/cluster", response_model=ClusterResponse)
async def cluster_answers(request: ClusterRequest):
    """
    Cluster answers based on their embeddings.

    This endpoint:
    1. Fetches embeddings for the given answer IDs from database
    2. Fetches answer texts for the given IDs
    3. Performs HDBSCAN clustering
    4. Returns cluster assignments and statistics
    """
    try:
        logger.info(f"Clustering {len(request.answer_ids)} answers")

        if not request.answer_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="answer_ids cannot be empty"
            )

        if len(request.answer_ids) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Need at least 3 answers to cluster"
            )

        # Fetch embeddings from database
        logger.info("Fetching embeddings from database...")
        response = supabase.table('answer_embeddings').select('answer_id, embedding_vector').in_('answer_id', request.answer_ids).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No embeddings found for the given answer IDs. Please generate embeddings first."
            )

        # Create embedding matrix (ensure correct order)
        # Parse embedding_vector from BYTEA (hex-encoded JSON string) to list
        import json
        import codecs
        embedding_map = {}
        for row in response.data:
            # embedding_vector is stored as BYTEA which Supabase returns as hex string (e.g. \x7b...)
            embedding_data = row['embedding_vector']
            try:
                if isinstance(embedding_data, str):
                    # Decode hex string to bytes, then to UTF-8 string, then parse JSON
                    # Remove \x prefix if present and decode from hex
                    if embedding_data.startswith('\\x'):
                        hex_str = embedding_data[2:]  # Remove \x
                        json_bytes = bytes.fromhex(hex_str)
                        embedding_map[row['answer_id']] = json.loads(json_bytes.decode('utf-8'))
                    else:
                        # Try direct JSON parsing
                        embedding_map[row['answer_id']] = json.loads(embedding_data)
                elif isinstance(embedding_data, bytes):
                    embedding_map[row['answer_id']] = json.loads(embedding_data.decode('utf-8'))
                else:
                    embedding_map[row['answer_id']] = embedding_data
            except Exception as e:
                logger.error(f"Failed to parse embedding for answer {row['answer_id']}: {e}")
                raise
        embeddings_list = []
        valid_answer_ids = []

        for answer_id in request.answer_ids:
            if answer_id in embedding_map:
                embeddings_list.append(embedding_map[answer_id])
                valid_answer_ids.append(answer_id)

        if len(embeddings_list) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only found {len(embeddings_list)} embeddings, need at least 3 to cluster"
            )

        embeddings_array = np.array(embeddings_list)
        logger.info(f"Loaded {embeddings_array.shape[0]} embeddings with dimension {embeddings_array.shape[1]}")

        # Fetch answer texts
        logger.info("Fetching answer texts...")
        answers_response = supabase.table('answers').select('id, answer_text').in_('id', valid_answer_ids).execute()

        if not answers_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch answer texts"
            )

        # Create answer map
        answer_map = {row['id']: row['answer_text'] for row in answers_response.data}

        # Cluster embeddings
        logger.info("Performing clustering...")
        cluster_config = ClusterConfig(
            min_cluster_size=request.config.min_cluster_size,
            min_samples=request.config.min_samples
        )

        cluster_result = ClusteringService.cluster_embeddings(embeddings_array, cluster_config)

        # Group answers by cluster
        clusters_dict = {}
        for i, (answer_id, label, prob) in enumerate(zip(valid_answer_ids, cluster_result.labels, cluster_result.probabilities)):
            if label == -1:  # Skip noise
                continue

            cluster_id = str(label)
            if cluster_id not in clusters_dict:
                clusters_dict[cluster_id] = {
                    'texts': [],
                    'probabilities': []
                }

            clusters_dict[cluster_id]['texts'].append(ClusterTexts(
                id=answer_id,
                text=answer_map.get(answer_id, ""),
                language="en"
            ))
            clusters_dict[cluster_id]['probabilities'].append(float(prob))

        # Build response clusters with statistics
        response_clusters = {}
        for cluster_id, data in clusters_dict.items():
            avg_confidence = np.mean(data['probabilities']) if data['probabilities'] else 0.0
            response_clusters[cluster_id] = ClusterData(
                texts=data['texts'],
                size=len(data['texts']),
                confidence=float(avg_confidence)
            )

        logger.info(
            f"Clustering complete: {cluster_result.num_clusters} clusters, "
            f"{cluster_result.noise_count} noise points"
        )

        return ClusterResponse(
            n_clusters=cluster_result.num_clusters,
            noise_count=cluster_result.noise_count,
            clusters=response_clusters
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clustering answers: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cluster answers: {str(e)}"
        )


@app.post("/api/generate-codeframe", response_model=CodeframeResponse)
async def generate_codeframe(request: CodeframeRequest):
    """
    Generate a codeframe for a cluster of survey responses.

    This endpoint:
    1. Validates input data
    2. Calls Claude API to generate codes
    3. Validates MECE principles
    4. Returns structured codeframe with metadata
    """
    start_time = time.time()

    try:
        logger.info(
            f"Received codeframe generation request for category '{request.category_name}' "
            f"with {len(request.cluster_texts)} texts"
        )

        # Validate input
        if not request.cluster_texts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="cluster_texts cannot be empty"
            )

        if len(request.cluster_texts) < 2:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Need at least 2 texts to generate codeframe"
            )

        # Convert Pydantic models to dicts for service layer
        cluster_texts_dict = [
            {"id": item.id, "text": item.text, "language": item.language}
            for item in request.cluster_texts
        ]

        # Step 1: Generate codeframe with Claude
        logger.info("Calling Claude API...")

        # Use API key from request if provided, otherwise use global client
        if request.anthropic_api_key:
            logger.info("Using API key from request (Settings page)")
            client_to_use = ClaudeClient(api_key=request.anthropic_api_key, config=claude_config)
        else:
            logger.info("Using API key from .env")
            client_to_use = claude_client

        claude_result = client_to_use.generate_codeframe(
            cluster_texts=cluster_texts_dict,
            category_name=request.category_name,
            category_description=request.category_description,
            target_language=request.target_language,
            existing_codes=request.existing_codes
        )

        # Step 2: Validate MECE principles
        logger.info("Validating MECE principles...")
        mece_result = mece_validator.validate_codeframe(
            codes=claude_result.codes,
            cluster_texts=cluster_texts_dict
        )

        # Step 3: Build response
        response = _build_response(
            claude_result,
            mece_result,
            int((time.time() - start_time) * 1000)
        )

        logger.info(
            f"Codeframe generation completed in {response.processing_time_ms}ms. "
            f"MECE score: {response.mece_score}"
        )

        return response

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating codeframe: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate codeframe: {str(e)}"
        )


def _build_response(claude_result, mece_result, total_time_ms) -> CodeframeResponse:
    """Build CodeframeResponse from service results."""

    # Convert codes recursively
    def convert_code(code_item):
        return Code(
            name=code_item.name,
            description=code_item.description,
            confidence=code_item.confidence,
            example_texts=[
                CodeExample(id=str(ex['id']), text=ex['text'])
                for ex in code_item.example_texts
            ],
            sub_codes=[convert_code(sub) for sub in code_item.sub_codes],
            frequency_estimate=code_item.frequency_estimate
        )

    codes = [convert_code(code) for code in claude_result.codes]

    # Convert MECE issues
    mece_issues = [
        MECEIssueResponse(
            type=issue.type,
            severity=issue.severity,
            message=issue.message,
            details=issue.details
        )
        for issue in mece_result.issues
    ]

    return CodeframeResponse(
        theme=Theme(
            name=claude_result.theme.name,
            description=claude_result.theme.description,
            confidence=claude_result.theme.confidence
        ),
        codes=codes,
        hierarchy_depth=claude_result.hierarchy_depth,
        mece_score=mece_result.mece_score,
        mece_issues=mece_issues,
        processing_time_ms=total_time_ms,
        usage=Usage(
            input_tokens=claude_result.usage.input_tokens,
            output_tokens=claude_result.usage.output_tokens
        ),
        cost_usd=claude_result.usage.cost_usd
    )


@app.post("/api/extract-brands", response_model=BrandExtractionResponse)
async def extract_brands(request: BrandExtractionRequest):
    """
    Extract brand names from text using NER and fuzzy matching.

    This endpoint:
    1. Analyzes text for potential brand mentions
    2. Applies fuzzy matching against known brands database
    3. Returns candidates with confidence scores
    """
    start_time = time.time()

    try:
        logger.info(f"Extracting brands from {len(request.texts)} texts")

        if not request.texts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="texts cannot be empty"
            )

        # Extract brands using the brand extractor service
        candidates = brand_extractor.extract_brands(request.texts)

        # Filter by confidence threshold
        filtered_candidates = [
            c for c in candidates
            if c.confidence >= request.min_confidence
        ]

        # Convert to response model
        brand_responses = [
            BrandCandidateResponse(
                name=candidate.name,
                normalized_name=candidate.normalized_name,
                confidence=candidate.confidence,
                source_text=candidate.source_text,
                position_start=candidate.position[0],
                position_end=candidate.position[1]
            )
            for candidate in filtered_candidates
        ]

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"Extracted {len(brand_responses)} brands from {len(request.texts)} texts "
            f"in {processing_time}ms"
        )

        return BrandExtractionResponse(
            brands=brand_responses,
            total_texts_processed=len(request.texts),
            processing_time_ms=processing_time
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting brands: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract brands: {str(e)}"
        )


@app.post("/api/normalize-brand", response_model=BrandNormalizationResponse)
async def normalize_brand(request: BrandNormalizationRequest):
    """
    Normalize a brand name and find matching known brands.

    This endpoint:
    1. Normalizes the brand name (lowercase, remove punctuation, etc.)
    2. Fuzzy matches against known brands database
    3. Returns normalized name and best match if found
    """
    start_time = time.time()

    try:
        logger.info(f"Normalizing brand: {request.brand_name}")

        if not request.brand_name or len(request.brand_name.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="brand_name cannot be empty"
            )

        # Normalize the brand name
        normalized = brand_extractor.normalize_brand_name(request.brand_name)

        # Fuzzy match against known brands
        known_match = brand_extractor.fuzzy_match_known_brands(
            normalized,
            threshold=request.threshold
        )

        # Calculate match confidence
        match_confidence = 0.0
        if known_match:
            from difflib import SequenceMatcher
            match_confidence = SequenceMatcher(
                None,
                normalized.lower(),
                known_match.lower()
            ).ratio()

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"Normalized '{request.brand_name}' to '{normalized}' "
            f"(match: {known_match or 'none'}) in {processing_time}ms"
        )

        return BrandNormalizationResponse(
            original=request.brand_name,
            normalized=normalized,
            known_brand_match=known_match,
            match_confidence=match_confidence,
            processing_time_ms=processing_time
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error normalizing brand: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to normalize brand: {str(e)}"
        )


@app.post("/api/validate-brand", response_model=BrandValidationResponse)
async def validate_brand(request: BrandValidationRequest):
    """
    Validate if a brand name is real using multiple signals.

    This endpoint:
    1. Checks cache for previous validation
    2. Normalizes the brand name
    3. Checks against known brands database
    4. Optionally validates with Google Search API
    5. Optionally validates with Google Images API
    6. Caches and returns validation result
    """
    start_time = time.time()

    try:
        logger.info(f"Validating brand: {request.brand_name}")

        if not request.brand_name or len(request.brand_name.strip()) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="brand_name cannot be empty"
            )

        # Check cache first
        cache = get_cache()
        cached_result = cache.get(request.brand_name, request.context)

        if cached_result:
            logger.info(f"Cache hit for brand: {request.brand_name}")
            processing_time = int((time.time() - start_time) * 1000)
            cached_result["processing_time_ms"] = processing_time
            cached_result["from_cache"] = True
            return BrandValidationResponse(**cached_result)

        # Initialize validation data
        evidence = {
            "normalized_name": "",
            "known_brand_match": None,
            "fuzzy_match_score": 0.0,
            "google_search_found": False,
            "google_images_found": False,
            "validation_methods": []
        }

        # Step 1: Normalize brand name
        normalized = brand_extractor.normalize_brand_name(request.brand_name)
        evidence["normalized_name"] = normalized
        evidence["validation_methods"].append("normalization")

        # Step 2: Check known brands database
        known_match = brand_extractor.fuzzy_match_known_brands(normalized, threshold=0.7)
        if known_match:
            from difflib import SequenceMatcher
            fuzzy_score = SequenceMatcher(None, normalized.lower(), known_match.lower()).ratio()
            evidence["known_brand_match"] = known_match
            evidence["fuzzy_match_score"] = fuzzy_score
            evidence["validation_methods"].append("known_brands_db")

        # Step 3 & 4: Google Search and Images validation (if enabled)
        if (request.use_google_search or request.use_google_images) and google_search_client.is_configured():
            try:
                google_result = google_search_client.validate_brand(
                    brand_name=request.brand_name,
                    context=request.context
                )

                # Merge Google validation results
                evidence["google_search_found"] = google_result["valid"]
                evidence["google_confidence"] = google_result["confidence"]
                evidence["google_reasoning"] = google_result["reasoning"]
                evidence["google_evidence"] = google_result["evidence"]
                evidence["validation_methods"].append("google_search_and_images")

            except Exception as e:
                logger.error(f"Error during Google validation: {str(e)}")
                evidence["validation_methods"].append("google_validation_failed")
        elif request.use_google_search or request.use_google_images:
            logger.warning("Google Search/Images validation requested but not configured")

        # Calculate confidence score
        confidence = 0.0

        # Known brand match contributes up to 60% confidence
        if known_match:
            confidence += evidence["fuzzy_match_score"] * 0.6

        # Google validation contributes up to 70% confidence (if available)
        if "google_confidence" in evidence:
            confidence += evidence["google_confidence"] * 0.7

        # Context relevance (if provided)
        if request.context:
            confidence += 0.1

        # Cap at 1.0
        confidence = min(confidence, 1.0)

        # Determine if valid (threshold: 0.5)
        is_valid = confidence >= 0.5

        # Generate reasoning
        reasoning_parts = []
        if known_match:
            reasoning_parts.append(f"Matched known brand '{known_match}' with {evidence['fuzzy_match_score']:.2f} similarity")
        else:
            reasoning_parts.append("No match in known brands database")

        if "google_reasoning" in evidence:
            reasoning_parts.append(f"Google validation: {evidence['google_reasoning']}")

        if request.context:
            reasoning_parts.append(f"Context: '{request.context}'")

        reasoning = "; ".join(reasoning_parts)

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"Validated brand '{request.brand_name}': "
            f"valid={is_valid}, confidence={confidence:.2f} in {processing_time}ms"
        )

        # Prepare response
        response_data = {
            "brand_name": request.brand_name,
            "is_valid": is_valid,
            "confidence": confidence,
            "reasoning": reasoning,
            "evidence": evidence,
            "processing_time_ms": processing_time
        }

        # Cache the result
        cache.set(request.brand_name, response_data, request.context)

        return BrandValidationResponse(**response_data)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating brand: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate brand: {str(e)}"
        )


@app.post("/api/build_codeframe", response_model=BrandCodeframeResponse)
async def build_brand_codeframe(request: BrandCodeframeRequest):
    """
    Build a brand-specific codeframe from survey answers.

    This endpoint:
    1. Extracts brand mentions from answers
    2. Validates brands using Google Search/Images
    3. Enriches with knowledge graph data
    4. Returns structured brand codeframe

    Use this for 'Brand Tracking' category type.
    """
    start_time = time.time()

    try:
        logger.info(
            f"Building brand codeframe for category '{request.category_name}' "
            f"with {len(request.answers)} answers"
        )

        # Validate input
        if not request.answers:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="answers cannot be empty"
            )

        if len(request.answers) < 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Need at least 5 answers to build brand codeframe"
            )

        # Convert Pydantic models to dicts
        answers_dict = [
            {"id": answer.id, "text": answer.text}
            for answer in request.answers
        ]

        # Create per-request instances with API keys from Settings (if provided)
        logger.info(f"Request API keys - Pinecone: {bool(request.pinecone_api_key)}, Google: {bool(request.google_api_key)}, Anthropic: {bool(request.anthropic_api_key)}")
        google_api_key = request.google_api_key or os.getenv("GOOGLE_API_KEY")
        google_cx_id = request.google_cse_cx_id or os.getenv("GOOGLE_CSE_CX_ID")
        pinecone_api_key = request.pinecone_api_key or os.getenv("PINECONE_API_KEY")
        anthropic_api_key = request.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")
        logger.info(f"Final API keys - Pinecone: {bool(pinecone_api_key)}, Google: {bool(google_api_key)}, Anthropic: {bool(anthropic_api_key)}")

        # ✅ FIX: Initialize clients in try block with cleanup in finally
        # This prevents memory leaks from unclosed connections
        request_google_client = None
        request_embedder = None
        request_claude_client = None
        request_brand_extractor = None
        request_codeframe_builder = None

        try:
            # Initialize Google Search Client with request-specific API keys
            request_google_client = GoogleSearchClient(
                api_key=google_api_key,
                cx_id=google_cx_id
            )

            if request_google_client.is_configured():
                logger.info("Using Google Search API from Settings")
            else:
                logger.warning("Google Search API not configured")

            # Initialize OpenAI Embedder with request-specific API key
            request_embedder = OpenAIEmbedder(pinecone_api_key=pinecone_api_key)

            # Initialize Claude client for AI validation
            if anthropic_api_key:
                logger.info("Initializing Claude client for brand validation")
                claude_config = ClaudeConfig(
                    model="claude-3-5-haiku-20241022",
                    temperature=0.3,
                    max_tokens=4096
                )
                request_claude_client = ClaudeClient(api_key=anthropic_api_key, config=claude_config)
            else:
                logger.warning("No Anthropic API key - Claude AI validation disabled")

            # Create progress callback adapter for BrandExtractor
            def brand_extractor_progress_callback(progress: int, message: str, phase: int):
                """Adapter to convert BrandExtractor progress to update_progress format."""
                phase_names = {1: "Indexing", 2: "AI Classification", 3: "Building Codeframe"}
                step = phase_names.get(phase, f"Phase {phase}")
                update_progress(progress, step, message)

            # Initialize Brand Extractor with 3-phase system (embedder, Claude, Google)
            request_brand_extractor = BrandExtractor(
                openai_embedder=request_embedder,
                claude_client=request_claude_client,
                google_client=request_google_client,
                progress_callback=brand_extractor_progress_callback
            )

            # Initialize Brand Codeframe Builder (delegates to 3-phase extractor)
            request_codeframe_builder = BrandCodeframeBuilder(
                brand_extractor=request_brand_extractor
            )

            # Create progress callback for live updates
            def update_progress(percent: int, step: str, details: str = ""):
                """Update generation progress in Supabase."""
                if request.generation_id and supabase:
                    try:
                        supabase.table('codeframe_generations').update({
                            'progress_percent': percent,
                            'current_step': f"{step} - {details}" if details else step
                        }).eq('id', request.generation_id).execute()
                        logger.info(f"📊 Progress: {percent}% - {step} {details}")
                    except Exception as e:
                        logger.warning(f"Failed to update progress: {e}")

            # Build brand codeframe
            logger.info("Building brand codeframe...")

            # Update: Starting
            update_progress(5, "Starting", f"Analyzing {len(answers_dict)} answers")

            # ✅ FIX: Run CPU-bound codeframe building in thread pool to avoid blocking event loop
            # This prevents the server from freezing during 3-8 minute codeframe builds
            loop = asyncio.get_event_loop()

            # Use functools.partial to bind arguments for executor
            build_func = partial(
                request_codeframe_builder.build_brand_codeframe,
                answers=answers_dict,
                category_name=request.category_name,
                category_description=request.category_description,
                target_language=request.target_language,
                min_confidence=request.min_confidence,
                enable_enrichment=request.enable_enrichment,
                progress_callback=update_progress
            )

            codeframe = await loop.run_in_executor(cpu_executor, build_func)

            # Convert to response
            response_dict = codeframe.to_dict()

            logger.info(
                f"Brand codeframe built in {response_dict['processing_time_ms']}ms. "
                f"Found {response_dict['total_brands_found']} brands: "
                f"{response_dict['verified_count']} verified, "
                f"{response_dict['review_count']} review, "
                f"{response_dict['spam_count']} spam"
            )

            return BrandCodeframeResponse(**response_dict)

        finally:
            # ✅ FIX: Clean up all client connections to prevent memory leaks
            logger.info("Cleaning up request-specific clients...")

            if request_embedder and hasattr(request_embedder, 'close'):
                try:
                    request_embedder.close()
                    logger.info("Closed OpenAI Embedder")
                except Exception as e:
                    logger.warning(f"Error closing embedder: {e}")

            if request_claude_client and hasattr(request_claude_client, 'close'):
                try:
                    request_claude_client.close()
                    logger.info("Closed Claude client")
                except Exception as e:
                    logger.warning(f"Error closing Claude client: {e}")

            if request_google_client and hasattr(request_google_client, 'close'):
                try:
                    request_google_client.close()
                    logger.info("Closed Google Search client")
                except Exception as e:
                    logger.warning(f"Error closing Google client: {e}")

            logger.info("Cleanup complete")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error building brand codeframe: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to build brand codeframe: {str(e)}"
        )


@app.post("/api/confirm_brand", response_model=ConfirmBrandResponse)
async def confirm_brand(request: ConfirmBrandRequest):
    """
    Confirm a brand identified by the user.

    This endpoint:
    1. Records user confirmation of a brand
    2. Updates brand confidence in cache
    3. Can be used to override automatic validation

    This allows users to manually approve brands that need review.
    """
    try:
        logger.info(f"Confirming brand: {request.brand_name}")

        # Update cache with user confirmation
        cache = get_cache()

        # Create confirmation entry
        confirmation_data = {
            "brand_name": request.brand_name,
            "is_valid": True,
            "confidence": request.confidence,
            "reasoning": "User confirmed",
            "evidence": {
                "normalized_name": request.normalized_name,
                "user_confirmed": True,
                "category_id": request.category_id,
                "validation_methods": ["user_confirmation"]
            },
            "processing_time_ms": 0
        }

        # Cache the confirmation
        cache.set(request.brand_name, confirmation_data)

        logger.info(f"Brand '{request.brand_name}' confirmed and cached")

        return ConfirmBrandResponse(
            success=True,
            brand_name=request.brand_name,
            message=f"Brand '{request.brand_name}' has been confirmed and cached"
        )

    except Exception as e:
        logger.error(f"Error confirming brand: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to confirm brand: {str(e)}"
        )


@app.post("/api/enrich_brands", response_model=EnrichBrandsResponse)
async def enrich_brands(request: EnrichBrandsRequest):
    """
    Enrich multiple brands with context data.

    This endpoint:
    1. Fetches knowledge graph data
    2. Validates with Google Search/Images
    3. Returns enriched brand information

    Use this to get detailed information about brands after extraction.
    """
    start_time = time.time()

    try:
        logger.info(f"Enriching {len(request.brands)} brands")

        if not request.brands:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="brands cannot be empty"
            )

        # Enrich brands
        enriched = brand_context_fetcher.enrich_multiple_brands(
            brands=request.brands,
            category_context=request.category_context
        )

        # Convert to dict format
        enriched_dicts = [context.to_dict() for context in enriched]

        processing_time = int((time.time() - start_time) * 1000)

        logger.info(
            f"Enriched {len(enriched)} brands in {processing_time}ms"
        )

        return EnrichBrandsResponse(
            enriched_brands=enriched_dicts,
            processing_time_ms=processing_time
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error enriching brands: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enrich brands: {str(e)}"
        )


# ==================================================================
# COMPREHENSIVE MULTI-STAGE VALIDATION
# ==================================================================

from models.validation import (
    ComprehensiveValidationRequest,
    EnhancedValidationResult,
    BulkValidationRequest,
    BulkValidationResponse
)
from validators.comprehensive_validator import ComprehensiveValidator
from validators.pinecone_first_validator import PineconeFirstValidator, validation_metrics
from utils.ui_formatter import UIFormatter


@app.post("/api/validate-pinecone-first")
async def validate_with_pinecone_first(
    request: ComprehensiveValidationRequest
) -> dict:
    """
    🚀 PINECONE-FIRST VALIDATION (PRIMARY ENDPOINT)

    This endpoint implements the cost-optimized validation flow:

    1. Check Pinecone FIRST (90% of cases)
       - Cost: $0.00002
       - Time: 50ms
       - Returns existing code match

    2. If not found, do full validation (10% of cases)
       - Cost: $0.04
       - Time: 3s
       - Returns comprehensive validation

    SAVINGS: 90% cost reduction vs always doing full validation!

    Request:
    {
        "user_response": "سنسوداين",
        "images": ["url1", "url2", ...],
        "category": "Toothpaste",
        "google_search_results": {...},
        "language_code": "ar"
    }

    Response (Pinecone hit - 90% of cases):
    {
        "validation_path": "pinecone_hit",
        "cost": 0.00002,
        "time_ms": 50,

        "user_response": "سنسوداين",
        "matched_code": {
            "code_id": "123",
            "code_name": "Sensodyne",
            "similarity": 98,
            "category": "Toothpaste",
            "mentions": 42,
            "examples": ["سنسوداين", "sensodyne"]
        },

        "confidence": {
            "final_score": 98,
            "source": "pinecone_match",
            "level": "high"
        },

        "ui_actions": {
            "show_to_user": true,
            "default_action": "approve_existing",
            "allow_approve": true,
            "allow_reject": true,
            "message": "Found existing code: Sensodyne (98% match)"
        }
    }

    Response (Full validation - 10% of cases):
    {
        "validation_path": "full_validation",
        "cost": 0.04,
        "time_ms": 3000,

        "user_response": "سنسوداين",
        "validation_result": {
            // Full ComprehensiveValidator result
        },

        "ui_actions": {
            "default_action": "create_new",
            "message": "New brand detected - review validation evidence"
        }
    }
    """
    start_time = time.time()

    try:
        # Initialize Pinecone-first validator
        validator = PineconeFirstValidator(
            pinecone_key=os.getenv("PINECONE_API_KEY"),
            openai_key=os.getenv("OPENAI_API_KEY")
        )

        # Run validation with Pinecone-first approach
        result = await validator.validate_with_pinecone_first(
            user_response=request.user_response,
            images=request.images or [],
            category=request.category or "Unknown",
            google_search_results=request.google_search_results,
            language_code=request.language_code
        )

        # Record metrics
        if result["validation_path"] == "pinecone_hit":
            validation_metrics.record_pinecone_hit(
                result["cost"],
                result["time_ms"]
            )
        else:
            validation_metrics.record_pinecone_miss(
                result["cost"],
                result["time_ms"]
            )

        # Log results
        logger.info(
            f"✅ Validation completed: "
            f"path={result['validation_path']}, "
            f"cost=${result['cost']}, "
            f"time={result['time_ms']}ms"
        )

        # Add stats to response
        result["system_stats"] = validation_metrics.get_stats()

        return result

    except Exception as e:
        logger.error(f"Validation error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


@app.get("/api/validation-metrics")
async def get_validation_metrics():
    """
    Get current validation metrics.

    Returns statistics about Pinecone cache performance:
    - Cache hit rate
    - Cost savings
    - Average latency
    - Total costs
    """
    return {
        "status": "success",
        "metrics": validation_metrics.get_stats(),
        "timestamp": time.time()
    }


@app.post("/api/validation-metrics/reset")
async def reset_validation_metrics():
    """Reset validation metrics counters."""
    validation_metrics.reset()
    return {
        "status": "success",
        "message": "Metrics reset successfully"
    }


@app.post("/api/validate-response-comprehensive", response_model=EnhancedValidationResult)
async def validate_response_comprehensive(
    request: ComprehensiveValidationRequest
) -> EnhancedValidationResult:
    """
    Enhanced multi-stage validation endpoint with proper UI format.

    Request example:
    {
        "user_response": "سنسوداين",
        "images": ["url1", "url2", ...],  // 6 images
        "google_search_results": {
            "query": "سنسوداين",  // IMPORTANT: Local language!
            "web_results": [...]
        },
        "language_code": "ar"  // Optional, auto-detected
    }

    Response example:
    {
        "user_response": "سنسوداين",
        "translation": "Sensodyne",
        "display_format": "سنسوداين (Sensodyne)",

        "variants": {
            "سنسوداين": 6,
            "Sensodyne": 6,
            "semosdine": 1
        },
        "primary_variant": "سنسوداين",
        "total_occurrences": 6,

        "recommendation": "approve",
        "confidence": 95,
        "reasoning": "Vision analysis confirms 6 products...",

        "vision_analysis": {...},
        "search_validation": {...},
        "translation_info": {...},

        "show_approve_button": true,
        "show_reject_button": true,
        "requires_human_review": false
    }
    """
    start_time = time.time()

    try:
        # Get API keys from environment
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        if not anthropic_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ANTHROPIC_API_KEY not configured"
            )

        # Initialize validator
        validator = ComprehensiveValidator(
            anthropic_key=anthropic_key,
            openai_key=openai_key
        )

        logger.info(
            f"Starting comprehensive validation for: {request.user_response[:50]}"
        )

        # Run validation
        result = await validator.validate_response(
            user_response=request.user_response,
            images=request.images,
            google_search_results=request.google_search_results,
            language_code=request.language_code
        )

        elapsed_ms = (time.time() - start_time) * 1000

        logger.info(
            f"Validation complete in {elapsed_ms:.0f}ms: "
            f"{result.recommendation} (confidence: {result.confidence}%)"
        )

        return result

    except Exception as e:
        logger.error(f"Comprehensive validation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


@app.post("/api/validate-response-comprehensive/ui", response_model=dict)
async def validate_response_with_ui_format(
    request: ComprehensiveValidationRequest
) -> dict:
    """
    Same as comprehensive validation but returns UI-formatted response.

    Returns structured data ready for frontend rendering including:
    - Two-column layout data
    - Variant table
    - Confidence section with colors
    - Action buttons configuration
    """
    # Get validation result
    result = await validate_response_comprehensive(request)

    # Format for UI
    formatted = UIFormatter.format_for_display(result)

    return formatted


@app.post("/api/validate-bulk", response_model=BulkValidationResponse)
async def validate_bulk_responses(
    request: BulkValidationRequest
) -> BulkValidationResponse:
    """
    Validate multiple responses in batch.

    Processes responses in parallel for efficiency.
    """
    start_time = time.time()

    try:
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")
        openai_key = os.getenv("OPENAI_API_KEY")

        if not anthropic_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="ANTHROPIC_API_KEY not configured"
            )

        validator = ComprehensiveValidator(
            anthropic_key=anthropic_key,
            openai_key=openai_key
        )

        logger.info(f"Starting bulk validation of {len(request.responses)} responses")

        results = []

        if request.parallel:
            # Parallel processing (async)
            import asyncio
            tasks = [
                validator.validate_response(
                    user_response=req.user_response,
                    images=req.images,
                    google_search_results=req.google_search_results,
                    language_code=req.language_code
                )
                for req in request.responses
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Filter out exceptions
            valid_results = [r for r in results if isinstance(r, EnhancedValidationResult)]
        else:
            # Sequential processing
            for req in request.responses:
                try:
                    result = await validator.validate_response(
                        user_response=req.user_response,
                        images=req.images,
                        google_search_results=req.google_search_results,
                        language_code=req.language_code
                    )
                    results.append(result)
                except Exception as e:
                    logger.error(f"Failed to validate response: {e}")

            valid_results = results

        # Calculate statistics
        total = len(valid_results)
        approved = sum(1 for r in valid_results if r.recommendation == "approve")
        rejected = sum(1 for r in valid_results if r.recommendation == "reject")
        requires_review = sum(1 for r in valid_results if r.requires_human_review)

        elapsed_ms = (time.time() - start_time) * 1000

        logger.info(
            f"Bulk validation complete in {elapsed_ms:.0f}ms: "
            f"{total} total, {approved} approved, {rejected} rejected"
        )

        return BulkValidationResponse(
            results=valid_results,
            total=total,
            approved=approved,
            rejected=rejected,
            requires_review=requires_review,
            processing_time_ms=elapsed_ms
        )

    except Exception as e:
        logger.error(f"Bulk validation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk validation failed: {str(e)}"
        )


# ==============================================================================
# MULTI-SOURCE BRAND VALIDATION
# ==============================================================================

class MultiSourceValidationRequest(BaseModel):
    """Request for multi-source brand validation"""
    user_response: str
    category: str
    language: str = "en"  # ✅ Changed from "ar" to match frontend default
    user_id: Optional[str] = None
    response_id: Optional[str] = None

    # API keys from Settings (override environment variables)
    google_api_key: Optional[str] = None
    google_cse_cx_id: Optional[str] = None
    pinecone_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None


class MultiSourceValidationResponse(BaseModel):
    """Response from multi-source validation"""
    type: str
    confidence: int
    reasoning: str
    ui_action: str

    # Optional fields
    brand: Optional[str] = None
    brand_id: Optional[str] = None
    descriptor: Optional[str] = None
    candidates: Optional[List[Dict[str, Any]]] = None
    detected_entity: Optional[str] = None
    detected_category: Optional[str] = None
    expected_category: Optional[str] = None

    # Sources breakdown
    sources: Dict[str, Any]

    # RAW DATA: Images, Web Results, Knowledge Graph Details
    image_urls: Optional[List[Dict[str, str]]] = None
    web_results: Optional[List[Dict[str, str]]] = None
    kg_details: Optional[Dict[str, Any]] = None

    # Metrics
    cost: float
    time_ms: int
    tier: int


def convert_numpy_types(obj):
    """
    Recursively convert numpy types to Python native types for JSON serialization.

    Handles:
    - numpy.bool_ -> bool
    - numpy.int* -> int
    - numpy.float* -> float
    - numpy.ndarray -> list
    - dict values (recursive)
    - list items (recursive)
    """
    if obj is None:
        return None

    # Check if numpy is available
    if np is not None:
        # Convert numpy scalar types
        if isinstance(obj, np.bool_):
            return bool(obj)
        if isinstance(obj, (np.integer, np.int_)):
            return int(obj)
        if isinstance(obj, (np.floating, np.float_)):
            return float(obj)
        if isinstance(obj, np.ndarray):
            return obj.tolist()

    # Recursively handle dict
    if isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}

    # Recursively handle list/tuple
    if isinstance(obj, (list, tuple)):
        return [convert_numpy_types(item) for item in obj]

    # Return as-is for other types
    return obj


@app.post("/api/validate", response_model=MultiSourceValidationResponse)
async def validate_brand_multi_source(request: MultiSourceValidationRequest):
    """
    Multi-Source Brand Validation with 6.5-tier pipeline

    Tiers:
    - Tier 0: Pinecone Vector Search (15-50ms, $0.00002)
    - Tier 1: Dual Google Images Search (500ms, FREE)
    - Tier 1.5: Web Search AI Analysis (2-3s, $0.003) - NEW!
    - Tier 2: Vision AI Analysis (2-3s, $0.012)
    - Tier 3: Knowledge Graph Verification (500ms, FREE)
    - Tier 4: Embedding Similarity (100ms, $0.00002)
    - Tier 5: Multi-Source Aggregation

    Web Search AI (Tier 1.5):
    - Uses Claude Haiku 4.5 to analyze search result titles/descriptions
    - Extracts brand names and product types from text
    - Complements Vision AI for better accuracy

    Returns validation result with type, confidence, reasoning, and sources
    """
    try:
        # Check if multi-source validation is available
        if MultiSourceValidator is None or openai is None or Pinecone is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Multi-source validation dependencies not available"
            )

        logger.info(f"🔍 Multi-source validation: '{request.user_response}' | Category: {request.category}")

        # Get API keys from request (Settings) or environment variables
        openai_api_key = request.openai_api_key or os.getenv("OPENAI_API_KEY")
        pinecone_api_key = request.pinecone_api_key or os.getenv("PINECONE_API_KEY")
        google_api_key = request.google_api_key or os.getenv("GOOGLE_API_KEY")
        google_cse_cx_id = request.google_cse_cx_id or os.getenv("GOOGLE_CSE_CX_ID")
        anthropic_api_key = request.anthropic_api_key or os.getenv("ANTHROPIC_API_KEY")

        logger.info(f"🔑 API Keys available - OpenAI: {bool(openai_api_key)}, Pinecone: {bool(pinecone_api_key)}, Google: {bool(google_api_key)}, CSE ID: {bool(google_cse_cx_id)}, Anthropic: {bool(anthropic_api_key)}")

        # Initialize APIs with request-specific keys
        openai_client = openai.OpenAI(api_key=openai_api_key)
        pinecone_client = Pinecone(api_key=pinecone_api_key)

        # Initialize validator
        validator = MultiSourceValidator(
            pinecone_client=pinecone_client,
            openai_client=openai_client,
            google_api_key=google_api_key,
            google_cse_id=google_cse_cx_id,
            gemini_api_key=google_api_key,  # Using same Google API key
            anthropic_api_key=anthropic_api_key,
        )

        # Run validation
        result = await validator.validate(
            user_text=request.user_response,
            category=request.category,
            language=request.language,
        )

        # Convert to response model (ensure numpy types are converted to Python types)
        return MultiSourceValidationResponse(
            type=result.type.value,
            confidence=float(result.confidence),
            reasoning=result.reasoning,
            ui_action=result.ui_action.value,
            brand=result.brand,
            brand_id=result.brand_id,
            descriptor=result.descriptor,
            candidates=[
                {
                    "brand": c.brand,
                    "full_name": c.full_name,
                    "score": float(c.score),
                    "vision_frequency": float(c.vision_frequency),
                    "kg_verified": bool(c.kg_verified),  # ✅ Convert numpy.bool_ to Python bool
                    "embedding_similarity": float(c.embedding_similarity),
                    "pinecone_match": bool(c.pinecone_match),  # ✅ Convert numpy.bool_ to Python bool
                }
                for c in (result.candidates or [])
            ],
            detected_entity=result.detected_entity,
            detected_category=result.detected_category,
            expected_category=result.expected_category,
            sources=convert_numpy_types(result.sources or {}),  # ✅ Convert all nested numpy types
            image_urls=convert_numpy_types(result.image_urls),
            web_results=convert_numpy_types(result.web_results),
            kg_details=convert_numpy_types(result.kg_details),
            cost=float(result.cost),
            time_ms=float(result.time_ms),
            tier=int(result.tier),
        )

    except Exception as e:
        logger.error(f"Multi-source validation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Multi-source validation failed: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    # ✅ FIX: Only enable reload in development, not production
    # reload=True causes CPU/memory overhead and can create duplicate processes
    is_production = os.getenv("ENVIRONMENT", "development").lower() == "production"
    port = int(os.getenv("PORT", 8000))

    if is_production:
        logger.info("🚀 Starting in PRODUCTION mode (reload disabled)")
    else:
        logger.info("🔧 Starting in DEVELOPMENT mode (reload enabled)")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=not is_production,  # ✅ Only reload in development
        reload_dirs=["./"] if not is_production else None,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )


"""
FastAPI microservice for AI codeframe generation.
"""
import hashlib
import logging
import os
import time
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from services.embedder import EmbeddingService
from services.clusterer import ClusteringService, ClusterConfig
from services.claude_client import ClaudeClient, ClaudeConfig
from services.mece_validator import MECEValidator
from supabase import create_client, Client
import numpy as np

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


# Initialize services at startup
claude_client: Optional[ClaudeClient] = None
mece_validator: Optional[MECEValidator] = None
supabase: Optional[Client] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle handler for FastAPI app."""
    global claude_client, mece_validator, supabase

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

    # Pre-load sentence-transformer model
    logger.info("Pre-loading sentence-transformer model...")
    EmbeddingService.get_model()
    logger.info("Model loaded successfully")

    logger.info("All services initialized. Ready to serve requests.")

    yield

    logger.info("Shutting down services...")


# Create FastAPI app
app = FastAPI(
    title="Codeframe Generation API",
    description="AI-powered codeframe generation using Claude Sonnet 4.5",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "codeframe-generation",
        "version": "1.0.0"
    }


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


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )

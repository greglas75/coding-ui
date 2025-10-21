"""
FastAPI microservice for AI codeframe generation.
"""
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

# Load environment variables
load_dotenv()

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


class CodeframeRequest(BaseModel):
    """Request body for codeframe generation."""
    cluster_texts: List[ClusterText]
    category_name: str
    category_description: str
    target_language: str = "en"
    existing_codes: Optional[List[str]] = None
    hierarchy_preference: str = "adaptive"
    algorithm_config: Optional[AlgorithmConfig] = None


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


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle handler for FastAPI app."""
    global claude_client, mece_validator

    logger.info("Initializing services...")

    # Initialize Claude client
    try:
        claude_config = ClaudeConfig(
            model=os.getenv("CLAUDE_MODEL", "claude-sonnet-4-5-20251022"),
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

        if len(request.cluster_texts) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Need at least 3 texts to generate codeframe"
            )

        # Convert Pydantic models to dicts for service layer
        cluster_texts_dict = [
            {"id": item.id, "text": item.text, "language": item.language}
            for item in request.cluster_texts
        ]

        # Step 1: Generate codeframe with Claude
        logger.info("Calling Claude API...")
        claude_result = claude_client.generate_codeframe(
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

"""
Multi-source validation endpoints.
"""
import asyncio
import logging
import os
import time
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
import numpy as np

from models.validation import (
    ComprehensiveValidationRequest,
    EnhancedValidationResult,
    BulkValidationRequest,
    BulkValidationResponse
)

# Multi-source validation imports
try:
    from validators.multi_source_validator import MultiSourceValidator
    import openai
    from pinecone import Pinecone
except ImportError as e:
    logger = logging.getLogger(__name__)
    logger.warning(f"Multi-source validation dependencies not available: {e}")
    MultiSourceValidator = None
    openai = None
    Pinecone = None

from validators.comprehensive_validator import ComprehensiveValidator
from validators.pinecone_first_validator import PineconeFirstValidator, validation_metrics
from utils.ui_formatter import UIFormatter
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ==============================================================================
# MULTI-SOURCE BRAND VALIDATION
# ==============================================================================

class MultiSourceValidationRequest(BaseModel):
    """Request for multi-source brand validation"""
    user_response: str
    category: str
    language: str = "en"
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


# ==============================================================================
# ENDPOINTS
# ==============================================================================

@router.post("/api/validate-pinecone-first")
async def validate_with_pinecone_first(
    request: ComprehensiveValidationRequest
) -> dict:
    """
    PINECONE-FIRST VALIDATION (PRIMARY ENDPOINT)

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
    """
    start_time = time.time()

    try:
        # Initialize Pinecone-first validator
        validator = PineconeFirstValidator(
            pinecone_key=settings.PINECONE_API_KEY,
            openai_key=settings.OPENAI_API_KEY
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


@router.get("/api/validation-metrics")
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


@router.post("/api/validation-metrics/reset")
async def reset_validation_metrics():
    """Reset validation metrics counters."""
    validation_metrics.reset()
    return {
        "status": "success",
        "message": "Metrics reset successfully"
    }


@router.post("/api/validate-response-comprehensive", response_model=EnhancedValidationResult)
async def validate_response_comprehensive(
    request: ComprehensiveValidationRequest
) -> EnhancedValidationResult:
    """
    Enhanced multi-stage validation endpoint with proper UI format.
    """
    start_time = time.time()

    try:
        # Get API keys from environment
        anthropic_key = settings.ANTHROPIC_API_KEY
        openai_key = settings.OPENAI_API_KEY

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


@router.post("/api/validate-response-comprehensive/ui", response_model=dict)
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


@router.post("/api/validate-bulk", response_model=BulkValidationResponse)
async def validate_bulk_responses(
    request: BulkValidationRequest
) -> BulkValidationResponse:
    """
    Validate multiple responses in batch.

    Processes responses in parallel for efficiency.
    """
    start_time = time.time()

    try:
        anthropic_key = settings.ANTHROPIC_API_KEY
        openai_key = settings.OPENAI_API_KEY

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


@router.post("/api/validate", response_model=MultiSourceValidationResponse)
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
        openai_api_key = request.openai_api_key or settings.OPENAI_API_KEY
        pinecone_api_key = request.pinecone_api_key or settings.PINECONE_API_KEY
        google_api_key = request.google_api_key or settings.GOOGLE_API_KEY
        google_cse_cx_id = request.google_cse_cx_id or settings.GOOGLE_CSE_CX_ID
        anthropic_api_key = request.anthropic_api_key or settings.ANTHROPIC_API_KEY

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
                    "kg_verified": bool(c.kg_verified),
                    "embedding_similarity": float(c.embedding_similarity),
                    "pinecone_match": bool(c.pinecone_match),
                }
                for c in (result.candidates or [])
            ],
            detected_entity=result.detected_entity,
            detected_category=result.detected_category,
            expected_category=result.expected_category,
            sources=convert_numpy_types(result.sources or {}),
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

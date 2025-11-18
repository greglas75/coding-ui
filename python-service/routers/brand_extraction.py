"""
Brand extraction and codeframe building endpoints.
"""
import asyncio
import logging
import os
import time
from functools import partial
from difflib import SequenceMatcher

from fastapi import APIRouter, HTTPException, status

from models.validation import (
    BrandExtractionRequest,
    BrandExtractionResponse,
    BrandCandidateResponse,
    BrandNormalizationRequest,
    BrandNormalizationResponse,
    BrandValidationRequest,
    BrandValidationResponse,
    BrandCodeframeRequest,
    BrandCodeframeResponse,
    ConfirmBrandRequest,
    ConfirmBrandResponse,
    EnrichBrandsRequest,
    EnrichBrandsResponse
)
from services.brand_extractor import BrandExtractor
from services.brand_cache import get_cache
from services.google_search_client import GoogleSearchClient
from services.openai_embedder import OpenAIEmbedder
from services.claude_client import ClaudeClient, ClaudeConfig
from services.brand_codeframe_builder import BrandCodeframeBuilder
from core.dependencies import (
    get_google_search_client,
    get_brand_context_fetcher,
    get_supabase,
    get_cpu_executor
)

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/extract-brands", response_model=BrandExtractionResponse)
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

        # NOTE: BrandExtractor is now created per-request (see /build_codeframe endpoint)
        # This endpoint would need the extractor instance passed in
        # For now, raising an error since this endpoint may be deprecated
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="This endpoint is deprecated. Use /api/build_codeframe instead."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting brands: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract brands: {str(e)}"
        )


@router.post("/api/normalize-brand", response_model=BrandNormalizationResponse)
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

        # NOTE: BrandExtractor is now created per-request
        # This endpoint would need the extractor instance passed in
        # For now, raising an error since this endpoint may be deprecated
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="This endpoint is deprecated. Use /api/build_codeframe instead."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error normalizing brand: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to normalize brand: {str(e)}"
        )


@router.post("/api/validate-brand", response_model=BrandValidationResponse)
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

        # NOTE: BrandExtractor is now created per-request
        # This endpoint would need the extractor instance passed in
        # For now, raising an error since this endpoint may be deprecated
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="This endpoint is deprecated. Use /api/validate for multi-source validation instead."
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error validating brand: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to validate brand: {str(e)}"
        )


@router.post("/api/build_codeframe", response_model=BrandCodeframeResponse)
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

        # Initialize clients in try block with cleanup in finally
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
            supabase = get_supabase()

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

            # Run CPU-bound codeframe building in thread pool to avoid blocking event loop
            # This prevents the server from freezing during 3-8 minute codeframe builds
            loop = asyncio.get_event_loop()
            cpu_executor = get_cpu_executor()

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
            # Clean up all client connections to prevent memory leaks
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


@router.post("/api/confirm_brand", response_model=ConfirmBrandResponse)
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


@router.post("/api/enrich_brands", response_model=EnrichBrandsResponse)
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

        # Get brand context fetcher
        brand_context_fetcher = get_brand_context_fetcher()

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

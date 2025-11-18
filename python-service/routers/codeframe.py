"""
Codeframe generation endpoints.
"""
import time
import logging

from fastapi import APIRouter, HTTPException, status

from models.codeframe import (
    CodeframeRequest,
    CodeframeResponse,
    Code,
    CodeExample,
    Theme,
    Usage,
    MECEIssueResponse
)
from services.claude_client import ClaudeClient, ClaudeConfig
from core.dependencies import get_claude_client, get_mece_validator
from core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


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


@router.post("/api/generate-codeframe", response_model=CodeframeResponse)
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
            claude_config = ClaudeConfig(
                model=settings.CLAUDE_MODEL,
                temperature=settings.CLAUDE_TEMPERATURE,
                max_tokens=settings.CLAUDE_MAX_TOKENS
            )
            client_to_use = ClaudeClient(api_key=request.anthropic_api_key, config=claude_config)
        else:
            logger.info("Using API key from .env")
            client_to_use = get_claude_client()

        claude_result = client_to_use.generate_codeframe(
            cluster_texts=cluster_texts_dict,
            category_name=request.category_name,
            category_description=request.category_description,
            target_language=request.target_language,
            existing_codes=request.existing_codes
        )

        # Step 2: Validate MECE principles
        logger.info("Validating MECE principles...")
        mece_validator = get_mece_validator()
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

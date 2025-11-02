"""
Pydantic models for comprehensive validation
"""

from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class VariantOccurrence(BaseModel):
    """Track spelling variants and their counts"""
    variant: str
    count: int
    script_type: str = Field(
        description="Script type: arabic, latin, cyrillic, etc."
    )
    is_misspelling: bool = False


class EnhancedValidationResult(BaseModel):
    """
    Comprehensive validation result with multilingual support
    """
    # Display fields
    user_response: str = Field(
        description="Original user input text, e.g., 'سنسوداين'"
    )
    translation: Optional[str] = Field(
        None,
        description="English translation, e.g., 'Sensodyne'"
    )
    display_format: str = Field(
        description="Formatted for UI display, e.g., 'سنسوداين (Sensodyne)'"
    )

    # Variant analysis
    variants: Dict[str, int] = Field(
        default_factory=dict,
        description="Map of variant -> count, e.g., {'سنسوداين': 6, 'semosdine': 1}"
    )
    primary_variant: str = Field(
        description="Most common spelling variant"
    )
    total_occurrences: int = Field(
        description="Sum of all variant occurrences"
    )

    # Validation results
    recommendation: str = Field(
        description="approve or reject"
    )
    confidence: int = Field(
        ge=0,
        le=100,
        description="Confidence score 0-100"
    )
    reasoning: str = Field(
        description="Human-readable explanation of the recommendation"
    )
    risk_factors: List[str] = Field(
        default_factory=list,
        description="List of identified risks or concerns"
    )

    # Detailed analysis
    vision_analysis: dict = Field(
        default_factory=dict,
        description="Results from vision analyzer"
    )
    search_validation: dict = Field(
        default_factory=dict,
        description="Results from search validator"
    )
    translation_info: dict = Field(
        default_factory=dict,
        description="Translation and language detection info"
    )

    # UI flags
    show_approve_button: bool = True
    show_reject_button: bool = True
    requires_human_review: bool = False

    class Config:
        json_schema_extra = {
            "example": {
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
                "reasoning": "Vision analysis confirms 6 products with brand name 'سنسوداين' (Sensodyne). Google search in Arabic returns 5 relevant results from official sources. High confidence match.",
                "risk_factors": [],
                "vision_analysis": {
                    "brand_primary": "Sensodyne",
                    "brand_local": "سنسوداين",
                    "products_identified": 6,
                    "confidence": "high"
                },
                "search_validation": {
                    "search_phrase": "سنسوداين",
                    "language": "ar",
                    "relevant_results": 5,
                    "confidence": "high",
                    "top_domains": ["sensodyne.com", "amazon.com"]
                },
                "translation_info": {
                    "detected_language": "ar",
                    "is_transliteration": True,
                    "confidence": 100
                },
                "show_approve_button": True,
                "show_reject_button": True,
                "requires_human_review": False
            }
        }


class ComprehensiveValidationRequest(BaseModel):
    """Request model for comprehensive validation"""

    user_response: str = Field(
        description="User's brand response text"
    )
    images: Optional[List[str]] = Field(
        default=[],
        description="List of image URLs or base64 strings"
    )
    google_search_results: Optional[dict] = Field(
        default=None,
        description="Google search results (must use LOCAL language query)"
    )
    category: Optional[str] = Field(
        default=None,
        description="Product category for filtering"
    )
    language_code: Optional[str] = Field(
        None,
        description="ISO 639-1 language code (auto-detected if not provided)"
    )
    metadata: Optional[dict] = Field(
        None,
        description="Additional metadata"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "user_response": "سنسوداين",
                "images": [
                    "https://example.com/image1.jpg",
                    "https://example.com/image2.jpg"
                ],
                "google_search_results": {
                    "query": "سنسوداين",
                    "web_results": [
                        {
                            "title": "Sensodyne Toothpaste",
                            "url": "https://www.sensodyne.com",
                            "snippet": "..."
                        }
                    ]
                },
                "language_code": "ar"
            }
        }


class BulkValidationRequest(BaseModel):
    """Request model for bulk validation of multiple responses"""

    responses: List[ComprehensiveValidationRequest] = Field(
        description="List of responses to validate"
    )
    parallel: bool = Field(
        default=True,
        description="Process validations in parallel"
    )


class BulkValidationResponse(BaseModel):
    """Response model for bulk validation"""

    results: List[EnhancedValidationResult] = Field(
        description="Validation results"
    )
    total: int = Field(
        description="Total number of responses validated"
    )
    approved: int = Field(
        description="Number recommended for approval"
    )
    rejected: int = Field(
        description="Number recommended for rejection"
    )
    requires_review: int = Field(
        description="Number requiring human review"
    )
    processing_time_ms: float = Field(
        description="Total processing time in milliseconds"
    )

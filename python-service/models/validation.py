"""
Pydantic models for brand validation and extraction.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


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
    context: Optional[str] = None
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
    generation_id: Optional[str] = None
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
    verified_brands: List[Dict[str, Any]]
    needs_review: List[Dict[str, Any]]
    spam_invalid: List[Dict[str, Any]]
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
    brands: List[Dict[str, str]]
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


class MultiSourceValidationRequest(BaseModel):
    """Request for multi-source brand validation"""
    user_response: str
    category: str
    language: str = "en"
    user_id: Optional[str] = None
    response_id: Optional[str] = None
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
    brand: Optional[str] = None
    brand_id: Optional[str] = None
    descriptor: Optional[str] = None
    candidates: Optional[List[Dict[str, Any]]] = None

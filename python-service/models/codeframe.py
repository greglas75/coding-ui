"""
Pydantic models for codeframe generation.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


# Import ClusterText from clustering module for CodeframeRequest
from .clustering import ClusterText, AlgorithmConfig


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

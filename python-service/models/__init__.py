"""
Pydantic models for request/response validation.
Extracted from main.py for better organization.
"""

from .embeddings import (
    EmbeddingText,
    EmbeddingRequest,
    EmbeddingItem,
    EmbeddingResponse,
)

from .clustering import (
    ClusterText,
    AlgorithmConfig,
    ClusterConfigRequest,
    ClusterRequest,
    ClusterTexts,
    ClusterData,
    ClusterResponse,
)

from .codeframe import (
    CodeframeRequest,
    CodeExample,
    Code,
    Theme,
    Usage,
    MECEIssueResponse,
    CodeframeResponse,
)

from .validation import (
    VariantOccurrence,
    EnhancedValidationResult,
    ComprehensiveValidationRequest,
    BulkValidationRequest,
    BulkValidationResponse,
)

__all__ = [
    # Embeddings
    "EmbeddingText",
    "EmbeddingRequest",
    "EmbeddingItem",
    "EmbeddingResponse",
    # Clustering
    "ClusterText",
    "AlgorithmConfig",
    "ClusterConfigRequest",
    "ClusterRequest",
    "ClusterTexts",
    "ClusterData",
    "ClusterResponse",
    # Codeframe
    "CodeframeRequest",
    "CodeExample",
    "Code",
    "Theme",
    "Usage",
    "MECEIssueResponse",
    "CodeframeResponse",
    # Validation
    "VariantOccurrence",
    "EnhancedValidationResult",
    "ComprehensiveValidationRequest",
    "BulkValidationRequest",
    "BulkValidationResponse",
]

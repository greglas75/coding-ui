"""
Pydantic models for clustering operations.
"""
from typing import List, Dict
from pydantic import BaseModel, Field


class ClusterText(BaseModel):
    """Individual text item in a cluster."""
    id: int
    text: str
    language: str = "en"


class AlgorithmConfig(BaseModel):
    """Configuration for clustering algorithm."""
    min_cluster_size: int = Field(default=5, ge=2)
    min_samples: int = Field(default=3, ge=1)


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

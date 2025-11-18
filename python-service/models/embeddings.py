"""
Pydantic models for embedding generation.
"""
from typing import List
from pydantic import BaseModel


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

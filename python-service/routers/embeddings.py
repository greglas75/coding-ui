"""
Embedding generation endpoints.
"""
import hashlib
import logging
from typing import List

from fastapi import APIRouter, HTTPException, status

from models.embeddings import (
    EmbeddingRequest,
    EmbeddingResponse,
    EmbeddingItem
)
from services.embedder import EmbeddingService

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/embeddings", response_model=EmbeddingResponse)
async def generate_embeddings(request: EmbeddingRequest):
    """
    Generate embeddings for text inputs.

    This endpoint:
    1. Receives a list of texts with IDs
    2. Generates embeddings using sentence-transformers
    3. Returns embeddings with text hashes for caching
    """
    try:
        logger.info(f"Generating embeddings for {len(request.texts)} texts")

        if not request.texts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="texts cannot be empty"
            )

        # Extract texts
        texts = [item.text for item in request.texts]

        # Generate embeddings using the embedding service
        embeddings = EmbeddingService.generate_embeddings(texts)

        # Build response with text hashes
        embedding_items = []
        for i, embedding in enumerate(embeddings):
            text_hash = hashlib.sha256(request.texts[i].text.encode('utf-8')).hexdigest()
            embedding_items.append(EmbeddingItem(
                id=request.texts[i].id,
                embedding=embedding.tolist(),
                text_hash=text_hash
            ))

        logger.info(f"Successfully generated {len(embedding_items)} embeddings")

        return EmbeddingResponse(embeddings=embedding_items)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating embeddings: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate embeddings: {str(e)}"
        )

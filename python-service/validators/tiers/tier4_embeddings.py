"""
Tier 4: Embedding Similarity Validator
Calculates semantic similarity between user text and candidates (100ms, $0.00002)
"""

import logging
from typing import Dict, List

logger = logging.getLogger(__name__)


class Tier4EmbeddingsValidator:
    """
    Tier 4: Embedding Similarity

    Calculates semantic similarity between user_text and candidate brands
    Uses OpenAI text-embedding-3-large
    Runs AFTER Vision AI to get candidates

    Cost: $0.00002 per embedding
    Time: ~100ms
    """

    def __init__(self, openai_client):
        self.openai_client = openai_client
        self.cost = 0.00002

    async def validate(
        self,
        user_text: str,
        vision_brands: List[str]
    ) -> Dict[str, float]:
        """
        Calculate embedding similarities

        Args:
            user_text: User's response text
            vision_brands: List of brand names from Vision AI

        Returns:
            Dictionary mapping brand -> similarity score
        """
        try:
            # Skip if no candidates
            if not vision_brands or vision_brands[0] == user_text:
                logger.info(f"📊 Tier 4: No Vision brands to compare")
                return {}

            from services.embeddings import EmbeddingService

            embedding_service = EmbeddingService(self.openai_client)

            embedding_similarities = await embedding_service.calculate_similarity(
                user_text,
                vision_brands
            )

            logger.info(f"📊 Tier 4: Calculated {len(embedding_similarities)} similarities")

            return embedding_similarities

        except Exception as e:
            logger.error(f"❌ Tier 4: Embeddings failed: {e}", exc_info=True)
            return {}

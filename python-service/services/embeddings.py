"""
Embedding Similarity Service

Calculates semantic similarity between user text and candidate brands

CRITICAL: Use text-embedding-3-large (dimension: 3072)
Same model as Pinecone index!
"""

import logging
from typing import List, Dict
import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    OpenAI Embeddings for semantic similarity

    Uses text-embedding-3-large for consistency with Pinecone
    """

    def __init__(self, openai_client):
        self.openai_client = openai_client
        logger.info("EmbeddingService initialized with text-embedding-3-large")

    async def calculate_similarity(
        self,
        user_text: str,
        candidate_brands: List[str]
    ) -> Dict[str, float]:
        """
        Calculate cosine similarity between user text and candidates

        Args:
            user_text: User's input (e.g., "اكسترا")
            candidate_brands: List of brand names to compare

        Returns:
            Dict mapping brand -> similarity score (0-1)

        Example:
            User: "اكسترا"
            Candidates: ["Extra", "Sensodyne Extra", "Oral-B Extra"]
            Output: {
                "Extra": 0.96,              # Very high
                "Sensodyne Extra": 0.43,    # Low
                "Oral-B Extra": 0.41         # Low
            }
        """
        logger.info(f"🔍 Embedding Similarity: '{user_text}' vs {len(candidate_brands)} candidates")

        # Generate embeddings for all texts
        all_texts = [user_text] + candidate_brands

        embeddings = await self._generate_batch_embeddings(all_texts)

        # User embedding is first
        user_embedding = embeddings[0]

        # Calculate cosine similarity for each candidate
        similarities = {}
        for i, brand in enumerate(candidate_brands):
            candidate_embedding = embeddings[i + 1]
            similarity = self._cosine_similarity(user_embedding, candidate_embedding)
            similarities[brand] = similarity

        # Log results
        for brand, sim in sorted(similarities.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {brand}: {sim:.3f}")

        return similarities

    async def _generate_batch_embeddings(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts

        CRITICAL: Must use text-embedding-3-large (dimension: 3072)
        """
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-large",
                input=texts,
                dimensions=3072,
            )

            embeddings = [data.embedding for data in response.data]
            return embeddings

        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            raise

    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """
        Calculate cosine similarity between two vectors

        Returns:
            Similarity score (0-1, where 1 is identical)
        """
        # Convert to numpy arrays
        a = np.array(vec1)
        b = np.array(vec2)

        # Cosine similarity
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            return 0.0

        similarity = dot_product / (norm_a * norm_b)

        # Clamp to [0, 1] (should already be in [-1, 1])
        return max(0.0, min(1.0, similarity))

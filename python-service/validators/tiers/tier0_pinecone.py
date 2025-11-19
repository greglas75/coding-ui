"""
Tier 0: Pinecone Vector Search Validator
Fast vector similarity search (15-50ms, $0.00002)
"""

import logging
from typing import List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class PineconeMatch:
    """Pinecone search result"""
    id: str
    name: str
    similarity: float
    namespace: str
    is_global: bool


class Tier0PineconeValidator:
    """
    Tier 0: Check Pinecone for existing matches

    Searches in:
    1. Global namespace (I don't know, None, N/A, etc.)
    2. Category-specific namespace (existing brands)

    Returns:
        PineconeMatch if similarity > 0.70, else None
    """

    def __init__(self, pinecone_client, openai_client):
        self.pinecone_client = pinecone_client
        self.openai_client = openai_client
        self.cost = 0.00002

    async def validate(
        self,
        user_text: str,
        category: str
    ) -> Optional[PineconeMatch]:
        """
        Check Pinecone for existing matches

        Args:
            user_text: User's response text
            category: Expected category

        Returns:
            PineconeMatch if found, else None
        """
        try:
            # Generate embedding for user text
            embedding = await self._generate_embedding(user_text)

            # Get index
            index = self.pinecone_client.Index("brand-codes")

            # First check global namespace
            global_results = index.query(
                vector=embedding,
                top_k=1,
                namespace="global",
                include_metadata=True,
            )

            if global_results.matches and len(global_results.matches) > 0:
                match = global_results.matches[0]
                if match.score > 0.85:  # High threshold for global codes
                    logger.info(f"✅ Tier 0: Global code matched - {match.metadata.get('name')} ({match.score:.2f})")
                    return PineconeMatch(
                        id=match.id,
                        name=match.metadata.get("name", "Unknown"),
                        similarity=match.score,
                        namespace="global",
                        is_global=True,
                    )

            # Query category-specific namespace
            category_namespace = category.lower().replace(" ", "_")
            category_results = index.query(
                vector=embedding,
                top_k=3,
                namespace=category_namespace,
                include_metadata=True,
            )

            if category_results.matches and len(category_results.matches) > 0:
                best_match = category_results.matches[0]
                if best_match.score > 0.70:  # Lower threshold for exploration
                    logger.info(f"✅ Tier 0: Brand matched - {best_match.metadata.get('name')} ({best_match.score:.2f})")
                    return PineconeMatch(
                        id=best_match.id,
                        name=best_match.metadata.get("name", "Unknown"),
                        similarity=best_match.score,
                        namespace=category_namespace,
                        is_global=False,
                    )

            logger.info("⏭️  Tier 0: No match in Pinecone")
            return None

        except Exception as e:
            logger.error(f"❌ Tier 0: Pinecone query failed: {e}")
            return None

    async def _generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding using OpenAI text-embedding-3-large

        CRITICAL: Must use text-embedding-3-large (dimension: 3072)
        Same model as Pinecone index!
        """
        try:
            response = self.openai_client.embeddings.create(
                model="text-embedding-3-large",
                input=text,
                dimensions=3072,
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"❌ Embedding generation failed: {e}")
            raise

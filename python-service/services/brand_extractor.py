"""
3-Phase Brand Extraction System using OpenAI Embeddings, Pinecone, Claude AI, and Google APIs.

PHASE 1: Embedding Indexing - Store ALL unique answers as vectors
PHASE 2: Brand Classification - AI + Google validation to mark brands
PHASE 3: Codeframe Building - Group verified brands and create centroids
"""
import hashlib
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import json

logger = logging.getLogger(__name__)


@dataclass
class AnswerEmbedding:
    """Represents an answer stored in Pinecone."""
    answer_id: str
    raw_text: str
    category: str
    is_brand: bool = False
    suggested_brand: Optional[str] = None
    confidence: float = 0.0
    verified_by: List[str] = None
    ai_reasoning: Optional[str] = None
    google_verified: bool = False

    def __post_init__(self):
        if self.verified_by is None:
            self.verified_by = []


@dataclass
class BrandCandidate:
    """Brand candidate after AI + Google validation."""
    brand_name: str
    confidence: float
    answer_count: int
    example_texts: List[str]
    verified_by: List[str]
    is_verified: bool


class BrandExtractor:
    """
    3-Phase brand extraction system.

    Architecture:
    - Phase 1: Index all unique answers to Pinecone (no brand detection yet)
    - Phase 2: Classify which indexed answers are brands using AI + Google
    - Phase 3: Build codeframe by grouping verified brands
    """

    def __init__(
        self,
        openai_embedder=None,
        claude_client=None,
        google_client=None,
        index_name: str = "tgm-brand-embeddings",
        namespace: str = "answers"
    ):
        """
        Initialize brand extractor.

        Args:
            openai_embedder: OpenAIEmbedder instance for generating embeddings
            claude_client: ClaudeClient for AI validation
            google_client: GoogleSearchClient for Google validation
            index_name: Pinecone index name
            namespace: Pinecone namespace for answer embeddings
        """
        self.embedder = openai_embedder
        self.claude = claude_client
        self.google = google_client
        self.index_name = index_name
        self.namespace = namespace

        logger.info(
            f"BrandExtractor initialized - "
            f"embedder={'✓' if openai_embedder else '✗'}, "
            f"claude={'✓' if claude_client else '✗'}, "
            f"google={'✓' if google_client else '✗'}"
        )

    # ============================================================================
    # PHASE 1: EMBEDDING INDEXING
    # ============================================================================

    def index_unique_answers(
        self,
        answers: List[Dict[str, Any]],
        category: str
    ) -> Dict[str, Any]:
        """
        PHASE 1: Index all unique answers to Pinecone WITHOUT classifying as brands yet.

        Args:
            answers: List of dicts with keys: id, text
            category: Category name (e.g., "toothpaste")

        Returns:
            Dict with indexing stats: {
                "total_answers": int,
                "unique_answers": int,
                "indexed_count": int,
                "skipped_count": int
            }
        """
        logger.info(f"📊 [PHASE 1/3] EMBEDDING INDEXING - Indexing {len(answers)} answers for category '{category}'")

        if not self.embedder or not self.embedder.pc:
            logger.error("❌ OpenAI embedder or Pinecone not configured")
            return {"error": "Embedder not configured"}

        # Deduplicate answers by text
        unique_answers = {}
        for answer in answers:
            text = answer.get('text', '').strip().lower()
            if text and text not in unique_answers:
                unique_answers[text] = answer

        logger.info(f"📝 Found {len(unique_answers)} unique answers (from {len(answers)} total)")

        # Generate embeddings in batch
        texts = list(unique_answers.keys())
        embeddings = self.embedder.generate_embeddings_batch(texts)

        # Prepare vectors for Pinecone
        vectors = []
        for i, (text, embedding) in enumerate(zip(texts, embeddings)):
            if embedding is None:
                logger.warning(f"⚠️ Failed to generate embedding for: {text[:50]}...")
                continue

            answer = unique_answers[text]
            answer_id = self._generate_answer_id(text, category)

            metadata = {
                "raw_text": answer.get('text', '').strip(),
                "category": category,
                "original_answer_id": str(answer.get('id', '')),
                "is_brand": False,  # Not classified yet
                "verified_by": [],
                "confidence": 0.0
            }

            vectors.append({
                "id": answer_id,
                "values": embedding,
                "metadata": metadata
            })

        # Upsert to Pinecone
        if vectors:
            success = self.embedder.upsert_to_pinecone(
                vectors=vectors,
                index_name=self.index_name,
                namespace=self.namespace
            )

            if success:
                logger.info(f"✅ [PHASE 1/3] Indexed {len(vectors)} unique answers to Pinecone")
            else:
                logger.error(f"❌ [PHASE 1/3] Failed to index answers to Pinecone")

        return {
            "total_answers": len(answers),
            "unique_answers": len(unique_answers),
            "indexed_count": len(vectors),
            "skipped_count": len(unique_answers) - len(vectors)
        }

    # ============================================================================
    # PHASE 2: BRAND CLASSIFICATION
    # ============================================================================

    def classify_brands(
        self,
        category: str,
        batch_size: int = 50
    ) -> List[BrandCandidate]:
        """
        PHASE 2: Classify which indexed answers are brands using AI + Google validation.

        Args:
            category: Category to classify brands for
            batch_size: Number of answers to process per batch

        Returns:
            List[BrandCandidate]: Verified brand candidates
        """
        logger.info(f"🤖 [PHASE 2/3] BRAND CLASSIFICATION - Classifying brands for category '{category}'")

        if not self.embedder or not self.embedder.index:
            logger.error("❌ Pinecone not initialized")
            return []

        # Fetch all unclassified answers from Pinecone
        all_vectors = self._fetch_all_vectors_for_category(category)
        logger.info(f"📦 Found {len(all_vectors)} vectors to classify")

        if not all_vectors:
            logger.warning(f"⚠️ No vectors found for category '{category}'. Run PHASE 1 first!")
            return []

        # Process in batches
        brand_candidates = []
        for i in range(0, len(all_vectors), batch_size):
            batch = all_vectors[i:i + batch_size]
            logger.info(f"🔄 Processing batch {i//batch_size + 1}/{(len(all_vectors)-1)//batch_size + 1}")

            for vector in batch:
                metadata = vector.get('metadata', {})
                text = metadata.get('raw_text', '')
                vector_id = vector.get('id', '')

                # Skip if already classified
                if metadata.get('is_brand'):
                    logger.debug(f"⏭️ Skipping already classified: {text[:30]}...")
                    continue

                # AI Classification
                ai_result = self._ai_classify_brand(text, category)

                if ai_result.get('is_brand'):
                    # Google Validation
                    google_result = self._google_validate_brand(
                        brand_name=ai_result.get('suggested_brand', text),
                        category=category
                    )

                    # Update metadata in Pinecone
                    updated_metadata = {
                        **metadata,
                        "is_brand": True,
                        "suggested_brand": ai_result.get('suggested_brand'),
                        "confidence": ai_result.get('confidence', 0.0),
                        "ai_reasoning": ai_result.get('reason', ''),
                        "verified_by": ["AI"] + (["Google"] if google_result.get('is_verified') else []),
                        "google_verified": google_result.get('is_verified', False)
                    }

                    # Update in Pinecone
                    self.embedder.index.update(
                        id=vector_id,
                        set_metadata=updated_metadata,
                        namespace=self.namespace
                    )

                    logger.info(f"✅ Classified as brand: {ai_result.get('suggested_brand')} (confidence: {ai_result.get('confidence'):.2f})")

        # Fetch all classified brands
        classified_brands = self._fetch_classified_brands(category)
        logger.info(f"🎯 [PHASE 2/3] Classification complete - Found {len(classified_brands)} brand candidates")

        return classified_brands

    # ============================================================================
    # PHASE 3: CODEFRAME BUILDING
    # ============================================================================

    def build_codeframe(
        self,
        category: str,
        similarity_threshold: float = 0.85
    ) -> Dict[str, Any]:
        """
        PHASE 3: Build codeframe by grouping verified brands and creating centroids.

        Args:
            category: Category to build codeframe for
            similarity_threshold: Cosine similarity threshold for grouping

        Returns:
            Dict: {
                "category": str,
                "brands": List[Dict],  # Brand codeframe
                "total_mentions": int,
                "unique_brands": int
            }
        """
        logger.info(f"📊 [PHASE 3/3] CODEFRAME BUILDING - Building codeframe for category '{category}'")

        # Fetch all classified brands
        brand_candidates = self._fetch_classified_brands(category)

        if not brand_candidates:
            logger.warning(f"⚠️ No classified brands found. Run PHASE 2 first!")
            return {
                "category": category,
                "brands": [],
                "total_mentions": 0,
                "unique_brands": 0
            }

        # Group by suggested_brand name
        brand_groups = {}
        for candidate in brand_candidates:
            brand_name = candidate.get('suggested_brand', '').lower()
            if brand_name not in brand_groups:
                brand_groups[brand_name] = []
            brand_groups[brand_name].append(candidate)

        # Build codeframe entries
        codeframe_brands = []
        for brand_name, mentions in brand_groups.items():
            # Calculate average confidence
            avg_confidence = sum(m.get('confidence', 0.0) for m in mentions) / len(mentions)

            # Get verification status
            is_google_verified = any(m.get('google_verified', False) for m in mentions)

            # Example texts
            example_texts = [m.get('raw_text', '') for m in mentions[:3]]

            codeframe_brands.append({
                "brand_name": brand_name.title(),
                "mention_count": len(mentions),
                "confidence": round(avg_confidence, 2),
                "google_verified": is_google_verified,
                "example_texts": example_texts
            })

        # Sort by mention count
        codeframe_brands.sort(key=lambda x: x['mention_count'], reverse=True)

        logger.info(f"✅ [PHASE 3/3] Codeframe built - {len(codeframe_brands)} unique brands from {len(brand_candidates)} mentions")

        return {
            "category": category,
            "brands": codeframe_brands,
            "total_mentions": len(brand_candidates),
            "unique_brands": len(codeframe_brands)
        }

    # ============================================================================
    # HELPER METHODS
    # ============================================================================

    def _generate_answer_id(self, text: str, category: str) -> str:
        """Generate unique ID for answer based on text + category."""
        content = f"{category}:{text}".encode('utf-8')
        return hashlib.md5(content).hexdigest()

    def _fetch_all_vectors_for_category(self, category: str) -> List[Dict[str, Any]]:
        """Fetch all vectors for a category from Pinecone."""
        try:
            # Pinecone doesn't have list_all, so we query with a dummy vector and high top_k
            # Better approach: Use Pinecone's list() method if available, or query in batches

            # For now, use a workaround: query with random vector and very high top_k
            import random
            dummy_vector = [random.random() for _ in range(3072)]

            results = self.embedder.index.query(
                vector=dummy_vector,
                top_k=10000,  # Max allowed
                namespace=self.namespace,
                include_metadata=True,
                filter={"category": {"$eq": category}}
            )

            vectors = []
            for match in results.matches:
                vectors.append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                })

            return vectors

        except Exception as e:
            logger.error(f"Failed to fetch vectors: {e}")
            return []

    def _fetch_classified_brands(self, category: str) -> List[Dict[str, Any]]:
        """Fetch all classified brands (is_brand=True) from Pinecone."""
        try:
            import random
            dummy_vector = [random.random() for _ in range(3072)]

            results = self.embedder.index.query(
                vector=dummy_vector,
                top_k=10000,
                namespace=self.namespace,
                include_metadata=True,
                filter={
                    "category": {"$eq": category},
                    "is_brand": {"$eq": True}
                }
            )

            brands = []
            for match in results.matches:
                brands.append({
                    **match.metadata,
                    "vector_id": match.id
                })

            return brands

        except Exception as e:
            logger.error(f"Failed to fetch classified brands: {e}")
            return []

    def _ai_classify_brand(self, text: str, category: str) -> Dict[str, Any]:
        """
        Use Claude AI to classify if text is a brand.

        Returns:
            Dict: {
                "is_brand": bool,
                "suggested_brand": str,
                "confidence": float,
                "reason": str
            }
        """
        if not self.claude:
            logger.warning("Claude client not configured - skipping AI classification")
            return {"is_brand": False, "confidence": 0.0}

        prompt = f"""You are verifying if a given text refers to a real consumer brand within the category: {category}.

Consider:
- Possible typos, translations, or variants
- Brand names vs. generic product descriptions
- Well-known international brands

Text to classify: "{text}"

Return ONLY a JSON object with this exact structure:
{{
  "is_brand": true or false,
  "suggested_brand": "Corrected Brand Name" or null,
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation"
}}"""

        try:
            response = self.claude.send_message(
                prompt,
                max_tokens=200,
                temperature=0.1
            )

            # Parse JSON response
            result = json.loads(response.strip())
            return result

        except Exception as e:
            logger.error(f"AI classification failed: {e}")
            return {"is_brand": False, "confidence": 0.0, "reason": str(e)}

    def _google_validate_brand(self, brand_name: str, category: str) -> Dict[str, Any]:
        """
        Validate brand using Google Knowledge Graph + Search.

        Returns:
            Dict: {
                "is_verified": bool,
                "confidence": float
            }
        """
        if not self.google:
            logger.warning("Google client not configured - skipping Google validation")
            return {"is_verified": False, "confidence": 0.0}

        try:
            # Use existing Google validation logic
            validation = self.google.validate_brand(
                brand_name=brand_name,
                category_description=category
            )

            return {
                "is_verified": validation.get('is_valid', False),
                "confidence": validation.get('confidence', 0.0)
            }

        except Exception as e:
            logger.error(f"Google validation failed: {e}")
            return {"is_verified": False, "confidence": 0.0}

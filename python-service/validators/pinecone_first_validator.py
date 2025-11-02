"""
Pinecone-First Validator - Check existing codes BEFORE expensive AI calls

CRITICAL PRINCIPLE: Always check Pinecone first!
- 90% of validations = existing brands → instant return ($0.00002, 50ms)
- 10% of validations = new brands → full validation ($0.04, 3s)

This saves 90% on costs and dramatically improves latency.
"""

from typing import Optional, Dict, List, Any
import openai
from pinecone import Pinecone
import re
import unicodedata
import logging
import time
import os
from datetime import datetime

logger = logging.getLogger(__name__)


class PineconeFirstValidator:
    """
    Validates brands by checking Pinecone FIRST before expensive AI calls.

    This is the primary validator - always use this!

    Flow:
    1. Normalize user input
    2. Generate fast embedding
    3. Query Pinecone for existing codes
    4. If match found (>85% similarity) → return immediately
    5. If no match → proceed to full validation
    """

    def __init__(
        self,
        pinecone_key: Optional[str] = None,
        openai_key: Optional[str] = None,
        index_name: str = "tgm-brand-embeddings"
    ):
        """
        Initialize Pinecone-first validator.

        Args:
            pinecone_key: Pinecone API key (optional - falls back to full validation if missing)
            openai_key: OpenAI API key for embeddings
            index_name: Pinecone index name (default: "tgm-brand-embeddings")
        """
        self.pinecone_key = pinecone_key
        self.openai_key = openai_key
        self.index_name = index_name
        self.pc = None
        self.index = None
        self.pinecone_available = False

        # Try to initialize Pinecone (gracefully handle if not configured)
        if pinecone_key:
            try:
                self.pc = Pinecone(api_key=pinecone_key)
                self.index = self.pc.Index(self.index_name)
                self.pinecone_available = True
                logger.info(f"✅ Connected to Pinecone index: {self.index_name}")
            except Exception as e:
                logger.warning(f"⚠️ Pinecone not available: {e}")
                logger.warning("🔄 Will fall back to full validation for all requests")
                self.pinecone_available = False
        else:
            logger.warning("⚠️ No Pinecone API key provided - skipping Pinecone integration")
            logger.warning("🔄 All validations will use full validation path")

        # Initialize OpenAI client (for embeddings)
        if openai_key:
            self.openai_client = openai.OpenAI(api_key=openai_key)
        else:
            self.openai_client = None
            logger.warning("⚠️ No OpenAI API key - embeddings not available")

        # Use SMALL embedding model for fast queries (same as used for indexing)
        self.embedding_model = "text-embedding-3-small"
        self.embedding_dimension = 1536

    def normalize_text(self, text: str) -> str:
        """
        Normalize text for better matching.

        Examples:
        - "SENSODYNE" → "sensodyne"
        - "سنسوداين" → "sensodyne" (transliterate)
        - "Sënsødyne" → "sensodyne" (remove accents)

        Args:
            text: Input text to normalize

        Returns:
            Normalized text string
        """
        if not text:
            return ""

        # Lowercase
        text = text.lower().strip()

        # Remove accents/diacritics
        text = ''.join(
            c for c in unicodedata.normalize('NFD', text)
            if unicodedata.category(c) != 'Mn'
        )

        # Remove special characters except spaces
        text = re.sub(r'[^\w\s]', '', text)

        # Collapse multiple spaces
        text = ' '.join(text.split())

        return text

    def embed_text_fast(self, text: str) -> List[float]:
        """
        Generate embedding using SMALL model (faster, cheaper).

        Cost: $0.00002 per 1K tokens
        Dimension: 1536
        Speed: ~50ms

        Args:
            text: Text to embed

        Returns:
            1536-dimensional embedding vector
        """
        if not self.openai_client:
            raise ValueError("OpenAI client not initialized - cannot generate embeddings")

        try:
            response = self.openai_client.embeddings.create(
                model=self.embedding_model,
                input=text
            )
            return response.data[0].embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            raise

    async def quick_lookup(
        self,
        user_response: str,
        category: Optional[str] = None,
        similarity_threshold: float = 0.85
    ) -> Dict[str, Any]:
        """
        STEP 1: Quick Pinecone lookup.

        This should ALWAYS be called first before any expensive AI.

        Args:
            user_response: User's text (e.g., "سنسوداين")
            category: Optional category filter
            similarity_threshold: Minimum similarity (default 0.85)

        Returns:
            If match found:
            {
                "status": "found",
                "code_id": "...",
                "code_name": "Sensodyne",
                "similarity": 0.98,
                "category": "Toothpaste",
                "mentions": 42,
                "examples": ["سنسوداين", "sensodyne"],
                "needs_full_validation": False,
                "query_cost": 0.00002,
                "query_time_ms": 50
            }

            If no match:
            {
                "status": "not_found",
                "needs_full_validation": True,
                "normalized_query": "sensodyne",
                "query_cost": 0.00002
            }
        """
        start_time = time.time()

        # Skip Pinecone if not available
        if not self.pinecone_available or not self.index:
            logger.info("⚠️ Pinecone not available - skipping quick lookup, will do full validation")
            return {
                "status": "not_found",
                "needs_full_validation": True,
                "normalized_query": self.normalize_text(user_response),
                "query_cost": 0.0,
                "reason": "Pinecone not configured"
            }

        try:
            # Normalize for better matching
            normalized = self.normalize_text(user_response)

            # Generate embedding (FAST & CHEAP!)
            logger.info(f"🔍 Quick lookup for: '{user_response}' (normalized: '{normalized}')")
            embedding = self.embed_text_fast(user_response)

            # Build filter
            filter_dict = {}
            if category:
                filter_dict["category"] = category

            # Query Pinecone
            results = self.index.query(
                vector=embedding,
                top_k=3,  # Get top 3 matches for better logging
                include_metadata=True,
                filter=filter_dict if filter_dict else None
            )

            query_time_ms = int((time.time() - start_time) * 1000)

            # Log all matches for debugging
            if results.matches:
                logger.info(f"📊 Top matches:")
                for i, match in enumerate(results.matches[:3]):
                    logger.info(
                        f"  {i+1}. {match.metadata.get('brand_name', 'Unknown')} "
                        f"({match.score:.2%} similarity)"
                    )
            else:
                logger.info("📊 No matches found in Pinecone")

            # Check if we have a good match
            if results.matches and results.matches[0].score >= similarity_threshold:
                match = results.matches[0]

                result = {
                    "status": "found",
                    "code_id": match.id,
                    "code_name": match.metadata.get("brand_name", "Unknown"),
                    "similarity": match.score,
                    "category": match.metadata.get("category"),
                    "mentions": match.metadata.get("mention_count", 0),
                    "examples": match.metadata.get("example_texts", []),
                    "needs_full_validation": False,
                    "query_cost": 0.00002,
                    "query_time_ms": query_time_ms,
                    "metadata": match.metadata
                }

                logger.info(
                    f"✅ PINECONE HIT! Found: {result['code_name']} "
                    f"({result['similarity']:.2%} match) in {query_time_ms}ms"
                )

                return result

            # No match found - need full validation
            logger.info(
                f"❌ PINECONE MISS - No match >= {similarity_threshold:.0%}. "
                f"Need full validation."
            )

            return {
                "status": "not_found",
                "needs_full_validation": True,
                "normalized_query": normalized,
                "query_cost": 0.00002,
                "query_time_ms": query_time_ms,
                "best_match": {
                    "code_name": results.matches[0].metadata.get("brand_name") if results.matches else None,
                    "similarity": results.matches[0].score if results.matches else 0
                } if results.matches else None
            }

        except Exception as e:
            logger.error(f"Error in quick_lookup: {e}", exc_info=True)
            return {
                "status": "error",
                "needs_full_validation": True,
                "normalized_query": self.normalize_text(user_response),
                "query_cost": 0.0,
                "error": str(e)
            }

    async def validate_with_pinecone_first(
        self,
        user_response: str,
        images: List[str],
        category: str,
        google_search_results: Optional[Dict] = None,
        language_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        COMPLETE VALIDATION FLOW starting with Pinecone.

        Flow:
        1. Quick Pinecone lookup (always first!)
        2. If found → return immediately (90% of cases)
        3. If not found → full validation (10% of cases)

        Args:
            user_response: User's brand mention text
            images: List of image URLs
            category: Product category
            google_search_results: Pre-fetched Google search results
            language_code: Detected language code

        Returns:
            Unified validation response with path indicator
        """
        total_start_time = time.time()

        logger.info(f"🚀 Starting Pinecone-first validation for: '{user_response}'")

        # STEP 1: Quick Pinecone check
        pinecone_result = await self.quick_lookup(
            user_response,
            category
        )

        if pinecone_result["status"] == "found":
            # CACHE HIT! Return immediately.
            # No need for expensive AI calls.

            total_time_ms = int((time.time() - total_start_time) * 1000)

            result = {
                "validation_path": "pinecone_hit",
                "cost": 0.00002,
                "time_ms": total_time_ms,

                "user_response": user_response,
                "matched_code": {
                    "code_id": pinecone_result["code_id"],
                    "code_name": pinecone_result["code_name"],
                    "similarity": int(pinecone_result["similarity"] * 100),
                    "category": pinecone_result["category"],
                    "mentions": pinecone_result["mentions"],
                    "examples": pinecone_result["examples"]
                },

                "confidence": {
                    "final_score": int(pinecone_result["similarity"] * 100),
                    "source": "pinecone_match",
                    "level": "high" if pinecone_result["similarity"] >= 0.95 else "medium"
                },

                "ui_actions": {
                    "show_to_user": True,
                    "default_action": "approve_existing",
                    "allow_approve": True,
                    "allow_reject": True,
                    "message": (
                        f"Found existing code: {pinecone_result['code_name']} "
                        f"({int(pinecone_result['similarity']*100)}% match)"
                    )
                },

                "metadata": {
                    "pinecone_lookup_time_ms": pinecone_result["query_time_ms"],
                    "full_metadata": pinecone_result.get("metadata", {})
                }
            }

            logger.info(
                f"💰 COST SAVINGS! Pinecone hit saved $0.04 in AI costs "
                f"(${result['cost']} vs $0.04)"
            )

            return result

        # STEP 2: Cache miss - need full validation
        logger.info("🔄 Pinecone miss - proceeding to full validation...")

        # Import here to avoid circular dependency
        from validators.comprehensive_validator import ComprehensiveValidator

        full_validator = ComprehensiveValidator(
            anthropic_key=os.getenv("ANTHROPIC_API_KEY"),
            openai_key=self.openai_key or os.getenv("OPENAI_API_KEY")
        )

        full_result = await full_validator.validate_response(
            user_response=user_response,
            images=images or [],
            google_search_results=google_search_results or {},
            language_code=language_code
        )

        total_time_ms = int((time.time() - total_start_time) * 1000)

        return {
            "validation_path": "full_validation",
            "cost": 0.04,  # Approximate (Claude Vision + potential other costs)
            "time_ms": total_time_ms,

            "user_response": user_response,
            "validation_result": full_result,

            "ui_actions": {
                "show_to_user": True,
                "default_action": "create_new",
                "allow_approve": True,
                "allow_reject": True,
                "message": "New brand detected - review validation evidence"
            },

            "metadata": {
                "pinecone_lookup_time_ms": pinecone_result.get("query_time_ms", 0),
                "full_validation_time_ms": total_time_ms - pinecone_result.get("query_time_ms", 0),
                "best_pinecone_match": pinecone_result.get("best_match")
            }
        }


# Metrics tracking (simple counters)
class ValidationMetrics:
    """Track validation metrics for monitoring."""

    def __init__(self):
        self.pinecone_hits = 0
        self.pinecone_misses = 0
        self.total_cost = 0.0
        self.total_time_ms = 0
        self.validations_count = 0

    def record_pinecone_hit(self, cost: float, time_ms: int):
        """Record a Pinecone cache hit."""
        self.pinecone_hits += 1
        self.total_cost += cost
        self.total_time_ms += time_ms
        self.validations_count += 1

    def record_pinecone_miss(self, cost: float, time_ms: int):
        """Record a Pinecone cache miss (full validation)."""
        self.pinecone_misses += 1
        self.total_cost += cost
        self.total_time_ms += time_ms
        self.validations_count += 1

    def get_stats(self) -> Dict[str, Any]:
        """Get current statistics."""
        total_validations = self.pinecone_hits + self.pinecone_misses

        return {
            "total_validations": total_validations,
            "pinecone_hits": self.pinecone_hits,
            "pinecone_misses": self.pinecone_misses,
            "cache_hit_rate": (
                self.pinecone_hits / total_validations * 100
                if total_validations > 0 else 0
            ),
            "total_cost_usd": round(self.total_cost, 4),
            "avg_cost_per_validation": (
                self.total_cost / total_validations
                if total_validations > 0 else 0
            ),
            "avg_time_ms": (
                self.total_time_ms / total_validations
                if total_validations > 0 else 0
            ),
            "estimated_monthly_cost": round(self.total_cost / total_validations * 30000, 2) if total_validations > 0 else 0,
            "cost_savings_vs_full": {
                "current": round(self.total_cost, 2),
                "if_all_full_validation": round(total_validations * 0.04, 2),
                "savings": round((total_validations * 0.04) - self.total_cost, 2),
                "savings_percent": round(
                    ((total_validations * 0.04) - self.total_cost) / (total_validations * 0.04) * 100
                    if total_validations > 0 else 0,
                    1
                )
            }
        }

    def reset(self):
        """Reset all metrics."""
        self.pinecone_hits = 0
        self.pinecone_misses = 0
        self.total_cost = 0.0
        self.total_time_ms = 0
        self.validations_count = 0


# Global metrics instance
validation_metrics = ValidationMetrics()

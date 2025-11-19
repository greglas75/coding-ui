"""
Multi-Source Brand Validation System (REFACTORED)

Implements 6.5-tier validation pipeline with modular tier validators:
- Tier 0: Pinecone Vector Search (15-50ms, $0.00002)
- Tier 1: Dual Google Images Search (500ms, FREE)
- Tier 1.5: Web Search AI Analysis (2-3s, $0.003)
- Tier 2: Vision AI Analysis (2-3s, $0.012)
- Tier 3: Knowledge Graph Verification (500ms, FREE)
- Tier 4: Embedding Similarity (100ms, $0.00002)
- Tier 5: Multi-Source Aggregation

CRITICAL: Use text-embedding-3-large (dimension: 3072)
"""

import time
import asyncio
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum
import logging
from utils.timer import PerformanceTimer
from validators.base_validator import BaseValidator
from validators.tiers import (
    Tier0PineconeValidator,
    Tier1_5WebAIValidator,
    Tier2VisionValidator,
    Tier3KnowledgeGraphValidator,
    Tier4EmbeddingsValidator,
)

logger = logging.getLogger(__name__)


class ValidationType(str, Enum):
    """Types of validation results"""
    GLOBAL_CODE = "global_code"  # Global code matched (I don't know, None, etc.)
    BRAND_MATCH = "brand_match"  # Existing brand matched in Pinecone
    CATEGORY_ERROR = "category_error"  # User text exists but in different category
    AMBIGUOUS_DESCRIPTOR = "ambiguous_descriptor"  # Term is product descriptor, not brand
    CLEAR_MATCH = "clear_match"  # High confidence match from multiple sources
    UNCLEAR = "unclear"  # Low confidence, needs manual review


class UIAction(str, Enum):
    """UI actions based on validation result"""
    APPROVE = "approve"  # Auto-approve
    ASK_USER_CHOOSE = "ask_user_choose"  # Show disambiguation options
    REVIEW_CATEGORY = "review_category"  # Category error - suggest change
    MANUAL_REVIEW = "manual_review"  # Unclear - flag for manual review


@dataclass
class Candidate:
    """Disambiguation candidate"""
    brand: str
    full_name: str
    score: float
    vision_frequency: float
    kg_verified: bool
    embedding_similarity: float
    pinecone_match: bool


@dataclass
class PineconeMatch:
    """Pinecone search result"""
    id: str
    name: str
    similarity: float
    namespace: str
    is_global: bool


@dataclass
class ValidationResult:
    """Complete validation result"""
    type: ValidationType
    confidence: int  # 0-100
    reasoning: str
    ui_action: UIAction

    # Optional fields based on type
    brand: Optional[str] = None
    brand_id: Optional[str] = None
    descriptor: Optional[str] = None
    candidates: Optional[List[Candidate]] = None
    detected_entity: Optional[str] = None
    detected_category: Optional[str] = None
    expected_category: Optional[str] = None

    # Source breakdown
    sources: Dict[str, Any] = None

    # RAW DATA: Images, Web Results, Knowledge Graph Details
    image_urls: Optional[List[Dict[str, str]]] = None
    web_results: Optional[List[Dict[str, str]]] = None
    kg_details: Optional[Dict[str, Any]] = None

    # Metrics
    cost: float = 0.0
    time_ms: int = 0
    tier: int = 0

    # ANALYSIS MODE: Detailed breakdown for debugging/transparency
    analysis_details: Optional[Dict[str, Any]] = None

    def __post_init__(self):
        if self.sources is None:
            self.sources = {}


class MultiSourceValidator(BaseValidator):
    """
    Multi-source brand validation with modular tier validators

    Flow:
    1. Check Pinecone (Tier 0) - instant if found
    2. Dual Google Images Search (Tier 1)
    3. Run ALL tiers in parallel (Tier 1.5, 2, 3, 4)
    4. Aggregate & Detect Patterns (Tier 5)
    """

    def __init__(
        self,
        pinecone_client,
        openai_client,
        google_api_key: str,
        google_cse_id: str,
        gemini_api_key: str,
        anthropic_api_key: str,
    ):
        super().__init__()  # Initialize base validator
        self.pinecone_client = pinecone_client
        self.openai_client = openai_client
        self.google_api_key = google_api_key
        self.google_cse_id = google_cse_id

        # Initialize tier validators
        self.tier0 = Tier0PineconeValidator(pinecone_client, openai_client)
        self.tier1_5 = Tier1_5WebAIValidator(anthropic_api_key)
        self.tier2 = Tier2VisionValidator(gemini_api_key)
        self.tier3 = Tier3KnowledgeGraphValidator(google_api_key)
        self.tier4 = Tier4EmbeddingsValidator(openai_client)

        logger.info("✅ MultiSourceValidator initialized with modular tiers")

    def analyze_web_results(self, results: List[Dict], brand: str) -> Dict[str, Any]:
        """
        Analyze web search results for brand mentions and domains

        Args:
            results: List of search results with title, snippet, url
            brand: Expected brand name

        Returns:
            Analysis with brand mentions, domains, etc.
        """
        from collections import Counter

        total = len(results)

        # Count brand mentions in titles and snippets
        brand_mentions = 0
        for result in results:
            text = f"{result.get('title', '')} {result.get('snippet', '')}".lower()
            if brand.lower() in text:
                brand_mentions += 1

        # Extract domains
        domains = []
        for result in results:
            url = result.get('url', '')
            if '://' in url:
                domain = url.split('://')[1].split('/')[0]
                domains.append(domain)

        domain_counts = Counter(domains)
        top_domains = [
            {"domain": domain, "count": count}
            for domain, count in domain_counts.most_common(5)
        ]

        return {
            "total_results": total,
            "brand_mentions": {brand: brand_mentions},
            "brand_mention_rate": round(brand_mentions / total * 100, 1) if total > 0 else 0,
            "top_domains": top_domains,
            "unique_domains": len(domain_counts)
        }

    async def validate(
        self,
        user_text: str,
        category: str,
        language: str = "en"
    ) -> ValidationResult:
        """
        Main validation entry point with parallel tier execution

        Args:
            user_text: User's response text (e.g., "اكسترا")
            category: Expected category (e.g., "Toothpaste")
            language: Language code (e.g., "ar", "pl", "en")

        Returns:
            ValidationResult with type, confidence, reasoning, and sources
        """
        start_time = time.time()
        total_cost = 0.0
        timer = PerformanceTimer()

        logger.info(f"🔍 Validating: '{user_text}' | Category: {category} | Language: {language}")

        # TIER 0: Check Pinecone first
        with timer.measure("tier_0_pinecone"):
            pinecone_result = await self.tier0.validate(user_text, category)
        total_cost += self.tier0.cost

        if pinecone_result:
            elapsed_ms = int((time.time() - start_time) * 1000)

            # Check if it's a global code
            if pinecone_result.is_global:
                logger.info(f"✅ Tier 0: Global code matched - {pinecone_result.name}")
                timer.print_summary()
                return ValidationResult(
                    type=ValidationType.GLOBAL_CODE,
                    confidence=100,
                    reasoning=f"Matched global code: {pinecone_result.name}",
                    ui_action=UIAction.APPROVE,
                    brand=pinecone_result.name,
                    brand_id=pinecone_result.id,
                    sources={
                        "pinecone": {
                            "match": True,
                            "similarity": pinecone_result.similarity,
                            "namespace": pinecone_result.namespace,
                            "is_global": True,
                        }
                    },
                    cost=total_cost,
                    time_ms=elapsed_ms,
                    tier=0,
                )

            # Existing brand match
            if pinecone_result.similarity > 0.85:
                logger.info(f"✅ Tier 0: Brand matched - {pinecone_result.name} ({pinecone_result.similarity:.2f})")
                timer.print_summary()
                return ValidationResult(
                    type=ValidationType.BRAND_MATCH,
                    confidence=int(pinecone_result.similarity * 100),
                    reasoning=f"Matched existing brand with {pinecone_result.similarity:.2f} similarity",
                    ui_action=UIAction.APPROVE,
                    brand=pinecone_result.name,
                    brand_id=pinecone_result.id,
                    sources={
                        "pinecone": {
                            "match": True,
                            "similarity": pinecone_result.similarity,
                            "namespace": pinecone_result.namespace,
                            "is_global": False,
                        }
                    },
                    cost=total_cost,
                    time_ms=elapsed_ms,
                    tier=0,
                )

        logger.info("⏭️  Tier 0: No match in Pinecone, continuing to Tier 1...")

        # TIER 1: Dual Google Images Search
        from services.google_images import GoogleImagesSearch

        with timer.measure("tier_1_google_search"):
            google_search = GoogleImagesSearch(self.google_api_key, self.google_cse_id)
            dual_results = await google_search.dual_images_search(user_text, category, language)

        logger.info(f"📊 Tier 1: Pattern detected - {dual_results.pattern}")

        # PARALLEL GROUP: Run ALL TIERS in parallel
        logger.info("🚀 [OPTIMIZATION] Running ALL TIERS in PARALLEL (Web AI + Vision AI + KG + Embeddings)...")

        with timer.measure("parallel_all_tiers"):
            # Execute Tier 1.5, 2, 3 in parallel (Tier 4 runs after Vision results)
            results_tuple = await asyncio.gather(
                self.tier1_5.validate(dual_results.search_a_results, dual_results.search_b_results, category),
                self.tier2.validate(dual_results.search_a_results, dual_results.search_b_results, category),
                self.tier3.validate(user_text, category),
            )
            (web_brands_a, web_brands_b), (vision_results, vision_brands_a, vision_brands_b, all_image_urls), kg_results = results_tuple

        total_cost += self.tier1_5.cost  # Web AI cost
        total_cost += len(all_image_urls) * self.tier2.cost_per_image  # Vision AI cost

        # TIER 4 (Post-parallel): Calculate Embeddings for Vision brands
        with timer.measure("tier_4_embeddings_post"):
            vision_brands = list(vision_results.brand_frequencies.keys()) if hasattr(vision_results, 'brand_frequencies') else []
            embedding_similarities = await self.tier4.validate(user_text, vision_brands)
            if embedding_similarities:
                total_cost += self.tier4.cost

        # TIER 5: Multi-Source Aggregation & Pattern Detection
        from validators.pattern_detector import PatternDetector

        with timer.measure("tier_5_pattern_detection"):
            pattern_detector = PatternDetector()

            # Prepare raw data for pattern detector
            raw_image_urls = []
            for result in dual_results.search_a_results[:5] + dual_results.search_b_results[:5]:
                raw_image_urls.append({
                    "url": result.url,
                    "title": result.title,
                    "thumbnail_url": result.thumbnail_url or result.url,
                    "context_link": result.context_link,
                    "snippet": result.snippet,
                })

            raw_web_results = []
            raw_web_results_a = []
            raw_web_results_b = []
            for result in dual_results.search_a_results:
                item = {
                    "title": result.title,
                    "snippet": result.snippet,
                    "url": result.context_link,
                }
                raw_web_results.append(item)
                raw_web_results_a.append(item)
            for result in dual_results.search_b_results:
                item = {
                    "title": result.title,
                    "snippet": result.snippet,
                    "url": result.context_link,
                }
                raw_web_results.append(item)
                raw_web_results_b.append(item)

            # Analyze web search results for Tier 1 breakdown
            web_analysis_a = self.analyze_web_results(raw_web_results_a, user_text)
            web_analysis_b = self.analyze_web_results(raw_web_results_b, user_text)

            # Extract KG details with error flags
            expected_entity = vision_results.dominant_brand if hasattr(vision_results, 'dominant_brand') else None
            raw_kg_details = self.tier3.extract_kg_details(kg_results, expected_entity)

            # Run pattern detection
            final_result = pattern_detector.detect_pattern(
                user_text=user_text,
                category=category,
                pinecone_match=pinecone_result,
                dual_search_results=dual_results,
                vision_results=vision_results,
                vision_brands_a=vision_brands_a,
                vision_brands_b=vision_brands_b,
                web_brands_a=web_brands_a,
                web_brands_b=web_brands_b,
                kg_results=kg_results,
                embedding_similarities=embedding_similarities,
                raw_image_urls=raw_image_urls,
                raw_web_results=raw_web_results,
                raw_kg_details=raw_kg_details,
            )

        # Add Tier 1 web search breakdown to sources
        final_result.sources["tier_1_web_search"] = {
            "search_a": {
                "query": user_text,
                "analysis": web_analysis_a,
                "results": raw_web_results_a
            },
            "search_b": {
                "query": f"{user_text} {category}",
                "analysis": web_analysis_b,
                "results": raw_web_results_b
            }
        }

        # Add cost and time metrics
        elapsed_ms = int((time.time() - start_time) * 1000)
        final_result.cost = total_cost
        final_result.time_ms = elapsed_ms

        # Extract performance breakdown
        performance_breakdown = self._extract_performance_breakdown(timer, total_cost)
        final_result.sources["performance_breakdown"] = performance_breakdown

        logger.info(
            f"✅ Final Result: {final_result.type} | "
            f"Confidence: {final_result.confidence}% | "
            f"Action: {final_result.ui_action} | "
            f"Time: {elapsed_ms}ms | Cost: ${total_cost:.5f}"
        )

        # Print performance summary
        timer.print_summary()

        return final_result

    def _extract_performance_breakdown(self, timer: Any, total_cost: float) -> Dict[str, Any]:
        """
        Extract performance metrics from timer and calculate costs per tier

        Returns breakdown with time and cost for each tier
        """
        # Get timing data from PerformanceTimer
        timings = {}
        if hasattr(timer, 'timings'):
            for operation, times_list in timer.timings.items():
                timings[operation] = sum(times_list)

        breakdown = {
            "tiers": [],
            "total_time_ms": 0,
            "total_cost": total_cost
        }

        # Map timer labels to tier info
        tier_config = [
            {"name": "Tier 0: Pinecone Search", "timer_key": "tier_0_pinecone", "cost": 0.00002, "color": "blue"},
            {"name": "Tier 1: Web Search", "timer_key": "tier_1_dual_search", "cost": 0.0, "color": "sky"},
            {"name": "Tier 1.5: Web Search AI", "timer_key": "tier_1.5_web_ai", "cost": 0.003, "color": "purple"},
            {"name": "Tier 2: Vision AI", "timer_key": "tier_2_vision_ai", "cost": 0.012, "color": "indigo"},
            {"name": "Tier 3: Knowledge Graph", "timer_key": "tier_3_kg", "cost": 0.0, "color": "green"},
            {"name": "Tier 4: Embeddings", "timer_key": "tier_4_embeddings_post", "cost": 0.00002, "color": "orange"},
            {"name": "Tier 5: Pattern Detection", "timer_key": "tier_5_pattern_detection", "cost": 0.0, "color": "slate"}
        ]

        total_ms = 0

        for tier in tier_config:
            time_ms = timings.get(tier["timer_key"], 0)

            if time_ms > 0:
                total_ms += time_ms

                breakdown["tiers"].append({
                    "name": tier["name"],
                    "time_ms": int(time_ms),
                    "time_seconds": round(time_ms / 1000, 2),
                    "cost": tier["cost"],
                    "percentage": 0,  # Will calculate after
                    "color": tier["color"]
                })

        # Calculate percentages
        if total_ms > 0:
            for tier in breakdown["tiers"]:
                tier["percentage"] = round((tier["time_ms"] / total_ms) * 100, 1)

        breakdown["total_time_ms"] = int(total_ms)
        breakdown["total_time_seconds"] = round(total_ms / 1000, 2)

        return breakdown

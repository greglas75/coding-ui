"""
Multi-Source Brand Validation System

Implements 6.5-tier validation pipeline:
- Tier 0: Pinecone Vector Search (15-50ms, $0.00002)
- Tier 1: Dual Google Images Search (500ms, FREE)
- Tier 1.5: Web Search AI Analysis (2-3s, $0.003) - NEW!
- Tier 2: Vision AI Analysis (2-3s, $0.012)
- Tier 3: Knowledge Graph Verification (500ms, FREE)
- Tier 4: Embedding Similarity (100ms, $0.00002)
- Tier 5: Multi-Source Aggregation

Web Search AI (Tier 1.5):
- Uses Claude Haiku 4.5 to analyze Google search titles/descriptions
- Extracts brand names and product types from text
- Filters by product type like Vision AI
- Cost: ~$0.003 per validation (12 results)
- Time: ~2-3 seconds (parallel processing)

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
    image_urls: Optional[List[Dict[str, str]]] = None  # List of {url, title, thumbnail_url, context_link}
    web_results: Optional[List[Dict[str, str]]] = None  # List of {title, snippet, url}
    kg_details: Optional[Dict[str, Any]] = None  # Full Knowledge Graph entity details

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
    Multi-source brand validation with intelligent pattern detection

    Flow:
    1. Check Pinecone (Tier 0) - instant if found
    2. Dual Google Images Search (Tier 1)
    3. Web Search AI Analysis (Tier 1.5) - NEW! Analyze titles/descriptions
    4. Vision AI Analysis (Tier 2) - Analyze images
    5. Knowledge Graph Verification (Tier 3)
    6. Embedding Similarity (Tier 4)
    7. Aggregate & Detect Patterns (Tier 5)
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
        self.gemini_api_key = gemini_api_key
        self.anthropic_api_key = anthropic_api_key

        # Cost tracking
        self.cost_pinecone_query = 0.00002
        self.cost_embedding = 0.00002
        self.cost_vision_per_image = 0.001  # Approximate

        logger.info("MultiSourceValidator initialized")

    def analyze_web_results(self, results: List[Dict], brand: str) -> Dict[str, Any]:
        """
        Analyze web search results for brand mentions and domains.

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
            "brand_mentions": {
                brand: brand_mentions
            },
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
            pinecone_result = await self._check_pinecone(user_text, category)
        total_cost += self.cost_pinecone_query

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

        # ═══════════════════════════════════════════════
        # PARALLEL GROUP: ALL TIERS TOGETHER!
        # Run Web AI, Vision AI, KG, and Embeddings ALL IN PARALLEL
        # Each tier is independent and analyzes user_text
        # ═══════════════════════════════════════════════

        logger.info("🚀 [OPTIMIZATION] Running ALL TIERS in PARALLEL (Web AI + Vision AI + KG + Embeddings)...")

        async def run_web_ai():
            """Tier 1.5: Web Search AI Analysis"""
            try:
                from services.web_search_ai import WebSearchAIService

                web_ai = WebSearchAIService(self.anthropic_api_key)

                # Convert image search results to format for web AI
                search_a_web_results = [
                    {
                        "title": r.title,
                        "description": r.snippet,
                        "url": r.context_link,
                    }
                    for r in dual_results.search_a_results[:12]
                ]

                search_b_web_results = [
                    {
                        "title": r.title,
                        "description": r.snippet,
                        "url": r.context_link,
                    }
                    for r in dual_results.search_b_results[:12]
                ]

                # Analyze both searches in parallel
                logger.info(f"📊 Tier 1.5: Analyzing web search results with Haiku 4.5...")
                web_analysis_a, web_analysis_b = await asyncio.gather(
                    web_ai.batch_analyze(search_a_web_results),
                    web_ai.batch_analyze(search_b_web_results)
                )

                # Aggregate results with product type filtering
                web_brands_a = web_ai.aggregate_results(
                    search_a_web_results,
                    web_analysis_a,
                    user_category=category
                )

                web_brands_b = web_ai.aggregate_results(
                    search_b_web_results,
                    web_analysis_b,
                    user_category=category
                )

                logger.info(
                    f"📊 Tier 1.5: Web AI Analysis | "
                    f"Search A: {web_brands_a['correct_matches']}/{web_brands_a['total_results']} correct | "
                    f"Search B: {web_brands_b['correct_matches']}/{web_brands_b['total_results']} correct | "
                    f"Brands detected: {list(web_brands_b['brands'].keys())}"
                )

                return web_brands_a, web_brands_b
            except Exception as e:
                logger.error(f"⚠️  Web AI failed with error: {e}", exc_info=True)
                return None, None

        async def run_vision_ai():
            """Tier 2: Vision AI Analysis"""
            from services.vision_ai import GeminiVisionAnalyzer

            vision_analyzer = GeminiVisionAnalyzer(self.gemini_api_key)

            # Combine image URLs from both searches (5 + 5 = 10)
            all_image_urls = [r.url for r in dual_results.search_a_results[:5]]
            all_image_urls += [r.url for r in dual_results.search_b_results[:5]]

            vision_results = await vision_analyzer.batch_vision_analysis(all_image_urls)

            logger.info(
                f"📊 Tier 2: Analyzed {vision_results.total_products} products | "
                f"Dominant: {vision_results.dominant_brand} ({vision_results.dominant_frequency:.1%})"
            )

            # CRITICAL: Filter vision results by product type!
            vision_results_a_dicts = []
            vision_results_b_dicts = []

            # ✅ FIX: Split based on actual number of images from Search A (5)
            # This must match the [:5] limit on line 358
            search_a_image_count = len(dual_results.search_a_results[:5])

            for i, result in enumerate(vision_results.results):
                result_dict = {
                    "brand": result.brand,
                    "product_type": result.product_type,
                    "variant": result.variant,
                    "confidence": result.confidence,
                    "is_product": result.is_product,
                }
                # First N are from Search A, rest from Search B
                if i < search_a_image_count:
                    vision_results_a_dicts.append(result_dict)
                else:
                    vision_results_b_dicts.append(result_dict)

            # Aggregate with product type filtering
            vision_brands_a = vision_analyzer.aggregate_results(
                vision_results_a_dicts,
                user_category=category
            )

            vision_brands_b = vision_analyzer.aggregate_results(
                vision_results_b_dicts,
                user_category=category
            )

            logger.info(
                f"📊 Product Type Filtering: "
                f"Search A: {vision_brands_a['correct_matches']}/{vision_brands_a['total_images']} correct type | "
                f"Search B: {vision_brands_b['correct_matches']}/{vision_brands_b['total_images']} correct type | "
                f"Total mismatches: {vision_brands_a['mismatched_count'] + vision_brands_b['mismatched_count']}"
            )

            return vision_results, vision_brands_a, vision_brands_b, all_image_urls

        async def run_knowledge_graph():
            """Tier 3: Knowledge Graph Verification (INDEPENDENT)"""
            from services.knowledge_graph import KnowledgeGraphService

            kg_service = KnowledgeGraphService(self.google_api_key)
            # KG verifies ONLY user_text (no dependency on Vision/Web results!)
            kg_results = await kg_service.batch_query([user_text], category)

            logger.info(f"📊 Tier 3: Verified {sum(1 for r in kg_results.values() if r and r.verified)}/1 entities")

            return kg_results

        async def run_embeddings():
            """Tier 4: Embedding Similarity (INDEPENDENT - skipped for now)"""
            # Embeddings need candidates to compare, but we don't have them yet
            # We'll skip embeddings in parallel execution
            # Pattern Detector will handle similarity on final brands
            logger.info(f"📊 Tier 4: Skipped (no candidates yet)")
            return {}, False

        # Execute ALL TIERS in PARALLEL!
        with timer.measure("parallel_all_tiers"):
            results_tuple = await asyncio.gather(
                run_web_ai(),
                run_vision_ai(),
                run_knowledge_graph(),
                run_embeddings()
            )
            logger.info(f"🐛 DEBUG: results_tuple = {[type(r) for r in results_tuple]}")
            logger.info(f"🐛 DEBUG: results_tuple[0] (web_ai) = {results_tuple[0]}")
            (web_brands_a, web_brands_b), (vision_results, vision_brands_a, vision_brands_b, all_image_urls), kg_results, (embedding_similarities, embedding_calculated) = results_tuple

        total_cost += 0.003  # Web AI cost
        total_cost += len(all_image_urls) * self.cost_vision_per_image  # Vision AI cost

        # ═══════════════════════════════════════════════
        # TIER 4 (Post-parallel): Calculate Embeddings for Vision brands
        # ═══════════════════════════════════════════════

        # Now that we have Vision results, calculate embeddings
        with timer.measure("tier_4_embeddings_post"):
            from services.embeddings import EmbeddingService

            embedding_service = EmbeddingService(self.openai_client)

            # Collect unique brands from Vision
            vision_brands = list(vision_results.brand_frequencies.keys())
            if vision_brands and vision_brands[0] != user_text:
                embedding_similarities = await embedding_service.calculate_similarity(
                    user_text,
                    vision_brands
                )
                logger.info(f"📊 Tier 4 (post): Calculated {len(embedding_similarities)} similarities")
                total_cost += self.cost_embedding
            else:
                embedding_similarities = {}
                logger.info(f"📊 Tier 4 (post): No Vision brands to compare")

        # TIER 5: Multi-Source Aggregation & Pattern Detection
        from validators.pattern_detector import PatternDetector

        with timer.measure("tier_5_pattern_detection"):
            pattern_detector = PatternDetector()

            # ✅ FIX: Only include images that were analyzed by Vision AI (5+5=10)
            # This matches the images sent to Vision AI on line 358-359
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
                    "url": result.context_link,  # Use context_link as the web page URL
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

            # Collect Knowledge Graph details WITH ERROR FLAGS
            raw_kg_details = {}

            # Get expected entity from vision results for error detection
            expected_entity = None
            if vision_results and hasattr(vision_results, 'dominant_brand'):
                expected_entity = vision_results.dominant_brand

            for entity, kg_result in kg_results.items():
                if kg_result:
                    # Determine if this is an error or warning
                    is_wrong_entity = False
                    is_category_mismatch = False

                    # Check if KG returned wrong entity
                    if expected_entity:
                        kg_name = kg_result.name if hasattr(kg_result, 'name') else None
                        # Wrong entity if KG returned different brand than expected
                        if kg_name and kg_name.lower() != expected_entity.lower():
                            is_wrong_entity = True

                    # Check category mismatch
                    if hasattr(kg_result, 'matches_user_category'):
                        is_category_mismatch = not bool(kg_result.matches_user_category)  # Convert to Python bool FIRST

                    # Determine error type
                    error_type = None
                    if is_wrong_entity:
                        error_type = "wrong_entity"
                    elif is_category_mismatch:
                        error_type = "category_mismatch"

                    raw_kg_details[entity] = {
                        "name": kg_result.name,
                        "entity_type": kg_result.entity_type,
                        "category": kg_result.category,
                        "description": kg_result.description,
                        "verified": bool(kg_result.verified),  # Convert to Python bool
                        "matches_user_category": bool(kg_result.matches_user_category),  # Convert to Python bool
                        # NEW ERROR FLAGS:
                        "is_error": bool(is_wrong_entity),  # Convert to Python bool
                        "is_warning": bool(is_category_mismatch and not is_wrong_entity),  # Convert to Python bool
                        "expected_entity": expected_entity if is_wrong_entity else None,
                        "error_type": error_type,
                    }

            logger.info(f"🐛 DEBUG BEFORE detect_pattern: web_brands_a={type(web_brands_a)}, web_brands_b={type(web_brands_b)}")
            logger.info(f"🐛 DEBUG: Calling with web_brands_a keys: {web_brands_a.keys() if web_brands_a else 'None'}")
            logger.info(f"🐛 DEBUG: Calling with web_brands_b keys: {web_brands_b.keys() if web_brands_b else 'None'}")
            import inspect
            sig = inspect.signature(pattern_detector.detect_pattern)
            logger.info(f"🐛 DEBUG: detect_pattern signature: {sig}")
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

        # Extract performance breakdown from timer
        performance_breakdown = self._extract_performance_breakdown(
            timer=timer,
            total_cost=total_cost
        )
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

    async def _check_pinecone(
        self,
        user_text: str,
        category: str
    ) -> Optional[PineconeMatch]:
        """
        TIER 0: Check Pinecone for existing matches

        Searches in:
        1. Global namespace (I don't know, None, N/A, etc.)
        2. Category-specific namespace (existing brands)

        Returns:
            PineconeMatch if similarity > 0.70, else None
        """
        try:
            # Generate embedding for user text
            embedding = await self._generate_embedding(user_text)

            # First check global namespace
            index = self.pinecone_client.Index("brand-codes")

            # Query global namespace
            global_results = index.query(
                vector=embedding,
                top_k=1,
                namespace="global",
                include_metadata=True,
            )

            if global_results.matches and len(global_results.matches) > 0:
                match = global_results.matches[0]
                if match.score > 0.85:  # High threshold for global codes
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
                    return PineconeMatch(
                        id=best_match.id,
                        name=best_match.metadata.get("name", "Unknown"),
                        similarity=best_match.score,
                        namespace=category_namespace,
                        is_global=False,
                    )

            return None

        except Exception as e:
            logger.error(f"Pinecone query failed: {e}")
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
            logger.error(f"Embedding generation failed: {e}")
            raise

    def _extract_performance_breakdown(
        self,
        timer: Any,
        total_cost: float
    ) -> Dict[str, Any]:
        """
        Extract performance metrics from timer and calculate costs per tier.

        Returns breakdown with time and cost for each tier.
        """
        # Get timing data from PerformanceTimer
        timings = {}
        if hasattr(timer, 'timings'):
            # Sum up all measurements for each operation
            for operation, times_list in timer.timings.items():
                timings[operation] = sum(times_list)

        breakdown = {
            "tiers": [],
            "total_time_ms": 0,
            "total_cost": total_cost
        }

        # Map timer labels to tier info
        tier_config = [
            {
                "name": "Tier 0: Pinecone Search",
                "timer_key": "tier_0_pinecone",
                "cost": 0.00002,
                "color": "blue"
            },
            {
                "name": "Tier 1: Web Search",
                "timer_key": "tier_1_dual_search",
                "cost": 0.0,
                "color": "sky"
            },
            {
                "name": "Tier 1.5: Web Search AI",
                "timer_key": "tier_1.5_web_ai",
                "cost": 0.003,
                "color": "purple"
            },
            {
                "name": "Tier 2: Vision AI",
                "timer_key": "tier_2_vision_ai",
                "cost": 0.012,
                "color": "indigo"
            },
            {
                "name": "Tier 3: Knowledge Graph",
                "timer_key": "tier_3_kg",
                "cost": 0.0,
                "color": "green"
            },
            {
                "name": "Tier 4: Embeddings",
                "timer_key": "tier_4_embeddings_post",
                "cost": 0.00002,
                "color": "orange"
            },
            {
                "name": "Tier 5: Pattern Detection",
                "timer_key": "tier_5_pattern_detection",
                "cost": 0.0,
                "color": "slate"
            }
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

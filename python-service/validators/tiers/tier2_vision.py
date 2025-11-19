"""
Tier 2: Vision AI Analysis Validator
Uses Gemini to analyze product images (2-3s, $0.012)
"""

import logging
from typing import Dict, List, Any

logger = logging.getLogger(__name__)


class Tier2VisionValidator:
    """
    Tier 2: Vision AI Analysis

    Analyzes product images from Google Image Search
    Extracts brand names, product types, variants
    Filters by product type to reduce false positives

    Cost: ~$0.001 per image (10 images = $0.010)
    Time: ~2-3 seconds (parallel batch processing)
    """

    def __init__(self, gemini_api_key: str):
        self.gemini_api_key = gemini_api_key
        self.cost_per_image = 0.001

    async def validate(
        self,
        search_a_results: List[Any],
        search_b_results: List[Any],
        category: str
    ) -> tuple[Any, Dict, Dict, List[str]]:
        """
        Analyze product images with Gemini Vision AI

        Args:
            search_a_results: Image results from Search A (user_text)
            search_b_results: Image results from Search B (user_text + category)
            category: Expected product category

        Returns:
            (vision_results, vision_brands_a, vision_brands_b, all_image_urls)
        """
        try:
            from services.vision_ai import GeminiVisionAnalyzer

            vision_analyzer = GeminiVisionAnalyzer(self.gemini_api_key)

            # Combine image URLs from both searches (5 + 5 = 10)
            all_image_urls = [r.url for r in search_a_results[:5]]
            all_image_urls += [r.url for r in search_b_results[:5]]

            logger.info(f"📊 Tier 2: Analyzing {len(all_image_urls)} images with Gemini Vision AI...")
            vision_results = await vision_analyzer.batch_vision_analysis(all_image_urls)

            logger.info(
                f"📊 Tier 2: Analyzed {vision_results.total_products} products | "
                f"Dominant: {vision_results.dominant_brand} ({vision_results.dominant_frequency:.1%})"
            )

            # Split results based on actual number of images from Search A (5)
            search_a_image_count = len(search_a_results[:5])

            vision_results_a_dicts = []
            vision_results_b_dicts = []

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
                f"📊 Tier 2: Product Type Filtering | "
                f"Search A: {vision_brands_a['correct_matches']}/{vision_brands_a['total_images']} correct type | "
                f"Search B: {vision_brands_b['correct_matches']}/{vision_brands_b['total_images']} correct type | "
                f"Total mismatches: {vision_brands_a['mismatched_count'] + vision_brands_b['mismatched_count']}"
            )

            return vision_results, vision_brands_a, vision_brands_b, all_image_urls

        except Exception as e:
            logger.error(f"❌ Tier 2: Vision AI failed: {e}", exc_info=True)
            # Return empty results on failure
            class EmptyVisionResults:
                total_products = 0
                dominant_brand = None
                dominant_frequency = 0.0
                brand_frequencies = {}
                results = []

            return EmptyVisionResults(), {}, {}, []

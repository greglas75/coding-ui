"""
Tier 1.5: Web Search AI Analysis Validator
Uses Claude Haiku to analyze web search results (2-3s, $0.003)
"""

import logging
import asyncio
from typing import Dict, List, Optional, Any

logger = logging.getLogger(__name__)


class Tier1_5WebAIValidator:
    """
    Tier 1.5: Web Search AI Analysis

    Uses Claude Haiku 4.5 to analyze Google search titles/descriptions
    Extracts brand names and product types from text
    Filters by product type like Vision AI

    Cost: ~$0.003 per validation (12 results)
    Time: ~2-3 seconds (parallel processing)
    """

    def __init__(self, anthropic_api_key: str):
        self.anthropic_api_key = anthropic_api_key
        self.cost = 0.003

    async def validate(
        self,
        search_a_results: List[Any],
        search_b_results: List[Any],
        category: str
    ) -> tuple[Optional[Dict], Optional[Dict]]:
        """
        Analyze web search results with Claude Haiku

        Args:
            search_a_results: Results from Search A (user_text)
            search_b_results: Results from Search B (user_text + category)
            category: Expected product category

        Returns:
            (web_brands_a, web_brands_b) dictionaries with brand analysis
        """
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
                for r in search_a_results[:12]
            ]

            search_b_web_results = [
                {
                    "title": r.title,
                    "description": r.snippet,
                    "url": r.context_link,
                }
                for r in search_b_results[:12]
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
            logger.error(f"❌ Tier 1.5: Web AI failed with error: {e}", exc_info=True)
            return None, None

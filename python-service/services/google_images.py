"""
Google Custom Search API - Dual Images Search

CRITICAL IMPLEMENTATION:
- Search A: User text ONLY (no category) - detects what word means in general
- Search B: User text + translated category - checks if exists in category

This dual approach is critical for detecting category errors!
"""

import logging
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass
import httpx

logger = logging.getLogger(__name__)


@dataclass
class ImageSearchResult:
    """Single image search result"""
    url: str
    title: str
    snippet: str
    context_link: str
    thumbnail_url: Optional[str] = None


@dataclass
class DualSearchResults:
    """Results from both searches"""
    search_a_results: List[ImageSearchResult]  # User text only
    search_b_results: List[ImageSearchResult]  # User text + category
    search_a_count: int
    search_b_count: int
    pattern: str  # "category_error", "multiple_brands", "clear", "unclear"


class GoogleImagesSearch:
    """
    Google Custom Search JSON API for image search

    CRITICAL RULES:
    - Search A: NEVER add category (pure user text)
    - Search B: ALWAYS add translated category
    - Return exactly 6 images per search (not 10, not 20)
    """

    def __init__(self, api_key: str, cse_id: str):
        self.api_key = api_key
        self.cse_id = cse_id
        self.base_url = "https://www.googleapis.com/customsearch/v1"

    async def dual_images_search(
        self,
        user_text: str,
        category: str,
        language: str = "en"
    ) -> DualSearchResults:
        """
        Execute dual Google Images search

        Search A: Pure user text (detects general meaning)
        Search B: User text + category (checks category-specific)

        Args:
            user_text: User's input (e.g., "اكسترا", "apple")
            category: Expected category (e.g., "Toothpaste", "Smartphones")
            language: Language code for category translation

        Returns:
            DualSearchResults with both result sets and pattern detection
        """
        logger.info(f"🔍 Dual Google Images Search: '{user_text}' | Category: {category}")

        # Translate category if needed
        category_translated = self._translate_category(category, language)

        # Execute both searches in parallel
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Search A: User text only (NO CATEGORY!)
            search_a_query = user_text
            search_a_task = self._execute_search(client, search_a_query)

            # Search B: User text + translated category
            search_b_query = f"{user_text} {category_translated}"
            search_b_task = self._execute_search(client, search_b_query)

            # Wait for both
            search_a_results = await search_a_task
            search_b_results = await search_b_task

        # Detect pattern
        pattern = self._detect_pattern(
            search_a_count=len(search_a_results),
            search_b_count=len(search_b_results),
        )

        logger.info(
            f"📊 Search A: {len(search_a_results)} results | "
            f"Search B: {len(search_b_results)} results | "
            f"Pattern: {pattern}"
        )

        return DualSearchResults(
            search_a_results=search_a_results[:6],  # Limit to 6
            search_b_results=search_b_results[:6],  # Limit to 6
            search_a_count=len(search_a_results),
            search_b_count=len(search_b_results),
            pattern=pattern,
        )

    async def _execute_search(
        self,
        client: httpx.AsyncClient,
        query: str
    ) -> List[ImageSearchResult]:
        """
        Execute single Google Custom Search API call

        Returns up to 10 image results
        """
        try:
            params = {
                "key": self.api_key,
                "cx": self.cse_id,
                "q": query,
                "searchType": "image",
                "num": 6,  # Request 6 images
            }

            response = await client.get(self.base_url, params=params)
            response.raise_for_status()
            data = response.json()

            results = []
            for item in data.get("items", []):
                results.append(
                    ImageSearchResult(
                        url=item.get("link", ""),
                        title=item.get("title", ""),
                        snippet=item.get("snippet", ""),
                        context_link=item.get("image", {}).get("contextLink", ""),
                        thumbnail_url=item.get("image", {}).get("thumbnailLink"),
                    )
                )

            return results

        except httpx.HTTPStatusError as e:
            logger.error(f"Google Search API error: {e.response.status_code} - {e.response.text}")
            return []
        except Exception as e:
            logger.error(f"Google Search failed: {e}")
            return []

    def _translate_category(self, category: str, language: str) -> str:
        """
        Translate category to target language

        For now, simple mapping. Can be replaced with translation API.
        """
        # Common translations
        translations = {
            "Toothpaste": {
                "ar": "معجون أسنان",
                "pl": "pasta do zębów",
                "es": "pasta de dientes",
                "fr": "dentifrice",
            },
            "Soap": {
                "ar": "صابون",
                "pl": "mydło",
                "es": "jabón",
                "fr": "savon",
            },
            "Shampoo": {
                "ar": "شامبو",
                "pl": "szampon",
                "es": "champú",
                "fr": "shampooing",
            },
        }

        if language == "en":
            return category

        translated = translations.get(category, {}).get(language)
        if translated:
            return translated

        # Fallback: return English
        logger.warning(f"No translation for category '{category}' in language '{language}'")
        return category

    def _detect_pattern(
        self,
        search_a_count: int,
        search_b_count: int,
    ) -> str:
        """
        Detect pattern based on search result counts

        Patterns:
        - "category_error": Search A >> Search B (exists elsewhere)
        - "multiple_brands": Search B has results but mixed
        - "clear": Both have similar results
        - "unclear": Low results in both
        """
        # Category error: Search A has many results, Search B has few
        if search_a_count >= 10 and search_b_count < 5:
            return "category_error"

        # Clear match: Both searches return results
        if search_a_count >= 5 and search_b_count >= 5:
            return "clear"

        # Multiple brands: Search B has some results
        if search_b_count >= 3:
            return "multiple_brands"

        # Unclear: Low results
        return "unclear"

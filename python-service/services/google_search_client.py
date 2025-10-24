"""
Google Search client for brand validation.
Integrates with Google Custom Search API to validate brand existence.
"""
import logging
import os
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Represents a single search result."""
    title: str
    link: str
    snippet: str
    display_link: str


@dataclass
class ImageResult:
    """Represents a single image search result."""
    title: str
    link: str
    thumbnail_link: str
    context_link: str
    display_link: str


class GoogleSearchClient:
    """Client for Google Custom Search API."""

    def __init__(self, api_key: Optional[str] = None, cx_id: Optional[str] = None):
        """
        Initialize Google Search client.

        Args:
            api_key: Google API key (defaults to env var GOOGLE_CSE_API_KEY)
            cx_id: Custom Search Engine ID (defaults to env var GOOGLE_CSE_CX_ID)
        """
        self.api_key = api_key or os.getenv("GOOGLE_CSE_API_KEY")
        self.cx_id = cx_id or os.getenv("GOOGLE_CSE_CX_ID")

        if not self.api_key or not self.cx_id:
            logger.warning("Google Search API credentials not configured")

        self.base_url = "https://www.googleapis.com/customsearch/v1"

    def is_configured(self) -> bool:
        """Check if Google Search API is properly configured."""
        return bool(self.api_key and self.cx_id)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def search_text(
        self,
        query: str,
        num_results: int = 5,
        language: str = "en"
    ) -> List[SearchResult]:
        """
        Perform a text search using Google Custom Search API.

        Args:
            query: Search query
            num_results: Number of results to return (max 10)
            language: Language code (e.g., 'en', 'es', 'ar')

        Returns:
            List[SearchResult]: List of search results
        """
        if not self.is_configured():
            logger.error("Google Search API not configured")
            return []

        try:
            params = {
                "key": self.api_key,
                "cx": self.cx_id,
                "q": query,
                "num": min(num_results, 10),  # Google API max is 10
                "lr": f"lang_{language}"
            }

            logger.info(f"Performing Google text search: '{query}'")
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            results = []

            if "items" in data:
                for item in data["items"]:
                    results.append(SearchResult(
                        title=item.get("title", ""),
                        link=item.get("link", ""),
                        snippet=item.get("snippet", ""),
                        display_link=item.get("displayLink", "")
                    ))

            logger.info(f"Found {len(results)} text search results")
            return results

        except requests.exceptions.RequestException as e:
            logger.error(f"Google Search API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in text search: {str(e)}")
            raise

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    def search_images(
        self,
        query: str,
        num_results: int = 5,
        language: str = "en"
    ) -> List[ImageResult]:
        """
        Perform an image search using Google Custom Search API.

        Args:
            query: Search query
            num_results: Number of results to return (max 10)
            language: Language code (e.g., 'en', 'es', 'ar')

        Returns:
            List[ImageResult]: List of image search results
        """
        if not self.is_configured():
            logger.error("Google Search API not configured")
            return []

        try:
            params = {
                "key": self.api_key,
                "cx": self.cx_id,
                "q": query,
                "num": min(num_results, 10),
                "searchType": "image",
                "lr": f"lang_{language}"
            }

            logger.info(f"Performing Google image search: '{query}'")
            response = requests.get(self.base_url, params=params, timeout=10)
            response.raise_for_status()

            data = response.json()
            results = []

            if "items" in data:
                for item in data["items"]:
                    image_data = item.get("image", {})
                    results.append(ImageResult(
                        title=item.get("title", ""),
                        link=item.get("link", ""),
                        thumbnail_link=image_data.get("thumbnailLink", ""),
                        context_link=image_data.get("contextLink", ""),
                        display_link=item.get("displayLink", "")
                    ))

            logger.info(f"Found {len(results)} image search results")
            return results

        except requests.exceptions.RequestException as e:
            logger.error(f"Google Images API error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in image search: {str(e)}")
            raise

    def validate_brand(
        self,
        brand_name: str,
        context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate a brand using Google Search and Images.

        Args:
            brand_name: Brand name to validate
            context: Optional context (e.g., "toothpaste", "payment app")

        Returns:
            Dict with validation results including confidence and evidence
        """
        if not self.is_configured():
            logger.error("Google Search API not configured")
            return {
                "valid": False,
                "confidence": 0.0,
                "reasoning": "Google Search API not configured",
                "evidence": {}
            }

        try:
            # Build search query
            search_query = brand_name
            if context:
                search_query = f"{brand_name} {context}"

            # Perform text and image searches
            text_results = self.search_text(search_query, num_results=5)
            image_results = self.search_images(search_query, num_results=5)

            # Analyze results for brand indicators
            evidence = {
                "text_search_count": len(text_results),
                "image_search_count": len(image_results),
                "brand_indicators": [],
                "text_matches": 0,
                "image_matches": 0
            }

            # Count text matches (brand name appears in title or snippet)
            brand_lower = brand_name.lower()
            for result in text_results:
                if brand_lower in result.title.lower() or brand_lower in result.snippet.lower():
                    evidence["text_matches"] += 1

            # Count image matches (brand name appears in title or context)
            for result in image_results:
                if brand_lower in result.title.lower():
                    evidence["image_matches"] += 1

            # Detect brand indicators
            brand_keywords = ["official", "brand", "trademark", "logo", "store", "shop", "buy"]
            for result in text_results:
                text = (result.title + " " + result.snippet).lower()
                for keyword in brand_keywords:
                    if keyword in text:
                        evidence["brand_indicators"].append(keyword)

            # Remove duplicates
            evidence["brand_indicators"] = list(set(evidence["brand_indicators"]))

            # Calculate confidence score (0.0 - 1.0)
            confidence = 0.0

            # Text matches contribute up to 50%
            text_contribution = min(evidence["text_matches"] / 3, 1.0) * 0.5
            confidence += text_contribution

            # Image matches contribute up to 50%
            image_contribution = min(evidence["image_matches"] / 3, 1.0) * 0.5
            confidence += image_contribution

            # Brand indicators add bonus (up to +30%)
            indicator_bonus = min(len(evidence["brand_indicators"]) / 3, 1.0) * 0.3
            confidence += indicator_bonus

            # Cap at 1.0
            confidence = min(confidence, 1.0)

            # Determine validity (threshold: 0.5)
            is_valid = confidence >= 0.5

            # Generate reasoning
            reasoning_parts = []
            if evidence["text_matches"] > 0:
                reasoning_parts.append(f"Found {evidence['text_matches']} text matches")
            if evidence["image_matches"] > 0:
                reasoning_parts.append(f"Found {evidence['image_matches']} image matches")
            if evidence["brand_indicators"]:
                reasoning_parts.append(f"Brand indicators: {', '.join(evidence['brand_indicators'])}")

            reasoning = "; ".join(reasoning_parts) if reasoning_parts else "No strong brand signals found"

            logger.info(
                f"Brand validation for '{brand_name}': "
                f"valid={is_valid}, confidence={confidence:.2f}"
            )

            return {
                "valid": is_valid,
                "confidence": confidence,
                "reasoning": reasoning,
                "evidence": evidence
            }

        except Exception as e:
            logger.error(f"Error validating brand '{brand_name}': {str(e)}")
            return {
                "valid": False,
                "confidence": 0.0,
                "reasoning": f"Error during validation: {str(e)}",
                "evidence": {}
            }

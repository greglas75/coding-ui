"""
Search Validator for Google search results validation
CRITICAL: Uses LOCAL language search, not translated queries
"""

from typing import List, Dict, Optional
import logging
from collections import Counter

logger = logging.getLogger(__name__)


class SearchValidationResult:
    """Result of Google search validation"""

    def __init__(
        self,
        search_phrase: str,
        language: str,
        relevant_results: int,
        total_results: int,
        confidence: str,
        top_domains: List[str],
        web_results: List[dict],
        red_flags: List[str]
    ):
        self.search_phrase = search_phrase
        self.language = language
        self.relevant_results = relevant_results
        self.total_results = total_results
        self.confidence = confidence
        self.top_domains = top_domains
        self.web_results = web_results
        self.red_flags = red_flags

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "search_phrase": self.search_phrase,
            "language": self.language,
            "relevant_results": self.relevant_results,
            "total_results": self.total_results,
            "confidence": self.confidence,
            "top_domains": self.top_domains,
            "web_results": self.web_results,
            "red_flags": self.red_flags
        }


class SearchValidator:
    """Validates brand responses using Google search results"""

    def __init__(self):
        """Initialize search validator"""
        pass

    async def validate_with_google_local(
        self,
        user_response: str,
        language_code: str,
        search_results: dict
    ) -> SearchValidationResult:
        """
        CRITICAL: Search validation in LOCAL language!

        If user wrote "سنسوداين", search should be for "سنسوداين"
        NOT translated to "Sensodyne"

        This validates that:
        1. Google recognizes the local spelling
        2. Results are relevant in user's language
        3. Product exists with this local name

        Args:
            user_response: Original user text (e.g., "سنسوداين")
            language_code: Language code (e.g., "ar")
            search_results: Google search results dict

        Returns:
            SearchValidationResult with confidence and analysis
        """
        # Extract search query from results
        search_query = search_results.get("query", user_response)

        # CRITICAL CHECK: Ensure search was done in local language
        if search_query != user_response:
            logger.warning(
                f"Search query mismatch! Expected: '{user_response}', Got: '{search_query}'"
            )

        # Get web results
        web_results = search_results.get("web_results", [])
        total_results = len(web_results)

        if total_results == 0:
            return SearchValidationResult(
                search_phrase=user_response,
                language=language_code,
                relevant_results=0,
                total_results=0,
                confidence="low",
                top_domains=[],
                web_results=[],
                red_flags=["No search results found"]
            )

        # Analyze results
        relevant_count = 0
        domain_counter = Counter()
        red_flags = []

        for result in web_results:
            url = result.get("url", "")
            title = result.get("title", "")
            snippet = result.get("snippet", "")

            # Extract domain
            try:
                from urllib.parse import urlparse
                domain = urlparse(url).netloc
                if domain:
                    # Remove www. prefix
                    if domain.startswith("www."):
                        domain = domain[4:]
                    domain_counter[domain] += 1
            except Exception as e:
                logger.warning(f"Failed to parse URL: {url}, error: {e}")

            # Check if result is relevant to the brand
            # Simple heuristic: check if user_response appears in title/snippet
            content_text = f"{title} {snippet}".lower()
            user_text_lower = user_response.lower()

            if user_text_lower in content_text:
                relevant_count += 1

        # Get top domains
        top_domains = [domain for domain, _ in domain_counter.most_common(5)]

        # Determine confidence
        relevance_ratio = relevant_count / total_results if total_results > 0 else 0

        if relevance_ratio >= 0.6 and total_results >= 3:
            confidence = "high"
        elif relevance_ratio >= 0.3 or total_results >= 2:
            confidence = "medium"
        else:
            confidence = "low"
            red_flags.append("Low relevance in search results")

        # Check for reputable domains
        reputable_domains = self._get_reputable_domains()
        has_reputable = any(
            any(rep in domain for rep in reputable_domains)
            for domain in top_domains
        )

        if not has_reputable:
            red_flags.append("No results from major retailers or brand sites")

        return SearchValidationResult(
            search_phrase=user_response,
            language=language_code,
            relevant_results=relevant_count,
            total_results=total_results,
            confidence=confidence,
            top_domains=top_domains,
            web_results=web_results[:10],  # Limit to top 10
            red_flags=red_flags
        )

    def _get_reputable_domains(self) -> List[str]:
        """
        Get list of reputable domains for brand validation.

        Returns:
            List of domain patterns
        """
        return [
            "amazon",
            "walmart",
            "target",
            "bestbuy",
            "ebay",
            "alibaba",
            "aliexpress",
            # Brand-specific domains (will be matched partially)
            "colgate",
            "sensodyne",
            "unilever",
            "pg.com",  # Procter & Gamble
            "nestle",
            "loreal",
            "johnson",
            # Regional retailers
            "carrefour",
            "tesco",
            "boots",
            "superdrug"
        ]

    def validate_search_phrase_match(
        self,
        user_response: str,
        search_phrase: str
    ) -> bool:
        """
        Validate that search was done with correct phrase.

        CRITICAL: Search phrase should match user response exactly
        for local language validation.

        Args:
            user_response: What user typed
            search_phrase: What was searched on Google

        Returns:
            True if they match (allowing minor normalization)
        """
        # Normalize whitespace
        user_norm = " ".join(user_response.split())
        search_norm = " ".join(search_phrase.split())

        return user_norm.lower() == search_norm.lower()

    def calculate_domain_trust_score(self, domains: List[str]) -> float:
        """
        Calculate trust score based on domains in results.

        Args:
            domains: List of domains from search results

        Returns:
            Trust score 0-1
        """
        reputable = self._get_reputable_domains()
        trust_score = 0.0

        for domain in domains[:5]:  # Consider top 5
            if any(rep in domain for rep in reputable):
                trust_score += 0.2  # Each reputable domain adds 20%

        return min(trust_score, 1.0)

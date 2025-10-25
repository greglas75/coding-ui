"""
Brand Context Fetcher - Fetches additional context for brands using external APIs.
Integrates with Google Knowledge Graph, Google Search, and Google Images.
"""
import logging
import json
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class BrandContext:
    """Enriched brand context from multiple sources."""
    brand_name: str
    normalized_name: str
    is_verified: bool
    confidence: float

    # Knowledge Graph data
    kg_entity_id: Optional[str] = None
    kg_description: Optional[str] = None
    kg_types: List[str] = None
    kg_url: Optional[str] = None

    # Search data
    search_results_count: int = 0
    search_snippets: List[str] = None
    search_urls: List[str] = None

    # Image data
    image_urls: List[str] = None
    has_logo: bool = False

    # Category/Industry data
    industry: Optional[str] = None
    category: Optional[str] = None
    parent_company: Optional[str] = None

    # Additional metadata
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        """Initialize mutable defaults."""
        if self.kg_types is None:
            self.kg_types = []
        if self.search_snippets is None:
            self.search_snippets = []
        if self.search_urls is None:
            self.search_urls = []
        if self.image_urls is None:
            self.image_urls = []
        if self.metadata is None:
            self.metadata = {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


class BrandContextFetcher:
    """Service for fetching and enriching brand context."""

    def __init__(
        self,
        google_search_client=None,
        config_path: Optional[str] = None
    ):
        """
        Initialize BrandContextFetcher.

        Args:
            google_search_client: GoogleSearchClient instance
            config_path: Path to brand_project_config.json
        """
        self.google_client = google_search_client
        self.config = self._load_config(config_path)

    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from JSON file."""
        if config_path is None:
            import os
            config_path = os.path.join(
                os.path.dirname(__file__),
                '..',
                'brand_project_config.json'
            )

        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file not found: {config_path}, using defaults")
            return self._get_default_config()
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in config file: {e}")
            return self._get_default_config()

    def _get_default_config(self) -> Dict[str, Any]:
        """Get default configuration."""
        return {
            "enrichment": {
                "google_search": {"enabled": True, "max_results": 5},
                "google_images": {"enabled": True, "max_results": 3},
                "knowledge_graph": {"enabled": True}
            }
        }

    async def fetch_brand_context(
        self,
        brand_name: str,
        normalized_name: str,
        category_context: Optional[str] = None
    ) -> BrandContext:
        """
        Fetch comprehensive context for a brand.

        Args:
            brand_name: Original brand name
            normalized_name: Normalized brand name
            category_context: Optional category context (e.g., "toothpaste", "mobile payment")

        Returns:
            BrandContext: Enriched brand context
        """
        logger.info(f"Fetching context for brand: {brand_name}")

        context = BrandContext(
            brand_name=brand_name,
            normalized_name=normalized_name,
            is_verified=False,
            confidence=0.0
        )

        # Check if Google client is available and configured
        if not self.google_client or not self.google_client.is_configured():
            logger.warning("Google Search client not configured, returning minimal context")
            return context

        try:
            # Use the existing validate_brand method from GoogleSearchClient
            validation_result = self.google_client.validate_brand(
                brand_name=brand_name,
                context=category_context
            )

            # Extract data from validation result
            context.is_verified = validation_result.get("valid", False)
            context.confidence = validation_result.get("confidence", 0.0)

            evidence = validation_result.get("evidence", {})

            # Knowledge Graph data
            kg_data = evidence.get("knowledge_graph", {})
            if kg_data:
                context.kg_entity_id = kg_data.get("entity_id")
                context.kg_description = kg_data.get("description")
                context.kg_types = kg_data.get("types", [])
                context.kg_url = kg_data.get("url")

                # Try to extract industry/category from types
                types_lower = [t.lower() for t in context.kg_types]
                if any("company" in t or "organization" in t for t in types_lower):
                    context.category = "Company"
                elif any("product" in t or "brand" in t for t in types_lower):
                    context.category = "Product/Brand"

            # Search results data
            search_data = evidence.get("search_results", {})
            if search_data:
                context.search_results_count = search_data.get("total_results", 0)

                # Extract snippets and URLs
                results = search_data.get("results", [])
                context.search_snippets = [r.get("snippet", "") for r in results[:3]]
                context.search_urls = [r.get("url", "") for r in results[:3]]

            # Image data
            image_data = evidence.get("image_results", {})
            if image_data:
                context.image_urls = image_data.get("image_urls", [])
                context.has_logo = image_data.get("has_logo", False)

            # Store full evidence in metadata
            context.metadata["full_evidence"] = evidence
            context.metadata["validation_methods"] = validation_result.get("validation_methods", [])

            logger.info(
                f"Brand context fetched: verified={context.is_verified}, "
                f"confidence={context.confidence:.2f}"
            )

        except Exception as e:
            logger.error(f"Error fetching brand context: {str(e)}", exc_info=True)
            # Return partial context with error information
            context.metadata["error"] = str(e)

        return context

    def enrich_multiple_brands(
        self,
        brands: List[Dict[str, str]],
        category_context: Optional[str] = None
    ) -> List[BrandContext]:
        """
        Enrich multiple brands with context.

        Args:
            brands: List of brand dictionaries with 'name' and 'normalized_name'
            category_context: Optional category context

        Returns:
            List[BrandContext]: List of enriched brand contexts
        """
        enriched_brands = []

        for brand in brands:
            brand_name = brand.get("name", "")
            normalized_name = brand.get("normalized_name", brand_name)

            # Use synchronous call (Google client doesn't use async)
            # Note: In production, you might want to use asyncio for parallel processing
            try:
                context = self.google_client.validate_brand(
                    brand_name=brand_name,
                    context=category_context
                )

                # Convert to BrandContext
                brand_context = self._validation_to_context(
                    brand_name,
                    normalized_name,
                    context
                )
                enriched_brands.append(brand_context)

            except Exception as e:
                logger.error(f"Error enriching brand {brand_name}: {e}")
                # Add minimal context
                enriched_brands.append(BrandContext(
                    brand_name=brand_name,
                    normalized_name=normalized_name,
                    is_verified=False,
                    confidence=0.0,
                    metadata={"error": str(e)}
                ))

        return enriched_brands

    def _validation_to_context(
        self,
        brand_name: str,
        normalized_name: str,
        validation_result: Dict[str, Any]
    ) -> BrandContext:
        """Convert validation result to BrandContext."""
        context = BrandContext(
            brand_name=brand_name,
            normalized_name=normalized_name,
            is_verified=validation_result.get("valid", False),
            confidence=validation_result.get("confidence", 0.0)
        )

        evidence = validation_result.get("evidence", {})

        # Knowledge Graph
        kg_data = evidence.get("knowledge_graph", {})
        if kg_data:
            context.kg_entity_id = kg_data.get("entity_id")
            context.kg_description = kg_data.get("description")
            context.kg_types = kg_data.get("types", [])
            context.kg_url = kg_data.get("url")

        # Search results
        search_data = evidence.get("search_results", {})
        if search_data:
            context.search_results_count = search_data.get("total_results", 0)
            results = search_data.get("results", [])
            context.search_snippets = [r.get("snippet", "") for r in results[:3]]
            context.search_urls = [r.get("url", "") for r in results[:3]]

        # Images
        image_data = evidence.get("image_results", {})
        if image_data:
            context.image_urls = image_data.get("image_urls", [])
            context.has_logo = image_data.get("has_logo", False)

        # Metadata
        context.metadata = {
            "full_evidence": evidence,
            "validation_methods": validation_result.get("validation_methods", [])
        }

        return context

    def filter_verified_brands(
        self,
        brand_contexts: List[BrandContext],
        min_confidence: float = 0.5
    ) -> tuple[List[BrandContext], List[BrandContext]]:
        """
        Separate verified brands from unverified ones.

        Args:
            brand_contexts: List of brand contexts
            min_confidence: Minimum confidence threshold

        Returns:
            Tuple of (verified_brands, needs_review_brands)
        """
        verified = []
        needs_review = []

        for context in brand_contexts:
            if context.is_verified and context.confidence >= min_confidence:
                verified.append(context)
            else:
                needs_review.append(context)

        logger.info(
            f"Filtered brands: {len(verified)} verified, {len(needs_review)} need review"
        )

        return verified, needs_review

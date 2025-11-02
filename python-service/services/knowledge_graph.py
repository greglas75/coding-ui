"""
Google Knowledge Graph API Integration

Verifies entities and checks:
- Does entity exist?
- What type/category?
- Is it a brand or company?
- Does category match expected?
"""

import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import httpx

logger = logging.getLogger(__name__)


@dataclass
class KGResult:
    """Knowledge Graph entity result"""
    name: str
    entity_type: str  # "Brand", "Company", "Retail", "Product", etc.
    category: str  # Specific category if available
    description: str
    verified: bool  # True if entity found
    matches_user_category: bool  # True if category matches expected


class KnowledgeGraphService:
    """
    Google Knowledge Graph Search API

    Verifies entities and their categories
    """

    # Acceptable entity types for consumer product categories
    # Reject: Event, Location, Person, etc.
    ACCEPTABLE_ENTITY_TYPES = {
        "Toothpaste": ["Brand", "Product", "Company"],
        "Toothbrush": ["Brand", "Product", "Company"],
        "Soap": ["Brand", "Product", "Company"],
        "Shampoo": ["Brand", "Product", "Company"],
        "Deodorant": ["Brand", "Product", "Company"],
        "Mouthwash": ["Brand", "Product", "Company"],
        "Cosmetics": ["Brand", "Product", "Company"],
    }

    # Rejected entity types (these are never acceptable for brands)
    REJECTED_TYPES = [
        "Event",
        "Location",
        "Place",
        "Person",
        "SportsEvent",
        "Organization",  # Too generic - prefer "Company" or "Brand"
        "Thing",  # Too generic
    ]

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://kgsearch.googleapis.com/v1/entities:search"

    async def query_knowledge_graph(
        self,
        entity_name: str,
        expected_category: Optional[str] = None
    ) -> Optional[KGResult]:
        """
        Query Knowledge Graph for entity with category-aware filtering

        Args:
            entity_name: Entity to search (e.g., "Oral-B", "Sensodyne")
            expected_category: Expected category for matching (e.g., "Toothpaste")

        Returns:
            KGResult if entity found and passes filters, else None
        """
        logger.info(f"🔍 Knowledge Graph: Searching for '{entity_name}' (category: {expected_category})")

        # Build multiple query variations (from most to least specific)
        queries = [entity_name]
        if expected_category:
            queries = [
                f"{entity_name} {expected_category}",  # Most specific: "Oral-B Toothpaste"
                f"{entity_name} brand",  # Brand-focused: "Oral-B brand"
                entity_name,  # Fallback: just "Oral-B"
            ]

        # Try each query in order
        for query_idx, query in enumerate(queries):
            logger.info(f"  📍 Try {query_idx + 1}/{len(queries)}: '{query}'")

            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    params = {
                        "query": query,
                        "key": self.api_key,
                        "limit": 10,  # Get more results for filtering
                        "indent": True,
                    }

                    response = await client.get(self.base_url, params=params)
                    response.raise_for_status()
                    data = response.json()

                    # Check if any results
                    if "itemListElement" not in data or not data["itemListElement"]:
                        logger.info(f"  ❌ No results for query: '{query}'")
                        continue

                    # Process ALL results and filter
                    for idx, item in enumerate(data["itemListElement"]):
                        result = item["result"]

                        name = result.get("name", entity_name)
                        description = result.get("description", "")
                        types = result.get("@type", [])

                        # Extract entity type and category
                        entity_type = self._extract_entity_type(types, description)
                        category = self._extract_category(description, entity_type)

                        # FILTER 1: Check if entity type is acceptable
                        if not self._is_acceptable_entity_type(entity_type, expected_category):
                            logger.info(
                                f"  ⚠️  Rejected result #{idx + 1}: {name} "
                                f"(type: {entity_type}, expected: Brand/Product/Company)"
                            )
                            continue

                        # FILTER 2: Check if category matches (if provided)
                        matches_category = False
                        if expected_category:
                            matches_category = self._category_matches(
                                category,
                                entity_type,
                                description,
                                expected_category
                            )

                        logger.info(
                            f"  ✅ Accepted: {name} | Type: {entity_type} | "
                            f"Category: {category} | Matches: {matches_category}"
                        )

                        return KGResult(
                            name=name,
                            entity_type=entity_type,
                            category=category,
                            description=description,
                            verified=True,
                            matches_user_category=matches_category,
                        )

            except httpx.HTTPStatusError as e:
                logger.error(f"Knowledge Graph API error for '{query}': {e.response.status_code}")
                continue
            except Exception as e:
                logger.error(f"Knowledge Graph query failed for '{query}': {e}")
                continue

        # No acceptable results found across all queries
        logger.info(f"  ❌ No acceptable entity found for '{entity_name}' after trying {len(queries)} queries")
        return None

    async def batch_query(
        self,
        entity_names: List[str],
        expected_category: Optional[str] = None
    ) -> Dict[str, Optional[KGResult]]:
        """
        Query multiple entities

        Args:
            entity_names: List of entities to query
            expected_category: Expected category for all

        Returns:
            Dict mapping entity_name -> KGResult or None
        """
        results = {}
        for entity_name in entity_names:
            result = await self.query_knowledge_graph(entity_name, expected_category)
            results[entity_name] = result

        return results

    def _is_acceptable_entity_type(
        self,
        entity_type: str,
        expected_category: Optional[str] = None
    ) -> bool:
        """
        Check if entity type is acceptable for the expected category

        Args:
            entity_type: Extracted entity type (e.g., "Brand", "Event", "Company")
            expected_category: Expected category (e.g., "Toothpaste")

        Returns:
            True if entity type is acceptable, False if rejected
        """
        # Reject specific unwanted types
        if entity_type in self.REJECTED_TYPES:
            return False

        # If no category specified, accept any non-rejected type
        if not expected_category:
            return True

        # Check category-specific acceptable types
        acceptable_types = self.ACCEPTABLE_ENTITY_TYPES.get(
            expected_category,
            ["Brand", "Product", "Company"]  # Default acceptable types
        )

        return entity_type in acceptable_types

    def _extract_entity_type(self, types: List[str], description: str) -> str:
        """
        Extract entity type from @type array and description

        Priority:
        1. Check for "Brand" in types or description
        2. Check for "Company" or "Organization"
        3. Check for "Product"
        4. Default to "Thing"
        """
        # Flatten types (may be nested)
        all_types = []
        for t in types:
            if isinstance(t, str):
                all_types.append(t.lower())

        description_lower = description.lower()

        # Check for brand
        if "brand" in all_types or "brand" in description_lower:
            return "Brand"

        # Check for company/organization
        if any(t in all_types for t in ["organization", "corporation", "company"]):
            if "retail" in description_lower or "store" in description_lower:
                return "Retail"
            return "Company"

        # Check for product
        if "product" in all_types or "product" in description_lower:
            return "Product"

        # Default
        return "Thing"

    def _extract_category(self, description: str, entity_type: str) -> str:
        """
        Extract category from description

        Examples:
        - "toothpaste brand" -> "Toothpaste"
        - "electronics retailer" -> "Electronics"
        - "soap manufacturer" -> "Soap"
        """
        description_lower = description.lower()

        # Common product categories
        categories = {
            "toothpaste": "Toothpaste",
            "soap": "Soap",
            "shampoo": "Shampoo",
            "electronics": "Electronics",
            "technology": "Technology",
            "retail": "Retail",
            "food": "Food",
            "beverage": "Beverage",
            "cosmetics": "Cosmetics",
            "healthcare": "Healthcare",
        }

        for keyword, category in categories.items():
            if keyword in description_lower:
                return category

        # Fallback to entity type
        return entity_type

    def _category_matches(
        self,
        found_category: str,
        entity_type: str,
        description: str,
        expected_category: str
    ) -> bool:
        """
        Check if found category matches expected category

        Fuzzy matching:
        - Direct match
        - Substring match
        - Related categories (e.g., "Healthcare" matches "Toothpaste")
        """
        found_lower = found_category.lower()
        expected_lower = expected_category.lower()
        description_lower = description.lower()

        # Direct match
        if found_lower == expected_lower:
            return True

        # Substring match
        if expected_lower in found_lower or found_lower in expected_lower:
            return True

        # Check description for expected category
        if expected_lower in description_lower:
            return True

        # Related categories
        related = {
            "toothpaste": ["healthcare", "dental", "oral care"],
            "soap": ["personal care", "hygiene"],
            "shampoo": ["personal care", "cosmetics", "beauty"],
        }

        for key, values in related.items():
            if expected_lower == key:
                if found_lower in values or any(v in found_lower for v in values):
                    return True

        return False

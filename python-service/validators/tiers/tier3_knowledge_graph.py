"""
Tier 3: Knowledge Graph Verification Validator
Verifies entities against Google Knowledge Graph (500ms, FREE)
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


class Tier3KnowledgeGraphValidator:
    """
    Tier 3: Knowledge Graph Verification

    Verifies entities against Google Knowledge Graph
    Independent validation - only checks user_text
    No dependency on Vision/Web results

    Cost: FREE
    Time: ~500ms
    """

    def __init__(self, google_api_key: str):
        self.google_api_key = google_api_key
        self.cost = 0.0

    async def validate(
        self,
        user_text: str,
        category: str
    ) -> Dict[str, Any]:
        """
        Verify entity in Knowledge Graph

        Args:
            user_text: User's response text
            category: Expected product category

        Returns:
            Dictionary mapping entity -> KG result
        """
        try:
            from services.knowledge_graph import KnowledgeGraphService

            kg_service = KnowledgeGraphService(self.google_api_key)

            # KG verifies ONLY user_text (no dependency on Vision/Web results!)
            kg_results = await kg_service.batch_query([user_text], category)

            verified_count = sum(1 for r in kg_results.values() if r and r.verified)
            logger.info(f"📊 Tier 3: Verified {verified_count}/{len(kg_results)} entities")

            return kg_results

        except Exception as e:
            logger.error(f"❌ Tier 3: Knowledge Graph failed: {e}", exc_info=True)
            return {}

    def extract_kg_details(
        self,
        kg_results: Dict[str, Any],
        expected_entity: str = None
    ) -> Dict[str, Any]:
        """
        Extract Knowledge Graph details with error flags

        Args:
            kg_results: Raw KG results from validation
            expected_entity: Expected entity name from vision results

        Returns:
            Dictionary with KG details including error flags
        """
        raw_kg_details = {}

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
                    is_category_mismatch = not bool(kg_result.matches_user_category)

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
                    "verified": bool(kg_result.verified),
                    "matches_user_category": bool(kg_result.matches_user_category),
                    # Error flags
                    "is_error": bool(is_wrong_entity),
                    "is_warning": bool(is_category_mismatch and not is_wrong_entity),
                    "expected_entity": expected_entity if is_wrong_entity else None,
                    "error_type": error_type,
                }

        return raw_kg_details

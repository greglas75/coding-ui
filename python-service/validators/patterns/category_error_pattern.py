"""
Pattern 1: Category Error

Triggers when:
- Search B has < 5 results
- Search A has > 10 results
- Knowledge Graph: user text exists but in different category
- Embedding: high similarity (> 0.85) to wrong-category entity

Example:
    User: "apple" + Category: Toothpaste
    → Detected: Apple Inc (technology)
    → Suggest: Change category or skip
"""
from typing import Optional, Dict, Any
from .base_pattern import BasePattern
from ..multi_source_validator import ValidationResult, ValidationType, UIAction
import logging

logger = logging.getLogger(__name__)


class CategoryErrorPattern(BasePattern):
    """
    Detects when user input belongs to wrong category.
    """

    def __init__(self):
        super().__init__(name="Category Error", priority=1)
        self.min_search_a_count = 10
        self.max_search_b_count = 5
        self.min_embedding_similarity = 0.85

    def detect(self, validation_data: Dict[str, Any]) -> Optional[ValidationResult]:
        """
        Detect category error pattern.

        Args:
            validation_data: All validation sources

        Returns:
            ValidationResult if pattern matches, None otherwise
        """
        user_text = validation_data['user_text']
        category = validation_data['category']
        dual_search_results = validation_data.get('dual_search_results')
        kg_results = validation_data['kg_results']
        embedding_similarities = validation_data['embedding_similarities']

        # Check search pattern
        if not dual_search_results:
            self.log_detection(False)
            return None

        if not (dual_search_results.search_a_count >= self.min_search_a_count and
                dual_search_results.search_b_count < self.max_search_b_count):
            self.log_detection(False)
            return None

        # Check if user_text is verified entity in wrong category
        user_kg = kg_results.get(user_text)
        if not (user_kg and user_kg.verified and not user_kg.matches_user_category):
            self.log_detection(False)
            return None

        # High embedding similarity confirms it's the wrong-category entity
        max_embedding_sim = max(embedding_similarities.values()) if embedding_similarities else 0

        if max_embedding_sim <= self.min_embedding_similarity:
            self.log_detection(False)
            return None

        # Pattern matched - build result
        return self._build_result(
            user_text=user_text,
            category=category,
            user_kg=user_kg,
            max_embedding_sim=max_embedding_sim,
            dual_search_results=dual_search_results,
            web_brands_a=validation_data['web_brands_a'],
            web_brands_b=validation_data['web_brands_b'],
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            validation_data=validation_data
        )

    def _build_result(
        self,
        user_text: str,
        category: str,
        user_kg: Any,
        max_embedding_sim: float,
        dual_search_results: Any,
        web_brands_a: Dict,
        web_brands_b: Dict,
        kg_results: Dict,
        embedding_similarities: Dict,
        validation_data: Dict
    ) -> ValidationResult:
        """
        Build validation result for category error pattern.
        """
        confidence = int(max_embedding_sim * 20)  # Low confidence (< 20%)

        self.log_detection(True, confidence)

        # Import helper methods
        from ..base_validator import BaseValidator
        from .pattern_helpers import build_sources_dict, build_decision_tree, detect_validation_issues

        validator = BaseValidator()

        # Calculate confidence breakdown
        confidence_breakdown = validator.calculate_confidence_breakdown(
            vision_brands_a=None,
            vision_brands_b=None,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=user_text
        ).breakdown

        # Generate decision tree
        decision_tree = build_decision_tree(
            vision_brands_a=None,
            vision_brands_b=None,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=user_text,
            confidence=confidence
        )

        # Detect issues
        issues_detected = detect_validation_issues(
            vision_brands_a=None,
            vision_brands_b=None,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=user_text,
            user_text=user_text,
            category=category
        )

        # Build sources dict
        sources = build_sources_dict(
            pinecone_match=None,
            dual_search_results=dual_search_results,
            vision_results=None,
            vision_brands_a=None,
            vision_brands_b=None,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
        )
        sources["confidence_breakdown"] = confidence_breakdown
        sources["decision_tree"] = decision_tree
        sources["issues_detected"] = issues_detected

        # Build result
        result = ValidationResult(
            type=ValidationType.CATEGORY_ERROR,
            confidence=confidence,
            reasoning=f"'{user_text}' exists as {user_kg.entity_type} in {user_kg.category} category, not {category}",
            ui_action=UIAction.REVIEW_CATEGORY,
            detected_entity=user_text,
            detected_category=user_kg.category,
            expected_category=category,
            sources=sources,
            tier=5,
        )

        # Add raw data
        return self._add_raw_data(result, validation_data)

"""
Pattern 3: Clear Match

Triggers when:
- Vision AI: single brand > 50% frequency
- Knowledge Graph: verified brand in correct category
- Embedding: moderate-high similarity (> 0.60)

Example:
    User: "Colgate"
    → Vision AI: Colgate 83%
    → KG: Verified toothpaste brand
    → Embedding: 0.89 similarity
    → Result: 90% confidence
"""
from typing import Optional, Dict, Any
from .base_pattern import BasePattern
from ..multi_source_validator import ValidationResult, ValidationType, UIAction
import logging

logger = logging.getLogger(__name__)


class ClearMatchPattern(BasePattern):
    """
    Detects clear brand match with high confidence from multiple sources.
    """

    def __init__(self):
        super().__init__(name="Clear Match", priority=3)
        self.min_vision_frequency = 0.50  # 50% dominant frequency
        self.min_confidence = 70  # Minimum confidence to trigger

    def detect(self, validation_data: Dict[str, Any]) -> Optional[ValidationResult]:
        """
        Detect clear match pattern.

        Args:
            validation_data: All validation sources

        Returns:
            ValidationResult if pattern matches, None otherwise
        """
        vision_results = validation_data.get('vision_results')

        # Check if we have vision results with dominant brand
        if not vision_results or not vision_results.dominant_brand:
            self.log_detection(False)
            return None

        # Check vision frequency threshold
        if vision_results.dominant_frequency <= self.min_vision_frequency:
            self.log_detection(False)
            return None

        # Build result if thresholds met
        result = self._build_result(
            user_text=validation_data['user_text'],
            category=validation_data['category'],
            vision_results=vision_results,
            vision_brands_a=validation_data['vision_brands_a'],
            vision_brands_b=validation_data['vision_brands_b'],
            web_brands_a=validation_data['web_brands_a'],
            web_brands_b=validation_data['web_brands_b'],
            kg_results=validation_data['kg_results'],
            embedding_similarities=validation_data['embedding_similarities'],
            validation_data=validation_data
        )

        if result and result.confidence >= self.min_confidence:
            return result

        self.log_detection(False)
        return None

    def _build_result(
        self,
        user_text: str,
        category: str,
        vision_results: Any,
        vision_brands_a: Dict,
        vision_brands_b: Dict,
        web_brands_a: Dict,
        web_brands_b: Dict,
        kg_results: Dict,
        embedding_similarities: Dict,
        validation_data: Dict
    ) -> Optional[ValidationResult]:
        """
        Build validation result for clear match pattern.
        """
        dominant_brand = vision_results.dominant_brand

        # Check KG verification
        kg_result = kg_results.get(dominant_brand)
        kg_verified = kg_result and kg_result.verified and kg_result.matches_user_category

        # Check embedding similarity
        embedding_sim = embedding_similarities.get(dominant_brand, 0.0)

        # Calculate composite confidence with KG BOOST
        vision_score = vision_results.dominant_frequency
        kg_score = 1.0 if kg_verified else 0.5
        base_confidence = int((
            vision_score * 0.50 +
            kg_score * 0.30 +
            embedding_sim * 0.20
        ) * 100)

        # Add KG verification boost
        kg_bonus = 0
        if kg_verified:
            kg_type = kg_result.entity_type if hasattr(kg_result, 'entity_type') else None
            if kg_type == "Brand":
                kg_bonus = 15  # Strong signal for verified brand
            elif kg_type in ["Product", "Company"]:
                kg_bonus = 10  # Medium signal
            else:
                kg_bonus = 5   # Weak signal

        confidence = min(98, base_confidence + kg_bonus)

        self.log_detection(True, confidence)

        # Build reasoning with KG info
        reasoning = f"High confidence match: {dominant_brand} detected in {vision_results.dominant_frequency:.0%} of images"
        if kg_verified:
            reasoning += f". Knowledge Graph VERIFIED as brand (+{kg_bonus}% confidence boost)"
        reasoning += ". Multiple sources confirm this brand."

        # Import helper methods
        from ..base_validator import BaseValidator
        from .pattern_helpers import build_sources_dict, build_decision_tree, detect_validation_issues

        validator = BaseValidator()

        # Calculate confidence breakdown
        confidence_breakdown = validator.calculate_confidence_breakdown(
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=dominant_brand
        ).breakdown

        # Generate decision tree
        decision_tree = build_decision_tree(
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=dominant_brand,
            confidence=confidence
        )

        # Detect issues
        issues_detected = detect_validation_issues(
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=dominant_brand,
            user_text=user_text,
            category=category
        )

        # Build sources dict
        sources = build_sources_dict(
            pinecone_match=None,
            dual_search_results=None,
            vision_results=vision_results,
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
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
            type=ValidationType.CLEAR_MATCH,
            confidence=confidence,
            reasoning=reasoning,
            ui_action=UIAction.APPROVE if confidence >= 85 else UIAction.MANUAL_REVIEW,
            brand=dominant_brand,
            expected_category=category,
            sources=sources,
            tier=5,
        )

        # Add raw data
        return self._add_raw_data(result, validation_data)

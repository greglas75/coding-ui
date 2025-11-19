"""
Pattern 4: Unclear Result

Always matches as fallback when no other pattern matches.
Returns low confidence result requiring manual review.
"""
from typing import Dict, Any
from .base_pattern import BasePattern
from ..multi_source_validator import ValidationResult, ValidationType, UIAction
import logging

logger = logging.getLogger(__name__)


class UnclearPattern(BasePattern):
    """Fallback pattern that always matches with low confidence."""

    def __init__(self):
        super().__init__(name="Unclear", priority=4)

    def detect(self, validation_data: Dict[str, Any]) -> ValidationResult:
        """
        Always returns unclear result as fallback.
        This should be the last pattern checked.
        """
        user_text = validation_data['user_text']
        category = validation_data['category']

        self.log_detection(True, confidence=0)

        # Try to get dominant brand if available
        vision_results = validation_data.get('vision_results')
        dominant_brand = None
        if vision_results and hasattr(vision_results, 'dominant_brand'):
            dominant_brand = vision_results.dominant_brand

        from ..base_validator import BaseValidator
        from .pattern_helpers import build_sources_dict, build_decision_tree, detect_validation_issues

        validator = BaseValidator()
        confidence_breakdown = validator.calculate_confidence_breakdown(
            vision_brands_a=validation_data.get('vision_brands_a'),
            vision_brands_b=validation_data.get('vision_brands_b'),
            web_brands_a=validation_data.get('web_brands_a'),
            web_brands_b=validation_data.get('web_brands_b'),
            kg_results=validation_data.get('kg_results'),
            embedding_similarities=validation_data.get('embedding_similarities'),
            dominant_brand=dominant_brand
        ).breakdown

        decision_tree = build_decision_tree(
            vision_brands_a=validation_data.get('vision_brands_a'),
            vision_brands_b=validation_data.get('vision_brands_b'),
            web_brands_a=validation_data.get('web_brands_a'),
            web_brands_b=validation_data.get('web_brands_b'),
            kg_results=validation_data.get('kg_results'),
            embedding_similarities=validation_data.get('embedding_similarities'),
            dominant_brand=dominant_brand,
            confidence=0
        )

        issues_detected = detect_validation_issues(
            vision_brands_a=validation_data.get('vision_brands_a'),
            vision_brands_b=validation_data.get('vision_brands_b'),
            web_brands_a=validation_data.get('web_brands_a'),
            web_brands_b=validation_data.get('web_brands_b'),
            kg_results=validation_data.get('kg_results'),
            embedding_similarities=validation_data.get('embedding_similarities'),
            dominant_brand=dominant_brand,
            user_text=user_text,
            category=category
        )

        sources = build_sources_dict(
            pinecone_match=validation_data.get('pinecone_match'),
            dual_search_results=validation_data.get('dual_search_results'),
            vision_results=vision_results,
            vision_brands_a=validation_data.get('vision_brands_a'),
            vision_brands_b=validation_data.get('vision_brands_b'),
            web_brands_a=validation_data.get('web_brands_a'),
            web_brands_b=validation_data.get('web_brands_b'),
            kg_results=validation_data.get('kg_results'),
            embedding_similarities=validation_data.get('embedding_similarities')
        )
        sources.update({
            "confidence_breakdown": confidence_breakdown,
            "decision_tree": decision_tree,
            "issues_detected": issues_detected
        })

        result = ValidationResult(
            type=ValidationType.UNCLEAR,
            confidence=0,
            reasoning="Insufficient data from all sources to make confident determination",
            ui_action=UIAction.MANUAL_REVIEW,
            expected_category=category,
            sources=sources,
            tier=5,
        )

        return self._add_raw_data(result, validation_data)

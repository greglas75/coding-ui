"""
Pattern 2: Ambiguous Descriptor

Triggers when:
- Vision AI detects 3+ different brands
- No single brand > 40% frequency
- User text is descriptor keyword (extra, white, pro, etc.)
"""
from typing import Optional, Dict, Any, List
from .base_pattern import BasePattern
from ..multi_source_validator import ValidationResult, ValidationType, UIAction, Candidate
import logging

logger = logging.getLogger(__name__)


class AmbiguousDescriptorPattern(BasePattern):
    """Detects ambiguous product descriptors appearing in multiple brands."""

    def __init__(self):
        super().__init__(name="Ambiguous Descriptor", priority=2)
        self.min_brands = 3
        self.max_dominant_frequency = 0.40
        self.descriptor_keywords = [
            "extra", "white", "whitening", "fresh", "pro",
            "advanced", "complete", "ultra", "max", "plus"
        ]

    def detect(self, validation_data: Dict[str, Any]) -> Optional[ValidationResult]:
        vision_results = validation_data.get('vision_results')
        user_text = validation_data['user_text']

        if not vision_results:
            self.log_detection(False)
            return None

        # Check if multiple brands detected with no clear winner
        if not (len(vision_results.brand_frequencies) >= self.min_brands and
                vision_results.dominant_frequency < self.max_dominant_frequency):
            self.log_detection(False)
            return None

        # Check if user text is descriptor keyword
        is_descriptor = any(kw in user_text.lower() for kw in self.descriptor_keywords)

        if not (is_descriptor or vision_results.pattern == "descriptor"):
            self.log_detection(False)
            return None

        # Build result
        return self._build_result(
            user_text=user_text,
            category=validation_data['category'],
            vision_results=vision_results,
            web_brands_a=validation_data['web_brands_a'],
            web_brands_b=validation_data['web_brands_b'],
            kg_results=validation_data['kg_results'],
            embedding_similarities=validation_data['embedding_similarities'],
            validation_data=validation_data
        )

    def _build_result(self, user_text, category, vision_results, web_brands_a, 
                     web_brands_b, kg_results, embedding_similarities, validation_data):
        # Build candidate list
        candidates = []
        for brand, freq_data in vision_results.brand_frequencies.items():
            kg_result = kg_results.get(brand)
            embedding_sim = embedding_similarities.get(brand, 0.0)

            vision_score = freq_data["frequency"]
            kg_score = 1.0 if (kg_result and kg_result.verified) else 0.5
            composite = vision_score * 0.50 + kg_score * 0.30 + embedding_sim * 0.20

            candidates.append(Candidate(
                brand=brand,
                full_name=f"{brand} {user_text}",
                score=composite,
                vision_frequency=freq_data["frequency"],
                kg_verified=bool(kg_result and kg_result.verified),
                embedding_similarity=embedding_sim,
                pinecone_match=False,
            ))

        candidates.sort(key=lambda c: c.score, reverse=True)
        confidence = int(candidates[0].score * 50) if candidates else 25

        self.log_detection(True, confidence)

        from ..base_validator import BaseValidator
        from .pattern_helpers import build_sources_dict, build_decision_tree, detect_validation_issues

        validator = BaseValidator()
        top_brand = candidates[0].brand if candidates else None
        confidence_breakdown = validator.calculate_confidence_breakdown(
            vision_brands_a=None, vision_brands_b=None,
            web_brands_a=web_brands_a, web_brands_b=web_brands_b,
            kg_results=kg_results, embedding_similarities=embedding_similarities,
            dominant_brand=top_brand
        ).breakdown

        decision_tree = build_decision_tree(
            vision_brands_a=None, vision_brands_b=None,
            web_brands_a=web_brands_a, web_brands_b=web_brands_b,
            kg_results=kg_results, embedding_similarities=embedding_similarities,
            dominant_brand=top_brand, confidence=confidence
        )

        issues_detected = detect_validation_issues(
            vision_brands_a=None, vision_brands_b=None,
            web_brands_a=web_brands_a, web_brands_b=web_brands_b,
            kg_results=kg_results, embedding_similarities=embedding_similarities,
            dominant_brand=top_brand, user_text=user_text, category=category
        )

        sources = build_sources_dict(
            pinecone_match=None, dual_search_results=None, vision_results=vision_results,
            vision_brands_a=None, vision_brands_b=None,
            web_brands_a=web_brands_a, web_brands_b=web_brands_b,
            kg_results=kg_results, embedding_similarities=embedding_similarities
        )
        sources.update({
            "confidence_breakdown": confidence_breakdown,
            "decision_tree": decision_tree,
            "issues_detected": issues_detected
        })

        result = ValidationResult(
            type=ValidationType.AMBIGUOUS_DESCRIPTOR,
            confidence=confidence,
            reasoning=f"'{user_text}' is a descriptor appearing in multiple brands. User needs to specify which brand.",
            ui_action=UIAction.ASK_USER_CHOOSE,
            descriptor=user_text,
            expected_category=category,
            candidates=candidates[:5],
            sources=sources,
            tier=5,
        )

        return self._add_raw_data(result, validation_data)

"""
Pattern 0: Category Validated by Product Type Filtering

Triggers when:
- Search B (with category) has high correct product type matches (>= 3)
- Search A (without category) has significant mismatches (>= 2)
- This validates that the category filter is working correctly!
- Uses BOTH Vision AI AND Web Search AI for validation

Example:
    User: "Oral-B" + Category: "Toothpaste"
    Vision AI Search A: 3 toothpaste + 3 electric toothbrushes (50% wrong type!)
    Vision AI Search B: 6 toothpaste (100% correct type!)
    Web AI Search B: 8 toothpaste (100% correct type!)
    → Category is validated! Brand exists in correct product type.
"""
from typing import Optional, Dict, Any
from .base_pattern import BasePattern
from ..multi_source_validator import ValidationResult, ValidationType, UIAction
import logging

logger = logging.getLogger(__name__)


class CategoryValidatedPattern(BasePattern):
    """
    Detects when category is validated through multi-source product type filtering.
    """

    def __init__(self):
        super().__init__(name="Category Validated", priority=0)
        self.min_correct_b = 3  # Minimum correct matches in Search B
        self.min_mismatched_a = 2  # Minimum mismatches in Search A

    def detect(self, validation_data: Dict[str, Any]) -> Optional[ValidationResult]:
        """
        Detect category validation pattern.

        Args:
            validation_data: All validation sources

        Returns:
            ValidationResult if pattern matches, None otherwise
        """
        # Extract data
        user_text = validation_data['user_text']
        category = validation_data['category']
        vision_brands_a = validation_data['vision_brands_a']
        vision_brands_b = validation_data['vision_brands_b']
        web_brands_a = validation_data['web_brands_a']
        web_brands_b = validation_data['web_brands_b']
        kg_results = validation_data['kg_results']
        embedding_similarities = validation_data['embedding_similarities']

        # Count matches from both Vision AI and Web Search AI
        vision_correct_a = vision_brands_a.get("correct_matches", 0)
        vision_correct_b = vision_brands_b.get("correct_matches", 0)
        vision_mismatched_a = vision_brands_a.get("mismatched_count", 0)

        web_correct_a = web_brands_a.get("correct_matches", 0)
        web_correct_b = web_brands_b.get("correct_matches", 0)
        web_mismatched_a = web_brands_a.get("mismatched_count", 0)

        # Combined totals
        total_correct_b = vision_correct_b + web_correct_b
        total_mismatched_a = vision_mismatched_a + web_mismatched_a

        # Check if pattern matches
        if total_correct_b >= self.min_correct_b and total_mismatched_a >= self.min_mismatched_a:
            return self._build_result(
                user_text=user_text,
                category=category,
                vision_brands_a=vision_brands_a,
                vision_brands_b=vision_brands_b,
                web_brands_a=web_brands_a,
                web_brands_b=web_brands_b,
                kg_results=kg_results,
                embedding_similarities=embedding_similarities,
                total_correct_b=total_correct_b,
                total_mismatched_a=total_mismatched_a,
                validation_data=validation_data
            )

        self.log_detection(False)
        return None

    def _build_result(
        self,
        user_text: str,
        category: str,
        vision_brands_a: Dict,
        vision_brands_b: Dict,
        web_brands_a: Dict,
        web_brands_b: Dict,
        kg_results: Dict,
        embedding_similarities: Dict,
        total_correct_b: int,
        total_mismatched_a: int,
        validation_data: Dict
    ) -> ValidationResult:
        """
        Build validation result for category validated pattern.
        """
        # Get the dominant brand from correctly typed products
        vision_brands = vision_brands_b.get("brands", {})
        web_brands = web_brands_b.get("brands", {})

        # Merge brand counts from both sources
        combined_brands = {}
        for brand, data in vision_brands.items():
            combined_brands[brand] = data["count"]
        for brand, data in web_brands.items():
            combined_brands[brand] = combined_brands.get(brand, 0) + data["count"]

        if not combined_brands:
            return None

        # Find brand with highest combined count
        brand_name = max(combined_brands.items(), key=lambda x: x[1])[0]

        # Check if KG verifies this brand
        kg_result = kg_results.get(brand_name)
        kg_verified = kg_result and kg_result.verified and kg_result.matches_user_category

        # Get embedding similarity
        embedding_sim = embedding_similarities.get(brand_name, 0.0)

        # Calculate confidence with KG BOOST
        base_confidence = 88  # High because multi-source validation

        # KG Verification adds significant boost
        kg_bonus = 0
        if kg_verified:
            kg_type = kg_result.entity_type if hasattr(kg_result, 'entity_type') else None
            if kg_type == "Brand":
                kg_bonus = 15  # Strong signal for verified brand
            elif kg_type in ["Product", "Company"]:
                kg_bonus = 10  # Medium signal
            else:
                kg_bonus = 5   # Weak signal

        embedding_bonus = int(embedding_sim * 10)
        confidence = min(98, base_confidence + kg_bonus + embedding_bonus)

        # Get mismatched product types for reasoning
        mismatched_types = set()
        for mismatch in vision_brands_a.get("mismatched_products", []):
            if mismatch.get("detected_type"):
                mismatched_types.add(mismatch["detected_type"])
        for mismatch in web_brands_a.get("mismatched_products", []):
            if mismatch.get("detected_type"):
                mismatched_types.add(mismatch["detected_type"])

        mismatched_types_str = ", ".join(sorted(mismatched_types)[:3]) if mismatched_types else "Unknown"

        self.log_detection(True, confidence)

        # Build reasoning
        reasoning = (
            f"Multi-source category validation! "
            f"Vision AI + Web AI detected {total_correct_b} correct {category} products. "
            f"Search without category shows {total_mismatched_a} wrong product types "
            f"({mismatched_types_str}). "
        )

        if kg_verified:
            reasoning += f" Knowledge Graph VERIFIED '{brand_name}' as brand (+{kg_bonus}% confidence boost). "

        reasoning += f"This confirms '{brand_name}' is the correct {category} brand."

        # Import helper methods
        from ..base_validator import BaseValidator
        from .pattern_helpers import build_decision_tree, detect_validation_issues

        validator = BaseValidator()

        # Calculate confidence breakdown
        confidence_breakdown = validator.calculate_confidence_breakdown(
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=brand_name
        ).breakdown

        # Generate decision tree
        decision_tree = build_decision_tree(
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=brand_name,
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
            dominant_brand=brand_name,
            user_text=user_text,
            category=category
        )

        # Build result
        result = ValidationResult(
            type=ValidationType.CLEAR_MATCH,
            confidence=confidence,
            reasoning=reasoning,
            ui_action=UIAction.APPROVE if confidence >= 92 else UIAction.MANUAL_REVIEW,
            brand=brand_name,
            expected_category=category,
            sources={
                "vision_ai_search_a": {
                    "correct_matches": vision_brands_a.get("correct_matches", 0),
                    "mismatched_count": vision_brands_a.get("mismatched_count", 0),
                },
                "vision_ai_search_b": {
                    "correct_matches": vision_brands_b.get("correct_matches", 0),
                    "mismatched_count": vision_brands_b.get("mismatched_count", 0),
                    "brands": vision_brands,
                },
                "web_search_ai_a": {
                    "correct_matches": web_brands_a.get("correct_matches", 0),
                    "mismatched_count": web_brands_a.get("mismatched_count", 0),
                },
                "web_search_ai_b": {
                    "correct_matches": web_brands_b.get("correct_matches", 0),
                    "mismatched_count": web_brands_b.get("mismatched_count", 0),
                    "brands": web_brands,
                },
                "multi_source_total": {
                    "total_correct_b": total_correct_b,
                    "total_mismatched_a": total_mismatched_a,
                    "mismatched_types": list(mismatched_types),
                },
                "knowledge_graph": {
                    brand_name: {
                        "verified": kg_verified,
                    }
                },
                "embeddings": {
                    brand_name: embedding_sim,
                },
                "confidence_breakdown": confidence_breakdown,
                "decision_tree": decision_tree,
                "issues_detected": issues_detected,
            },
            tier=5,
        )

        # Add raw data
        return self._add_raw_data(result, validation_data)

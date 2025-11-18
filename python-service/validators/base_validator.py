"""
Base Validator - Shared validation logic across all validators

This module provides common functionality used by multiple validators:
- Confidence breakdown calculations
- Knowledge graph verification
- Tier-based scoring
- Common utility methods

Reduces 400+ lines of duplication across PatternDetector, MultiSourceValidator,
and ComprehensiveValidator.
"""

import logging
from typing import Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ConfidenceBreakdown:
    """Structured confidence breakdown from multi-tier validation"""
    vision_contribution: int
    web_contribution: int
    kg_contribution: int
    embedding_contribution: int
    total_confidence: int
    breakdown: Dict[str, Any]


class BaseValidator:
    """
    Base class for all validators providing shared functionality.

    Common patterns:
    - Multi-tier confidence calculations (Vision, Web, KG, Embeddings)
    - Knowledge graph verification
    - Source aggregation
    """

    def __init__(self):
        """Initialize base validator"""
        self.logger = logger

    def calculate_confidence_breakdown(
        self,
        vision_brands_a: Optional[Dict] = None,
        vision_brands_b: Optional[Dict] = None,
        web_brands_a: Optional[Dict] = None,
        web_brands_b: Optional[Dict] = None,
        kg_results: Optional[Dict] = None,
        embedding_similarities: Optional[Dict] = None,
        dominant_brand: Optional[str] = None
    ) -> ConfidenceBreakdown:
        """
        Calculate how each tier contributed to final confidence.

        This is a centralized implementation of the confidence calculation
        logic that was previously duplicated across multiple validators.

        Tier weights:
        - Vision AI: Max 35%
        - Web Search AI: Max 30%
        - Knowledge Graph: Max 15%
        - Embeddings: Max 20%
        Total: 100%

        Args:
            vision_brands_a: Vision results from first image set
            vision_brands_b: Vision results from second image set
            web_brands_a: Web search results from first query
            web_brands_b: Web search results from second query
            kg_results: Knowledge graph verification results
            embedding_similarities: Text similarity scores
            dominant_brand: Primary brand identified

        Returns:
            ConfidenceBreakdown with detailed tier contributions
        """
        breakdown = {}

        # Tier 1: Vision AI contribution (Max 35%)
        vision_b_correct = vision_brands_b.get("correct_matches", 0) if vision_brands_b else 0
        vision_b_total = vision_brands_b.get("total_images", 1) if vision_brands_b else 1
        vision_rate = vision_b_correct / vision_b_total if vision_b_total > 0 else 0

        vision_contribution = int(vision_rate * 35)  # Max 35%
        breakdown["vision_ai"] = {
            "contribution": vision_contribution,
            "max_contribution": 35,
            "rate": round(vision_rate * 100, 1),
            "reason": f"{vision_b_correct}/{vision_b_total} images matched category",
            "status": "strong" if vision_rate >= 0.8 else "moderate" if vision_rate >= 0.5 else "weak"
        }

        # Tier 1.5: Web Search AI contribution (Max 30%)
        web_b_correct = web_brands_b.get("correct_matches", 0) if web_brands_b else 0
        web_b_total = web_brands_b.get("total_results", 1) if web_brands_b else 1
        web_rate = web_b_correct / web_b_total if web_b_total > 0 else 0

        web_contribution = int(web_rate * 30)  # Max 30%
        breakdown["web_search"] = {
            "contribution": web_contribution,
            "max_contribution": 30,
            "rate": round(web_rate * 100, 1),
            "reason": f"{web_b_correct}/{web_b_total} results matched brand",
            "status": "strong" if web_rate >= 0.8 else "moderate" if web_rate >= 0.5 else "weak"
        }

        # Tier 3: Knowledge Graph contribution (Max 15%)
        kg_contribution, kg_verified, kg_matches_category = self._calculate_kg_contribution(
            kg_results, dominant_brand
        )

        breakdown["knowledge_graph"] = {
            "contribution": kg_contribution,
            "max_contribution": 15,
            "verified": kg_verified,
            "matches_category": kg_matches_category,
            "reason": self._get_kg_reason(kg_verified, kg_matches_category),
            "status": self._get_kg_status(kg_verified, kg_matches_category)
        }

        # Tier 4: Embeddings contribution (Max 20%)
        embedding_similarity = 0
        if embedding_similarities and dominant_brand and dominant_brand in embedding_similarities:
            embedding_similarity = embedding_similarities[dominant_brand]

        embedding_contribution = int(embedding_similarity * 20)  # Max 20%
        breakdown["embeddings"] = {
            "contribution": embedding_contribution,
            "max_contribution": 20,
            "similarity": round(embedding_similarity * 100, 1),
            "reason": f"{round(embedding_similarity * 100, 1)}% text similarity",
            "status": "strong" if embedding_similarity >= 0.7 else "moderate" if embedding_similarity >= 0.4 else "weak"
        }

        # Calculate total
        total = vision_contribution + web_contribution + kg_contribution + embedding_contribution

        breakdown["total"] = {
            "confidence": total,
            "max_possible": 100,
            "components": {
                "vision": vision_contribution,
                "web": web_contribution,
                "kg": kg_contribution,
                "embeddings": embedding_contribution
            }
        }

        return ConfidenceBreakdown(
            vision_contribution=vision_contribution,
            web_contribution=web_contribution,
            kg_contribution=kg_contribution,
            embedding_contribution=embedding_contribution,
            total_confidence=total,
            breakdown=breakdown
        )

    def _calculate_kg_contribution(
        self,
        kg_results: Optional[Dict],
        dominant_brand: Optional[str]
    ) -> tuple[int, bool, bool]:
        """
        Calculate Knowledge Graph contribution to confidence.

        Args:
            kg_results: Knowledge graph verification results
            dominant_brand: Primary brand name to verify

        Returns:
            Tuple of (contribution, verified, matches_category)
        """
        kg_verified = False
        kg_matches_category = False

        if kg_results and dominant_brand and dominant_brand in kg_results:
            kg_result = kg_results[dominant_brand]
            if kg_result:
                kg_verified = kg_result.verified if hasattr(kg_result, 'verified') else False
                kg_matches_category = kg_result.matches_user_category if hasattr(kg_result, 'matches_user_category') else False

        kg_contribution = 0
        if kg_verified:
            if kg_matches_category:
                kg_contribution = 15  # Full 15% - verified and category matches
            else:
                kg_contribution = 5   # Partial 5% - verified but category mismatch

        return kg_contribution, kg_verified, kg_matches_category

    def _get_kg_reason(self, verified: bool, matches_category: bool) -> str:
        """Get human-readable reason for KG verification result"""
        if not verified:
            return "Not found in Knowledge Graph"
        if matches_category:
            return "Entity verified and category matches"
        return "Entity verified but category mismatch"

    def _get_kg_status(self, verified: bool, matches_category: bool) -> str:
        """Get status level for KG verification"""
        if not verified:
            return "none"
        if matches_category:
            return "strong"
        return "weak"

    def aggregate_sources(
        self,
        confidence_breakdown: ConfidenceBreakdown,
        vision_data: Optional[Dict] = None,
        web_data: Optional[Dict] = None,
        kg_data: Optional[Dict] = None,
        embedding_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Aggregate all source data into a comprehensive sources dict.

        Args:
            confidence_breakdown: Calculated confidence breakdown
            vision_data: Vision AI analysis results
            web_data: Web search results
            kg_data: Knowledge graph data
            embedding_data: Embedding similarity data

        Returns:
            Comprehensive sources dictionary with all tier data
        """
        sources = {
            "confidence_breakdown": confidence_breakdown.breakdown,
            "total_confidence": confidence_breakdown.total_confidence
        }

        if vision_data:
            sources["vision_ai"] = vision_data

        if web_data:
            sources["web_search"] = web_data

        if kg_data:
            sources["knowledge_graph"] = kg_data

        if embedding_data:
            sources["embeddings"] = embedding_data

        return sources

    def calculate_confidence_level(self, confidence: int) -> str:
        """
        Convert numeric confidence to level description.

        Args:
            confidence: Confidence score 0-100

        Returns:
            Confidence level: "very_high", "high", "medium", "low", "very_low"
        """
        if confidence >= 80:
            return "very_high"
        elif confidence >= 60:
            return "high"
        elif confidence >= 40:
            return "medium"
        elif confidence >= 20:
            return "low"
        else:
            return "very_low"

    def get_recommendation(self, confidence: int, risk_factors: list = None) -> str:
        """
        Get validation recommendation based on confidence and risk factors.

        Args:
            confidence: Confidence score 0-100
            risk_factors: List of identified risk factors

        Returns:
            Recommendation: "approve", "review", or "reject"
        """
        risk_count = len(risk_factors) if risk_factors else 0

        # High confidence with no risks -> approve
        if confidence >= 70 and risk_count == 0:
            return "approve"

        # Low confidence or many risks -> reject
        if confidence < 40 or risk_count >= 3:
            return "reject"

        # Medium confidence or some risks -> review
        return "review"

    def validate_brand_format(self, brand_name: str) -> Dict[str, Any]:
        """
        Validate brand name format and detect common issues.

        Args:
            brand_name: Brand name to validate

        Returns:
            Dict with validation results
        """
        issues = []
        warnings = []

        if not brand_name or len(brand_name.strip()) == 0:
            issues.append("Empty brand name")

        if len(brand_name) < 2:
            warnings.append("Brand name too short (< 2 characters)")

        if len(brand_name) > 100:
            warnings.append("Brand name unusually long (> 100 characters)")

        # Check for common placeholder text
        placeholders = ["unknown", "n/a", "none", "null", "undefined", "test"]
        if brand_name.lower() in placeholders:
            issues.append(f"Placeholder text detected: {brand_name}")

        # Check for gibberish (too many consonants in a row)
        import re
        consonant_clusters = re.findall(r'[bcdfghjklmnpqrstvwxyz]{5,}', brand_name.lower())
        if consonant_clusters:
            warnings.append("Possible gibberish detected")

        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "warnings": warnings,
            "cleaned": brand_name.strip()
        }

    def merge_duplicate_brands(self, brands: Dict[str, float], threshold: float = 0.85) -> Dict[str, float]:
        """
        Merge similar brand names based on string similarity.

        Args:
            brands: Dictionary of brand names and their scores
            threshold: Similarity threshold for merging (0-1)

        Returns:
            Merged brands dictionary
        """
        from difflib import SequenceMatcher

        if not brands or len(brands) <= 1:
            return brands

        merged = {}
        processed = set()

        for brand1, score1 in brands.items():
            if brand1 in processed:
                continue

            # Find similar brands
            similar_brands = [brand1]
            total_score = score1

            for brand2, score2 in brands.items():
                if brand2 == brand1 or brand2 in processed:
                    continue

                # Calculate similarity
                similarity = SequenceMatcher(None, brand1.lower(), brand2.lower()).ratio()

                if similarity >= threshold:
                    similar_brands.append(brand2)
                    total_score += score2
                    processed.add(brand2)

            # Use the longest brand name as canonical
            canonical = max(similar_brands, key=len)
            merged[canonical] = total_score / len(similar_brands)
            processed.add(brand1)

        return merged

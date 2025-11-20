"""
Pattern Detection & Multi-Source Aggregation

Analyzes all validation sources and detects patterns:
- Category Error: User text exists but in wrong category
- Ambiguous Descriptor: Term is product descriptor, not brand
- Clear Match: High confidence match from multiple sources
- Unclear: Low confidence, needs manual review

COMPOSITE SCORING FORMULA:
confidence = (
    pinecone_score * 0.40 +
    vision_score * 0.30 +
    kg_score * 0.20 +
    embedding_score * 0.10
) * 100
"""

import logging
from typing import Dict, List, Optional, Any
from validators.multi_source_validator import (
    ValidationResult,
    ValidationType,
    UIAction,
    Candidate,
)

logger = logging.getLogger(__name__)


class PatternDetector:
    """
    Detects patterns from multi-source validation data

    Implements composite scoring and pattern classification
    """

    # Pattern detection thresholds
    CATEGORY_ERROR_THRESHOLD = 0.20  # < 20% confidence suggests category error
    CLEAR_MATCH_THRESHOLD = 0.70  # > 70% confidence is clear match
    AMBIGUOUS_THRESHOLD = 0.50  # 20-50% suggests ambiguity

    def __init__(self):
        logger.info("PatternDetector initialized")

    def detect_pattern(
        self,
        user_text: str,
        category: str,
        pinecone_match: Optional[Any],
        dual_search_results: Any,
        vision_results: Any,
        vision_brands_a: Dict[str, Any],
        vision_brands_b: Dict[str, Any],
        web_brands_a: Dict[str, Any],
        web_brands_b: Dict[str, Any],
        kg_results: Dict[str, Optional[Any]],
        embedding_similarities: Dict[str, float],
        raw_image_urls: Optional[List[Dict[str, str]]] = None,
        raw_web_results: Optional[List[Dict[str, str]]] = None,
        raw_kg_details: Optional[Dict[str, Any]] = None,
    ) -> ValidationResult:
        """
        Analyze all sources and return final validation result

        Args:
            user_text: User's input
            category: Expected category
            pinecone_match: Pinecone search result
            dual_search_results: Google Images dual search
            vision_results: Vision AI analysis
            kg_results: Knowledge Graph verification
            embedding_similarities: Embedding similarity scores

        Returns:
            ValidationResult with detected pattern
        """
        logger.info(f"🔍 Pattern Detection: Analyzing all sources...")

        # PATTERN 0: Category Validated by Product Type Filtering
        category_validated = self._detect_category_validated(
            user_text,
            category,
            vision_brands_a,
            vision_brands_b,
            web_brands_a,
            web_brands_b,
            vision_results,
            kg_results,
            embedding_similarities,
        )
        if category_validated:
            # Add raw data
            category_validated.image_urls = raw_image_urls
            category_validated.web_results = raw_web_results
            category_validated.kg_details = raw_kg_details
            return category_validated

        # PATTERN 1: Category Error
        category_error = self._detect_category_error(
            user_text,
            category,
            dual_search_results,
            web_brands_a,
            web_brands_b,
            kg_results,
            embedding_similarities,
        )
        if category_error:
            # Add raw data
            category_error.image_urls = raw_image_urls
            category_error.web_results = raw_web_results
            category_error.kg_details = raw_kg_details
            return category_error

        # PATTERN 2: Ambiguous Descriptor
        ambiguous = self._detect_ambiguous_descriptor(
            user_text,
            category,
            vision_results,
            web_brands_a,
            web_brands_b,
            kg_results,
            embedding_similarities,
        )
        if ambiguous:
            # Add raw data
            ambiguous.image_urls = raw_image_urls
            ambiguous.web_results = raw_web_results
            ambiguous.kg_details = raw_kg_details
            return ambiguous

        # PATTERN 3: Clear Match
        clear_match = self._detect_clear_match(
            user_text,
            category,
            vision_results,
            vision_brands_a,
            vision_brands_b,
            web_brands_a,
            web_brands_b,
            kg_results,
            embedding_similarities,
        )
        if clear_match:
            # Add raw data
            clear_match.image_urls = raw_image_urls
            clear_match.web_results = raw_web_results
            clear_match.kg_details = raw_kg_details
            return clear_match

        # PATTERN 4: Unclear - needs manual review
        unclear = self._create_unclear_result(
            user_text=user_text,
            category=category,
            pinecone_match=pinecone_match,
            dual_search_results=dual_search_results,
            vision_results=vision_results,
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
        )
        # Add raw data even for unclear results
        unclear.image_urls = raw_image_urls
        unclear.web_results = raw_web_results
        unclear.kg_details = raw_kg_details
        return unclear

    def _detect_category_validated(
        self,
        user_text: str,
        category: str,
        vision_brands_a: Dict[str, Any],
        vision_brands_b: Dict[str, Any],
        web_brands_a: Dict[str, Any],
        web_brands_b: Dict[str, Any],
        vision_results: Any,
        kg_results: Dict[str, Optional[Any]],
        embedding_similarities: Dict[str, float],
    ) -> Optional[ValidationResult]:
        """
        PATTERN 0: Category Validated by Product Type Filtering

        Triggers:
        - Search B (with category) has high correct product type matches (>= 5)
        - Search A (without category) has significant mismatches (>= 3)
        - This validates that the category filter is working correctly!
        - Now uses BOTH Vision AI AND Web Search AI for validation

        Example:
            User: "Oral-B" + Category: "Toothpaste"
            Vision AI Search A: 3 toothpaste + 3 electric toothbrushes (50% wrong type!)
            Vision AI Search B: 6 toothpaste (100% correct type!)
            Web AI Search B: 8 toothpaste (100% correct type!)
            → Category is validated! Brand exists in correct product type.
        """
        # Count from both Vision AI and Web Search AI
        vision_correct_a = vision_brands_a.get("correct_matches", 0)
        vision_correct_b = vision_brands_b.get("correct_matches", 0)
        vision_mismatched_a = vision_brands_a.get("mismatched_count", 0)
        vision_mismatched_b = vision_brands_b.get("mismatched_count", 0)

        web_correct_a = web_brands_a.get("correct_matches", 0)
        web_correct_b = web_brands_b.get("correct_matches", 0)
        web_mismatched_a = web_brands_a.get("mismatched_count", 0)
        web_mismatched_b = web_brands_b.get("mismatched_count", 0)

        # Combined totals
        total_correct_b = vision_correct_b + web_correct_b
        total_mismatched_a = vision_mismatched_a + web_mismatched_a

        # Check if Search B has strong correct matches and Search A has mismatches
        # LOWER THRESHOLD: 3 correct (was 5), 2 mismatched (was 3) - more lenient
        if total_correct_b >= 3 and total_mismatched_a >= 2:
            # This is a strong signal that category filtering is working!
            # Search without category shows wrong product types
            # Search with category shows correct product types

            # Get the dominant brand from correctly typed products
            # Combine both Vision and Web brands
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

            # Get data from vision if available, otherwise web
            brand_data = vision_brands.get(brand_name) or web_brands.get(brand_name)

            # Check if KG verifies this brand
            kg_result = kg_results.get(brand_name)
            kg_verified = kg_result and kg_result.verified and kg_result.matches_user_category

            # Get embedding similarity
            embedding_sim = embedding_similarities.get(brand_name, 0.0)

            # Calculate confidence with KG BOOST
            # High confidence because multi-source category filtering works
            base_confidence = 88  # Increased from 85 because we have 2 sources

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
                if mismatch["detected_type"]:  # Filter out None
                    mismatched_types.add(mismatch["detected_type"])
            for mismatch in web_brands_a.get("mismatched_products", []):
                if mismatch["detected_type"]:  # Filter out None
                    mismatched_types.add(mismatch["detected_type"])

            mismatched_types_str = ", ".join(sorted(mismatched_types)[:3]) if mismatched_types else "Unknown"

            logger.info(
                f"✅ Category Validated (Multi-Source): {brand_name} in {category} | "
                f"Vision B: {vision_correct_b} correct, Web B: {web_correct_b} correct | "
                f"KG verified: {kg_verified} (+{kg_bonus}% boost)"
            )

            # Build reasoning with KG verification
            reasoning = (
                f"Multi-source category validation! "
                f"Vision AI + Web AI detected {total_correct_b} correct {category} products. "
                f"Search without category shows {total_mismatched_a} wrong product types "
                f"({mismatched_types_str}). "
            )

            if kg_verified:
                reasoning += f" Knowledge Graph VERIFIED '{brand_name}' as brand (+{kg_bonus}% confidence boost). "

            reasoning += f"This confirms '{brand_name}' is the correct {category} brand."

            # Calculate confidence breakdown
            confidence_breakdown = self._calculate_confidence_breakdown(
                vision_brands_a=vision_brands_a,
                vision_brands_b=vision_brands_b,
                web_brands_a=web_brands_a,
                web_brands_b=web_brands_b,
                kg_results=kg_results,
                embedding_similarities=embedding_similarities,
                dominant_brand=brand_name
            )

            # Generate decision tree
            decision_tree = self._build_decision_tree(
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
            issues_detected = self._detect_validation_issues(
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

            return ValidationResult(
                type=ValidationType.CLEAR_MATCH,
                confidence=confidence,
                reasoning=reasoning,
                ui_action=UIAction.APPROVE if confidence >= 92 else UIAction.MANUAL_REVIEW,
                brand=brand_name,
                expected_category=category,
                sources={
                    "vision_ai_search_a": {
                        "correct_matches": vision_correct_a,
                        "mismatched_count": vision_mismatched_a,
                    },
                    "vision_ai_search_b": {
                        "correct_matches": vision_correct_b,
                        "mismatched_count": vision_mismatched_b,
                        "brands": vision_brands,
                    },
                    "web_search_ai_a": {
                        "correct_matches": web_correct_a,
                        "mismatched_count": web_mismatched_a,
                    },
                    "web_search_ai_b": {
                        "correct_matches": web_correct_b,
                        "mismatched_count": web_mismatched_b,
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

        return None

    def _detect_category_error(
        self,
        user_text: str,
        category: str,
        dual_search_results: Any,
        web_brands_a: Dict[str, Any],
        web_brands_b: Dict[str, Any],
        kg_results: Dict[str, Optional[Any]],
        embedding_similarities: Dict[str, float],
    ) -> Optional[ValidationResult]:
        """
        PATTERN 1: Category Error

        Triggers:
        - Search B has < 5 results
        - Search A has > 10 results
        - Knowledge Graph: user text exists but in different category
        - Embedding: high similarity (> 0.85) to wrong-category entity

        Example:
            User: "apple" + Category: Toothpaste
            → Detected: Apple Inc (technology)
            → Suggest: Change category or skip
        """
        # Check search pattern
        if (dual_search_results.search_a_count >= 10 and
            dual_search_results.search_b_count < 5):

            # Check if user_text is verified entity in wrong category
            user_kg = kg_results.get(user_text)
            if user_kg and user_kg.verified and not user_kg.matches_user_category:

                # High embedding similarity confirms it's the wrong-category entity
                max_embedding_sim = max(embedding_similarities.values()) if embedding_similarities else 0

                if max_embedding_sim > 0.85:
                    logger.info(f"🚨 Category Error: '{user_text}' is {user_kg.entity_type} ({user_kg.category}), not {category}")

                    confidence = int(max_embedding_sim * 20)  # Low confidence (< 20%)

                    # Calculate confidence breakdown
                    confidence_breakdown = self._calculate_confidence_breakdown(
                        vision_brands_a=None,
                        vision_brands_b=None,
                        web_brands_a=web_brands_a,
                        web_brands_b=web_brands_b,
                        kg_results=kg_results,
                        embedding_similarities=embedding_similarities,
                        dominant_brand=user_text
                    )

                    # Generate decision tree
                    decision_tree = self._build_decision_tree(
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
                    issues_detected = self._detect_validation_issues(
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

                    # Build sources dict and add confidence breakdown
                    sources = self._build_sources_dict(
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

                    return ValidationResult(
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

        return None

    def _detect_ambiguous_descriptor(
        self,
        user_text: str,
        category: str,
        vision_results: Any,
        web_brands_a: Dict[str, Any],
        web_brands_b: Dict[str, Any],
        kg_results: Dict[str, Optional[Any]],
        embedding_similarities: Dict[str, float],
    ) -> Optional[ValidationResult]:
        """
        PATTERN 2: Ambiguous Descriptor

        Triggers:
        - Vision AI detects 3+ different brands
        - No single brand > 40% frequency
        - User text appears as part of multiple brand names
        - Descriptor keywords: extra, white, whitening, fresh, pro, advanced, complete

        Example:
            User: "اكسترا" + Category: Toothpaste
            → Detected: Sensodyne Extra (33%), Oral-B Extra (33%), Parodontax (17%)
            → Ask: "Which brand's Extra product?"
        """
        # Check if vision detected multiple brands
        if (vision_results and
            len(vision_results.brand_frequencies) >= 3 and
            vision_results.dominant_frequency < 0.40):

            # Check if user text is a descriptor keyword
            descriptor_keywords = [
                "extra", "white", "whitening", "fresh", "pro",
                "advanced", "complete", "ultra", "max", "plus"
            ]

            is_descriptor = any(kw in user_text.lower() for kw in descriptor_keywords)

            if is_descriptor or vision_results.pattern == "descriptor":
                logger.info(f"🔀 Ambiguous Descriptor: '{user_text}' appears in multiple brands")

                # Build candidate list
                candidates = []
                for brand, freq_data in vision_results.brand_frequencies.items():
                    kg_result = kg_results.get(brand)
                    embedding_sim = embedding_similarities.get(brand, 0.0)

                    # Composite score for this candidate
                    vision_score = freq_data["frequency"]
                    kg_score = 1.0 if (kg_result and kg_result.verified) else 0.5
                    composite = (
                        vision_score * 0.50 +
                        kg_score * 0.30 +
                        embedding_sim * 0.20
                    )

                    candidates.append(
                        Candidate(
                            brand=brand,
                            full_name=f"{brand} {user_text}",
                            score=composite,
                            vision_frequency=freq_data["frequency"],
                            kg_verified=bool(kg_result and kg_result.verified),
                            embedding_similarity=embedding_sim,
                            pinecone_match=False,
                        )
                    )

                # Sort by score
                candidates.sort(key=lambda c: c.score, reverse=True)

                # Confidence = highest candidate score * 50 (ambiguous range)
                confidence = int(candidates[0].score * 50) if candidates else 25

                # Calculate confidence breakdown for top candidate
                top_brand = candidates[0].brand if candidates else None
                confidence_breakdown = self._calculate_confidence_breakdown(
                    vision_brands_a=None,
                    vision_brands_b=None,
                    web_brands_a=web_brands_a,
                    web_brands_b=web_brands_b,
                    kg_results=kg_results,
                    embedding_similarities=embedding_similarities,
                    dominant_brand=top_brand
                )

                # Generate decision tree
                decision_tree = self._build_decision_tree(
                    vision_brands_a=None,
                    vision_brands_b=None,
                    web_brands_a=web_brands_a,
                    web_brands_b=web_brands_b,
                    kg_results=kg_results,
                    embedding_similarities=embedding_similarities,
                    dominant_brand=top_brand,
                    confidence=confidence
                )

                # Detect issues
                issues_detected = self._detect_validation_issues(
                    vision_brands_a=None,
                    vision_brands_b=None,
                    web_brands_a=web_brands_a,
                    web_brands_b=web_brands_b,
                    kg_results=kg_results,
                    embedding_similarities=embedding_similarities,
                    dominant_brand=top_brand,
                    user_text=user_text,
                    category=category
                )

                # Build sources dict and add confidence breakdown
                sources = self._build_sources_dict(
                    pinecone_match=None,
                    dual_search_results=None,
                    vision_results=vision_results,
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

                return ValidationResult(
                    type=ValidationType.AMBIGUOUS_DESCRIPTOR,
                    confidence=confidence,
                    reasoning=f"'{user_text}' is a descriptor appearing in multiple brands. User needs to specify which brand.",
                    ui_action=UIAction.ASK_USER_CHOOSE,
                    descriptor=user_text,
                    expected_category=category,
                    candidates=candidates[:5],  # Top 5
                    sources=sources,
                    tier=5,
                )

        return None

    def _detect_clear_match(
        self,
        user_text: str,
        category: str,
        vision_results: Any,
        vision_brands_a: Dict[str, Any],
        vision_brands_b: Dict[str, Any],
        web_brands_a: Dict[str, Any],
        web_brands_b: Dict[str, Any],
        kg_results: Dict[str, Optional[Any]],
        embedding_similarities: Dict[str, float],
    ) -> Optional[ValidationResult]:
        """
        PATTERN 3: Clear Match

        Triggers:
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
        if not vision_results or not vision_results.dominant_brand:
            return None

        # Check vision frequency
        if vision_results.dominant_frequency > 0.50:
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

            if confidence >= 70:
                logger.info(
                    f"✅ Clear Match: {dominant_brand} with {confidence}% confidence "
                    f"(base: {base_confidence}%, KG boost: +{kg_bonus}%)"
                )

                # Build reasoning with KG info
                reasoning = f"High confidence match: {dominant_brand} detected in {vision_results.dominant_frequency:.0%} of images"
                if kg_verified:
                    reasoning += f". Knowledge Graph VERIFIED as brand (+{kg_bonus}% confidence boost)"
                reasoning += ". Multiple sources confirm this brand."

                # Calculate confidence breakdown
                confidence_breakdown = self._calculate_confidence_breakdown(
                    vision_brands_a=vision_brands_a,
                    vision_brands_b=vision_brands_b,
                    web_brands_a=web_brands_a,
                    web_brands_b=web_brands_b,
                    kg_results=kg_results,
                    embedding_similarities=embedding_similarities,
                    dominant_brand=dominant_brand
                )

                # Generate decision tree
                decision_tree = self._build_decision_tree(
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
                issues_detected = self._detect_validation_issues(
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

                # Build sources dict and add confidence breakdown
                sources = self._build_sources_dict(
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

                return ValidationResult(
                    type=ValidationType.CLEAR_MATCH,
                    confidence=confidence,
                    reasoning=reasoning,
                    ui_action=UIAction.APPROVE if confidence >= 85 else UIAction.MANUAL_REVIEW,
                    brand=dominant_brand,
                    expected_category=category,
                    sources=sources,
                    tier=5,
                )

        return None

    def _create_unclear_result(
        self,
        user_text: str,
        category: str,
        pinecone_match: Optional[Any],
        dual_search_results: Optional[Any],
        vision_results: Optional[Any],
        vision_brands_a: Dict[str, Any],
        vision_brands_b: Dict[str, Any],
        web_brands_a: Dict[str, Any],
        web_brands_b: Dict[str, Any],
        kg_results: Dict[str, Optional[Any]],
        embedding_similarities: Dict[str, float],
    ) -> ValidationResult:
        """
        PATTERN 4: Unclear

        Triggers:
        - Low confidence from all sources
        - Conflicting information
        - Insufficient data

        IMPORTANT: Still includes all sources data for UI display!
        """
        logger.info(f"❓ Unclear: Insufficient data for confident determination")

        # Try to get dominant brand from vision results if available
        dominant_brand = None
        if vision_results and hasattr(vision_results, 'dominant_brand'):
            dominant_brand = vision_results.dominant_brand

        # Calculate confidence breakdown even for unclear results
        confidence_breakdown = self._calculate_confidence_breakdown(
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=dominant_brand
        )

        # Generate decision tree
        decision_tree = self._build_decision_tree(
            vision_brands_a=vision_brands_a,
            vision_brands_b=vision_brands_b,
            web_brands_a=web_brands_a,
            web_brands_b=web_brands_b,
            kg_results=kg_results,
            embedding_similarities=embedding_similarities,
            dominant_brand=dominant_brand,
            confidence=0  # Unclear results have 0 confidence
        )

        # Detect issues
        issues_detected = self._detect_validation_issues(
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

        # Build sources dict and add confidence breakdown
        sources = self._build_sources_dict(
            pinecone_match=pinecone_match,
            dual_search_results=dual_search_results,
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

        return ValidationResult(
            type=ValidationType.UNCLEAR,
            confidence=0,
            reasoning="Insufficient data from all sources to make confident determination",
            ui_action=UIAction.MANUAL_REVIEW,
            expected_category=category,
            sources=sources,
            tier=5,
        )

    def _build_sources_dict(
        self,
        pinecone_match: Optional[Any],
        dual_search_results: Optional[Any],
        vision_results: Optional[Any],
        vision_brands_a: Optional[Dict[str, Any]],
        vision_brands_b: Optional[Dict[str, Any]],
        web_brands_a: Optional[Dict[str, Any]],
        web_brands_b: Optional[Dict[str, Any]],
        kg_results: Optional[Dict[str, Optional[Any]]],
        embedding_similarities: Optional[Dict[str, float]],
    ) -> Dict[str, Any]:
        """
        Build comprehensive sources breakdown with ALL tier data
        """
        sources = {}

        if pinecone_match:
            sources["pinecone"] = {
                "match": True,
                "similarity": pinecone_match.similarity,
                "namespace": pinecone_match.namespace,
            }

        if dual_search_results:
            sources["google_search_a"] = {
                "results_count": dual_search_results.search_a_count,
                "pattern": dual_search_results.pattern,
            }
            sources["google_search_b"] = {
                "results_count": dual_search_results.search_b_count,
                "pattern": dual_search_results.pattern,
            }

        # Web Search AI (Tier 1.5) - NEW!
        if web_brands_a or web_brands_b:
            sources["web_search_ai_a"] = {
                "total_results": web_brands_a.get("total_results", 0) if web_brands_a else 0,
                "correct_matches": web_brands_a.get("correct_matches", 0) if web_brands_a else 0,
                "mismatched_count": web_brands_a.get("mismatched_count", 0) if web_brands_a else 0,
                "brands": web_brands_a.get("brands", {}) if web_brands_a else {},
            }
            sources["web_search_ai_b"] = {
                "total_results": web_brands_b.get("total_results", 0) if web_brands_b else 0,
                "correct_matches": web_brands_b.get("correct_matches", 0) if web_brands_b else 0,
                "mismatched_count": web_brands_b.get("mismatched_count", 0) if web_brands_b else 0,
                "brands": web_brands_b.get("brands", {}) if web_brands_b else {},
            }

        if vision_results:
            sources["vision_ai"] = {
                "images_analyzed": vision_results.total_analyzed,
                "products_identified": vision_results.total_products,
                "dominant_brand": vision_results.dominant_brand,
                "brands_detected": vision_results.brand_frequencies,
            }

        # Vision AI filtered results (with product type filtering)
        if vision_brands_a or vision_brands_b:
            sources["vision_ai_search_a"] = {
                "total_images": vision_brands_a.get("total_images", 0) if vision_brands_a else 0,
                "correct_matches": vision_brands_a.get("correct_matches", 0) if vision_brands_a else 0,
                "mismatched_count": vision_brands_a.get("mismatched_count", 0) if vision_brands_a else 0,
                "brands": vision_brands_a.get("brands", {}) if vision_brands_a else {},
            }
            sources["vision_ai_search_b"] = {
                "total_images": vision_brands_b.get("total_images", 0) if vision_brands_b else 0,
                "correct_matches": vision_brands_b.get("correct_matches", 0) if vision_brands_b else 0,
                "mismatched_count": vision_brands_b.get("mismatched_count", 0) if vision_brands_b else 0,
                "brands": vision_brands_b.get("brands", {}) if vision_brands_b else {},
            }

        if kg_results:
            # Build comprehensive KG data with verification details
            kg_entities = {}
            verified_count = 0

            for entity, result in kg_results.items():
                if result:
                    is_verified = result.verified if hasattr(result, 'verified') else False
                    if is_verified:
                        verified_count += 1

                    kg_entities[entity] = {
                        "verified": is_verified,
                        "entity_type": result.entity_type if hasattr(result, 'entity_type') else None,
                        "matches_category": result.matches_user_category if hasattr(result, 'matches_user_category') else False,
                        "category": result.category if hasattr(result, 'category') else None,
                        "description": (result.description[:200] if hasattr(result, 'description') and result.description else "")
                    }
                else:
                    kg_entities[entity] = {
                        "verified": False,
                        "entity_type": None,
                        "matches_category": False,
                        "category": None,
                        "description": ""
                    }

            sources["knowledge_graph"] = {
                "entities": kg_entities,
                "total_entities": len(kg_results),
                "verified_count": verified_count,
            }

        if embedding_similarities:
            sources["embeddings"] = embedding_similarities

        return sources

    def _calculate_confidence_breakdown(
        self,
        vision_brands_a: Optional[Dict],
        vision_brands_b: Optional[Dict],
        web_brands_a: Optional[Dict],
        web_brands_b: Optional[Dict],
        kg_results: Optional[Dict],
        embedding_similarities: Optional[Dict],
        dominant_brand: Optional[str]
    ) -> Dict[str, Any]:
        """
        Calculate how each tier contributed to final confidence.

        Returns breakdown with contribution, reason, and status for each tier.
        """
        breakdown = {}

        # Vision AI contribution
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

        # Web Search AI contribution
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

        # Knowledge Graph contribution
        kg_verified = False
        kg_matches_category = False
        if kg_results and dominant_brand and dominant_brand in kg_results:
            kg_result = kg_results[dominant_brand]
            if kg_result:
                kg_verified = kg_result.verified if hasattr(kg_result, 'verified') else False
                kg_matches_category = kg_result.matches_user_category if hasattr(kg_result, 'matches_user_category') else False

        kg_contribution = 0
        kg_reason = "Not found in Knowledge Graph"
        kg_status = "none"

        if kg_verified:
            if kg_matches_category:
                kg_contribution = 15  # Full 15%
                kg_reason = "Entity verified and category matches"
                kg_status = "strong"
            else:
                kg_contribution = 5  # Partial 5%
                kg_reason = "Entity verified but category mismatch"
                kg_status = "weak"

        breakdown["knowledge_graph"] = {
            "contribution": kg_contribution,
            "max_contribution": 15,
            "verified": kg_verified,
            "matches_category": kg_matches_category,
            "reason": kg_reason,
            "status": kg_status
        }

        # Embeddings contribution
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

        return breakdown

    def _build_decision_tree(
        self,
        vision_brands_a: Optional[Dict],
        vision_brands_b: Optional[Dict],
        web_brands_a: Optional[Dict],
        web_brands_b: Optional[Dict],
        kg_results: Optional[Dict],
        embedding_similarities: Optional[Dict],
        dominant_brand: Optional[str],
        confidence: int
    ) -> List[Dict[str, Any]]:
        """
        Build step-by-step decision tree showing validation logic.

        Returns list of decision steps with checks, results, and impacts.
        """
        steps = []
        step_num = 1

        # Step 1: Vision AI Check
        vision_b_correct = vision_brands_b.get("correct_matches", 0) if vision_brands_b else 0
        vision_b_total = vision_brands_b.get("total_images", 1) if vision_brands_b else 1
        vision_rate = vision_b_correct / vision_b_total if vision_b_total > 0 else 0

        vision_result = vision_rate >= 0.8
        vision_signal = "STRONG" if vision_rate >= 0.8 else "MODERATE" if vision_rate >= 0.5 else "WEAK"

        steps.append({
            "step": step_num,
            "check": "Vision AI Detection Rate",
            "question": "Are most images showing the correct product type?",
            "result": vision_result,
            "details": f"{vision_b_correct}/{vision_b_total} images matched category",
            "signal": vision_signal,
            "impact": f"+{int(vision_rate * 35)}% confidence",
            "icon": "eye"
        })
        step_num += 1

        # Step 2: Web Search Check
        web_b_correct = web_brands_b.get("correct_matches", 0) if web_brands_b else 0
        web_b_total = web_brands_b.get("total_results", 1) if web_brands_b else 1
        web_rate = web_b_correct / web_b_total if web_b_total > 0 else 0

        web_result = web_rate >= 0.8
        web_signal = "STRONG" if web_rate >= 0.8 else "MODERATE" if web_rate >= 0.5 else "WEAK"

        steps.append({
            "step": step_num,
            "check": "Web Search Consensus",
            "question": "Do web results confirm this brand?",
            "result": web_result,
            "details": f"{web_b_correct}/{web_b_total} results mentioned brand",
            "signal": web_signal,
            "impact": f"+{int(web_rate * 30)}% confidence",
            "icon": "search"
        })
        step_num += 1

        # Step 3: Multi-source Agreement
        multi_source_agree = vision_result and web_result
        pattern_detected = "CLEAR_MATCH" if multi_source_agree else "UNCLEAR"

        steps.append({
            "step": step_num,
            "check": "Multi-source Agreement",
            "question": "Do Vision AI and Web Search agree?",
            "result": multi_source_agree,
            "details": f"Vision ({vision_signal}) + Web ({web_signal})",
            "signal": pattern_detected,
            "impact": f"Pattern: {pattern_detected}",
            "icon": "check-circle"
        })
        step_num += 1

        # Step 4: Knowledge Graph Verification
        kg_verified = False
        kg_matches = False
        if kg_results and dominant_brand and dominant_brand in kg_results:
            kg_result = kg_results[dominant_brand]
            if kg_result:
                kg_verified = kg_result.verified if hasattr(kg_result, 'verified') else False
                kg_matches = kg_result.matches_user_category if hasattr(kg_result, 'matches_user_category') else False

        kg_impact = 0
        kg_details = "Not found in Knowledge Graph"
        if kg_verified:
            if kg_matches:
                kg_impact = 15
                kg_details = "Entity verified and category matches"
            else:
                kg_impact = 5
                kg_details = "Entity verified but category mismatch (penalty applied)"

        steps.append({
            "step": step_num,
            "check": "Knowledge Graph Verification",
            "question": "Is this entity in Google's Knowledge Graph?",
            "result": kg_verified,
            "details": kg_details,
            "signal": "VERIFIED" if kg_matches else "MISMATCH" if kg_verified else "NOT_FOUND",
            "impact": f"+{kg_impact}% confidence" if kg_impact > 0 else "No impact",
            "icon": "globe"
        })
        step_num += 1

        # Step 5: Embedding Similarity
        embedding_sim = 0
        if embedding_similarities and dominant_brand and dominant_brand in embedding_similarities:
            embedding_sim = embedding_similarities[dominant_brand]

        embedding_result = embedding_sim >= 0.7
        embedding_signal = "HIGH" if embedding_sim >= 0.7 else "MODERATE" if embedding_sim >= 0.4 else "LOW"

        steps.append({
            "step": step_num,
            "check": "Text Similarity",
            "question": "How similar is the user text to the detected brand?",
            "result": embedding_result,
            "details": f"{round(embedding_sim * 100, 1)}% similarity score",
            "signal": embedding_signal,
            "impact": f"+{int(embedding_sim * 20)}% confidence",
            "icon": "zap"
        })
        step_num += 1

        # Step 6: Final Confidence Calculation
        steps.append({
            "step": step_num,
            "check": "Final Confidence Score",
            "question": "What is the overall confidence?",
            "result": confidence >= 70,
            "details": f"Combined all tier contributions",
            "signal": "HIGH" if confidence >= 70 else "MEDIUM" if confidence >= 50 else "LOW",
            "impact": f"{confidence}% final confidence",
            "icon": "trending-up"
        })

        return steps

    def _detect_validation_issues(
        self,
        vision_brands_a: Optional[Dict],
        vision_brands_b: Optional[Dict],
        web_brands_a: Optional[Dict],
        web_brands_b: Optional[Dict],
        kg_results: Optional[Dict],
        embedding_similarities: Optional[Dict],
        dominant_brand: Optional[str],
        user_text: str,
        category: str
    ) -> List[Dict[str, Any]]:
        """
        Detect issues and anomalies in validation process.

        Returns list of issues with severity, description, and suggestions.
        """
        issues = []

        # Issue 1: Knowledge Graph Wrong Entity
        if kg_results and dominant_brand:
            for query_text, kg_result in kg_results.items():
                if kg_result and kg_result.verified if hasattr(kg_result, 'verified') else False:
                    # Check if KG returned different entity than dominant brand
                    kg_name = kg_result.name if hasattr(kg_result, 'name') else None
                    if kg_name and kg_name.lower() != dominant_brand.lower():
                        issues.append({
                            "severity": "high",
                            "tier": "knowledge_graph",
                            "type": "wrong_entity",
                            "title": "Knowledge Graph Entity Mismatch",
                            "problem": f"KG returned '{kg_name}' for query '{query_text}'",
                            "expected": f"Expected: '{dominant_brand}'",
                            "impact": "Knowledge Graph did not contribute to confidence",
                            "suggestion": "This may indicate issues with query transliteration or entity disambiguation in Google's Knowledge Graph",
                            "icon": "alert-triangle"
                        })

                    # Check if KG category doesn't match
                    elif not (kg_result.matches_user_category if hasattr(kg_result, 'matches_user_category') else False):
                        kg_category = kg_result.category if hasattr(kg_result, 'category') else "Unknown"
                        issues.append({
                            "severity": "medium",
                            "tier": "knowledge_graph",
                            "type": "category_mismatch",
                            "title": "Knowledge Graph Category Mismatch",
                            "problem": f"KG category is '{kg_category}' but expected '{category}'",
                            "impact": "Reduced KG contribution from 15% to 5%",
                            "suggestion": "Entity exists but is classified differently in Knowledge Graph",
                            "icon": "alert-circle"
                        })

        # Issue 2: Low Embedding Similarity
        if embedding_similarities and dominant_brand:
            similarity = embedding_similarities.get(dominant_brand, 0)
            if similarity < 0.4:
                issues.append({
                    "severity": "medium",
                    "tier": "embeddings",
                    "type": "low_similarity",
                    "title": "Low Text Similarity",
                    "problem": f"Only {round(similarity * 100, 1)}% similarity between '{user_text}' and '{dominant_brand}'",
                    "impact": f"Reduced confidence by {20 - int(similarity * 20)}%",
                    "suggestion": "This often occurs with non-Latin scripts. Consider: (1) Adding transliteration step, (2) Using language-specific embedding models, (3) Implementing fuzzy matching",
                    "icon": "alert-circle"
                })

        # Issue 3: Vision AI Multiple Product Types (Search A)
        if vision_brands_a:
            correct = vision_brands_a.get("correct_matches", 0)
            mismatched = vision_brands_a.get("mismatched_count", 0)

            if mismatched > correct and mismatched > 0:
                total = correct + mismatched
                accuracy = round((correct/total)*100, 1) if total > 0 else 0
                issues.append({
                    "severity": "low",
                    "tier": "vision_ai",
                    "type": "multi_category_brand",
                    "title": "Multiple Product Types Detected",
                    "problem": f"Search A found {mismatched}/{total} images with wrong product type",
                    "impact": f"Reduced Search A accuracy to {accuracy}%",
                    "suggestion": "This brand likely produces multiple product categories (e.g., toothpaste AND whitening strips). This is expected behavior - category filtering in Search B resolves this.",
                    "icon": "info"
                })

        # Issue 4: Web Search Low Brand Mention Rate
        if web_brands_b:
            correct = web_brands_b.get("correct_matches", 0)
            total = web_brands_b.get("total_results", 1)
            rate = correct / total if total > 0 else 0

            if rate < 0.5:
                issues.append({
                    "severity": "medium",
                    "tier": "web_search",
                    "type": "low_mention_rate",
                    "title": "Low Web Search Brand Mentions",
                    "problem": f"Only {correct}/{total} results mentioned the brand ({round(rate*100, 1)}%)",
                    "impact": f"Reduced web search contribution to {int(rate * 30)}%",
                    "suggestion": "May indicate: (1) Uncommon brand name, (2) Spelling variations, (3) Regional availability issues",
                    "icon": "alert-circle"
                })

        # Issue 5: No Knowledge Graph Entity Found
        if kg_results and dominant_brand:
            kg_result = kg_results.get(dominant_brand)
            if not kg_result or not (kg_result.verified if hasattr(kg_result, 'verified') else False):
                issues.append({
                    "severity": "low",
                    "tier": "knowledge_graph",
                    "type": "entity_not_found",
                    "title": "Brand Not in Knowledge Graph",
                    "problem": f"'{dominant_brand}' not found in Google Knowledge Graph",
                    "impact": "No KG contribution (0%)",
                    "suggestion": "This is common for: (1) Regional brands, (2) New brands, (3) Private labels. Not necessarily a problem if other tiers agree.",
                    "icon": "info"
                })

        # Sort by severity (high > medium > low)
        severity_order = {"high": 0, "medium": 1, "low": 2}
        issues.sort(key=lambda x: severity_order.get(x["severity"], 3))

        return issues

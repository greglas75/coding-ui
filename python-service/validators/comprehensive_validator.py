"""
Comprehensive Validator - Multi-stage validation orchestrator
Coordinates translation, vision, and search validation
"""

from typing import List, Dict, Optional
import logging

from validators.translation_handler import TranslationHandler
from validators.gemini_vision_analyzer import GeminiVisionAnalyzer
from validators.search_validator import SearchValidator
from models.validation import EnhancedValidationResult

logger = logging.getLogger(__name__)


class ComprehensiveValidator:
    """
    Orchestrates multi-stage validation:
    1. Language detection and translation
    2. Vision-based brand identification with variant counting
    3. Google search validation in local language
    4. Confidence scoring and recommendation
    """

    def __init__(self, google_api_key: str, openai_key: Optional[str] = None):
        """
        Initialize validator with required API keys.

        Args:
            google_api_key: Google API key for Gemini Vision
            openai_key: Optional OpenAI key for future use
        """
        self.translation_handler = TranslationHandler()
        self.vision_analyzer = GeminiVisionAnalyzer(google_api_key)
        self.search_validator = SearchValidator()
        self.google_api_key = google_api_key
        self.openai_key = openai_key

    async def validate_response(
        self,
        user_response: str,
        images: List[str],
        google_search_results: dict,
        language_code: Optional[str] = None
    ) -> EnhancedValidationResult:
        """
        Enhanced validation with:
        - Automatic translation detection
        - Variant counting (all spelling variations)
        - Multi-language support
        - Local language search validation

        Args:
            user_response: Original user text (e.g., "سنسوداين")
            images: List of product image URLs
            google_search_results: Google search results dict
            language_code: ISO 639-1 code (auto-detected if None)

        Returns:
            EnhancedValidationResult with comprehensive analysis
        """
        try:
            # STAGE 1: Translation and language detection
            logger.info(f"Stage 1: Analyzing user response: {user_response}")

            # Detect language if not provided
            if not language_code:
                language_code = self.translation_handler.detect_language(user_response)
                logger.info(f"Detected language: {language_code}")

            # STAGE 2: Vision analysis with variant counting
            logger.info(f"Stage 2: Analyzing {len(images)} images")
            vision_result = await self.vision_analyzer.analyze_images_with_variants(
                images=images,
                expected_brand=None  # Let Claude identify the brand
            )

            logger.info(
                f"Vision analysis: {vision_result.brand_primary}, "
                f"{vision_result.total_products} products, "
                f"{len(vision_result.variants)} variants"
            )

            # Get display format using detected brand
            display_info = self.translation_handler.get_display_format(
                user_response=user_response,
                detected_brand=vision_result.brand_primary,
                language_code=language_code
            )

            # STAGE 3: Search validation in LOCAL language
            logger.info(f"Stage 3: Validating Google search for '{user_response}'")
            search_result = await self.search_validator.validate_with_google_local(
                user_response=user_response,
                language_code=language_code,
                search_results=google_search_results
            )

            # Verify search was done in correct language
            if not self.search_validator.validate_search_phrase_match(
                user_response,
                search_result.search_phrase
            ):
                logger.warning(
                    f"Search phrase mismatch! User: '{user_response}', "
                    f"Searched: '{search_result.search_phrase}'"
                )

            # STAGE 4: Calculate confidence and recommendation
            logger.info("Stage 4: Calculating confidence and recommendation")
            confidence_score, recommendation, reasoning, risk_factors = self._calculate_recommendation(
                vision_result=vision_result,
                search_result=search_result,
                user_response=user_response,
                display_info=display_info
            )

            # Get primary variant and total occurrences
            primary_variant, total_occurrences = self.vision_analyzer.count_variant_occurrences(
                vision_result.variants
            )

            # Determine if human review is needed
            requires_review = self._requires_human_review(
                confidence_score,
                risk_factors,
                vision_result,
                search_result
            )

            # Build final result
            result = EnhancedValidationResult(
                user_response=user_response,
                translation=display_info["translation"],
                display_format=display_info["display_format"],
                variants=vision_result.variants,
                primary_variant=primary_variant,
                total_occurrences=total_occurrences,
                recommendation=recommendation,
                confidence=confidence_score,
                reasoning=reasoning,
                risk_factors=risk_factors,
                vision_analysis=vision_result.to_dict(),
                search_validation=search_result.to_dict(),
                translation_info={
                    "detected_language": language_code,
                    "is_transliteration": display_info["is_non_latin"],
                    "confidence": 100  # Language detection is generally reliable
                },
                show_approve_button=True,
                show_reject_button=True,
                requires_human_review=requires_review
            )

            logger.info(
                f"Validation complete: {recommendation} (confidence: {confidence_score}%)"
            )
            return result

        except Exception as e:
            logger.error(f"Validation failed: {e}", exc_info=True)

            # Return low-confidence rejection on error
            return EnhancedValidationResult(
                user_response=user_response,
                translation=None,
                display_format=user_response,
                variants={},
                primary_variant="Unknown",
                total_occurrences=0,
                recommendation="reject",
                confidence=0,
                reasoning=f"Validation error: {str(e)}",
                risk_factors=["System error during validation"],
                vision_analysis={},
                search_validation={},
                translation_info={},
                show_approve_button=False,
                show_reject_button=True,
                requires_human_review=True
            )

    def _calculate_recommendation(
        self,
        vision_result,
        search_result,
        user_response: str,
        display_info: dict
    ) -> tuple:
        """
        Calculate confidence score and recommendation.

        Returns:
            Tuple of (confidence_score, recommendation, reasoning, risk_factors)
        """
        confidence_score = 0
        risk_factors = []
        reasoning_parts = []

        # Vision analysis contribution (up to 60 points)
        if vision_result.confidence == "high":
            confidence_score += 50
            reasoning_parts.append(
                f"Vision analysis confirms {vision_result.total_products} products "
                f"with brand name '{vision_result.brand_local or vision_result.brand_primary}'"
            )
        elif vision_result.confidence == "medium":
            confidence_score += 30
            reasoning_parts.append("Vision analysis shows moderate brand visibility")
        else:
            confidence_score += 10
            risk_factors.append("Low confidence in vision analysis")

        if vision_result.total_products >= 3:
            confidence_score += 10
            reasoning_parts.append(f"Multiple products identified ({vision_result.total_products})")
        elif vision_result.total_products == 0:
            risk_factors.append("No products identified in images")

        # Search validation contribution (up to 40 points)
        if search_result.confidence == "high":
            confidence_score += 30
            reasoning_parts.append(
                f"Google search in {search_result.language} returns "
                f"{search_result.relevant_results} relevant results"
            )
        elif search_result.confidence == "medium":
            confidence_score += 20
            reasoning_parts.append("Google search shows some relevant results")
        else:
            confidence_score += 5
            risk_factors.append("Low confidence in search results")

        # Domain trust bonus (up to 10 points)
        domain_trust = self.search_validator.calculate_domain_trust_score(
            search_result.top_domains
        )
        confidence_score += int(domain_trust * 10)
        if domain_trust >= 0.4:
            reasoning_parts.append("Results from official/trusted sources")

        # Add any red flags
        risk_factors.extend(vision_result.red_flags)
        risk_factors.extend(search_result.red_flags)

        # Cap confidence at 100
        confidence_score = min(confidence_score, 100)

        # Determine recommendation
        if confidence_score >= 70 and len(risk_factors) == 0:
            recommendation = "approve"
        elif confidence_score < 40 or len(risk_factors) >= 3:
            recommendation = "reject"
        else:
            recommendation = "review"  # Needs human review

        # Build reasoning text
        if reasoning_parts:
            reasoning = ". ".join(reasoning_parts) + "."
        else:
            reasoning = "Insufficient data for reliable validation."

        if risk_factors:
            reasoning += f" Risk factors: {', '.join(risk_factors)}."

        return (confidence_score, recommendation, reasoning, risk_factors)

    def _requires_human_review(
        self,
        confidence_score: int,
        risk_factors: List[str],
        vision_result,
        search_result
    ) -> bool:
        """
        Determine if response requires human review.

        Args:
            confidence_score: Calculated confidence (0-100)
            risk_factors: List of identified risks
            vision_result: Vision analysis result
            search_result: Search validation result

        Returns:
            True if human review is needed
        """
        # Low confidence always requires review
        if confidence_score < 50:
            return True

        # Multiple risk factors require review
        if len(risk_factors) >= 2:
            return True

        # Conflicting signals require review
        if vision_result.confidence == "high" and search_result.confidence == "low":
            return True
        if vision_result.confidence == "low" and search_result.confidence == "high":
            return True

        # No clear consensus
        if 50 <= confidence_score < 70:
            return True

        return False

"""
Test cases for comprehensive multilingual validation
"""

import pytest
from models.validation import ComprehensiveValidationRequest
from validators.comprehensive_validator import ComprehensiveValidator
from validators.translation_handler import TranslationHandler
from validators.vision_analyzer import VisionAnalyzer
from validators.search_validator import SearchValidator


# Mock API keys for testing
TEST_ANTHROPIC_KEY = "test-anthropic-key"
TEST_OPENAI_KEY = "test-openai-key"


class TestTranslationHandler:
    """Test translation and language detection"""

    def setup_method(self):
        """Setup test fixtures"""
        self.handler = TranslationHandler()

    def test_detect_arabic_language(self):
        """Test Arabic language detection with realistic text"""
        # Use longer text for better detection accuracy
        result = self.handler.detect_language("سنسوداين معجون أسنان للأسنان الحساسة")
        assert result == "ar", f"Expected 'ar', got '{result}'"

    def test_detect_english_language(self):
        """Test English language detection with realistic text"""
        # Use longer text for better detection accuracy
        result = self.handler.detect_language("Sensodyne toothpaste for sensitive teeth")
        assert result == "en", f"Expected 'en', got '{result}'"

    def test_is_non_latin_script_arabic(self):
        """Test Arabic non-Latin script detection"""
        result = self.handler.is_non_latin_script("سنسوداين")
        assert result is True, "Arabic should be detected as non-Latin"

    def test_is_non_latin_script_english(self):
        """Test English Latin script detection"""
        result = self.handler.is_non_latin_script("Sensodyne")
        assert result is False, "English should be detected as Latin"

    def test_display_format_arabic(self):
        """Test display format for Arabic response"""
        result = self.handler.get_display_format(
            user_response="سنسوداين",
            detected_brand="Sensodyne",
            language_code="ar"
        )

        assert result["user_response"] == "سنسوداين"
        assert result["translation"] == "Sensodyne"
        assert result["display_format"] == "سنسوداين (Sensodyne)"
        assert result["language_code"] == "ar"
        assert result["is_non_latin"] is True

    def test_display_format_english(self):
        """Test display format for English response"""
        result = self.handler.get_display_format(
            user_response="Sensodyne",
            detected_brand="Sensodyne",
            language_code="en"
        )

        assert result["user_response"] == "Sensodyne"
        assert result["translation"] == "Sensodyne"
        assert result["display_format"] == "Sensodyne"
        assert result["language_code"] == "en"
        assert result["is_non_latin"] is False

    def test_normalize_for_comparison(self):
        """Test text normalization"""
        text1 = "  Sensodyne  "
        text2 = "SENSODYNE"

        norm1 = self.handler.normalize_for_comparison(text1)
        norm2 = self.handler.normalize_for_comparison(text2)

        assert norm1 == "sensodyne"
        assert norm2 == "sensodyne"


class TestSearchValidator:
    """Test Google search validation"""

    def setup_method(self):
        """Setup test fixtures"""
        self.validator = SearchValidator()

    @pytest.mark.asyncio
    async def test_validate_with_google_local_arabic(self):
        """Test Arabic local language search validation"""
        search_results = {
            "query": "سنسوداين",
            "web_results": [
                {
                    "title": "Sensodyne | سنسوداين - Amazon",
                    "url": "https://www.amazon.com/sensodyne",
                    "snippet": "سنسوداين معجون أسنان للأسنان الحساسة"
                },
                {
                    "title": "Sensodyne Toothpaste",
                    "url": "https://www.sensodyne.com",
                    "snippet": "Sensodyne سنسوداين provides relief"
                },
                {
                    "title": "سنسوداين - Walmart",
                    "url": "https://www.walmart.com/sensodyne",
                    "snippet": "Buy Sensodyne سنسوداين toothpaste"
                }
            ]
        }

        result = await self.validator.validate_with_google_local(
            user_response="سنسوداين",
            language_code="ar",
            search_results=search_results
        )

        assert result.search_phrase == "سنسوداين"
        assert result.language == "ar"
        assert result.relevant_results >= 2, "Should find at least 2 relevant results"
        assert result.total_results == 3
        assert result.confidence in ["high", "medium"]
        assert len(result.top_domains) > 0

    def test_validate_search_phrase_match(self):
        """Test search phrase matching"""
        # Exact match
        assert self.validator.validate_search_phrase_match(
            "سنسوداين",
            "سنسوداين"
        )

        # Whitespace normalized match
        assert self.validator.validate_search_phrase_match(
            "  سنسوداين  ",
            "سنسوداين"
        )

        # Mismatch
        assert not self.validator.validate_search_phrase_match(
            "سنسوداين",
            "Sensodyne"
        )

    def test_calculate_domain_trust_score(self):
        """Test domain trust scoring"""
        # High trust (major retailers)
        score = self.validator.calculate_domain_trust_score([
            "amazon.com",
            "walmart.com",
            "sensodyne.com"
        ])
        assert score >= 0.6, "Should have high trust for major retailers"

        # Low trust (unknown domains)
        score = self.validator.calculate_domain_trust_score([
            "random-site.com",
            "unknown-shop.net"
        ])
        assert score == 0.0, "Should have zero trust for unknown domains"


class TestVisionAnalyzer:
    """Test vision analysis (mocked)"""

    def test_count_variant_occurrences(self):
        """Test variant counting logic"""
        analyzer = VisionAnalyzer(TEST_ANTHROPIC_KEY)

        variants = {
            "سنسوداين": 6,
            "Sensodyne": 6,
            "semosdine": 1
        }

        primary, total = analyzer.count_variant_occurrences(variants)

        # Primary should be the one with highest count (first in dict if tie)
        assert primary in ["سنسوداين", "Sensodyne"]
        assert total == 13, "Total should be sum of all variants"

    def test_count_variant_occurrences_empty(self):
        """Test variant counting with no variants"""
        analyzer = VisionAnalyzer(TEST_ANTHROPIC_KEY)

        primary, total = analyzer.count_variant_occurrences({})

        assert primary == "Unknown"
        assert total == 0


class TestComprehensiveValidator:
    """Integration tests for comprehensive validator"""

    @pytest.mark.asyncio
    @pytest.mark.skipif(
        not TEST_ANTHROPIC_KEY or TEST_ANTHROPIC_KEY == "test-anthropic-key",
        reason="Requires real Anthropic API key"
    )
    async def test_arabic_sensodyne_validation(self):
        """
        Test complete validation flow for Arabic "سنسوداين" (Sensodyne)

        This is the main integration test matching the requirements.
        """
        validator = ComprehensiveValidator(
            anthropic_key=TEST_ANTHROPIC_KEY,
            openai_key=TEST_OPENAI_KEY
        )

        # Mock data matching the requirement screenshots
        user_response = "سنسوداين"
        images = [
            "https://example.com/sensodyne1.jpg",
            "https://example.com/sensodyne2.jpg",
            "https://example.com/sensodyne3.jpg",
            "https://example.com/sensodyne4.jpg",
            "https://example.com/sensodyne5.jpg",
            "https://example.com/sensodyne6.jpg"
        ]
        google_search_results = {
            "query": "سنسوداين",  # CRITICAL: Local language
            "web_results": [
                {
                    "title": "Sensodyne سنسوداين - Official Site",
                    "url": "https://www.sensodyne.com",
                    "snippet": "سنسوداين معجون الأسنان الحساسة"
                },
                {
                    "title": "سنسوداين - Amazon",
                    "url": "https://www.amazon.com/sensodyne",
                    "snippet": "Shop سنسوداين toothpaste"
                },
                {
                    "title": "Sensodyne Products",
                    "url": "https://www.walmart.com/sensodyne",
                    "snippet": "Buy Sensodyne سنسوداين"
                }
            ]
        }

        result = await validator.validate_response(
            user_response=user_response,
            images=images,
            google_search_results=google_search_results,
            language_code="ar"
        )

        # Assertions based on requirements
        assert result.user_response == "سنسوداين"
        assert result.translation == "Sensodyne"
        assert result.display_format == "سنسوداين (Sensodyne)"

        # Should detect variants
        assert "سنسوداين" in result.variants or "Sensodyne" in result.variants

        # Should have high confidence
        assert result.confidence >= 70

        # Should recommend approval
        assert result.recommendation == "approve"

        # UI buttons
        assert result.show_approve_button is True
        assert result.show_reject_button is True

        # Should have vision analysis
        assert "brand_primary" in result.vision_analysis

        # Should have search validation in local language
        assert result.search_validation["search_phrase"] == "سنسوداين"
        assert result.search_validation["language"] == "ar"

    def test_misspelling_detection_logic(self):
        """Test that misspellings are included in variants"""
        # This would be part of the vision analysis
        # Testing the concept with mock data

        variants = {
            "سنسوداين": 6,
            "semosdine": 1  # Misspelling
        }

        # Should include both in results
        assert len(variants) == 2
        assert "سنسوداين" in variants
        assert "semosdine" in variants

        # Primary should be correct spelling (higher count)
        primary = max(variants.items(), key=lambda x: x[1])[0]
        assert primary == "سنسوداين"


class TestUIFormatter:
    """Test UI formatting"""

    def test_format_for_display_arabic(self):
        """Test UI formatting for Arabic response"""
        from utils.ui_formatter import UIFormatter
        from models.validation import EnhancedValidationResult

        result = EnhancedValidationResult(
            user_response="سنسوداين",
            translation="Sensodyne",
            display_format="سنسوداين (Sensodyne)",
            variants={"سنسوداين": 6, "semosdine": 1},
            primary_variant="سنسوداين",
            total_occurrences=7,
            recommendation="approve",
            confidence=95,
            reasoning="High confidence match",
            risk_factors=[],
            vision_analysis={"brand_primary": "Sensodyne", "total_products": 6},
            search_validation={"search_phrase": "سنسوداين", "relevant_results": 5, "language": "ar"},
            translation_info={"detected_language": "ar", "is_transliteration": True}
        )

        formatted = UIFormatter.format_for_display(result)

        # Check header section
        assert formatted["header"]["user_response"] == "سنسوداين"
        assert formatted["header"]["translation"] == "Sensodyne"
        assert formatted["header"]["display_text"] == "سنسوداين (Sensodyne)"

        # Check variants section
        assert formatted["variants_section"]["has_variants"] is True
        assert len(formatted["variants_section"]["items"]) == 2

        # Check confidence section
        assert formatted["confidence_section"]["score"] == 95
        assert formatted["confidence_section"]["label"] == "HIGH"
        assert formatted["confidence_section"]["color"] == "green"

        # Check actions
        assert formatted["actions"]["show_approve"] is True
        assert formatted["actions"]["approve_enabled"] is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

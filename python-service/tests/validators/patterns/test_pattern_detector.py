"""
Tests for PatternDetector (Refactored)

Integration tests verifying the refactored PatternDetector orchestrator.
"""
import unittest
from unittest.mock import Mock
from validators.pattern_detector import PatternDetector
from validators.multi_source_validator import ValidationType


class TestPatternDetector(unittest.TestCase):
    """Test refactored PatternDetector integration."""

    def setUp(self):
        """Initialize detector for each test."""
        self.detector = PatternDetector()

    def test_detector_initialization(self):
        """Test detector initializes with router."""
        self.assertIsNotNone(self.detector.router)
        self.assertEqual(len(self.detector.router.patterns), 5)

    def test_detect_pattern_clear_match(self):
        """Test detector returns clear match when appropriate."""
        result = self.detector.detect_pattern(
            user_text='colgate',
            category='toothpaste',
            vision_results=Mock(
                dominant_brand='Colgate',
                dominant_frequency=0.85,
                total_analyzed=10,
                total_products=8,
                brand_frequencies={'Colgate': {'frequency': 0.85}}
            ),
            vision_brands_a={},
            vision_brands_b={},
            web_brands_a={},
            web_brands_b={},
            kg_results={
                'Colgate': Mock(
                    verified=True,
                    entity_type='Brand',
                    matches_user_category=True,
                    category='Toothpaste'
                )
            },
            embedding_similarities={'Colgate': 0.85},
        )

        self.assertEqual(result.type, ValidationType.CLEAR_MATCH)
        self.assertGreater(result.confidence, 70)

    def test_detect_pattern_unclear_fallback(self):
        """Test detector falls back to unclear when no pattern matches."""
        result = self.detector.detect_pattern(
            user_text='unknown',
            category='unknown',
            vision_brands_a={},
            vision_brands_b={},
            web_brands_a={},
            web_brands_b={},
            kg_results={},
            embedding_similarities={},
        )

        self.assertEqual(result.type, ValidationType.UNCLEAR)
        self.assertEqual(result.confidence, 0)

    def test_detect_pattern_with_raw_data(self):
        """Test detector preserves raw data for UI display."""
        raw_image_urls = [
            {'url': 'http://example.com/1.jpg', 'title': 'Test 1'},
            {'url': 'http://example.com/2.jpg', 'title': 'Test 2'},
        ]
        raw_web_results = [
            {'url': 'http://example.com', 'title': 'Test'},
        ]
        raw_kg_details = {'test': 'data'}

        result = self.detector.detect_pattern(
            user_text='test',
            category='test',
            vision_brands_a={},
            vision_brands_b={},
            web_brands_a={},
            web_brands_b={},
            kg_results={},
            embedding_similarities={},
            raw_image_urls=raw_image_urls,
            raw_web_results=raw_web_results,
            raw_kg_details=raw_kg_details,
        )

        # Unclear pattern should add raw data
        self.assertEqual(result.image_urls, raw_image_urls)
        self.assertEqual(result.web_results, raw_web_results)
        self.assertEqual(result.kg_details, raw_kg_details)

    def test_detect_pattern_category_validated(self):
        """Test detector returns category validated when appropriate."""
        result = self.detector.detect_pattern(
            user_text='colgate',
            category='toothpaste',
            vision_brands_a={
                'correct_matches': 0,
                'mismatched_count': 5,
                'total_images': 10,
            },
            vision_brands_b={
                'correct_matches': 5,
                'mismatched_count': 0,
                'total_images': 10,
                'brands': {'Colgate': {'frequency': 0.9}}
            },
            web_brands_a={
                'correct_matches': 0,
                'mismatched_count': 4,
                'total_results': 5,
            },
            web_brands_b={
                'correct_matches': 5,
                'mismatched_count': 0,
                'total_results': 5,
                'brands': {'Colgate': 0.9}
            },
            kg_results={},
            embedding_similarities={},
        )

        # Should match Category Validated pattern (priority 0)
        self.assertEqual(result.type, ValidationType.CLEAR_MATCH)
        self.assertGreater(result.confidence, 80)

    def test_validation_data_preparation(self):
        """Test validation data is properly prepared."""
        # This is an indirect test - we verify the detector doesn't crash
        # with various parameter combinations
        test_cases = [
            # All None
            {},
            # Only required params
            {'user_text': 'test', 'category': 'test'},
            # With some optional params
            {
                'user_text': 'test',
                'category': 'test',
                'kg_results': {'test': Mock()},
            },
        ]

        for params in test_cases:
            params.setdefault('user_text', 'default')
            params.setdefault('category', 'default')

            result = self.detector.detect_pattern(**params)
            self.assertIsNotNone(result)
            # Should at least return unclear
            self.assertIn(result.type, [
                ValidationType.UNCLEAR,
                ValidationType.CLEAR_MATCH,
                ValidationType.CATEGORY_ERROR,
                ValidationType.AMBIGUOUS_DESCRIPTOR
            ])


class TestPatternDetectorBackwardCompatibility(unittest.TestCase):
    """Test refactored detector maintains backward compatibility."""

    def setUp(self):
        """Initialize detector for each test."""
        self.detector = PatternDetector()

    def test_maintains_base_validator_interface(self):
        """Test detector still inherits from BaseValidator."""
        from validators.base_validator import BaseValidator
        self.assertIsInstance(self.detector, BaseValidator)

    def test_detect_pattern_signature_unchanged(self):
        """Test detect_pattern method signature is compatible."""
        import inspect
        sig = inspect.signature(self.detector.detect_pattern)

        # Check required parameters
        self.assertIn('user_text', sig.parameters)
        self.assertIn('category', sig.parameters)

        # Check all optional parameters still exist
        optional_params = [
            'pinecone_match', 'dual_search_results', 'vision_results',
            'vision_brands_a', 'vision_brands_b',
            'web_brands_a', 'web_brands_b',
            'kg_results', 'embedding_similarities',
            'raw_image_urls', 'raw_web_results', 'raw_kg_details'
        ]

        for param in optional_params:
            self.assertIn(param, sig.parameters)


if __name__ == '__main__':
    unittest.main()

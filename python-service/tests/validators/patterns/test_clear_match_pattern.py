"""
Tests for Clear Match Pattern

Verifies single clear brand match detection.
"""
import unittest
from validators.patterns import ClearMatchPattern
from validators.multi_source_validator import ValidationType, UIAction


class TestClearMatchPattern(unittest.TestCase):
    """Test ClearMatchPattern detection logic."""

    def setUp(self):
        """Initialize pattern for each test."""
        self.pattern = ClearMatchPattern()

    def test_pattern_properties(self):
        """Test pattern has correct name and priority."""
        self.assertEqual(self.pattern.name, "Clear Match")
        self.assertEqual(self.pattern.priority, 3)

    def test_match_with_high_vision_frequency(self):
        """Test pattern matches when vision frequency > 50%."""
        validation_data = {
            'user_text': 'colgate',
            'category': 'toothpaste',
            'vision_results': Mock(
                dominant_brand='Colgate',
                dominant_frequency=0.85,
                total_analyzed=10,
                total_products=8,
                brand_frequencies={'Colgate': {'frequency': 0.85}}
            ),
            'vision_brands_a': {},
            'vision_brands_b': {},
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {
                'Colgate': Mock(
                    verified=True,
                    entity_type='Brand',
                    matches_user_category=True,
                    category='Toothpaste'
                )
            },
            'embedding_similarities': {'Colgate': 0.85},
        }

        result = self.pattern.detect(validation_data)

        self.assertIsNotNone(result)
        self.assertEqual(result.type, ValidationType.CLEAR_MATCH)
        self.assertGreater(result.confidence, 70)
        self.assertEqual(result.brand, 'Colgate')

    def test_no_match_low_vision_frequency(self):
        """Test pattern doesn't match when vision frequency < 50%."""
        validation_data = {
            'user_text': 'test',
            'category': 'test',
            'vision_results': Mock(
                dominant_brand='Test',
                dominant_frequency=0.35,  # Below threshold
                total_analyzed=10,
                total_products=3,
                brand_frequencies={'Test': {'frequency': 0.35}}
            ),
            'vision_brands_a': {},
            'vision_brands_b': {},
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.pattern.detect(validation_data)
        self.assertIsNone(result)

    def test_no_match_without_vision_results(self):
        """Test pattern doesn't match when no vision results."""
        validation_data = {
            'user_text': 'test',
            'category': 'test',
            'vision_results': None,
            'vision_brands_a': {},
            'vision_brands_b': {},
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.pattern.detect(validation_data)
        self.assertIsNone(result)

    def test_confidence_boost_with_kg_verification(self):
        """Test KG verification increases confidence."""
        # First test without KG
        validation_data_no_kg = {
            'user_text': 'colgate',
            'category': 'toothpaste',
            'vision_results': Mock(
                dominant_brand='Colgate',
                dominant_frequency=0.70,
                total_analyzed=10,
                total_products=7,
                brand_frequencies={'Colgate': {'frequency': 0.70}}
            ),
            'vision_brands_a': {},
            'vision_brands_b': {},
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {'Colgate': 0.70},
        }

        result_no_kg = self.pattern.detect(validation_data_no_kg)
        confidence_no_kg = result_no_kg.confidence

        # Then test with KG
        validation_data_with_kg = validation_data_no_kg.copy()
        validation_data_with_kg['kg_results'] = {
            'Colgate': Mock(
                verified=True,
                entity_type='Brand',
                matches_user_category=True,
                category='Toothpaste'
            )
        }

        result_with_kg = self.pattern.detect(validation_data_with_kg)
        confidence_with_kg = result_with_kg.confidence

        # KG should boost confidence
        self.assertGreater(confidence_with_kg, confidence_no_kg)

    def test_ui_action_approve_high_confidence(self):
        """Test UI action is APPROVE when confidence >= 85."""
        validation_data = {
            'user_text': 'colgate',
            'category': 'toothpaste',
            'vision_results': Mock(
                dominant_brand='Colgate',
                dominant_frequency=0.95,
                total_analyzed=10,
                total_products=10,
                brand_frequencies={'Colgate': {'frequency': 0.95}}
            ),
            'vision_brands_a': {},
            'vision_brands_b': {},
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {
                'Colgate': Mock(
                    verified=True,
                    entity_type='Brand',
                    matches_user_category=True,
                    category='Toothpaste'
                )
            },
            'embedding_similarities': {'Colgate': 0.95},
        }

        result = self.pattern.detect(validation_data)
        self.assertEqual(result.ui_action, UIAction.APPROVE)

    def test_ui_action_manual_review_low_confidence(self):
        """Test UI action is MANUAL_REVIEW when confidence < 85."""
        validation_data = {
            'user_text': 'test',
            'category': 'test',
            'vision_results': Mock(
                dominant_brand='Test',
                dominant_frequency=0.60,
                total_analyzed=10,
                total_products=6,
                brand_frequencies={'Test': {'frequency': 0.60}}
            ),
            'vision_brands_a': {},
            'vision_brands_b': {},
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {'Test': 0.50},
        }

        result = self.pattern.detect(validation_data)
        self.assertEqual(result.ui_action, UIAction.MANUAL_REVIEW)


if __name__ == '__main__':
    unittest.main()

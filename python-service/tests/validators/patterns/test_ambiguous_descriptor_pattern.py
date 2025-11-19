"""
Tests for Ambiguous Descriptor Pattern

Verifies descriptor appearing in multiple brands.
"""
import unittest
from validators.patterns import AmbiguousDescriptorPattern
from validators.multi_source_validator import ValidationType, UIAction


class TestAmbiguousDescriptorPattern(unittest.TestCase):
    """Test AmbiguousDescriptorPattern detection logic."""

    def setUp(self):
        """Initialize pattern for each test."""
        self.pattern = AmbiguousDescriptorPattern()

    def test_pattern_properties(self):
        """Test pattern has correct name and priority."""
        self.assertEqual(self.pattern.name, "Ambiguous Descriptor")
        self.assertEqual(self.pattern.priority, 2)

    def test_match_with_descriptor_keyword(self):
        """Test pattern matches when user text is descriptor keyword."""
        from unittest.mock import Mock

        validation_data = {
            'user_text': 'extra',  # Descriptor keyword
            'category': 'toothpaste',
            'vision_results': Mock(
                brand_frequencies={
                    'Colgate Extra': {'frequency': 0.35},
                    'Crest Extra': {'frequency': 0.30},
                    'Sensodyne Extra': {'frequency': 0.25},
                },
                dominant_frequency=0.35,
                pattern='descriptor'
            ),
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.pattern.detect(validation_data)

        self.assertIsNotNone(result)
        self.assertEqual(result.type, ValidationType.AMBIGUOUS_DESCRIPTOR)
        self.assertEqual(result.ui_action, UIAction.ASK_USER_CHOOSE)
        self.assertEqual(result.descriptor, 'extra')
        self.assertGreater(len(result.candidates), 0)

    def test_no_match_with_few_brands(self):
        """Test pattern doesn't match when fewer than 3 brands."""
        from unittest.mock import Mock

        validation_data = {
            'user_text': 'extra',
            'category': 'toothpaste',
            'vision_results': Mock(
                brand_frequencies={
                    'Colgate Extra': {'frequency': 0.60},
                    'Crest Extra': {'frequency': 0.40},
                },
                dominant_frequency=0.60
            ),
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.pattern.detect(validation_data)
        self.assertIsNone(result)

    def test_no_match_with_clear_dominant(self):
        """Test pattern doesn't match when dominant frequency > 40%."""
        from unittest.mock import Mock

        validation_data = {
            'user_text': 'extra',
            'category': 'toothpaste',
            'vision_results': Mock(
                brand_frequencies={
                    'Colgate Extra': {'frequency': 0.50},  # Above threshold
                    'Crest Extra': {'frequency': 0.30},
                    'Sensodyne Extra': {'frequency': 0.20},
                },
                dominant_frequency=0.50
            ),
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.pattern.detect(validation_data)
        self.assertIsNone(result)

    def test_no_match_without_descriptor_keyword(self):
        """Test pattern doesn't match when text is not descriptor."""
        from unittest.mock import Mock

        validation_data = {
            'user_text': 'colgate',  # Not a descriptor
            'category': 'toothpaste',
            'vision_results': Mock(
                brand_frequencies={
                    'Colgate A': {'frequency': 0.35},
                    'Colgate B': {'frequency': 0.35},
                    'Colgate C': {'frequency': 0.30},
                },
                dominant_frequency=0.35,
                pattern='brand'
            ),
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.pattern.detect(validation_data)
        self.assertIsNone(result)

    def test_candidates_sorted_by_score(self):
        """Test candidates are sorted by composite score."""
        from unittest.mock import Mock

        validation_data = {
            'user_text': 'white',
            'category': 'toothpaste',
            'vision_results': Mock(
                brand_frequencies={
                    'Colgate White': {'frequency': 0.30},
                    'Crest White': {'frequency': 0.35},
                    'Sensodyne White': {'frequency': 0.25},
                },
                dominant_frequency=0.35,
                pattern='descriptor'
            ),
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {
                'Crest White': Mock(verified=True),  # KG boost
                'Colgate White': Mock(verified=False),
                'Sensodyne White': Mock(verified=False),
            },
            'embedding_similarities': {
                'Crest White': 0.80,
                'Colgate White': 0.70,
                'Sensodyne White': 0.60,
            },
        }

        result = self.pattern.detect(validation_data)

        # Candidates should be sorted by composite score
        self.assertGreater(len(result.candidates), 0)
        for i in range(len(result.candidates) - 1):
            self.assertGreaterEqual(
                result.candidates[i].score,
                result.candidates[i + 1].score
            )

    def test_descriptor_keywords_comprehensive(self):
        """Test all descriptor keywords are recognized."""
        from unittest.mock import Mock

        descriptors = [
            "extra", "white", "whitening", "fresh", "pro",
            "advanced", "complete", "ultra", "max", "plus"
        ]

        for descriptor in descriptors:
            validation_data = {
                'user_text': descriptor,
                'category': 'toothpaste',
                'vision_results': Mock(
                    brand_frequencies={
                        f'Brand1 {descriptor}': {'frequency': 0.35},
                        f'Brand2 {descriptor}': {'frequency': 0.33},
                        f'Brand3 {descriptor}': {'frequency': 0.32},
                    },
                    dominant_frequency=0.35,
                    pattern='descriptor'
                ),
                'web_brands_a': {},
                'web_brands_b': {},
                'kg_results': {},
                'embedding_similarities': {},
            }

            result = self.pattern.detect(validation_data)
            self.assertIsNotNone(result, f"Failed for descriptor: {descriptor}")


if __name__ == '__main__':
    unittest.main()

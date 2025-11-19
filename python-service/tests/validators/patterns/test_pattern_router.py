"""
Tests for PatternRouter

Verifies pattern routing and priority-based matching.
"""
import unittest
from unittest.mock import Mock, MagicMock
from validators.patterns import PatternRouter
from validators.multi_source_validator import ValidationResult, ValidationType, UIAction


class TestPatternRouter(unittest.TestCase):
    """Test PatternRouter pattern detection and routing."""

    def setUp(self):
        """Initialize router for each test."""
        self.router = PatternRouter()

    def test_router_initialization(self):
        """Test router initializes with all patterns in priority order."""
        self.assertEqual(len(self.router.patterns), 5)

        # Check patterns are sorted by priority
        for i in range(len(self.router.patterns) - 1):
            self.assertLessEqual(
                self.router.patterns[i].priority,
                self.router.patterns[i + 1].priority
            )

    def test_pattern_priority_order(self):
        """Test patterns are checked in correct priority order."""
        pattern_names = [p.name for p in self.router.patterns]
        expected_order = [
            "Category Validated",  # Priority 0
            "Category Error",       # Priority 1
            "Ambiguous Descriptor", # Priority 2
            "Clear Match",          # Priority 3
            "Unclear"              # Priority 4
        ]
        self.assertEqual(pattern_names, expected_order)

    def test_category_validated_pattern_match(self):
        """Test Category Validated pattern is matched when conditions met."""
        validation_data = {
            'user_text': 'colgate',
            'category': 'toothpaste',
            'vision_brands_a': {
                'correct_matches': 0,
                'mismatched_count': 3,
                'total_images': 10,
            },
            'vision_brands_b': {
                'correct_matches': 5,
                'mismatched_count': 0,
                'total_images': 10,
                'brands': {'Colgate': {'frequency': 0.8, 'count': 5}}
            },
            'web_brands_a': {
                'correct_matches': 0,
                'mismatched_count': 4,
                'total_results': 5,
            },
            'web_brands_b': {
                'correct_matches': 5,
                'mismatched_count': 0,
                'total_results': 5,
                'brands': {'Colgate': 3}
            },
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.router.detect(validation_data)
        self.assertEqual(result.type, ValidationType.CLEAR_MATCH)
        self.assertGreater(result.confidence, 80)

    def test_unclear_pattern_always_matches(self):
        """Test Unclear pattern matches when no other pattern does."""
        validation_data = {
            'user_text': 'unknown',
            'category': 'unknown',
            'vision_brands_a': {},
            'vision_brands_b': {},
            'web_brands_a': {},
            'web_brands_b': {},
            'kg_results': {},
            'embedding_similarities': {},
        }

        result = self.router.detect(validation_data)
        self.assertEqual(result.type, ValidationType.UNCLEAR)
        self.assertEqual(result.confidence, 0)

    def test_add_pattern_dynamically(self):
        """Test adding a new pattern dynamically."""
        from validators.patterns.base_pattern import BasePattern

        class CustomPattern(BasePattern):
            def __init__(self):
                super().__init__(name="Custom", priority=2.5)

            def detect(self, validation_data):
                return None

        initial_count = len(self.router.patterns)
        custom = CustomPattern()
        self.router.add_pattern(custom)

        self.assertEqual(len(self.router.patterns), initial_count + 1)
        # Check pattern is inserted in correct priority position
        priorities = [p.priority for p in self.router.patterns]
        self.assertEqual(priorities, sorted(priorities))

    def test_remove_pattern(self):
        """Test removing a pattern by name."""
        initial_count = len(self.router.patterns)
        result = self.router.remove_pattern("Unclear")

        self.assertTrue(result)
        self.assertEqual(len(self.router.patterns), initial_count - 1)

        # Verify pattern is actually removed
        pattern_names = [p.name for p in self.router.patterns]
        self.assertNotIn("Unclear", pattern_names)

    def test_remove_nonexistent_pattern(self):
        """Test removing a pattern that doesn't exist."""
        initial_count = len(self.router.patterns)
        result = self.router.remove_pattern("NonExistent")

        self.assertFalse(result)
        self.assertEqual(len(self.router.patterns), initial_count)


if __name__ == '__main__':
    unittest.main()

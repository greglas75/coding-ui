"""
Pattern Router - Orchestrates Pattern Detection

Routes validation data through all pattern detectors in priority order.
First matching pattern wins.
"""
from typing import Dict, Any, List
from .base_pattern import BasePattern
from .category_validated_pattern import CategoryValidatedPattern
from .category_error_pattern import CategoryErrorPattern
from .ambiguous_descriptor_pattern import AmbiguousDescriptorPattern
from .clear_match_pattern import ClearMatchPattern
from .unclear_pattern import UnclearPattern
from ..multi_source_validator import ValidationResult
import logging

logger = logging.getLogger(__name__)


class PatternRouter:
    """
    Routes validation data through pattern detectors.

    Patterns are checked in priority order (lowest number first).
    First matching pattern returns the result.
    """

    def __init__(self):
        """Initialize pattern router with all available patterns."""
        # Initialize all pattern detectors
        self.patterns: List[BasePattern] = [
            CategoryValidatedPattern(),      # Priority 0 - Multi-source category validation
            CategoryErrorPattern(),           # Priority 1 - Wrong category detection
            AmbiguousDescriptorPattern(),     # Priority 2 - Multiple brand matches
            ClearMatchPattern(),              # Priority 3 - Single clear brand match
            UnclearPattern(),                 # Priority 4 - Fallback (always matches)
        ]

        # Sort by priority (lower number = higher priority)
        self.patterns.sort(key=lambda p: p.priority)

        logger.info(f"PatternRouter initialized with {len(self.patterns)} patterns")

    def detect(self, validation_data: Dict[str, Any]) -> ValidationResult:
        """
        Detect matching pattern for validation data.

        Args:
            validation_data: Dictionary containing all validation sources

        Returns:
            ValidationResult from first matching pattern
        """
        logger.info(f"🔍 PatternRouter: Analyzing validation data...")

        # Try each pattern in priority order
        for pattern in self.patterns:
            logger.debug(f"Checking pattern: {pattern.name} (priority: {pattern.priority})")
            result = pattern.detect(validation_data)

            if result:
                logger.info(f"✅ Pattern matched: {pattern.name}")
                return result

        # This should never happen if UnclearPattern is last (always matches)
        logger.error("❌ No pattern matched! This should not happen.")
        raise RuntimeError("No pattern matched validation data")

    def add_pattern(self, pattern: BasePattern) -> None:
        """
        Add a new pattern detector dynamically.

        Args:
            pattern: BasePattern instance to add
        """
        self.patterns.append(pattern)
        self.patterns.sort(key=lambda p: p.priority)
        logger.info(f"Added pattern: {pattern.name} (priority: {pattern.priority})")

    def remove_pattern(self, pattern_name: str) -> bool:
        """
        Remove a pattern detector by name.

        Args:
            pattern_name: Name of pattern to remove

        Returns:
            True if removed, False if not found
        """
        original_count = len(self.patterns)
        self.patterns = [p for p in self.patterns if p.name != pattern_name]

        if len(self.patterns) < original_count:
            logger.info(f"Removed pattern: {pattern_name}")
            return True

        logger.warning(f"Pattern not found: {pattern_name}")
        return False

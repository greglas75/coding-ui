"""
Pattern Detection Module

Modular pattern detectors for brand validation.
Each pattern is in a separate file for easier testing and maintenance.
"""
from .base_pattern import BasePattern
from .category_validated_pattern import CategoryValidatedPattern
from .category_error_pattern import CategoryErrorPattern
from .ambiguous_descriptor_pattern import AmbiguousDescriptorPattern
from .clear_match_pattern import ClearMatchPattern
from .unclear_pattern import UnclearPattern
from .pattern_router import PatternRouter
from . import pattern_helpers

__all__ = [
    'BasePattern',
    'CategoryValidatedPattern',
    'CategoryErrorPattern',
    'AmbiguousDescriptorPattern',
    'ClearMatchPattern',
    'UnclearPattern',
    'PatternRouter',
    'pattern_helpers',
]

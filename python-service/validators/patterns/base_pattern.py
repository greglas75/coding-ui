"""
Base Pattern for Validation Detection

All pattern detectors inherit from this base class.
Provides common functionality and enforces consistent interface.
"""
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from ..multi_source_validator import ValidationResult
import logging

logger = logging.getLogger(__name__)


class BasePattern(ABC):
    """
    Base class for all pattern detectors.

    Each pattern detector must implement the detect() method
    which analyzes validation data and returns a result if pattern matches.
    """

    def __init__(self, name: str, priority: int):
        """
        Initialize pattern detector.

        Args:
            name: Pattern name for logging
            priority: Lower number = higher priority (checked first)
        """
        self.name = name
        self.priority = priority
        logger.info(f"Pattern detector initialized: {name} (priority: {priority})")

    @abstractmethod
    def detect(self, validation_data: Dict[str, Any]) -> Optional[ValidationResult]:
        """
        Detect if this pattern matches the validation data.

        Args:
            validation_data: Dictionary containing all validation sources:
                - user_text: str
                - category: str
                - pinecone_match: Optional[Any]
                - dual_search_results: Any
                - vision_results: Any
                - vision_brands_a: Dict[str, Any]
                - vision_brands_b: Dict[str, Any]
                - web_brands_a: Dict[str, Any]
                - web_brands_b: Dict[str, Any]
                - kg_results: Dict[str, Optional[Any]]
                - embedding_similarities: Dict[str, float]
                - raw_image_urls: Optional[List[Dict[str, str]]]
                - raw_web_results: Optional[List[Dict[str, str]]]
                - raw_kg_details: Optional[Dict[str, Any]]

        Returns:
            ValidationResult if pattern matches, None otherwise
        """
        pass

    def _add_raw_data(
        self,
        result: ValidationResult,
        validation_data: Dict[str, Any]
    ) -> ValidationResult:
        """
        Add raw data (images, web results, KG details) to result.

        Args:
            result: ValidationResult to enhance
            validation_data: Source data

        Returns:
            Enhanced ValidationResult
        """
        result.image_urls = validation_data.get('raw_image_urls')
        result.web_results = validation_data.get('raw_web_results')
        result.kg_details = validation_data.get('raw_kg_details')
        return result

    def log_detection(self, detected: bool, confidence: int = 0) -> None:
        """
        Log pattern detection result.

        Args:
            detected: Whether pattern was detected
            confidence: Confidence level if detected
        """
        if detected:
            logger.info(f"✅ {self.name}: Pattern matched (confidence: {confidence}%)")
        else:
            logger.debug(f"⏭️  {self.name}: Pattern not matched")

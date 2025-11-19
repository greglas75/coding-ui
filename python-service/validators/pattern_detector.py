"""
Pattern Detection & Multi-Source Aggregation - REFACTORED

Now uses modular pattern system for easier testing and maintenance.

BEFORE: 1,243 lines god class
AFTER:  ~100 lines orchestrator
"""
import logging
from typing import Dict, List, Optional, Any
from validators.base_validator import BaseValidator
from validators.patterns import PatternRouter
from validators.multi_source_validator import ValidationResult

logger = logging.getLogger(__name__)


class PatternDetector(BaseValidator):
    """
    Pattern detection orchestrator using modular pattern system.

    Delegates pattern detection to PatternRouter which manages
    individual pattern detectors.
    """

    def __init__(self):
        """Initialize pattern detector with pattern router."""
        self.router = PatternRouter()
        logger.info("PatternDetector initialized with modular pattern system")

    def detect_pattern(
        self,
        user_text: str,
        category: str,
        pinecone_match: Optional[Any] = None,
        dual_search_results: Any = None,
        vision_results: Any = None,
        vision_brands_a: Dict[str, Any] = None,
        vision_brands_b: Dict[str, Any] = None,
        web_brands_a: Dict[str, Any] = None,
        web_brands_b: Dict[str, Any] = None,
        kg_results: Dict[str, Optional[Any]] = None,
        embedding_similarities: Dict[str, float] = None,
        raw_image_urls: Optional[List[Dict[str, str]]] = None,
        raw_web_results: Optional[List[Dict[str, str]]] = None,
        raw_kg_details: Optional[Dict[str, Any]] = None,
    ) -> ValidationResult:
        """
        Analyze all sources and return final validation result.

        Args:
            user_text: User's input
            category: Expected category
            pinecone_match: Pinecone search result
            dual_search_results: Google Images dual search
            vision_results: Vision AI analysis
            vision_brands_a: Vision AI results without category filter
            vision_brands_b: Vision AI results with category filter
            web_brands_a: Web Search AI results without category filter
            web_brands_b: Web Search AI results with category filter
            kg_results: Knowledge Graph verification
            embedding_similarities: Embedding similarity scores
            raw_image_urls: Raw image URLs for UI display
            raw_web_results: Raw web results for UI display
            raw_kg_details: Raw KG details for UI display

        Returns:
            ValidationResult with detected pattern
        """
        logger.info(f"🔍 Pattern Detection: Analyzing '{user_text}' for category '{category}'")

        # Prepare validation data dictionary
        validation_data = {
            'user_text': user_text,
            'category': category,
            'pinecone_match': pinecone_match,
            'dual_search_results': dual_search_results,
            'vision_results': vision_results,
            'vision_brands_a': vision_brands_a or {},
            'vision_brands_b': vision_brands_b or {},
            'web_brands_a': web_brands_a or {},
            'web_brands_b': web_brands_b or {},
            'kg_results': kg_results or {},
            'embedding_similarities': embedding_similarities or {},
            'raw_image_urls': raw_image_urls,
            'raw_web_results': raw_web_results,
            'raw_kg_details': raw_kg_details,
        }

        # Delegate to pattern router
        result = self.router.detect(validation_data)

        logger.info(f"✅ Pattern Detected: {result.type} (confidence: {result.confidence}%)")
        return result


"""
Brand Codeframe Builder - Orchestrates the 3-phase brand extraction system.

This is a thin wrapper that calls the 3-phase BrandExtractor:
- PHASE 1: Index all answers to Pinecone
- PHASE 2: Classify brands using AI + Google
- PHASE 3: Build codeframe from verified brands
"""
import logging
import json
from typing import List, Dict, Optional, Any
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


@dataclass
class BrandCodeNode:
    """A code node representing a brand."""
    code_id: str
    brand_name: str
    description: str
    confidence: str  # "high" | "medium" | "low"
    is_verified: bool
    mention_count: int
    frequency_estimate: str  # "high" | "medium" | "low"
    example_texts: List[Dict[str, str]]
    google_verified: bool = False
    validation_evidence: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return asdict(self)


@dataclass
class BrandCodeframe:
    """Complete brand codeframe result."""
    theme_name: str
    theme_description: str
    theme_confidence: str
    hierarchy_depth: str
    codes: List[BrandCodeNode]
    mece_score: float
    mece_issues: List[Dict[str, Any]]
    processing_time_ms: int
    total_brands_found: int
    verified_brands: int
    needs_review_brands: int
    total_mentions: int

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        result = asdict(self)
        result['codes'] = [code.to_dict() for code in self.codes]
        return result


class BrandCodeframeBuilder:
    """
    Orchestrator for 3-phase brand extraction system.

    Delegates to BrandExtractor for:
    - Phase 1: Indexing answers to Pinecone
    - Phase 2: Classifying brands with AI + Google
    - Phase 3: Building codeframe from verified brands
    """

    def __init__(
        self,
        brand_extractor,
        config_path: Optional[str] = None
    ):
        """
        Initialize BrandCodeframeBuilder.

        Args:
            brand_extractor: BrandExtractor instance (3-phase system)
            config_path: Path to brand_project_config.json (optional)
        """
        self.extractor = brand_extractor
        self.config = self._load_config(config_path)

        logger.info("BrandCodeframeBuilder initialized with 3-phase extractor")

    def _load_config(self, config_path: Optional[str]) -> Dict[str, Any]:
        """Load configuration from JSON file."""
        if config_path is None:
            import os
            config_path = os.path.join(
                os.path.dirname(__file__),
                '..',
                'brand_project_config.json'
            )

        try:
            with open(config_path, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            logger.warning(f"Config error: {e}, using defaults")
            return {"brand_extraction": {"min_confidence": 0.3}}

    def build_brand_codeframe(
        self,
        answers: List[Dict[str, Any]],
        category_name: str,
        category_description: str = "",
        target_language: str = "en",
        min_confidence: Optional[float] = None,
        enable_enrichment: bool = True
    ) -> BrandCodeframe:
        """
        Build a brand codeframe using the 3-phase extraction system.

        PHASE 1: Index all unique answers to Pinecone
        PHASE 2: Classify which answers are brands using AI + Google
        PHASE 3: Build codeframe from verified brands

        Args:
            answers: List of answer dictionaries with 'id' and 'text' keys
            category_name: Name of the category
            category_description: Description of the category
            target_language: Target language for the codeframe
            min_confidence: Minimum confidence threshold (default from config)
            enable_enrichment: Whether to run PHASE 2 (AI + Google classification)

        Returns:
            BrandCodeframe: Complete brand codeframe
        """
        import time
        start_time = time.time()

        logger.info(f"🚀 Building brand codeframe for {len(answers)} answers")
        logger.info(f"📂 Category: {category_name}")
        logger.info(f"🔬 Enrichment: {'enabled' if enable_enrichment else 'disabled'}")

        # Get min_confidence from config if not provided
        if min_confidence is None:
            min_confidence = self.config.get("brand_extraction", {}).get("min_confidence", 0.3)

        # ========================================================================
        # PHASE 1: INDEX ALL ANSWERS TO PINECONE
        # ========================================================================
        logger.info("📊 [PHASE 1/3] Indexing answers to Pinecone...")

        indexing_result = self.extractor.index_unique_answers(
            answers=answers,
            category=category_name
        )

        logger.info(f"✅ [PHASE 1/3] Indexed {indexing_result.get('indexed_count', 0)} unique answers")

        # ========================================================================
        # PHASE 2: CLASSIFY BRANDS (optional, controlled by enable_enrichment)
        # ========================================================================
        if enable_enrichment:
            logger.info("🤖 [PHASE 2/3] Classifying brands with AI + Google...")

            classified_brands = self.extractor.classify_brands(
                category=category_name,
                batch_size=50
            )

            logger.info(f"✅ [PHASE 2/3] Classified {len(classified_brands)} brand candidates")
        else:
            logger.info("⏭️ [PHASE 2/3] Skipping classification (enrichment disabled)")
            classified_brands = []

        # ========================================================================
        # PHASE 3: BUILD CODEFRAME FROM VERIFIED BRANDS
        # ========================================================================
        logger.info("📊 [PHASE 3/3] Building codeframe...")

        codeframe_data = self.extractor.build_codeframe(
            category=category_name,
            similarity_threshold=0.85
        )

        brands = codeframe_data.get('brands', [])
        total_mentions = codeframe_data.get('total_mentions', 0)
        unique_brands = codeframe_data.get('unique_brands', 0)

        logger.info(f"✅ [PHASE 3/3] Codeframe built - {unique_brands} unique brands, {total_mentions} mentions")

        # Convert to BrandCodeNode format
        brand_codes = []
        for i, brand in enumerate(brands):
            # Determine confidence level
            conf_value = brand.get('confidence', 0.0)
            if conf_value >= 0.7:
                confidence = "high"
            elif conf_value >= 0.5:
                confidence = "medium"
            else:
                confidence = "low"

            # Determine frequency
            mention_count = brand.get('mention_count', 0)
            if mention_count >= 10:
                frequency = "high"
            elif mention_count >= 5:
                frequency = "medium"
            else:
                frequency = "low"

            # Format example texts
            example_texts = [
                {"id": str(idx), "text": text}
                for idx, text in enumerate(brand.get('example_texts', []))
            ]

            code_node = BrandCodeNode(
                code_id=f"brand_{i+1}",
                brand_name=brand.get('brand_name', ''),
                description=f"Brand: {brand.get('brand_name', '')}",
                confidence=confidence,
                is_verified=brand.get('google_verified', False),
                mention_count=mention_count,
                frequency_estimate=frequency,
                example_texts=example_texts,
                google_verified=brand.get('google_verified', False),
                validation_evidence=brand.get('validation_evidence')
            )
            brand_codes.append(code_node)

        # Calculate stats
        verified_count = sum(1 for code in brand_codes if code.is_verified)
        needs_review_count = sum(1 for code in brand_codes if not code.is_verified and code.confidence == "medium")

        # Calculate MECE score (simplified for brands)
        mece_score, mece_issues = self._calculate_brand_mece(brand_codes, len(answers))

        processing_time_ms = int((time.time() - start_time) * 1000)

        # Build final codeframe
        codeframe = BrandCodeframe(
            theme_name=category_name,
            theme_description=category_description or f"Brand mentions for {category_name}",
            theme_confidence="high" if verified_count > unique_brands * 0.5 else "medium",
            hierarchy_depth="flat",
            codes=brand_codes,
            mece_score=mece_score,
            mece_issues=mece_issues,
            processing_time_ms=processing_time_ms,
            total_brands_found=unique_brands,
            verified_brands=verified_count,
            needs_review_brands=needs_review_count,
            total_mentions=total_mentions
        )

        logger.info(f"🎉 Brand codeframe complete: {unique_brands} brands, {verified_count} verified")
        return codeframe

    def _calculate_brand_mece(
        self,
        brand_codes: List[BrandCodeNode],
        total_answers: int
    ) -> tuple[float, List[Dict[str, Any]]]:
        """
        Calculate MECE score for brand codeframe.

        For brands, MECE is simpler:
        - Mutually Exclusive: Each brand is unique (automatically satisfied)
        - Collectively Exhaustive: How many answers have at least one brand mention

        Args:
            brand_codes: List of brand code nodes
            total_answers: Total number of answers

        Returns:
            Tuple of (score, issues)
        """
        issues = []

        # Check for exhaustiveness
        total_mentions = sum(code.mention_count for code in brand_codes)
        coverage_ratio = min(total_mentions / total_answers, 1.0) if total_answers > 0 else 0

        # MECE score is primarily coverage-based for brands
        mece_score = coverage_ratio * 100

        if coverage_ratio < 0.5:
            issues.append({
                "type": "low_coverage",
                "severity": "warning",
                "message": f"Only {coverage_ratio*100:.1f}% of answers have brand mentions"
            })

        # Check for unverified brands
        unverified_count = sum(1 for code in brand_codes if not code.is_verified)
        if unverified_count > 0:
            issues.append({
                "type": "unverified_brands",
                "severity": "info",
                "message": f"{unverified_count} brands need verification"
            })

        return round(mece_score, 1), issues

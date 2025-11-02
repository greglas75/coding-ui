"""
Vision AI Batch Analysis using Google Gemini

Analyzes product images to extract:
- Brand names
- Product types
- Variants/descriptors
- Text visible on packaging

CRITICAL: Analyze 5 images from Search A + 5 from Search B = 10 total
"""

import logging
import asyncio
from typing import List, Dict, Any
from dataclasses import dataclass
import google.generativeai as genai
import httpx
from io import BytesIO
from PIL import Image

logger = logging.getLogger(__name__)


@dataclass
class VisionResult:
    """Single image analysis result"""
    brand: str | None
    product_type: str
    variant: str | None
    text_visible: List[str]
    confidence: int  # 0-100
    is_product: bool  # False if store building, logo only, etc.


@dataclass
class BatchVisionResults:
    """Aggregated results from all images"""
    results: List[VisionResult]
    brand_frequencies: Dict[str, Dict[str, Any]]  # {brand: {count, frequency}}
    dominant_brand: str | None
    dominant_frequency: float
    pattern: str  # "single_brand", "multiple_brands", "descriptor", "non_product"
    total_analyzed: int
    total_products: int


class GeminiVisionAnalyzer:
    """
    Gemini Vision API for batch image analysis

    Analyzes product images to detect brands, variants, and descriptors
    """

    VISION_PROMPT = """Analyze this product image and extract structured information:

1. BRAND NAME: The main brand (e.g., "Sensodyne", "Oral-B", "Colgate")
   - Look for logos, text on packaging
   - If multiple brands visible, list primary brand only

2. PRODUCT TYPE: What category (toothpaste, soap, shampoo, etc.)

3. PRODUCT VARIANT: Any descriptor after brand name
   - Examples: "Extra", "Extra White", "Pro", "Advanced"
   - This is the sub-product line, not the brand

4. TEXT VISIBLE: All text you can read on the image
   - Package text, labels, ingredients, anything

5. CONFIDENCE: Your confidence in brand detection (0-100)

6. IS_PRODUCT: true if actual product, false if store building/logo only

Return as JSON:
{
  "brand": "string or null",
  "product_type": "string",
  "variant": "string or null",
  "text_visible": ["list", "of", "text"],
  "confidence": 0-100,
  "is_product": true or false
}

If image is not a product (e.g., store building, logo only), set is_product=false."""

    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        # Using gemini-2.5-flash-lite (fastest and cheapest with vision)
        # Alternatives: 'gemini-2.5-flash' (better), 'gemini-2.5-pro' (best)
        self.model = genai.GenerativeModel('gemini-2.5-flash-lite')
        logger.info("GeminiVisionAnalyzer initialized with gemini-2.5-flash-lite")

    async def batch_vision_analysis(
        self,
        image_urls: List[str],
    ) -> BatchVisionResults:
        """
        Analyze batch of images (up to 10) IN PARALLEL.

        CRITICAL: Uses asyncio.gather() to process all images concurrently,
        not sequentially! This reduces time from 30s to ~3s for 10 images.

        Args:
            image_urls: List of image URLs to analyze

        Returns:
            BatchVisionResults with aggregated brand detection
        """
        logger.info(f"🔍 Analyzing {len(image_urls)} images IN PARALLEL with Gemini Vision...")

        # Create tasks for ALL images (don't await yet!)
        tasks = [
            self._analyze_single_image(url)
            for url in image_urls
        ]

        # Execute ALL tasks in PARALLEL using asyncio.gather()
        results_raw = await asyncio.gather(*tasks, return_exceptions=True)

        # Filter out exceptions and None results
        results = []
        for i, result in enumerate(results_raw):
            if isinstance(result, Exception):
                logger.error(f"⚠️  Image {i+1} analysis failed: {result}")
                # Continue processing other images
            elif result is not None:
                results.append(result)

        logger.info(f"✅ Successfully analyzed {len(results)}/{len(image_urls)} images")

        # Aggregate results
        brand_frequencies = self._calculate_brand_frequencies(results)
        dominant_brand, dominant_frequency = self._find_dominant_brand(brand_frequencies)
        pattern = self._detect_pattern(brand_frequencies, results)

        total_products = sum(1 for r in results if r.is_product)

        logger.info(
            f"📊 Vision Analysis: {total_products}/{len(results)} products | "
            f"Dominant: {dominant_brand} ({dominant_frequency:.1%})"
        )

        return BatchVisionResults(
            results=results,
            brand_frequencies=brand_frequencies,
            dominant_brand=dominant_brand,
            dominant_frequency=dominant_frequency,
            pattern=pattern,
            total_analyzed=len(results),
            total_products=total_products,
        )

    async def _analyze_single_image(self, url: str) -> VisionResult | None:
        """
        Analyze single image using Gemini Vision

        Returns:
            VisionResult or None if analysis fails
        """
        try:
            # Download image (3s timeout for faster failures when quota exceeded)
            async with httpx.AsyncClient(timeout=3.0) as client:
                response = await client.get(url)
                response.raise_for_status()
                image_data = response.content

            # Load image with PIL
            image = Image.open(BytesIO(image_data))

            # Resize to optimize speed (brand detection doesn't need high res)
            # 768px is enough for logo/brand recognition, much faster than 4096px
            max_size = 768
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)

            # Analyze with Gemini (using run_in_executor for true async parallelism)
            # Google Gemini SDK is synchronous, so we run it in a thread pool
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content([
                    self.VISION_PROMPT,
                    image
                ])
            )

            # Parse JSON response
            import json
            # Extract JSON from response (may be wrapped in markdown)
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            text = text.strip()

            data = json.loads(text)

            return VisionResult(
                brand=data.get("brand"),
                product_type=data.get("product_type", "unknown"),
                variant=data.get("variant"),
                text_visible=data.get("text_visible", []),
                confidence=data.get("confidence", 0),
                is_product=data.get("is_product", True),
            )

        except httpx.HTTPError as e:
            logger.error(f"Failed to download image {url}: {e}")
            return None
        except Exception as e:
            logger.error(f"Vision analysis failed for {url}: {e}")
            return None

    def _calculate_brand_frequencies(
        self,
        results: List[VisionResult]
    ) -> Dict[str, Dict[str, Any]]:
        """
        Calculate brand occurrence frequencies

        Returns:
            {brand: {count: int, frequency: float}}
        """
        # Count only products (not store buildings, etc.)
        product_results = [r for r in results if r.is_product and r.brand]

        if not product_results:
            return {}

        # Count occurrences
        brand_counts: Dict[str, int] = {}
        for result in product_results:
            if result.brand:
                brand_counts[result.brand] = brand_counts.get(result.brand, 0) + 1

        # Calculate frequencies
        total = len(product_results)
        frequencies = {}
        for brand, count in brand_counts.items():
            frequencies[brand] = {
                "count": count,
                "frequency": count / total,
            }

        return frequencies

    def _find_dominant_brand(
        self,
        brand_frequencies: Dict[str, Dict[str, Any]]
    ) -> tuple[str | None, float]:
        """
        Find the most frequent brand

        Returns:
            (dominant_brand, frequency) or (None, 0.0)
        """
        if not brand_frequencies:
            return None, 0.0

        dominant = max(
            brand_frequencies.items(),
            key=lambda x: x[1]["frequency"]
        )
        return dominant[0], dominant[1]["frequency"]

    def _detect_pattern(
        self,
        brand_frequencies: Dict[str, Dict[str, Any]],
        results: List[VisionResult]
    ) -> str:
        """
        Detect pattern from vision results

        Patterns:
        - "single_brand": One brand > 50% frequency
        - "multiple_brands": Multiple brands, no dominant
        - "descriptor": Descriptor appears across brands
        - "non_product": Mostly non-product images
        """
        # Check if mostly non-product images
        product_count = sum(1 for r in results if r.is_product)
        if product_count < len(results) * 0.5:
            return "non_product"

        # Check for single dominant brand
        if brand_frequencies:
            max_freq = max(f["frequency"] for f in brand_frequencies.values())
            if max_freq > 0.50:
                return "single_brand"

        # Check for multiple brands
        if len(brand_frequencies) >= 3:
            return "multiple_brands"

        # Check for descriptor pattern
        # (e.g., "Extra" appears in Sensodyne Extra, Oral-B Extra, etc.)
        variants = [r.variant for r in results if r.variant and r.is_product]
        if len(set(variants)) == 1 and len(variants) >= 3:
            return "descriptor"

        return "multiple_brands"

    def aggregate_results(
        self,
        results: List[dict],
        user_category: str
    ) -> dict:
        """
        Aggregate vision results, filtering by product type.

        Only counts detections where product type matches user's category!

        Args:
            results: List of vision result dictionaries
            user_category: User's category (e.g., "Toothpaste", "Toothbrush")

        Returns:
            Aggregated statistics with product type filtering
        """
        from utils.product_types import matches_category

        total_images = len(results)
        brand_data = {}
        mismatched_products = []
        unidentified = 0

        for result in results:
            brand = result.get("brand")
            product_type = result.get("product_type")
            confidence = result.get("confidence", 0)

            if not brand or confidence < 30:
                unidentified += 1
                continue

            # CRITICAL: Check if product type matches category!
            type_matches = matches_category(product_type, user_category)

            if type_matches:
                # Correct product type - count it!
                if brand not in brand_data:
                    brand_data[brand] = {
                        "count": 0,
                        "confidences": [],
                        "product_types": []
                    }

                brand_data[brand]["count"] += 1
                brand_data[brand]["confidences"].append(confidence)
                brand_data[brand]["product_types"].append(product_type)
            else:
                # Wrong product type - track as mismatch!
                mismatched_products.append({
                    "brand": brand,
                    "detected_type": product_type,
                    "expected_category": user_category,
                    "confidence": confidence
                })

        # Calculate aggregated stats
        aggregated_brands = {}
        for brand, data in brand_data.items():
            count = data["count"]
            avg_conf = sum(data["confidences"]) / len(data["confidences"])

            aggregated_brands[brand] = {
                "count": count,
                "frequency": count / total_images,
                "percentage": round((count / total_images) * 100, 1),
                "avg_confidence": round(avg_conf, 1),
                "product_types": list(set(data["product_types"]))
            }

        return {
            "brands": aggregated_brands,
            "total_images": total_images,
            "correct_matches": sum(b["count"] for b in aggregated_brands.values()),
            "mismatched_products": mismatched_products,
            "mismatched_count": len(mismatched_products),
            "unidentified": unidentified
        }

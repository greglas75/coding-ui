"""
Gemini Vision Analyzer for brand validation
Uses Google Gemini Vision API to analyze product images
"""

from typing import List, Dict, Optional
import logging
import os
import google.generativeai as genai
from PIL import Image
import requests
from io import BytesIO

logger = logging.getLogger(__name__)


class VisionAnalysisResult:
    """Result of vision analysis on product images"""

    def __init__(
        self,
        brand_primary: str,
        brand_local: Optional[str],
        total_products: int,
        variants: Dict[str, int],
        confidence: str,
        red_flags: List[str],
        analyzed_images: List[str]
    ):
        self.brand_primary = brand_primary
        self.brand_local = brand_local
        self.total_products = total_products
        self.variants = variants
        self.confidence = confidence
        self.red_flags = red_flags
        self.analyzed_images = analyzed_images

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "brand_primary": self.brand_primary,
            "brand_local": self.brand_local,
            "total_products": self.total_products,
            "variants": self.variants,
            "confidence": self.confidence,
            "red_flags": self.red_flags,
            "analyzed_images": self.analyzed_images
        }


class GeminiVisionAnalyzer:
    """Analyzes product images using Google Gemini Vision API"""

    def __init__(self, google_api_key: str):
        """
        Initialize Gemini vision analyzer.

        Args:
            google_api_key: Google API key for Gemini
        """
        self.google_api_key = google_api_key or os.getenv("GOOGLE_API_KEY")

        if not self.google_api_key:
            raise ValueError("Google API key is required for Gemini Vision")

        # Configure Gemini
        genai.configure(api_key=self.google_api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')  # Use flash for vision

    async def analyze_images_with_variants(
        self,
        images: List[str],
        expected_brand: Optional[str] = None
    ) -> VisionAnalysisResult:
        """
        Analyze product images to identify brands and count variants.

        Args:
            images: List of image URLs
            expected_brand: Optional expected brand name

        Returns:
            VisionAnalysisResult with brand analysis
        """
        if not images:
            logger.warning("No images provided for analysis")
            return VisionAnalysisResult(
                brand_primary="Unknown",
                brand_local=None,
                total_products=0,
                variants={},
                confidence="low",
                red_flags=["No images provided"],
                analyzed_images=[]
            )

        try:
            # Download and prepare images
            pil_images = []
            for img_url in images[:6]:  # Max 6 images
                try:
                    response = requests.get(img_url, timeout=10)
                    response.raise_for_status()
                    pil_image = Image.open(BytesIO(response.content))
                    pil_images.append(pil_image)
                except Exception as e:
                    logger.warning(f"Failed to load image {img_url}: {e}")
                    continue

            if not pil_images:
                raise ValueError("No valid images could be loaded")

            # Create analysis prompt
            prompt = self._create_analysis_prompt(expected_brand)

            # Call Gemini Vision API
            logger.info(f"Analyzing {len(pil_images)} images with Gemini Vision...")

            # Prepare content for Gemini
            content = [prompt] + pil_images

            response = self.model.generate_content(content)

            # Parse response
            result = self._parse_vision_response(response.text, images[:6])

            logger.info(f"✓ Gemini analysis complete: {result.brand_primary}, {result.total_products} products")

            return result

        except Exception as e:
            logger.error(f"Gemini vision analysis failed: {e}")
            return VisionAnalysisResult(
                brand_primary="Unknown",
                brand_local=None,
                total_products=0,
                variants={},
                confidence="low",
                red_flags=[f"Analysis error: {str(e)}"],
                analyzed_images=[]
            )

    def _create_analysis_prompt(self, expected_brand: Optional[str]) -> str:
        """Create the prompt for Gemini Vision analysis"""

        prompt = """Analyze these product images and identify the brand:

1. What is the EXACT brand name on each product?
   - Include text in ANY script (Arabic, Latin, Cyrillic, etc.)
   - Note exact spelling on each package

2. How many distinct products show this brand?

3. List ALL spelling variants found:
   - Different scripts (سنسوداين vs Sensodyne)
   - Misspellings
   - Capitalizations

4. Confidence level:
   - HIGH: Clear brand name on multiple products
   - MEDIUM: Brand visible but some ambiguity
   - LOW: Unclear or inconsistent

Return ONLY a JSON object in this format:
{
  "brand_primary": "English brand name",
  "brand_local": "Local language name (if different)",
  "total_products": <number>,
  "variants": {
    "variant1": <count>,
    "variant2": <count>
  },
  "confidence": "high|medium|low",
  "red_flags": ["any concerns"]
}"""

        if expected_brand:
            prompt += f"\n\nExpected brand: {expected_brand}"

        return prompt

    def count_variant_occurrences(self, variants: Dict[str, int]) -> tuple:
        """
        Get primary variant and total count.

        Args:
            variants: Dict of variant -> count

        Returns:
            Tuple of (primary_variant, total_occurrences)
        """
        if not variants:
            return ("Unknown", 0)

        # Primary variant is the one with highest count
        primary_variant = max(variants.items(), key=lambda x: x[1])[0]
        total_occurrences = sum(variants.values())

        return (primary_variant, total_occurrences)

    def _parse_vision_response(self, response_text: str, images: List[str]) -> VisionAnalysisResult:
        """
        Parse Gemini Vision API response.

        Args:
            response_text: JSON response from Gemini
            images: Original image list

        Returns:
            VisionAnalysisResult
        """
        import json

        try:
            # Extract JSON from response (Gemini might add markdown)
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text.strip()

            data = json.loads(json_str)

            return VisionAnalysisResult(
                brand_primary=data.get("brand_primary", "Unknown"),
                brand_local=data.get("brand_local"),
                total_products=data.get("total_products", 0),
                variants=data.get("variants", {}),
                confidence=data.get("confidence", "low"),
                red_flags=data.get("red_flags", []),
                analyzed_images=images
            )

        except Exception as e:
            logger.error(f"Failed to parse Gemini response: {e}")
            logger.debug(f"Response was: {response_text}")

            return VisionAnalysisResult(
                brand_primary="Unknown",
                brand_local=None,
                total_products=0,
                variants={},
                confidence="low",
                red_flags=[f"Parse error: {str(e)}"],
                analyzed_images=images
            )

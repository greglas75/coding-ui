"""
Vision Analyzer for brand validation with variant counting
Analyzes product images to identify brands and count occurrences
"""

from typing import List, Dict, Optional
import logging
import base64
import httpx
from collections import Counter

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


class VisionAnalyzer:
    """Analyzes product images using Claude Vision API"""

    def __init__(self, anthropic_api_key: str):
        """
        Initialize vision analyzer.

        Args:
            anthropic_api_key: Anthropic API key for Claude
        """
        self.anthropic_api_key = anthropic_api_key
        self.api_url = "https://api.anthropic.com/v1/messages"

    async def analyze_images_with_variants(
        self,
        images: List[str],
        expected_brand: Optional[str] = None
    ) -> VisionAnalysisResult:
        """
        Enhanced vision analysis that:
        1. Detects brand name in ANY script (Arabic, Latin, etc.)
        2. Counts ALL occurrences of brand name across images
        3. Identifies spelling variations/transliterations
        4. Maps variants to occurrence count

        Args:
            images: List of image URLs or base64 strings
            expected_brand: Optional expected brand name for validation

        Returns:
            VisionAnalysisResult with variant counts and analysis
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
            # Prepare images for Claude Vision API
            image_content = await self._prepare_images(images[:6])  # Max 6 images

            # Create the analysis prompt
            prompt = self._create_variant_analysis_prompt(expected_brand)

            # Call Claude Vision API
            response = await self._call_claude_vision(image_content, prompt)

            # Parse the response
            result = self._parse_vision_response(response, images[:6])

            return result

        except Exception as e:
            logger.error(f"Vision analysis failed: {e}")
            return VisionAnalysisResult(
                brand_primary="Unknown",
                brand_local=None,
                total_products=0,
                variants={},
                confidence="low",
                red_flags=[f"Analysis error: {str(e)}"],
                analyzed_images=[]
            )

    def _create_variant_analysis_prompt(self, expected_brand: Optional[str]) -> str:
        """Create the prompt for Claude Vision analysis"""

        base_prompt = """Analyze these product images and provide detailed brand identification:

1. Identify the EXACT brand name as it appears on each product
   - Include text in ANY script (Arabic سنسوداين, Latin Sensodyne, Cyrillic, etc.)
   - Note the exact spelling on each package

2. Count occurrences: How many distinct products show this brand?

3. List ALL variants found:
   - Correct spellings in different scripts
   - Misspellings or variations (if any)
   - Transliterations
   - Different capitalizations

4. Assess confidence:
   - HIGH: Clear, consistent brand name across multiple products
   - MEDIUM: Brand visible but some ambiguity
   - LOW: Unclear or inconsistent

Return your analysis in this EXACT JSON format:
{
  "brand_primary": "English brand name",
  "brand_local": "Local language brand name (if different)",
  "total_products": <number of distinct products identified>,
  "variants": {
    "variant1": <count>,
    "variant2": <count>
  },
  "confidence": "high|medium|low",
  "red_flags": ["any concerns or issues"],
  "products_detail": [
    {
      "product_number": 1,
      "brand_text_found": "exact text on package",
      "script_type": "arabic|latin|mixed"
    }
  ]
}

IMPORTANT:
- Count each product/package separately
- Include ALL spelling variations you see
- If a variant appears on multiple products, count all occurrences"""

        if expected_brand:
            base_prompt += f"\n\nExpected brand to validate: {expected_brand}"

        return base_prompt

    async def _prepare_images(self, images: List[str]) -> List[dict]:
        """
        Prepare images for Claude Vision API.

        Args:
            images: List of image URLs or base64 data

        Returns:
            List of image content dicts for API
        """
        image_content = []

        for img in images:
            if img.startswith("http://") or img.startswith("https://"):
                # Image URL
                image_content.append({
                    "type": "image",
                    "source": {
                        "type": "url",
                        "url": img
                    }
                })
            elif img.startswith("data:image"):
                # Base64 data URL
                # Extract base64 part
                if "base64," in img:
                    base64_data = img.split("base64,")[1]
                    media_type = img.split(";")[0].split(":")[1]
                else:
                    logger.warning(f"Invalid base64 image format: {img[:50]}")
                    continue

                image_content.append({
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": base64_data
                    }
                })
            else:
                logger.warning(f"Unsupported image format: {img[:50]}")

        return image_content

    async def _call_claude_vision(self, image_content: List[dict], prompt: str) -> dict:
        """
        Call Claude Vision API.

        Args:
            image_content: Prepared image content
            prompt: Analysis prompt

        Returns:
            API response dict
        """
        if not image_content:
            raise ValueError("No valid images to analyze")

        # Construct messages with images
        messages_content = image_content + [{
            "type": "text",
            "text": prompt
        }]

        headers = {
            "x-api-key": self.anthropic_api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json"
        }

        payload = {
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 2048,
            "messages": [
                {
                    "role": "user",
                    "content": messages_content
                }
            ]
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                self.api_url,
                headers=headers,
                json=payload
            )
            response.raise_for_status()
            return response.json()

    def _parse_vision_response(self, api_response: dict, images: List[str]) -> VisionAnalysisResult:
        """
        Parse Claude Vision API response.

        Args:
            api_response: Raw API response
            images: Original image list

        Returns:
            Parsed VisionAnalysisResult
        """
        try:
            # Extract text from response
            content = api_response.get("content", [])
            if not content:
                raise ValueError("Empty response from Claude")

            text_content = content[0].get("text", "")

            # Try to parse as JSON
            import json
            import re

            # Find JSON in response (might be wrapped in markdown code blocks)
            json_match = re.search(r'\{[\s\S]*\}', text_content)
            if json_match:
                data = json.loads(json_match.group())
            else:
                # Fallback: treat whole response as JSON
                data = json.loads(text_content)

            # Extract fields
            brand_primary = data.get("brand_primary", "Unknown")
            brand_local = data.get("brand_local")
            total_products = data.get("total_products", 0)
            variants = data.get("variants", {})
            confidence = data.get("confidence", "low")
            red_flags = data.get("red_flags", [])

            return VisionAnalysisResult(
                brand_primary=brand_primary,
                brand_local=brand_local,
                total_products=total_products,
                variants=variants,
                confidence=confidence,
                red_flags=red_flags,
                analyzed_images=images
            )

        except Exception as e:
            logger.error(f"Failed to parse vision response: {e}")
            logger.error(f"Response: {api_response}")

            # Return low-confidence result
            return VisionAnalysisResult(
                brand_primary="Unknown",
                brand_local=None,
                total_products=0,
                variants={},
                confidence="low",
                red_flags=[f"Parse error: {str(e)}"],
                analyzed_images=images
            )

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

"""
AI analysis of web search results using Claude Haiku 4.5.

Analyzes Google search result titles, descriptions, and URLs to extract:
- Brand name
- Product type
- Confidence score

Why Haiku 4.5?
- Fast: ~200ms per analysis
- Cheap: $0.25 per 1M input tokens
- Good enough for title/description analysis
- Can process 12 results in ~2-3 seconds (parallel)

Cost: ~$0.003 per validation (12 results)
"""

import anthropic
import asyncio
from typing import List, Dict, Any
import json
import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class WebSearchAIService:
    """
    Analyze web search results with Claude Haiku 4.5.

    Extracts brand names and product types from search result text.
    """

    def __init__(self, api_key: str):
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = "claude-haiku-4-5-20251001"  # Claude Haiku 4.5
        logger.info("WebSearchAIService initialized with Claude Haiku 4.5")

    async def analyze_result(self, search_result: dict) -> dict:
        """
        Analyze single web search result.

        Args:
            search_result: {
                "title": "معجون أسنان كولغيت",
                "description": "كولغيت معجون أسنان للتبييض",
                "url": "https://www.colgate.com/...",
                "context": "www.colgate.com"
            }

        Returns:
        {
            "brand": "Colgate" or null,
            "product_type": "Toothpaste" or null,
            "confidence": 0-100,
            "reasoning": "Brand name appears in title and URL..."
        }
        """

        title = search_result.get("title", "")
        description = search_result.get("description", "") or search_result.get("snippet", "")
        url = search_result.get("url", "") or search_result.get("link", "")

        prompt = f"""Analyze this web search result and extract brand and product information.

SEARCH RESULT:
Title: {title}
Description: {description}
URL: {url}

TASK:
Extract the following information:

1. BRAND NAME: The main brand mentioned (e.g., "Colgate", "Oral-B", "Sensodyne")
   - Look in title, description, and URL
   - Return canonical English name even if text is Arabic
   - Examples: "كولغيت" → "Colgate", "سنسوداين" → "Sensodyne", "أورال-بي" → "Oral-B"

2. PRODUCT TYPE: What type of product is this?
   - Examples: "Toothpaste", "Toothbrush", "Soap", "Shampoo"
   - If unclear, try to infer from context
   - Return null if truly unknown

3. CONFIDENCE: Your confidence in brand detection (0-100)
   - High (85-100): Brand clearly stated multiple times
   - Medium (50-84): Brand mentioned once or inferred
   - Low (0-49): Uncertain or no clear brand

Return ONLY valid JSON (no markdown, no explanation):
{{
  "brand": "BrandName or null",
  "product_type": "ProductType or null",
  "confidence": 0-100,
  "reasoning": "Brief explanation"
}}"""

        try:
            # Run in thread pool since anthropic client is sync
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.messages.create(
                    model=self.model,
                    max_tokens=300,
                    temperature=0,
                    messages=[{
                        "role": "user",
                        "content": prompt
                    }]
                )
            )

            result_text = response.content[0].text.strip()

            # Remove markdown if present
            if result_text.startswith("```"):
                lines = result_text.split("\n")
                # Remove first and last lines (``` markers)
                result_text = "\n".join(lines[1:-1])
                if result_text.startswith("json"):
                    result_text = result_text[4:].strip()

            result = json.loads(result_text)

            logger.debug(
                f"Web AI: {result.get('brand', 'Unknown')} "
                f"({result.get('product_type', 'Unknown')}) - "
                f"{result.get('confidence', 0)}%"
            )

            return result

        except json.JSONDecodeError as e:
            logger.error(f"Web Search AI JSON error: {e}\nResponse: {result_text[:200]}")
            return {
                "brand": None,
                "product_type": None,
                "confidence": 0,
                "reasoning": f"JSON parse error: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Web Search AI error: {e}")
            return {
                "brand": None,
                "product_type": None,
                "confidence": 0,
                "reasoning": f"Analysis failed: {str(e)}"
            }

    async def batch_analyze(self, search_results: List[dict]) -> List[dict]:
        """
        Analyze multiple search results in parallel.

        Args:
            search_results: List of search result dicts

        Returns:
            List of analysis results
        """
        logger.info(f"🔍 Analyzing {len(search_results)} web search results with Haiku 4.5...")

        tasks = [
            self.analyze_result(result)
            for result in search_results
        ]
        results = await asyncio.gather(*tasks)

        # Count successful extractions
        brands_found = sum(1 for r in results if r.get("brand") and r.get("confidence", 0) >= 30)
        logger.info(f"📊 Web AI: {brands_found}/{len(results)} results with confident brand detection")

        return results

    def aggregate_results(
        self,
        search_results: List[dict],
        analysis_results: List[dict],
        user_category: str
    ) -> Dict[str, Any]:
        """
        Aggregate web search analysis results.

        Similar to Vision AI aggregation but for text.
        Filters by product type matching user's category.

        Args:
            search_results: Original search results (for URL extraction)
            analysis_results: AI analysis results
            user_category: User's category (e.g., "Toothpaste")

        Returns:
        {
            "brands": {
                "Colgate": {
                    "count": 8,
                    "frequency": 0.67,
                    "percentage": 66.7,
                    "avg_confidence": 92,
                    "product_types": ["Toothpaste"],
                    "sources": ["colgate.com", "store.com"]
                }
            },
            "total_results": 12,
            "correct_matches": 8,
            "mismatched_count": 2,
            "unidentified": 2
        }
        """
        from utils.product_types import matches_category

        total_results = len(analysis_results)
        brand_data = {}
        mismatched_products = []
        unidentified = 0

        for i, analysis in enumerate(analysis_results):
            brand = analysis.get("brand")
            product_type = analysis.get("product_type")
            confidence = analysis.get("confidence", 0)

            if not brand or confidence < 30:
                unidentified += 1
                continue

            # CRITICAL: Check if product type matches category!
            type_matches = matches_category(product_type, user_category)

            if type_matches:
                # Correct match - count it!
                if brand not in brand_data:
                    brand_data[brand] = {
                        "count": 0,
                        "confidences": [],
                        "product_types": [],
                        "sources": []
                    }

                brand_data[brand]["count"] += 1
                brand_data[brand]["confidences"].append(confidence)
                brand_data[brand]["product_types"].append(product_type)

                # Extract domain from URL
                if i < len(search_results):
                    url = search_results[i].get("url", "") or search_results[i].get("link", "")
                    try:
                        domain = urlparse(url).netloc
                        if domain:
                            brand_data[brand]["sources"].append(domain)
                    except:
                        pass
            else:
                # Product type mismatch - track it!
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
                "frequency": count / total_results if total_results > 0 else 0,
                "percentage": round((count / total_results) * 100, 1) if total_results > 0 else 0,
                "avg_confidence": round(avg_conf, 1),
                "product_types": list(set(data["product_types"])),
                "sources": list(set(data["sources"]))[:3]  # Top 3 unique sources
            }

        return {
            "brands": aggregated_brands,
            "total_results": total_results,
            "correct_matches": sum(b["count"] for b in aggregated_brands.values()),
            "mismatched_products": mismatched_products,
            "mismatched_count": len(mismatched_products),
            "unidentified": unidentified
        }

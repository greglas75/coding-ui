"""
UI Formatter - Format validation results for frontend display
"""

from models.validation import EnhancedValidationResult
from typing import Dict, List


class UIFormatter:
    """Format validation results for frontend display"""

    @staticmethod
    def format_for_display(result: EnhancedValidationResult) -> Dict:
        """
        Format validation result for UI rendering.

        Returns structure matching the UI layout:

        ┌─────────────────────────────────────┐
        │ User Response    │ Translation      │
        │ سنسوداين         │ Sensodyne        │
        ├─────────────────────────────────────┤
        │ Other Forms Found:                  │
        │ • سنسوداين (6)                      │
        │ • semosdine (1)                     │
        ├─────────────────────────────────────┤
        │ Confidence: HIGH                    │
        │ Google Search: "سنسوداين" (5 res)  │
        ├─────────────────────────────────────┤
        │ [Reject]              [✓ Approve]   │
        └─────────────────────────────────────┘

        Args:
            result: EnhancedValidationResult to format

        Returns:
            Formatted dict for UI rendering
        """
        confidence_label = UIFormatter._get_confidence_label(result.confidence)

        return {
            "header": {
                "user_response": result.user_response,
                "translation": result.translation,
                "display_text": result.display_format
            },
            "variants_section": {
                "title": "Other Forms Found:",
                "items": [
                    {
                        "text": variant,
                        "count": count,
                        "display": f"• {variant} ({count})"
                    }
                    for variant, count in result.variants.items()
                ],
                "has_variants": len(result.variants) > 1
            },
            "confidence_section": {
                "score": result.confidence,
                "label": confidence_label,
                "color": UIFormatter._get_confidence_color(result.confidence),
                "google_search": {
                    "query": result.search_validation.get("search_phrase", result.user_response),
                    "results_count": result.search_validation.get("relevant_results", 0),
                    "display": f'Google Search: "{result.search_validation.get("search_phrase", result.user_response)}" ({result.search_validation.get("relevant_results", 0)} results)'
                },
                "vision_summary": {
                    "products_found": result.vision_analysis.get("total_products", 0),
                    "brand_identified": result.vision_analysis.get("brand_primary", "Unknown"),
                    "display": f'{result.vision_analysis.get("total_products", 0)} products identified'
                }
            },
            "reasoning_section": {
                "text": result.reasoning,
                "risk_factors": result.risk_factors,
                "has_risks": len(result.risk_factors) > 0
            },
            "actions": {
                "show_approve": result.show_approve_button,
                "show_reject": result.show_reject_button,
                "approve_enabled": result.confidence >= 70 and result.recommendation == "approve",
                "reject_enabled": True,
                "requires_review": result.requires_human_review,
                "recommendation": result.recommendation
            },
            "web_results": result.search_validation.get("web_results", []),
            "images": result.vision_analysis.get("analyzed_images", []),
            "metadata": {
                "language": result.translation_info.get("detected_language", "unknown"),
                "is_multilingual": result.translation_info.get("is_transliteration", False),
                "total_variants": len(result.variants),
                "primary_variant": result.primary_variant
            }
        }

    @staticmethod
    def _get_confidence_label(score: int) -> str:
        """
        Get confidence label from score.

        Args:
            score: Confidence score 0-100

        Returns:
            Label: HIGH, MEDIUM, or LOW
        """
        if score >= 80:
            return "HIGH"
        elif score >= 50:
            return "MEDIUM"
        else:
            return "LOW"

    @staticmethod
    def _get_confidence_color(score: int) -> str:
        """
        Get color for confidence display.

        Args:
            score: Confidence score 0-100

        Returns:
            Color code: green, yellow, or red
        """
        if score >= 80:
            return "green"
        elif score >= 50:
            return "yellow"
        else:
            return "red"

    @staticmethod
    def format_bulk_summary(results: List[EnhancedValidationResult]) -> Dict:
        """
        Format summary for bulk validation.

        Args:
            results: List of validation results

        Returns:
            Summary dict with statistics
        """
        total = len(results)
        approved = sum(1 for r in results if r.recommendation == "approve")
        rejected = sum(1 for r in results if r.recommendation == "reject")
        requires_review = sum(1 for r in results if r.requires_human_review)

        avg_confidence = sum(r.confidence for r in results) / total if total > 0 else 0

        return {
            "total": total,
            "approved": approved,
            "rejected": rejected,
            "requires_review": requires_review,
            "pending": total - approved - rejected,
            "average_confidence": round(avg_confidence, 1),
            "approval_rate": round(approved / total * 100, 1) if total > 0 else 0,
            "high_confidence_count": sum(1 for r in results if r.confidence >= 80),
            "low_confidence_count": sum(1 for r in results if r.confidence < 50)
        }

    @staticmethod
    def format_variant_table(variants: Dict[str, int]) -> List[Dict]:
        """
        Format variants as a table for display.

        Args:
            variants: Dict of variant -> count

        Returns:
            List of table rows
        """
        # Sort by count (descending)
        sorted_variants = sorted(
            variants.items(),
            key=lambda x: x[1],
            reverse=True
        )

        total_count = sum(variants.values())

        return [
            {
                "variant": variant,
                "count": count,
                "percentage": round(count / total_count * 100, 1) if total_count > 0 else 0,
                "is_primary": i == 0  # First one is primary (most common)
            }
            for i, (variant, count) in enumerate(sorted_variants)
        ]

    @staticmethod
    def format_comparison_view(
        user_response: str,
        translation: str,
        variants: Dict[str, int],
        language: str
    ) -> Dict:
        """
        Format a two-column comparison view.

        Args:
            user_response: Original user input
            translation: English translation
            variants: Variant occurrences
            language: Language code

        Returns:
            Formatted comparison dict
        """
        return {
            "columns": [
                {
                    "title": "User Response",
                    "language": language,
                    "text": user_response,
                    "is_original": True
                },
                {
                    "title": "Translation",
                    "language": "en",
                    "text": translation,
                    "is_original": False
                }
            ],
            "variants": UIFormatter.format_variant_table(variants),
            "display_format": f"{user_response} ({translation})" if language != "en" else user_response
        }

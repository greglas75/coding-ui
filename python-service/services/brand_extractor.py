"""
Brand extraction service using NER and fuzzy matching to detect brand names from text.
"""
import logging
import re
from typing import List, Optional, Tuple
from dataclasses import dataclass
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)


@dataclass
class BrandCandidate:
    """Represents a potential brand found in text."""
    name: str
    normalized_name: str
    confidence: float
    source_text: str
    position: Tuple[int, int]  # (start, end) character positions


class BrandExtractor:
    """Service for extracting brand names from free-text responses."""

    def __init__(self):
        # Common brand patterns and keywords
        self.brand_indicators = [
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',  # Title case words
            r'\b[A-Z]{2,}\b',  # Acronyms (APPLE, BMW, etc.)
            r'\b[a-z]+(?:\s+[a-z]+)*\b',  # Lowercase words (for typos)
        ]

        # Common brand suffixes/prefixes
        self.brand_suffixes = [
            'brand', 'company', 'corp', 'inc', 'ltd', 'llc', 'group',
            'international', 'global', 'worldwide', 'enterprises'
        ]

        # Known brand database for fuzzy matching (can be expanded)
        self.known_brands = {
            # Health & Personal Care
            'colgate', 'crest', 'oral-b', 'sensodyne', 'listerine',
            'dove', 'olay', 'neutrogena', 'cetaphil', 'aveeno',
            'johnson', 'johnson & johnson', 'pampers', 'huggies',

            # Tech & Electronics
            'apple', 'samsung', 'google', 'microsoft', 'amazon',
            'sony', 'lg', 'nokia', 'huawei', 'xiaomi',
            'tesla', 'bmw', 'mercedes', 'audi', 'volkswagen',

            # Fashion & Luxury
            'nike', 'adidas', 'puma', 'under armour', 'lululemon',
            'gucci', 'louis vuitton', 'chanel', 'prada', 'hermes',
            'zara', 'h&m', 'uniqlo', 'gap', 'old navy',

            # Food & Beverage
            'coca-cola', 'pepsi', 'mcdonalds', 'kfc', 'subway',
            'starbucks', 'dunkin', 'tim hortons', 'dominos',
            'pizza hut', 'burger king', 'wendys',

            # Retail & E-commerce
            'walmart', 'target', 'costco', 'home depot', 'lowes',
            'ikea', 'wayfair', 'etsy', 'ebay', 'shopify'
        }

    def extract_brands(self, texts: List[str]) -> List[BrandCandidate]:
        """
        Extract potential brand names from a list of texts.

        Args:
            texts: List of text strings to analyze

        Returns:
            List[BrandCandidate]: List of potential brands found
        """
        all_candidates = []

        for text in texts:
            candidates = self._extract_from_text(text)
            all_candidates.extend(candidates)

        # Remove duplicates and merge similar candidates
        unique_candidates = self._deduplicate_candidates(all_candidates)

        # Sort by confidence (highest first)
        unique_candidates.sort(key=lambda x: x.confidence, reverse=True)

        logger.info(f"Extracted {len(unique_candidates)} unique brand candidates from {len(texts)} texts")
        return unique_candidates

    def _extract_from_text(self, text: str) -> List[BrandCandidate]:
        """Extract brand candidates from a single text."""
        candidates = []

        # Find all potential brand mentions using regex patterns
        for pattern in self.brand_indicators:
            matches = re.finditer(pattern, text, re.IGNORECASE)

            for match in matches:
                raw_name = match.group().strip()

                # Skip very short or very long names
                if len(raw_name) < 2 or len(raw_name) > 50:
                    continue

                # Skip common words that aren't brands
                if self._is_common_word(raw_name):
                    continue

                # Normalize the brand name
                normalized = self.normalize_brand_name(raw_name)

                # Calculate confidence based on various factors
                confidence = self._calculate_confidence(raw_name, normalized, text)

                # Only include candidates with reasonable confidence
                if confidence > 0.3:
                    candidate = BrandCandidate(
                        name=raw_name,
                        normalized_name=normalized,
                        confidence=confidence,
                        source_text=text,
                        position=(match.start(), match.end())
                    )
                    candidates.append(candidate)

        return candidates

    def normalize_brand_name(self, raw_name: str) -> str:
        """
        Normalize a brand name by cleaning and standardizing it.

        Args:
            raw_name: Raw brand name from text

        Returns:
            str: Normalized brand name
        """
        # Convert to lowercase for processing
        normalized = raw_name.lower().strip()

        # Remove common punctuation
        normalized = re.sub(r'[^\w\s-]', '', normalized)

        # Remove extra whitespace
        normalized = ' '.join(normalized.split())

        # Handle common typos and variations
        normalized = self._fix_common_typos(normalized)

        # Remove brand suffixes if present
        for suffix in self.brand_suffixes:
            if normalized.endswith(f' {suffix}'):
                normalized = normalized[:-len(f' {suffix}')].strip()

        return normalized

    def fuzzy_match_known_brands(self, candidate: str, threshold: float = 0.8) -> Optional[str]:
        """
        Find the best match for a candidate brand in the known brands database.

        Args:
            candidate: Brand name to match
            threshold: Minimum similarity score (0-1)

        Returns:
            Optional[str]: Best matching known brand or None
        """
        best_match = None
        best_score = 0.0

        for known_brand in self.known_brands:
            # Calculate similarity using SequenceMatcher
            similarity = SequenceMatcher(None, candidate.lower(), known_brand.lower()).ratio()

            if similarity > best_score and similarity >= threshold:
                best_score = similarity
                best_match = known_brand

        return best_match if best_score >= threshold else None

    def _calculate_confidence(self, raw_name: str, normalized: str, context: str) -> float:
        """Calculate confidence score for a brand candidate."""
        confidence = 0.0

        # Base confidence from length (not too short, not too long)
        length_score = min(1.0, len(normalized) / 15.0)  # Optimal around 15 chars
        confidence += length_score * 0.2

        # Check if it matches a known brand
        known_match = self.fuzzy_match_known_brands(normalized, threshold=0.7)
        if known_match:
            confidence += 0.6  # High confidence for known brands

        # Check for brand indicators in context
        context_lower = context.lower()
        brand_context_indicators = [
            'brand', 'company', 'product', 'manufacturer',
            'buy', 'purchase', 'use', 'prefer', 'like',
            'recommend', 'trust', 'quality'
        ]

        context_score = sum(1 for indicator in brand_context_indicators
                          if indicator in context_lower) / len(brand_context_indicators)
        confidence += context_score * 0.2

        # Bonus for title case (likely proper nouns)
        if raw_name[0].isupper() and any(c.isupper() for c in raw_name[1:]):
            confidence += 0.1

        # Penalty for very common words
        if self._is_common_word(normalized):
            confidence *= 0.3

        return min(1.0, confidence)

    def _fix_common_typos(self, name: str) -> str:
        """Fix common typos in brand names."""
        typo_fixes = {
            'colagte': 'colgate',
            'crest': 'crest',  # Already correct
            'appel': 'apple',
            'samsun': 'samsung',
            'googl': 'google',
            'microsft': 'microsoft',
            'amazn': 'amazon',
            'nik': 'nike',
            'adida': 'adidas',
            'starbuck': 'starbucks',
            'mcdonal': 'mcdonalds',
            'coca cola': 'coca-cola',
            'louis vuiton': 'louis vuitton',
        }

        return typo_fixes.get(name, name)

    def _is_common_word(self, word: str) -> bool:
        """Check if a word is too common to be a brand."""
        common_words = {
            'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
            'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
            'after', 'above', 'below', 'between', 'among', 'good', 'bad', 'new',
            'old', 'big', 'small', 'great', 'nice', 'best', 'better', 'worse',
            'first', 'last', 'next', 'previous', 'other', 'another', 'same',
            'different', 'similar', 'easy', 'hard', 'simple', 'complex'
        }

        return word.lower() in common_words

    def _deduplicate_candidates(self, candidates: List[BrandCandidate]) -> List[BrandCandidate]:
        """Remove duplicate and very similar brand candidates."""
        unique_candidates = []

        for candidate in candidates:
            # Check if this candidate is too similar to existing ones
            is_duplicate = False

            for existing in unique_candidates:
                similarity = SequenceMatcher(
                    None,
                    candidate.normalized_name.lower(),
                    existing.normalized_name.lower()
                ).ratio()

                # If very similar (90%+), keep the one with higher confidence
                if similarity > 0.9:
                    is_duplicate = True
                    if candidate.confidence > existing.confidence:
                        # Replace the existing candidate
                        unique_candidates.remove(existing)
                        unique_candidates.append(candidate)
                    break

            if not is_duplicate:
                unique_candidates.append(candidate)

        return unique_candidates


# Convenience function for direct use
def extract_brands(texts: List[str]) -> List[BrandCandidate]:
    """
    Extract brand candidates from a list of texts.

    Args:
        texts: List of text strings to analyze

    Returns:
        List[BrandCandidate]: List of potential brands found
    """
    extractor = BrandExtractor()
    return extractor.extract_brands(texts)

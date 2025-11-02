"""
Translation Handler for multilingual brand validation
Handles language detection, translation, and display formatting
"""

from typing import Optional
import logging

try:
    from deep_translator import GoogleTranslator
except ImportError:
    GoogleTranslator = None

try:
    from langdetect import detect, LangDetectException
except ImportError:
    detect = None
    LangDetectException = Exception

logger = logging.getLogger(__name__)


class TranslationHandler:
    """Handles translation and display formatting for multilingual responses"""

    def __init__(self):
        """Initialize translation handler"""
        self.translator = GoogleTranslator() if GoogleTranslator else None
        if not self.translator:
            logger.warning("deep-translator not available - translation will be limited")

    def detect_language(self, text: str) -> str:
        """
        Detect the language of the input text.

        Args:
            text: Input text to analyze

        Returns:
            ISO 639-1 language code (e.g., 'ar', 'en', 'es')
        """
        if not detect:
            logger.warning("langdetect not available - defaulting to 'unknown'")
            return "unknown"

        try:
            return detect(text)
        except (LangDetectException, Exception) as e:
            logger.warning(f"Language detection failed: {e}")
            return "unknown"

    def is_non_latin_script(self, text: str) -> bool:
        """
        Check if text contains non-Latin characters.

        Args:
            text: Input text to check

        Returns:
            True if text contains non-ASCII/non-Latin characters
        """
        return not text.isascii()

    def translate_to_english(self, text: str, source_lang: Optional[str] = None) -> Optional[str]:
        """
        Translate text to English.

        Args:
            text: Text to translate
            source_lang: Source language code (auto-detect if None)

        Returns:
            Translated text or None if translation fails
        """
        if not self.translator:
            logger.warning("Translator not available")
            return None

        try:
            if source_lang and source_lang != "unknown":
                self.translator.source = source_lang
            else:
                # Auto-detect
                detected_lang = self.detect_language(text)
                if detected_lang == "unknown" or detected_lang == "en":
                    return text
                self.translator.source = detected_lang

            self.translator.target = "en"
            translated = self.translator.translate(text)
            return translated
        except Exception as e:
            logger.error(f"Translation failed: {e}")
            return None

    def get_display_format(
        self,
        user_response: str,
        detected_brand: Optional[str] = None,
        language_code: Optional[str] = None
    ) -> dict:
        """
        Create proper display format with translation.

        Logic:
        1. Detect language of user_response
        2. If non-English:
           - Translate to English (or use detected_brand if provided)
           - Format: "سنسوداين (Sensodyne)"
        3. If English:
           - Format: "Sensodyne"

        Args:
            user_response: Original user input text
            detected_brand: Known brand name (from vision analysis)
            language_code: Override language detection

        Returns:
            dict with:
                - user_response: Original text
                - translation: English translation
                - display_format: Formatted for UI
                - language_code: Detected language
                - is_non_latin: Whether text uses non-Latin script
        """
        # Detect language if not provided
        if not language_code:
            language_code = self.detect_language(user_response)

        # Check if user_response is non-Latin script
        is_non_latin = self.is_non_latin_script(user_response)

        # Determine translation
        translation = detected_brand if detected_brand else user_response

        if is_non_latin and language_code != "en":
            # User wrote in local language (Arabic, Cyrillic, etc.)
            # Try to translate if we don't have detected_brand
            if not detected_brand:
                auto_translation = self.translate_to_english(user_response, language_code)
                if auto_translation:
                    translation = auto_translation

            # Format: "سنسوداين (Sensodyne)"
            display_format = f"{user_response} ({translation})"
        else:
            # User wrote in Latin script or English
            display_format = user_response
            translation = user_response

        return {
            "user_response": user_response,
            "translation": translation,
            "display_format": display_format,
            "language_code": language_code,
            "is_non_latin": is_non_latin
        }

    def normalize_for_comparison(self, text: str) -> str:
        """
        Normalize text for comparison (lowercase, strip whitespace).

        Args:
            text: Text to normalize

        Returns:
            Normalized text
        """
        return text.lower().strip()

    def are_variants(self, text1: str, text2: str, threshold: float = 0.8) -> bool:
        """
        Check if two texts are likely variants of each other.
        Uses simple character overlap for now.

        Args:
            text1: First text
            text2: Second text
            threshold: Similarity threshold (0-1)

        Returns:
            True if texts are likely variants
        """
        norm1 = self.normalize_for_comparison(text1)
        norm2 = self.normalize_for_comparison(text2)

        if norm1 == norm2:
            return True

        # Simple character-based similarity
        common_chars = set(norm1) & set(norm2)
        all_chars = set(norm1) | set(norm2)

        if not all_chars:
            return False

        similarity = len(common_chars) / len(all_chars)
        return similarity >= threshold

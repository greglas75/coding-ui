"""
Claude API client for codeframe generation.
"""
import logging
import os
import time
import xml.etree.ElementTree as ET
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
import anthropic
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
    before_sleep_log
)
from pybreaker import CircuitBreaker, CircuitBreakerError
from threading import Lock
from collections import deque
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


# Rate limiter implementation
class RateLimiter:
    """
    Simple rate limiter using sliding window algorithm.
    Thread-safe implementation for concurrent requests.
    """
    def __init__(self, max_calls: int, time_window: int):
        """
        Initialize rate limiter.

        Args:
            max_calls: Maximum number of calls allowed
            time_window: Time window in seconds
        """
        self.max_calls = max_calls
        self.time_window = time_window
        self.calls = deque()
        self.lock = Lock()

    def acquire(self) -> bool:
        """
        Attempt to acquire permission to make a call.

        Returns:
            bool: True if allowed, False if rate limit exceeded
        """
        with self.lock:
            now = datetime.now()
            # Remove calls outside the time window
            while self.calls and self.calls[0] < now - timedelta(seconds=self.time_window):
                self.calls.popleft()

            # Check if we can make a new call
            if len(self.calls) < self.max_calls:
                self.calls.append(now)
                return True

            return False

    def wait_time(self) -> float:
        """
        Calculate how long to wait before next call is allowed.

        Returns:
            float: Seconds to wait
        """
        with self.lock:
            if len(self.calls) < self.max_calls:
                return 0.0

            oldest_call = self.calls[0]
            wait_until = oldest_call + timedelta(seconds=self.time_window)
            wait_seconds = (wait_until - datetime.now()).total_seconds()
            return max(0.0, wait_seconds)


@dataclass
class ClaudeConfig:
    """Configuration for Claude API calls."""
    model: str = "claude-sonnet-4-5-20251022"
    temperature: float = 0.3
    max_tokens: int = 4096
    # Rate limiting: Max 10 API calls per minute (conservative)
    rate_limit_calls: int = 10
    rate_limit_window: int = 60  # seconds
    # Cost protection: Max $5 per single generation (safety net)
    max_cost_per_generation_usd: float = 5.0
    # Circuit breaker: Open after 5 failures, half-open after 60s
    circuit_breaker_fail_threshold: int = 5
    circuit_breaker_timeout: int = 60  # seconds


@dataclass
class ClaudeUsage:
    """Token usage and cost information."""
    input_tokens: int
    output_tokens: int
    cost_usd: float


@dataclass
class CodeframeTheme:
    """Theme extracted from cluster."""
    name: str
    description: str
    dominant_language: str
    confidence: str


@dataclass
class CodeItem:
    """Individual code within the codeframe."""
    name: str
    description: str
    confidence: str
    example_texts: List[Dict[str, Any]]
    sub_codes: List['CodeItem']
    frequency_estimate: Optional[str] = None


@dataclass
class ClaudeCodeframeResult:
    """Complete result from Claude codeframe generation."""
    theme: CodeframeTheme
    codes: List[CodeItem]
    hierarchy_depth: str
    mece_assessment: Dict[str, Any]
    thinking: str
    usage: ClaudeUsage
    processing_time_ms: int


class ClaudeClient:
    """Client for interacting with Claude API for codeframe generation."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        config: Optional[ClaudeConfig] = None,
        system_prompt_path: str = "prompts/system_prompt.xml"
    ):
        """
        Initialize Claude client.

        Args:
            api_key: Anthropic API key. If None, reads from ANTHROPIC_API_KEY env var.
            config: Claude configuration. If None, uses defaults.
            system_prompt_path: Path to system prompt XML file.
        """
        self.api_key = api_key or os.getenv("ANTHROPIC_API_KEY")
        if not self.api_key:
            raise ValueError("ANTHROPIC_API_KEY must be set")

        self.config = config or ClaudeConfig()
        self.client = anthropic.Anthropic(api_key=self.api_key)
        self.system_prompt = self._load_system_prompt(system_prompt_path)

        # Initialize rate limiter
        self.rate_limiter = RateLimiter(
            max_calls=self.config.rate_limit_calls,
            time_window=self.config.rate_limit_window
        )

        # Initialize circuit breaker
        self.circuit_breaker = CircuitBreaker(
            fail_max=self.config.circuit_breaker_fail_threshold,
            reset_timeout=self.config.circuit_breaker_timeout,
            name="claude_api"
        )

        logger.info(
            f"Claude client initialized with model: {self.config.model}, "
            f"rate limit: {self.config.rate_limit_calls}/{self.config.rate_limit_window}s, "
            f"max cost: ${self.config.max_cost_per_generation_usd}"
        )

    def _load_system_prompt(self, path: str) -> str:
        """
        Load system prompt from XML file.

        Args:
            path: Path to system prompt file.

        Returns:
            str: System prompt content.
        """
        try:
            with open(path, 'r', encoding='utf-8') as f:
                prompt = f.read()
            logger.info(f"Loaded system prompt from: {path}")
            return prompt
        except FileNotFoundError:
            logger.warning(f"System prompt file not found: {path}")
            return ""

    @retry(
        retry=retry_if_exception_type((anthropic.RateLimitError, anthropic.APIConnectionError)),
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        before_sleep=before_sleep_log(logger, logging.WARNING)
    )
    def _call_claude_api_protected(
        self,
        user_prompt: str
    ) -> anthropic.types.Message:
        """
        Call Claude API with rate limiting, circuit breaker, and retry logic.

        Args:
            user_prompt: The user prompt to send to Claude

        Returns:
            anthropic.types.Message: The API response

        Raises:
            RuntimeError: If rate limit exceeded
            CircuitBreakerError: If circuit breaker is open
            Exception: If API call fails after retries
        """
        # Check rate limit
        if not self.rate_limiter.acquire():
            wait_time = self.rate_limiter.wait_time()
            logger.warning(
                f"Rate limit exceeded! Must wait {wait_time:.1f}s before next call. "
                f"Limit: {self.config.rate_limit_calls} calls per {self.config.rate_limit_window}s"
            )
            raise RuntimeError(
                f"Rate limit exceeded. Please wait {wait_time:.1f} seconds. "
                f"Limit: {self.config.rate_limit_calls} calls per {self.config.rate_limit_window}s"
            )

        # Call through circuit breaker
        try:
            response = self.circuit_breaker.call(
                self.client.messages.create,
                model=self.config.model,
                max_tokens=self.config.max_tokens,
                temperature=self.config.temperature,
                system=self.system_prompt,
                messages=[{"role": "user", "content": user_prompt}]
            )
            return response
        except CircuitBreakerError as e:
            logger.error(
                f"Circuit breaker is OPEN! API calls are temporarily blocked. "
                f"Will retry after {self.config.circuit_breaker_timeout}s"
            )
            raise

    def generate_codeframe(
        self,
        cluster_texts: List[Dict[str, Any]],
        category_name: str,
        category_description: str,
        target_language: str = "en",
        existing_codes: Optional[List[str]] = None
    ) -> ClaudeCodeframeResult:
        """
        Generate codeframe for a cluster of texts using Claude.

        Args:
            cluster_texts: List of text items with 'id', 'text', 'language' keys.
            category_name: Name of the category being coded.
            category_description: Description of the category.
            target_language: Target language for code names (default: 'en').
            existing_codes: List of existing codes to avoid duplication.

        Returns:
            ClaudeCodeframeResult: Parsed codeframe with theme, codes, and metadata.

        Raises:
            Exception: If API call fails or XML parsing fails.
        """
        start_time = time.time()

        # Build user prompt
        user_prompt = self._build_user_prompt(
            cluster_texts,
            category_name,
            category_description,
            target_language,
            existing_codes
        )

        logger.info(
            f"Generating codeframe for {len(cluster_texts)} texts "
            f"in category '{category_name}'"
        )

        try:
            # Call Claude API with protection layers
            response = self._call_claude_api_protected(user_prompt)

            processing_time_ms = int((time.time() - start_time) * 1000)

            # Calculate usage and cost FIRST (before parsing)
            usage = self._calculate_usage(response.usage)

            # Check cost limit
            if usage.cost_usd > self.config.max_cost_per_generation_usd:
                logger.error(
                    f"COST LIMIT EXCEEDED! Generation cost ${usage.cost_usd:.4f} exceeds "
                    f"limit of ${self.config.max_cost_per_generation_usd}. "
                    f"This is a safety mechanism - please review the configuration."
                )
                raise RuntimeError(
                    f"Cost limit exceeded: ${usage.cost_usd:.4f} > ${self.config.max_cost_per_generation_usd}. "
                    f"Generation aborted for safety."
                )

            # Extract response content
            response_text = response.content[0].text

            # Parse XML response
            result = self._parse_xml_response(response_text)

            logger.info(
                f"Codeframe generated successfully in {processing_time_ms}ms. "
                f"Usage: {usage.input_tokens} in, {usage.output_tokens} out, "
                f"Cost: ${usage.cost_usd:.4f}"
            )

            return ClaudeCodeframeResult(
                theme=result['theme'],
                codes=result['codes'],
                hierarchy_depth=result['hierarchy_depth'],
                mece_assessment=result['mece_assessment'],
                thinking=result['thinking'],
                usage=usage,
                processing_time_ms=processing_time_ms
            )

        except Exception as e:
            logger.error(f"Error generating codeframe: {str(e)}")
            raise

    def _build_user_prompt(
        self,
        cluster_texts: List[Dict[str, Any]],
        category_name: str,
        category_description: str,
        target_language: str,
        existing_codes: Optional[List[str]]
    ) -> str:
        """Build user prompt for Claude API."""
        # Format texts
        texts_formatted = "\n".join([
            f"<text id=\"{item['id']}\" language=\"{item.get('language', 'en')}\">"
            f"{item['text']}</text>"
            for item in cluster_texts
        ])

        # Format existing codes if provided
        existing_codes_section = ""
        if existing_codes:
            codes_list = ", ".join(f'"{code}"' for code in existing_codes)
            existing_codes_section = f"\n<existing_codes>{codes_list}</existing_codes>"

        prompt = f"""<task>
Analyze the following cluster of survey responses and create a codeframe.

<category>
  <name>{category_name}</name>
  <description>{category_description}</description>
  <target_language>{target_language}</target_language>
</category>
{existing_codes_section}

<cluster_responses>
{texts_formatted}
</cluster_responses>
</task>

Provide your analysis in the specified XML format. Remember to:
1. Identify the main theme unifying these responses
2. Create MECE codes (mutually exclusive, collectively exhaustive)
3. Use chain-of-thought reasoning in <thinking> tags
4. Provide clear descriptions and examples
5. Return ONLY the XML structure, no additional text"""

        return prompt

    def _parse_xml_response(self, xml_text: str) -> Dict[str, Any]:
        """
        Parse XML response from Claude into structured data.

        Args:
            xml_text: XML response text from Claude.

        Returns:
            Dict with parsed theme, codes, hierarchy, and assessment.
        """
        try:
            # Extract XML if wrapped in markdown code blocks
            if "```xml" in xml_text:
                xml_text = xml_text.split("```xml")[1].split("```")[0].strip()
            elif "```" in xml_text:
                xml_text = xml_text.split("```")[1].split("```")[0].strip()

            root = ET.fromstring(xml_text)

            # Parse theme
            theme_elem = root.find("theme")
            theme = CodeframeTheme(
                name=theme_elem.find("name").text,
                description=theme_elem.find("description").text,
                dominant_language=theme_elem.find("dominant_language").text,
                confidence=theme_elem.find("confidence").text
            )

            # Parse hierarchy depth
            hierarchy_depth = root.find("hierarchy_depth").text

            # Parse codes
            codes = self._parse_codes(root.find("codes"))

            # Parse MECE assessment
            mece_elem = root.find("mece_assessment")
            mece_assessment = {
                "exclusivity": mece_elem.find("exclusivity").text,
                "exhaustiveness": mece_elem.find("exhaustiveness").text,
                "notes": mece_elem.find("notes").text if mece_elem.find("notes") is not None else ""
            }

            # Extract thinking
            thinking_elem = root.find("thinking")
            thinking = thinking_elem.text if thinking_elem is not None else ""

            return {
                "theme": theme,
                "codes": codes,
                "hierarchy_depth": hierarchy_depth,
                "mece_assessment": mece_assessment,
                "thinking": thinking
            }

        except Exception as e:
            logger.error(f"Error parsing XML response: {str(e)}")
            logger.debug(f"XML text: {xml_text[:500]}...")
            raise

    def _parse_codes(self, codes_elem: ET.Element) -> List[CodeItem]:
        """Recursively parse code elements from XML."""
        codes = []

        for code_elem in codes_elem.findall("code"):
            name = code_elem.find("name").text
            description = code_elem.find("description").text
            confidence = code_elem.find("confidence").text

            # Parse example texts
            example_texts = []
            examples_elem = code_elem.find("example_texts")
            if examples_elem is not None:
                for text_elem in examples_elem.findall("text"):
                    example_texts.append({
                        "id": text_elem.get("id"),
                        "text": text_elem.text
                    })

            # Parse frequency estimate if present
            freq_elem = code_elem.find("frequency_estimate")
            frequency_estimate = freq_elem.text if freq_elem is not None else None

            # Recursively parse sub-codes
            sub_codes = []
            sub_codes_elem = code_elem.find("sub_codes")
            if sub_codes_elem is not None:
                sub_codes = self._parse_codes(sub_codes_elem)

            codes.append(CodeItem(
                name=name,
                description=description,
                confidence=confidence,
                example_texts=example_texts,
                sub_codes=sub_codes,
                frequency_estimate=frequency_estimate
            ))

        return codes

    def _calculate_usage(self, usage: Any) -> ClaudeUsage:
        """
        Calculate token usage and cost.

        Pricing for Claude Sonnet 4.5 (as of Oct 2024):
        - Input: $3 per million tokens
        - Output: $15 per million tokens
        """
        input_tokens = usage.input_tokens
        output_tokens = usage.output_tokens

        # Calculate cost
        input_cost = (input_tokens / 1_000_000) * 3.0
        output_cost = (output_tokens / 1_000_000) * 15.0
        total_cost = input_cost + output_cost

        return ClaudeUsage(
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_usd=round(total_cost, 6)
        )

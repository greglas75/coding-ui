"""
Dependency injection and service initialization.
"""
import logging
from typing import Optional
from concurrent.futures import ThreadPoolExecutor

from supabase import create_client, Client

from services.claude_client import ClaudeClient, ClaudeConfig
from services.mece_validator import MECEValidator
from services.google_search_client import GoogleSearchClient
from services.brand_context_fetcher import BrandContextFetcher
from services.embedder import EmbeddingService
from core.config import settings

logger = logging.getLogger(__name__)


# Global service instances
claude_client: Optional[ClaudeClient] = None
mece_validator: Optional[MECEValidator] = None
google_search_client: Optional[GoogleSearchClient] = None
brand_context_fetcher: Optional[BrandContextFetcher] = None
supabase: Optional[Client] = None

# Thread pool executor for CPU-bound operations
# max_workers=2 to prevent overwhelming the system during concurrent codeframe builds
cpu_executor: Optional[ThreadPoolExecutor] = None


async def initialize_services():
    """Initialize all application services."""
    global claude_client, mece_validator, google_search_client, brand_context_fetcher, supabase, cpu_executor

    logger.info("Initializing services...")

    # Initialize Supabase client
    if settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
        logger.info("Supabase client initialized")
    else:
        logger.warning("Supabase credentials not found, clustering will not work")

    # Initialize Claude client
    try:
        claude_config = ClaudeConfig(
            model=settings.CLAUDE_MODEL,
            temperature=settings.CLAUDE_TEMPERATURE,
            max_tokens=settings.CLAUDE_MAX_TOKENS
        )
        claude_client = ClaudeClient(config=claude_config)
        logger.info("Claude client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize Claude client: {e}")
        raise

    # Initialize MECE validator
    mece_validator = MECEValidator()
    logger.info("MECE validator initialized")

    # Initialize Google Search Client
    google_search_client = GoogleSearchClient()
    if google_search_client.is_configured():
        logger.info("Google Search client initialized and configured")
    else:
        logger.warning("Google Search client initialized but not configured (missing API keys)")

    # Initialize Brand Context Fetcher
    brand_context_fetcher = BrandContextFetcher(
        google_search_client=google_search_client
    )
    logger.info("Brand context fetcher initialized")

    # Initialize thread pool executor
    cpu_executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="codeframe-worker")
    logger.info("CPU executor initialized")

    # Pre-load sentence-transformer model
    logger.info("Pre-loading sentence-transformer model...")
    EmbeddingService.get_model()
    logger.info("Model loaded successfully")

    logger.info("All services initialized. Ready to serve requests.")


async def shutdown_services():
    """Shutdown all application services."""
    global cpu_executor

    logger.info("Shutting down services...")

    # Shutdown thread pool executor gracefully
    if cpu_executor:
        logger.info("Shutting down CPU executor...")
        cpu_executor.shutdown(wait=True, cancel_futures=False)
        logger.info("CPU executor shut down successfully")


# Dependency injection functions
def get_claude_client() -> ClaudeClient:
    """Get Claude client instance."""
    if claude_client is None:
        raise RuntimeError("Claude client not initialized")
    return claude_client


def get_mece_validator() -> MECEValidator:
    """Get MECE validator instance."""
    if mece_validator is None:
        raise RuntimeError("MECE validator not initialized")
    return mece_validator


def get_google_search_client() -> GoogleSearchClient:
    """Get Google Search client instance."""
    if google_search_client is None:
        raise RuntimeError("Google Search client not initialized")
    return google_search_client


def get_brand_context_fetcher() -> BrandContextFetcher:
    """Get Brand Context Fetcher instance."""
    if brand_context_fetcher is None:
        raise RuntimeError("Brand Context Fetcher not initialized")
    return brand_context_fetcher


def get_supabase() -> Client:
    """Get Supabase client instance."""
    if supabase is None:
        raise RuntimeError("Supabase client not initialized")
    return supabase


def get_cpu_executor() -> ThreadPoolExecutor:
    """Get CPU executor instance."""
    if cpu_executor is None:
        raise RuntimeError("CPU executor not initialized")
    return cpu_executor

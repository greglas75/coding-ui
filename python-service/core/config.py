"""
Application configuration and settings.
"""
import os
import logging
from typing import List
from dotenv import load_dotenv

# Load environment variables from parent directory
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '..', '.env'))


class Settings:
    """Application settings loaded from environment variables."""

    # Application
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    PORT: int = int(os.getenv("PORT", 8000))
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    # API Keys
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    GOOGLE_CSE_CX_ID: str = os.getenv("GOOGLE_CSE_CX_ID", "")
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")

    # Database
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Claude Configuration
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-5-haiku-20241022")
    CLAUDE_TEMPERATURE: float = 0.3
    CLAUDE_MAX_TOKENS: int = 4096

    # CORS Origins
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3020",  # Node backend
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.ENVIRONMENT.lower() == "production"


# Global settings instance
settings = Settings()


def configure_logging():
    """Configure application logging."""
    logging.basicConfig(
        level=settings.LOG_LEVEL,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)

    if settings.is_production:
        logger.info("🚀 Running in PRODUCTION mode")
    else:
        logger.info("🔧 Running in DEVELOPMENT mode")

    return logger

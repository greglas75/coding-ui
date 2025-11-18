"""
FastAPI microservice for AI codeframe generation.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from core.config import settings, configure_logging
from core.dependencies import initialize_services, shutdown_services

# Import routers
from routers import (
    embeddings,
    clustering,
    codeframe,
    brand_extraction,
    validation,
    cache,
    testing
)

# Configure logging
logger = configure_logging()


# Lifecycle management
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle handler for FastAPI app."""
    # Initialize services
    await initialize_services()

    yield

    # Shutdown services
    await shutdown_services()


# Create FastAPI app
app = FastAPI(
    title="Codeframe Generation API",
    description="AI-powered codeframe generation using Claude Sonnet 4.5",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(embeddings.router, tags=["Embeddings"])
app.include_router(clustering.router, tags=["Clustering"])
app.include_router(codeframe.router, tags=["Codeframe"])
app.include_router(brand_extraction.router, tags=["Brand Extraction"])
app.include_router(validation.router, tags=["Validation"])
app.include_router(cache.router, tags=["Cache"])
app.include_router(testing.router, tags=["Testing"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "codeframe-generation-and-brand-extraction",
        "version": "1.1.0"
    }


# Main application runner
if __name__ == "__main__":
    # Only enable reload in development, not production
    # reload=True causes CPU/memory overhead and can create duplicate processes
    port = settings.PORT

    if settings.is_production:
        logger.info("🚀 Starting in PRODUCTION mode (reload disabled)")
    else:
        logger.info("🔧 Starting in DEVELOPMENT mode (reload enabled)")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=not settings.is_production,
        reload_dirs=["./"] if not settings.is_production else None,
        log_level=settings.LOG_LEVEL.lower()
    )

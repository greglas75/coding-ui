"""
Cache management endpoints.
"""
import logging
from fastapi import APIRouter

from services.brand_cache import get_cache

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/api/brand-cache/stats")
async def get_brand_cache_stats():
    """Get brand validation cache statistics."""
    cache = get_cache()
    stats = cache.get_stats()
    return {
        "cache_stats": stats,
        "status": "ok"
    }


@router.post("/api/brand-cache/clear")
async def clear_brand_cache():
    """Clear all brand validation cache entries."""
    cache = get_cache()
    cache.clear()
    return {
        "message": "Brand cache cleared successfully",
        "status": "ok"
    }

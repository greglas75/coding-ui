"""
Brand validation caching service.
Caches brand validation results to reduce API calls and improve performance.
"""
import json
import logging
import hashlib
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class BrandCache:
    """In-memory cache for brand validation results."""

    def __init__(self, ttl_hours: int = 12):
        """
        Initialize brand cache.

        Args:
            ttl_hours: Time-to-live for cache entries in hours (default: 12)
        """
        self.cache: Dict[str, Dict[str, Any]] = {}
        self.ttl = timedelta(hours=ttl_hours)
        logger.info(f"Brand cache initialized with TTL: {ttl_hours} hours")

    def _generate_key(self, brand_name: str, context: Optional[str] = None) -> str:
        """
        Generate cache key from brand name and context.

        Args:
            brand_name: Brand name
            context: Optional context

        Returns:
            str: Cache key (hash)
        """
        key_data = f"{brand_name.lower()}|{context or ''}".encode('utf-8')
        return hashlib.md5(key_data).hexdigest()

    def get(self, brand_name: str, context: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Get cached validation result.

        Args:
            brand_name: Brand name
            context: Optional context

        Returns:
            Optional[Dict]: Cached result or None if not found/expired
        """
        key = self._generate_key(brand_name, context)

        if key not in self.cache:
            logger.debug(f"Cache miss for brand: {brand_name}")
            return None

        entry = self.cache[key]
        cached_time = entry["cached_at"]

        # Check if entry has expired
        if datetime.now() - cached_time > self.ttl:
            logger.debug(f"Cache expired for brand: {brand_name}")
            del self.cache[key]
            return None

        logger.debug(f"Cache hit for brand: {brand_name}")
        return entry["data"]

    def set(
        self,
        brand_name: str,
        validation_result: Dict[str, Any],
        context: Optional[str] = None
    ) -> None:
        """
        Cache validation result.

        Args:
            brand_name: Brand name
            validation_result: Validation result to cache
            context: Optional context
        """
        key = self._generate_key(brand_name, context)

        self.cache[key] = {
            "data": validation_result,
            "cached_at": datetime.now(),
            "brand_name": brand_name,
            "context": context
        }

        logger.debug(f"Cached validation result for brand: {brand_name}")

    def clear(self) -> None:
        """Clear all cache entries."""
        count = len(self.cache)
        self.cache.clear()
        logger.info(f"Cache cleared: {count} entries removed")

    def cleanup_expired(self) -> int:
        """
        Remove expired cache entries.

        Returns:
            int: Number of entries removed
        """
        now = datetime.now()
        expired_keys = [
            key for key, entry in self.cache.items()
            if now - entry["cached_at"] > self.ttl
        ]

        for key in expired_keys:
            del self.cache[key]

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

        return len(expired_keys)

    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.

        Returns:
            Dict with cache stats
        """
        now = datetime.now()
        valid_entries = sum(
            1 for entry in self.cache.values()
            if now - entry["cached_at"] <= self.ttl
        )

        return {
            "total_entries": len(self.cache),
            "valid_entries": valid_entries,
            "expired_entries": len(self.cache) - valid_entries,
            "ttl_hours": self.ttl.total_seconds() / 3600
        }


# Global cache instance
_global_cache: Optional[BrandCache] = None


def get_cache(ttl_hours: int = 12) -> BrandCache:
    """
    Get global cache instance (singleton).

    Args:
        ttl_hours: TTL in hours (only used on first call)

    Returns:
        BrandCache: Global cache instance
    """
    global _global_cache
    if _global_cache is None:
        _global_cache = BrandCache(ttl_hours=ttl_hours)
    return _global_cache

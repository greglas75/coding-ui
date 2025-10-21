"""
Embedding generation service using sentence-transformers with Redis caching.
"""
import hashlib
import logging
import os
import pickle
from typing import List, Optional
import numpy as np
import redis
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Service for generating text embeddings using sentence-transformers with Redis caching."""

    # Class-level model cache (load once globally)
    _model: Optional[SentenceTransformer] = None
    _model_name: str = "all-MiniLM-L6-v2"

    # Redis client for embedding cache
    _redis_client: Optional[redis.Redis] = None
    _cache_enabled: bool = True
    _cache_ttl: int = 86400 * 7  # 7 days TTL (embeddings rarely change)

    @classmethod
    def get_redis_client(cls) -> Optional[redis.Redis]:
        """
        Get or initialize Redis client for embedding cache.

        Returns:
            Optional[redis.Redis]: Redis client or None if connection fails.
        """
        if cls._redis_client is None and cls._cache_enabled:
            try:
                redis_host = os.getenv('REDIS_HOST', 'localhost')
                redis_port = int(os.getenv('REDIS_PORT', '6379'))
                redis_password = os.getenv('REDIS_PASSWORD')

                cls._redis_client = redis.Redis(
                    host=redis_host,
                    port=redis_port,
                    password=redis_password if redis_password else None,
                    decode_responses=False,  # We're storing binary (pickled) data
                    socket_timeout=2,
                    socket_connect_timeout=2,
                )

                # Test connection
                cls._redis_client.ping()
                logger.info(f"✅ Redis cache connected: {redis_host}:{redis_port}")

            except Exception as e:
                logger.warning(f"⚠️  Redis cache unavailable, embeddings won't be cached: {str(e)}")
                cls._redis_client = None
                cls._cache_enabled = False

        return cls._redis_client

    @classmethod
    def _get_cache_key(cls, text: str) -> str:
        """
        Generate cache key for a text.

        Args:
            text: Text to generate key for.

        Returns:
            str: Cache key.
        """
        # Use SHA256 hash of text as cache key
        text_hash = hashlib.sha256(text.encode('utf-8')).hexdigest()
        return f"embedding:{cls._model_name}:{text_hash}"

    @classmethod
    def _get_cached_embedding(cls, text: str) -> Optional[np.ndarray]:
        """
        Get embedding from cache if available.

        Args:
            text: Text to get embedding for.

        Returns:
            Optional[np.ndarray]: Cached embedding or None if not found.
        """
        if not cls._cache_enabled:
            return None

        try:
            redis_client = cls.get_redis_client()
            if redis_client is None:
                return None

            key = cls._get_cache_key(text)
            cached_bytes = redis_client.get(key)

            if cached_bytes:
                embedding = pickle.loads(cached_bytes)
                return embedding

        except Exception as e:
            logger.debug(f"Cache read error for text: {str(e)}")

        return None

    @classmethod
    def _cache_embedding(cls, text: str, embedding: np.ndarray) -> None:
        """
        Store embedding in cache.

        Args:
            text: Text that was embedded.
            embedding: Generated embedding.
        """
        if not cls._cache_enabled:
            return

        try:
            redis_client = cls.get_redis_client()
            if redis_client is None:
                return

            key = cls._get_cache_key(text)
            embedding_bytes = pickle.dumps(embedding)

            # Store with TTL
            redis_client.setex(key, cls._cache_ttl, embedding_bytes)

        except Exception as e:
            logger.debug(f"Cache write error: {str(e)}")

    @classmethod
    def get_model(cls) -> SentenceTransformer:
        """
        Get or initialize the sentence-transformer model.

        Uses class-level caching to avoid reloading the model.

        Returns:
            SentenceTransformer: The loaded model instance.
        """
        if cls._model is None:
            logger.info(f"Loading sentence-transformer model: {cls._model_name}")
            cls._model = SentenceTransformer(cls._model_name)
            logger.info("Model loaded successfully")
        return cls._model

    @classmethod
    def generate_embeddings(
        cls,
        texts: List[str],
        batch_size: int = 32,
        normalize: bool = True
    ) -> np.ndarray:
        """
        Generate embeddings for a list of texts with Redis caching.

        Args:
            texts: List of text strings to embed.
            batch_size: Batch size for processing (default: 32).
            normalize: Whether to normalize embeddings to unit length (default: True).

        Returns:
            np.ndarray: Array of embeddings with shape (len(texts), embedding_dim).

        Raises:
            ValueError: If texts list is empty.
        """
        if not texts:
            raise ValueError("Cannot generate embeddings for empty text list")

        logger.info(f"Generating embeddings for {len(texts)} texts")

        try:
            # Try to get cached embeddings
            embeddings_list = []
            texts_to_generate = []
            indices_to_generate = []

            for i, text in enumerate(texts):
                cached_embedding = cls._get_cached_embedding(text)
                if cached_embedding is not None:
                    embeddings_list.append((i, cached_embedding))
                else:
                    texts_to_generate.append(text)
                    indices_to_generate.append(i)

            cache_hits = len(embeddings_list)
            cache_misses = len(texts_to_generate)

            if cache_hits > 0:
                logger.info(f"📦 Cache hits: {cache_hits}/{len(texts)} ({cache_hits/len(texts)*100:.1f}%)")

            # Generate embeddings for texts not in cache
            if texts_to_generate:
                model = cls.get_model()
                new_embeddings = model.encode(
                    texts_to_generate,
                    batch_size=batch_size,
                    show_progress_bar=False,
                    normalize_embeddings=normalize
                )

                # Cache new embeddings
                for text, embedding in zip(texts_to_generate, new_embeddings):
                    cls._cache_embedding(text, embedding)

                # Add new embeddings to list
                for i, embedding in zip(indices_to_generate, new_embeddings):
                    embeddings_list.append((i, embedding))

            # Sort by original index and extract embeddings
            embeddings_list.sort(key=lambda x: x[0])
            embeddings = np.array([emb for _, emb in embeddings_list])

            logger.info(f"Generated embeddings with shape: {embeddings.shape} (cache: {cache_hits} hits, {cache_misses} misses)")
            return embeddings

        except Exception as e:
            logger.error(f"Error generating embeddings: {str(e)}")
            raise

    @classmethod
    def generate_single_embedding(cls, text: str, normalize: bool = True) -> np.ndarray:
        """
        Generate embedding for a single text.

        Args:
            text: Text string to embed.
            normalize: Whether to normalize embedding to unit length (default: True).

        Returns:
            np.ndarray: Embedding vector.
        """
        return cls.generate_embeddings([text], normalize=normalize)[0]

    @classmethod
    def cosine_similarity(cls, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """
        Calculate cosine similarity between two embeddings.

        Args:
            embedding1: First embedding vector.
            embedding2: Second embedding vector.

        Returns:
            float: Cosine similarity score between -1 and 1.
        """
        # If embeddings are already normalized, dot product = cosine similarity
        similarity = np.dot(embedding1, embedding2)
        return float(similarity)

    @classmethod
    def pairwise_cosine_similarity(cls, embeddings: np.ndarray) -> np.ndarray:
        """
        Calculate pairwise cosine similarity matrix for a set of embeddings.

        Args:
            embeddings: Array of embeddings with shape (n, embedding_dim).

        Returns:
            np.ndarray: Similarity matrix with shape (n, n).
        """
        # If embeddings are normalized, matrix multiplication gives cosine similarity
        similarity_matrix = np.dot(embeddings, embeddings.T)
        return similarity_matrix

    @classmethod
    def get_cache_stats(cls) -> dict:
        """
        Get cache statistics.

        Returns:
            dict: Cache statistics including total keys, memory usage, etc.
        """
        if not cls._cache_enabled:
            return {
                "enabled": False,
                "message": "Cache is disabled"
            }

        try:
            redis_client = cls.get_redis_client()
            if redis_client is None:
                return {
                    "enabled": False,
                    "message": "Redis not connected"
                }

            # Count embedding keys
            pattern = f"embedding:{cls._model_name}:*"
            keys = redis_client.keys(pattern)
            total_keys = len(keys)

            # Get memory usage (if available)
            try:
                memory_info = redis_client.info('memory')
                memory_used = memory_info.get('used_memory_human', 'N/A')
            except:
                memory_used = 'N/A'

            return {
                "enabled": True,
                "total_cached_embeddings": total_keys,
                "redis_memory_used": memory_used,
                "cache_ttl_days": cls._cache_ttl // 86400,
                "model_name": cls._model_name
            }

        except Exception as e:
            return {
                "enabled": False,
                "error": str(e)
            }

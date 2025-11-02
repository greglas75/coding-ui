"""
OpenAI embedding service using text-embedding-3-large model with Pinecone integration.
"""
import hashlib
import logging
import os
import threading
from typing import List, Optional, Dict, Any
import openai

try:
    from pinecone import Pinecone, ServerlessSpec
except ImportError:
    # Support older versions of pinecone
    try:
        from pinecone.grpc import PineconeGRPC as Pinecone
        from pinecone import ServerlessSpec
    except ImportError:
        Pinecone = None
        ServerlessSpec = None
        logging.warning("Pinecone not installed - vector storage will be disabled")

logger = logging.getLogger(__name__)

# ✅ FIX: Global lock dictionary to prevent race conditions in Pinecone upserts
# Multiple concurrent requests modifying same index can cause duplicates/corruption
_pinecone_locks = {}
_pinecone_locks_lock = threading.Lock()  # Lock for the locks dict itself


class OpenAIEmbedder:
    """Service for generating embeddings using OpenAI text-embedding-3-large and storing in Pinecone."""

    def __init__(self, api_key: Optional[str] = None, pinecone_api_key: Optional[str] = None):
        """
        Initialize OpenAI embedder with Pinecone.

        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            pinecone_api_key: Pinecone API key (defaults to PINECONE_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.pinecone_api_key = pinecone_api_key or os.getenv('PINECONE_API_KEY')
        self.model = "text-embedding-3-large"
        self.dimension = 3072  # text-embedding-3-large produces 3072-dim vectors

        if not self.api_key:
            logger.warning("No OpenAI API key provided - embeddings will not work")

        # Initialize OpenAI client
        if self.api_key:
            openai.api_key = self.api_key

        # Initialize Pinecone
        self.pc = None
        self.index = None
        if self.pinecone_api_key:
            logger.info(f"🔑 Pinecone API key provided: {self.pinecone_api_key[:10]}...")
            try:
                self.pc = Pinecone(api_key=self.pinecone_api_key)
                logger.info("✅ Pinecone client initialized")
                # Immediately ensure index exists and connect to it
                self.ensure_index("tgm-brand-embeddings")
            except Exception as e:
                logger.error(f"❌ Failed to initialize Pinecone: {e}")
                import traceback
                logger.error(traceback.format_exc())
        else:
            logger.warning("⚠️ No Pinecone API key - brand extraction will not work!")

    def ensure_index(self, index_name: str = "tgm-brand-embeddings") -> bool:
        """
        Ensure Pinecone index exists with correct dimensions, create if it doesn't.
        If index exists with wrong dimensions, delete and recreate it.

        Args:
            index_name: Name of the Pinecone index

        Returns:
            bool: True if index is ready, False otherwise
        """
        if not self.pc:
            logger.warning("Pinecone not initialized")
            return False

        try:
            # Check if index exists
            existing_indexes = self.pc.list_indexes().names()

            if index_name in existing_indexes:
                # Check if existing index has correct dimensions
                index_info = self.pc.describe_index(index_name)
                existing_dimension = index_info.dimension

                if existing_dimension != self.dimension:
                    logger.warning(
                        f"⚠️ Index {index_name} has dimension {existing_dimension}, "
                        f"but we need {self.dimension}. Deleting and recreating..."
                    )
                    self.pc.delete_index(index_name)
                    logger.info(f"🗑️ Deleted index with incorrect dimensions")
                    # Wait for deletion to complete
                    import time
                    time.sleep(5)
                else:
                    logger.info(f"✅ Index {index_name} exists with correct dimensions ({self.dimension})")
                    # Connect to index
                    self.index = self.pc.Index(index_name)
                    logger.info(f"Connected to index: {index_name}")
                    return True

            # Create index if it doesn't exist or was deleted
            logger.info(f"Creating Pinecone index: {index_name} with dimension={self.dimension}")
            self.pc.create_index(
                name=index_name,
                dimension=self.dimension,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1'
                )
            )
            logger.info(f"✅ Index {index_name} created successfully with dimension={self.dimension}")

            # Wait for index to be ready
            import time
            time.sleep(5)

            # Connect to index
            self.index = self.pc.Index(index_name)
            logger.info(f"Connected to index: {index_name}")
            return True

        except Exception as e:
            logger.error(f"Failed to ensure index: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False

    def generate_embedding(self, text: str) -> Optional[List[float]]:
        """
        Generate embedding for a single text using OpenAI text-embedding-3-large.

        Args:
            text: Text to embed

        Returns:
            Optional[List[float]]: Embedding vector or None if failed
        """
        if not self.api_key:
            logger.warning("No OpenAI API key - cannot generate embedding")
            return None

        try:
            response = openai.embeddings.create(
                model=self.model,
                input=text,
                encoding_format="float"
            )
            embedding = response.data[0].embedding
            logger.debug(f"Generated embedding for text: {text[:50]}...")
            return embedding

        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    def generate_embeddings_batch(self, texts: List[str]) -> List[Optional[List[float]]]:
        """
        Generate embeddings for multiple texts in a batch.

        Args:
            texts: List of texts to embed

        Returns:
            List[Optional[List[float]]]: List of embedding vectors
        """
        if not self.api_key:
            logger.warning("No OpenAI API key - cannot generate embeddings")
            return [None] * len(texts)

        try:
            # OpenAI API supports batch embedding (up to 2048 texts)
            response = openai.embeddings.create(
                model=self.model,
                input=texts,
                encoding_format="float"
            )

            embeddings = [data.embedding for data in response.data]
            logger.info(f"Generated {len(embeddings)} embeddings in batch")
            return embeddings

        except Exception as e:
            logger.error(f"Failed to generate batch embeddings: {e}")
            return [None] * len(texts)

    def upsert_to_pinecone(
        self,
        vectors: List[Dict[str, Any]],
        index_name: str = "tgm-brand-embeddings",
        namespace: str = "brand-tracking"
    ) -> bool:
        """
        Upsert vectors to Pinecone index.

        Args:
            vectors: List of vector dicts with keys: id, values, metadata
            index_name: Name of the Pinecone index
            namespace: Namespace within the index

        Returns:
            bool: True if successful, False otherwise
        """
        if not self.ensure_index(index_name):
            return False

        # ✅ FIX: Get or create lock for this specific index to prevent race conditions
        # Multiple concurrent requests can try to upsert same brand causing duplicates
        lock_key = f"{index_name}:{namespace}"
        with _pinecone_locks_lock:
            if lock_key not in _pinecone_locks:
                _pinecone_locks[lock_key] = threading.Lock()
            index_lock = _pinecone_locks[lock_key]

        # Acquire lock before upsert to ensure only one thread modifies index at a time
        with index_lock:
            try:
                self.index.upsert(
                    vectors=vectors,
                    namespace=namespace
                )
                logger.info(f"Upserted {len(vectors)} vectors to Pinecone namespace: {namespace}")
                return True

            except Exception as e:
                logger.error(f"Failed to upsert to Pinecone: {e}")
                return False

    def store_brand_embedding(
        self,
        brand_id: str,
        brand_name: str,
        embedding: List[float],
        metadata: Optional[Dict[str, Any]] = None,
        index_name: str = "tgm-brand-embeddings"
    ) -> bool:
        """
        Store a single brand embedding in Pinecone.

        Args:
            brand_id: Unique brand identifier
            brand_name: Brand name
            embedding: Embedding vector
            metadata: Optional metadata (category_id, confidence, etc.)
            index_name: Pinecone index name

        Returns:
            bool: True if successful
        """
        if not embedding:
            logger.warning(f"No embedding provided for brand: {brand_name}")
            return False

        vector_metadata = metadata or {}
        vector_metadata['brand_name'] = brand_name

        vector = {
            'id': brand_id,
            'values': embedding,
            'metadata': vector_metadata
        }

        return self.upsert_to_pinecone([vector], index_name=index_name)

    def query_similar_brands(
        self,
        query_embedding: List[float],
        top_k: int = 10,
        index_name: str = "tgm-brand-embeddings",
        namespace: str = "brand-tracking",
        filter_metadata: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Query Pinecone for similar brands.

        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            index_name: Pinecone index name
            namespace: Namespace to query
            filter_metadata: Optional metadata filter

        Returns:
            List[Dict[str, Any]]: List of similar brands with scores
        """
        if not self.ensure_index(index_name):
            return []

        try:
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                namespace=namespace,
                include_metadata=True,
                filter=filter_metadata
            )

            matches = []
            for match in results.matches:
                matches.append({
                    'id': match.id,
                    'score': match.score,
                    'metadata': match.metadata
                })

            logger.info(f"Found {len(matches)} similar brands")
            return matches

        except Exception as e:
            logger.error(f"Failed to query Pinecone: {e}")
            return []

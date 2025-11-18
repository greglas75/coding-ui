"""
Testing and diagnostic endpoints.
"""
import logging
from fastapi import APIRouter

from models.validation import (
    PineconeTestRequest,
    PineconeTestResponse
)
from services.openai_embedder import OpenAIEmbedder

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/test-pinecone", response_model=PineconeTestResponse)
async def test_pinecone_connection(request: PineconeTestRequest):
    """
    Test Pinecone connection with provided API key.

    This endpoint:
    1. Validates the Pinecone API key
    2. Checks if the index exists
    3. Verifies index dimensions (should be 3072 for text-embedding-3-large)
    4. Tests basic connectivity
    """
    try:
        logger.info(f"🔍 Testing Pinecone connection for index: {request.index_name}")

        # Initialize OpenAI embedder with Pinecone
        embedder = OpenAIEmbedder(
            api_key=None,  # OpenAI key not needed for just testing Pinecone connection
            pinecone_api_key=request.pinecone_api_key
        )

        if not embedder.pc:
            return PineconeTestResponse(
                success=False,
                message="Failed to initialize Pinecone client. Check your API key.",
                details={"error": "Pinecone client initialization failed"}
            )

        # List available indexes
        try:
            existing_indexes = embedder.pc.list_indexes().names()
            logger.info(f"📋 Available indexes: {existing_indexes}")
        except Exception as e:
            logger.error(f"❌ Failed to list indexes: {e}")
            return PineconeTestResponse(
                success=False,
                message=f"Failed to list indexes: {str(e)}",
                details={"error": str(e), "error_type": type(e).__name__}
            )

        # Check if requested index exists
        if request.index_name not in existing_indexes:
            return PineconeTestResponse(
                success=True,  # Connection works, but index doesn't exist yet (will be created on first use)
                message=f"Connection successful! Index '{request.index_name}' does not exist yet - it will be created automatically on first brand extraction.",
                details={
                    "available_indexes": existing_indexes,
                    "index_exists": False
                }
            )

        # Get index info
        try:
            index_info = embedder.pc.describe_index(request.index_name)
            dimension = index_info.dimension
            metric = index_info.metric

            logger.info(f"✅ Index info: dimension={dimension}, metric={metric}")

            # Check if dimensions are correct
            expected_dimension = 3072
            dimension_ok = dimension == expected_dimension

            if not dimension_ok:
                return PineconeTestResponse(
                    success=True,
                    message=f"Connection successful, but index has incorrect dimensions ({dimension} vs {expected_dimension}). The index will be recreated automatically with correct dimensions.",
                    details={
                        "index_exists": True,
                        "current_dimension": dimension,
                        "expected_dimension": expected_dimension,
                        "metric": metric,
                        "will_recreate": True
                    }
                )

            # Try to connect to the index
            try:
                index = embedder.pc.Index(request.index_name)
                stats = index.describe_index_stats()

                # Extract primitive values from stats to avoid serialization issues
                total_vectors = 0
                namespaces_count = 0

                try:
                    if hasattr(stats, 'total_vector_count') and stats.total_vector_count is not None:
                        total_vectors = int(stats.total_vector_count)
                except:
                    pass

                try:
                    if hasattr(stats, 'namespaces') and stats.namespaces:
                        namespaces_count = len(stats.namespaces)
                except:
                    pass

                return PineconeTestResponse(
                    success=True,
                    message=f"Connection successful! Index '{request.index_name}' is ready.",
                    details={
                        "index_exists": True,
                        "dimension": int(dimension),
                        "metric": str(metric),
                        "total_vector_count": total_vectors,
                        "namespaces_count": namespaces_count
                    }
                )
            except Exception as e:
                logger.error(f"❌ Failed to connect to index: {e}")
                return PineconeTestResponse(
                    success=False,
                    message=f"Failed to connect to index: {str(e)}",
                    details={"error": str(e), "error_type": type(e).__name__}
                )

        except Exception as e:
            logger.error(f"❌ Failed to describe index: {e}")
            return PineconeTestResponse(
                success=False,
                message=f"Failed to get index information: {str(e)}",
                details={"error": str(e), "error_type": type(e).__name__}
            )

    except Exception as e:
        logger.error(f"❌ Pinecone test failed: {e}")
        return PineconeTestResponse(
            success=False,
            message=f"Connection test failed: {str(e)}",
            details={"error": str(e), "error_type": type(e).__name__}
        )

"""
Clustering endpoints.
"""
import json
import logging
import numpy as np
from typing import Dict

from fastapi import APIRouter, HTTPException, status

from models.clustering import (
    ClusterRequest,
    ClusterResponse,
    ClusterData,
    ClusterTexts
)
from services.clusterer import ClusteringService, ClusterConfig
from core.dependencies import get_supabase

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/cluster", response_model=ClusterResponse)
async def cluster_answers(request: ClusterRequest):
    """
    Cluster answers based on their embeddings.

    This endpoint:
    1. Fetches embeddings for the given answer IDs from database
    2. Fetches answer texts for the given IDs
    3. Performs HDBSCAN clustering
    4. Returns cluster assignments and statistics
    """
    try:
        logger.info(f"Clustering {len(request.answer_ids)} answers")

        if not request.answer_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="answer_ids cannot be empty"
            )

        if len(request.answer_ids) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Need at least 3 answers to cluster"
            )

        # Get Supabase client
        supabase = get_supabase()

        # Fetch embeddings from database
        logger.info("Fetching embeddings from database...")
        response = supabase.table('answer_embeddings').select('answer_id, embedding_vector').in_('answer_id', request.answer_ids).execute()

        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No embeddings found for the given answer IDs. Please generate embeddings first."
            )

        # Create embedding matrix (ensure correct order)
        # Parse embedding_vector from BYTEA (hex-encoded JSON string) to list
        embedding_map = {}
        for row in response.data:
            # embedding_vector is stored as BYTEA which Supabase returns as hex string (e.g. \x7b...)
            embedding_data = row['embedding_vector']
            try:
                if isinstance(embedding_data, str):
                    # Decode hex string to bytes, then to UTF-8 string, then parse JSON
                    # Remove \x prefix if present and decode from hex
                    if embedding_data.startswith('\\x'):
                        hex_str = embedding_data[2:]  # Remove \x
                        json_bytes = bytes.fromhex(hex_str)
                        embedding_map[row['answer_id']] = json.loads(json_bytes.decode('utf-8'))
                    else:
                        # Try direct JSON parsing
                        embedding_map[row['answer_id']] = json.loads(embedding_data)
                elif isinstance(embedding_data, bytes):
                    embedding_map[row['answer_id']] = json.loads(embedding_data.decode('utf-8'))
                else:
                    embedding_map[row['answer_id']] = embedding_data
            except Exception as e:
                logger.error(f"Failed to parse embedding for answer {row['answer_id']}: {e}")
                raise
        embeddings_list = []
        valid_answer_ids = []

        for answer_id in request.answer_ids:
            if answer_id in embedding_map:
                embeddings_list.append(embedding_map[answer_id])
                valid_answer_ids.append(answer_id)

        if len(embeddings_list) < 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Only found {len(embeddings_list)} embeddings, need at least 3 to cluster"
            )

        embeddings_array = np.array(embeddings_list)
        logger.info(f"Loaded {embeddings_array.shape[0]} embeddings with dimension {embeddings_array.shape[1]}")

        # Fetch answer texts
        logger.info("Fetching answer texts...")
        answers_response = supabase.table('answers').select('id, answer_text').in_('id', valid_answer_ids).execute()

        if not answers_response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to fetch answer texts"
            )

        # Create answer map
        answer_map = {row['id']: row['answer_text'] for row in answers_response.data}

        # Cluster embeddings
        logger.info("Performing clustering...")
        cluster_config = ClusterConfig(
            min_cluster_size=request.config.min_cluster_size,
            min_samples=request.config.min_samples
        )

        cluster_result = ClusteringService.cluster_embeddings(embeddings_array, cluster_config)

        # Group answers by cluster
        clusters_dict: Dict[str, Dict] = {}
        for i, (answer_id, label, prob) in enumerate(zip(valid_answer_ids, cluster_result.labels, cluster_result.probabilities)):
            if label == -1:  # Skip noise
                continue

            cluster_id = str(label)
            if cluster_id not in clusters_dict:
                clusters_dict[cluster_id] = {
                    'texts': [],
                    'probabilities': []
                }

            clusters_dict[cluster_id]['texts'].append(ClusterTexts(
                id=answer_id,
                text=answer_map.get(answer_id, ""),
                language="en"
            ))
            clusters_dict[cluster_id]['probabilities'].append(float(prob))

        # Build response clusters with statistics
        response_clusters = {}
        for cluster_id, data in clusters_dict.items():
            avg_confidence = np.mean(data['probabilities']) if data['probabilities'] else 0.0
            response_clusters[cluster_id] = ClusterData(
                texts=data['texts'],
                size=len(data['texts']),
                confidence=float(avg_confidence)
            )

        logger.info(
            f"Clustering complete: {cluster_result.num_clusters} clusters, "
            f"{cluster_result.noise_count} noise points"
        )

        return ClusterResponse(
            n_clusters=cluster_result.num_clusters,
            noise_count=cluster_result.noise_count,
            clusters=response_clusters
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error clustering answers: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cluster answers: {str(e)}"
        )

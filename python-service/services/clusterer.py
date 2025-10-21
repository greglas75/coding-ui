"""
Clustering service using HDBSCAN algorithm.
"""
import logging
from typing import List, Dict, Any, Optional
import numpy as np
import hdbscan
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class ClusterConfig:
    """Configuration for HDBSCAN clustering."""
    min_cluster_size: int = 5
    min_samples: int = 3
    metric: str = "euclidean"
    cluster_selection_method: str = "eom"


@dataclass
class ClusterResult:
    """Result from clustering operation."""
    labels: np.ndarray
    probabilities: np.ndarray
    num_clusters: int
    noise_count: int
    cluster_sizes: Dict[int, int]


class ClusteringService:
    """Service for clustering text embeddings using HDBSCAN."""

    @staticmethod
    def cluster_embeddings(
        embeddings: np.ndarray,
        config: Optional[ClusterConfig] = None
    ) -> ClusterResult:
        """
        Cluster embeddings using HDBSCAN algorithm.

        Args:
            embeddings: Array of embeddings with shape (n_samples, embedding_dim).
            config: Clustering configuration. If None, uses defaults.

        Returns:
            ClusterResult: Clustering results with labels, probabilities, and statistics.

        Raises:
            ValueError: If embeddings array is invalid.
        """
        if embeddings.shape[0] == 0:
            raise ValueError("Cannot cluster empty embeddings array")

        if config is None:
            config = ClusterConfig()

        logger.info(
            f"Clustering {embeddings.shape[0]} embeddings with "
            f"min_cluster_size={config.min_cluster_size}, "
            f"min_samples={config.min_samples}"
        )

        try:
            # Initialize HDBSCAN clusterer
            clusterer = hdbscan.HDBSCAN(
                min_cluster_size=config.min_cluster_size,
                min_samples=config.min_samples,
                metric=config.metric,
                cluster_selection_method=config.cluster_selection_method,
                prediction_data=True
            )

            # Fit and predict cluster labels
            cluster_labels = clusterer.fit_predict(embeddings)
            probabilities = clusterer.probabilities_

            # Calculate statistics
            unique_labels = set(cluster_labels)
            num_clusters = len([label for label in unique_labels if label != -1])
            noise_count = np.sum(cluster_labels == -1)

            # Calculate cluster sizes
            cluster_sizes = {}
            for label in unique_labels:
                if label != -1:  # Exclude noise
                    cluster_sizes[int(label)] = int(np.sum(cluster_labels == label))

            logger.info(
                f"Clustering complete: {num_clusters} clusters, "
                f"{noise_count} noise points"
            )

            return ClusterResult(
                labels=cluster_labels,
                probabilities=probabilities,
                num_clusters=num_clusters,
                noise_count=noise_count,
                cluster_sizes=cluster_sizes
            )

        except Exception as e:
            logger.error(f"Error during clustering: {str(e)}")
            raise

    @staticmethod
    def group_texts_by_cluster(
        texts: List[Dict[str, Any]],
        cluster_labels: np.ndarray
    ) -> Dict[int, List[Dict[str, Any]]]:
        """
        Group text items by their cluster labels.

        Args:
            texts: List of text items (dicts with 'id', 'text', 'language' keys).
            cluster_labels: Array of cluster labels from HDBSCAN.

        Returns:
            Dict mapping cluster_id -> list of text items in that cluster.
            Noise points (label -1) are excluded.
        """
        if len(texts) != len(cluster_labels):
            raise ValueError(
                f"Mismatch: {len(texts)} texts but {len(cluster_labels)} labels"
            )

        clusters = {}
        for text_item, label in zip(texts, cluster_labels):
            if label == -1:  # Skip noise
                continue

            cluster_id = int(label)
            if cluster_id not in clusters:
                clusters[cluster_id] = []
            clusters[cluster_id].append(text_item)

        logger.info(f"Grouped texts into {len(clusters)} clusters")
        return clusters

    @staticmethod
    def get_cluster_statistics(cluster_result: ClusterResult) -> Dict[str, Any]:
        """
        Get human-readable statistics from clustering result.

        Args:
            cluster_result: Result from cluster_embeddings.

        Returns:
            Dict with clustering statistics.
        """
        stats = {
            "num_clusters": cluster_result.num_clusters,
            "noise_count": cluster_result.noise_count,
            "total_points": len(cluster_result.labels),
            "clustered_points": len(cluster_result.labels) - cluster_result.noise_count,
            "cluster_sizes": cluster_result.cluster_sizes,
            "avg_cluster_size": (
                np.mean(list(cluster_result.cluster_sizes.values()))
                if cluster_result.cluster_sizes
                else 0
            ),
            "min_cluster_size": (
                min(cluster_result.cluster_sizes.values())
                if cluster_result.cluster_sizes
                else 0
            ),
            "max_cluster_size": (
                max(cluster_result.cluster_sizes.values())
                if cluster_result.cluster_sizes
                else 0
            ),
        }
        return stats

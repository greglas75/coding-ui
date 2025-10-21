"""
Unit tests for codeframe generation pipeline.
"""
import pytest
import numpy as np
from services.embedder import EmbeddingService
from services.clusterer import ClusteringService, ClusterConfig
from services.mece_validator import MECEValidator
from services.claude_client import CodeItem


class TestEmbeddingService:
    """Tests for EmbeddingService."""

    def test_generate_embeddings(self):
        """Test basic embedding generation."""
        texts = ["Hello world", "Good morning", "Python programming"]
        embeddings = EmbeddingService.generate_embeddings(texts)

        assert embeddings.shape[0] == 3
        assert embeddings.shape[1] == 384  # all-MiniLM-L6-v2 dimension

    def test_generate_embeddings_empty_list(self):
        """Test that empty list raises ValueError."""
        with pytest.raises(ValueError):
            EmbeddingService.generate_embeddings([])

    def test_generate_single_embedding(self):
        """Test single text embedding."""
        text = "Test sentence"
        embedding = EmbeddingService.generate_single_embedding(text)

        assert embedding.shape == (384,)

    def test_cosine_similarity(self):
        """Test cosine similarity calculation."""
        texts = ["cat", "kitten", "dog"]
        embeddings = EmbeddingService.generate_embeddings(texts)

        # Cat and kitten should be more similar than cat and dog
        sim_cat_kitten = EmbeddingService.cosine_similarity(
            embeddings[0], embeddings[1]
        )
        sim_cat_dog = EmbeddingService.cosine_similarity(
            embeddings[0], embeddings[2]
        )

        assert sim_cat_kitten > sim_cat_dog

    def test_pairwise_cosine_similarity(self):
        """Test pairwise similarity matrix."""
        texts = ["apple", "banana", "car"]
        embeddings = EmbeddingService.generate_embeddings(texts)
        similarity_matrix = EmbeddingService.pairwise_cosine_similarity(embeddings)

        assert similarity_matrix.shape == (3, 3)
        # Diagonal should be ~1.0 (self-similarity)
        assert np.allclose(np.diag(similarity_matrix), 1.0, atol=0.01)


class TestClusteringService:
    """Tests for ClusteringService."""

    def test_cluster_embeddings_basic(self):
        """Test basic clustering with synthetic data."""
        # Create two distinct clusters
        cluster1 = np.random.randn(10, 384) + [1, 0] * 192
        cluster2 = np.random.randn(10, 384) + [-1, 0] * 192
        embeddings = np.vstack([cluster1, cluster2])

        config = ClusterConfig(min_cluster_size=5, min_samples=3)
        result = ClusteringService.cluster_embeddings(embeddings, config)

        assert result.num_clusters >= 1
        assert len(result.labels) == 20

    def test_cluster_embeddings_empty(self):
        """Test that empty embeddings raise ValueError."""
        embeddings = np.array([])
        with pytest.raises(ValueError):
            ClusteringService.cluster_embeddings(embeddings)

    def test_group_texts_by_cluster(self):
        """Test grouping texts by cluster labels."""
        texts = [
            {"id": 1, "text": "text1", "language": "en"},
            {"id": 2, "text": "text2", "language": "en"},
            {"id": 3, "text": "text3", "language": "en"},
        ]
        labels = np.array([0, 0, 1])

        clusters = ClusteringService.group_texts_by_cluster(texts, labels)

        assert len(clusters) == 2
        assert len(clusters[0]) == 2
        assert len(clusters[1]) == 1

    def test_group_texts_excludes_noise(self):
        """Test that noise points (label -1) are excluded."""
        texts = [
            {"id": 1, "text": "text1", "language": "en"},
            {"id": 2, "text": "text2", "language": "en"},
        ]
        labels = np.array([0, -1])

        clusters = ClusteringService.group_texts_by_cluster(texts, labels)

        assert len(clusters) == 1
        assert 0 in clusters
        assert -1 not in clusters

    def test_get_cluster_statistics(self):
        """Test cluster statistics calculation."""
        from services.clusterer import ClusterResult

        result = ClusterResult(
            labels=np.array([0, 0, 1, 1, 1, -1]),
            probabilities=np.array([0.9, 0.8, 0.95, 0.9, 0.85, 0.1]),
            num_clusters=2,
            noise_count=1,
            cluster_sizes={0: 2, 1: 3}
        )

        stats = ClusteringService.get_cluster_statistics(result)

        assert stats['num_clusters'] == 2
        assert stats['noise_count'] == 1
        assert stats['total_points'] == 6
        assert stats['clustered_points'] == 5
        assert stats['min_cluster_size'] == 2
        assert stats['max_cluster_size'] == 3


class TestMECEValidator:
    """Tests for MECEValidator."""

    def test_validate_codeframe_basic(self):
        """Test basic MECE validation."""
        codes = [
            CodeItem(
                name="Sports",
                description="Athletic activities and games",
                confidence="high",
                example_texts=[{"id": "1", "text": "I love soccer"}],
                sub_codes=[]
            ),
            CodeItem(
                name="Music",
                description="Musical instruments and genres",
                confidence="high",
                example_texts=[{"id": "2", "text": "I play guitar"}],
                sub_codes=[]
            )
        ]

        cluster_texts = [
            {"id": 1, "text": "I love playing soccer and basketball", "language": "en"},
            {"id": 2, "text": "I enjoy playing guitar and piano", "language": "en"},
        ]

        validator = MECEValidator()
        result = validator.validate_codeframe(codes, cluster_texts)

        assert 0 <= result.mece_score <= 100
        assert 0 <= result.exclusivity_score <= 100
        assert 0 <= result.exhaustiveness_score <= 100
        assert isinstance(result.issues, list)

    def test_validate_detects_overlap(self):
        """Test that validator detects overlapping codes."""
        codes = [
            CodeItem(
                name="Soccer",
                description="Playing soccer and football",
                confidence="high",
                example_texts=[{"id": "1", "text": "soccer"}],
                sub_codes=[]
            ),
            CodeItem(
                name="Football",
                description="Playing football and soccer",
                confidence="high",
                example_texts=[{"id": "2", "text": "football"}],
                sub_codes=[]
            )
        ]

        cluster_texts = [
            {"id": 1, "text": "I love soccer", "language": "en"},
            {"id": 2, "text": "Football is great", "language": "en"},
        ]

        validator = MECEValidator()
        result = validator.validate_codeframe(
            codes,
            cluster_texts,
            overlap_warning_threshold=0.5
        )

        # Should detect some overlap
        overlap_issues = [i for i in result.issues if i.type == 'overlap']
        assert len(overlap_issues) > 0

    def test_flatten_codes(self):
        """Test flattening hierarchical codes."""
        codes = [
            CodeItem(
                name="Parent1",
                description="Parent code 1",
                confidence="high",
                example_texts=[],
                sub_codes=[
                    CodeItem(
                        name="Child1",
                        description="Child code 1",
                        confidence="high",
                        example_texts=[],
                        sub_codes=[]
                    )
                ]
            )
        ]

        validator = MECEValidator()
        flattened = validator._flatten_codes(codes)

        assert len(flattened) == 2
        assert flattened[0].name == "Parent1"
        assert flattened[1].name == "Child1"


class TestXMLParsing:
    """Tests for XML parsing in ClaudeClient."""

    def test_parse_simple_xml_response(self):
        """Test parsing a simple XML response."""
        xml_response = """<analysis>
  <thinking>Test thinking</thinking>
  <theme>
    <name>Test Theme</name>
    <description>Test description</description>
    <dominant_language>en</dominant_language>
    <confidence>high</confidence>
  </theme>
  <hierarchy_depth>flat</hierarchy_depth>
  <codes>
    <code>
      <name>Code1</name>
      <description>Code 1 description</description>
      <confidence>high</confidence>
      <example_texts>
        <text id="1">Example text</text>
      </example_texts>
    </code>
  </codes>
  <mece_assessment>
    <exclusivity>excellent</exclusivity>
    <exhaustiveness>good</exhaustiveness>
    <notes>No issues</notes>
  </mece_assessment>
</analysis>"""

        from services.claude_client import ClaudeClient
        import tempfile
        import os

        # Create a temporary system prompt file
        with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.xml') as f:
            f.write("<prompt>Test</prompt>")
            temp_path = f.name

        try:
            # Create client with temp file (no API key needed for parsing test)
            os.environ['ANTHROPIC_API_KEY'] = 'test-key'
            client = ClaudeClient(system_prompt_path=temp_path)
            result = client._parse_xml_response(xml_response)

            assert result['theme'].name == "Test Theme"
            assert result['hierarchy_depth'] == "flat"
            assert len(result['codes']) == 1
            assert result['codes'][0].name == "Code1"
        finally:
            os.unlink(temp_path)


def test_integration_embeddings_and_clustering():
    """Integration test: embeddings + clustering."""
    texts = [
        "I love Nike shoes",
        "Nike is the best",
        "Adidas is great",
        "Adidas quality",
        "Puma sneakers are comfortable"
    ]

    # Generate embeddings
    embeddings = EmbeddingService.generate_embeddings(texts)

    # Cluster
    config = ClusterConfig(min_cluster_size=2, min_samples=1)
    result = ClusteringService.cluster_embeddings(embeddings, config)

    # Should find at least some clusters
    assert result.num_clusters >= 1


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

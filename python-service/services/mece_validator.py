"""
MECE (Mutually Exclusive, Collectively Exhaustive) validation service.
"""
import logging
from typing import List, Dict, Any, Tuple
import numpy as np
from dataclasses import dataclass

from services.embedder import EmbeddingService
from services.claude_client import CodeItem

logger = logging.getLogger(__name__)


@dataclass
class MECEIssue:
    """Represents a MECE validation issue."""
    type: str  # 'overlap' or 'gap'
    severity: str  # 'error', 'warning', 'info'
    message: str
    details: Dict[str, Any]


@dataclass
class MECEValidationResult:
    """Result from MECE validation."""
    mece_score: float  # 0-100
    exclusivity_score: float  # 0-100
    exhaustiveness_score: float  # 0-100
    issues: List[MECEIssue]
    overlap_matrix: np.ndarray  # Similarity matrix between codes
    coverage_stats: Dict[str, Any]


class MECEValidator:
    """Service for validating MECE principles in codeframes."""

    def __init__(self):
        """Initialize MECE validator."""
        self.embedder = EmbeddingService()

    def validate_codeframe(
        self,
        codes: List[CodeItem],
        cluster_texts: List[Dict[str, Any]],
        overlap_warning_threshold: float = 0.70,
        overlap_error_threshold: float = 0.85,
        coverage_threshold: float = 0.30,
        gap_threshold: float = 0.10
    ) -> MECEValidationResult:
        """
        Validate MECE principles for a codeframe.

        Args:
            codes: List of CodeItem objects from Claude.
            cluster_texts: Original cluster texts that codes should cover.
            overlap_warning_threshold: Similarity threshold for overlap warning.
            overlap_error_threshold: Similarity threshold for overlap error.
            coverage_threshold: Minimum similarity for a text to "fit" a code.
            gap_threshold: Max proportion of texts that can be uncovered.

        Returns:
            MECEValidationResult: Validation results with score and issues.
        """
        logger.info(f"Validating MECE for {len(codes)} codes")

        issues = []

        # 1. Check Mutual Exclusivity (no overlap between codes)
        exclusivity_result = self._check_exclusivity(
            codes,
            overlap_warning_threshold,
            overlap_error_threshold
        )
        issues.extend(exclusivity_result['issues'])
        overlap_matrix = exclusivity_result['overlap_matrix']
        exclusivity_score = exclusivity_result['score']

        # 2. Check Collective Exhaustiveness (all texts covered)
        exhaustiveness_result = self._check_exhaustiveness(
            codes,
            cluster_texts,
            coverage_threshold,
            gap_threshold
        )
        issues.extend(exhaustiveness_result['issues'])
        coverage_stats = exhaustiveness_result['coverage_stats']
        exhaustiveness_score = exhaustiveness_result['score']

        # 3. Calculate overall MECE score
        mece_score = (exclusivity_score + exhaustiveness_score) / 2

        logger.info(
            f"MECE validation complete: Score={mece_score:.1f}, "
            f"Exclusivity={exclusivity_score:.1f}, "
            f"Exhaustiveness={exhaustiveness_score:.1f}, "
            f"Issues={len(issues)}"
        )

        return MECEValidationResult(
            mece_score=round(mece_score, 2),
            exclusivity_score=round(exclusivity_score, 2),
            exhaustiveness_score=round(exhaustiveness_score, 2),
            issues=issues,
            overlap_matrix=overlap_matrix,
            coverage_stats=coverage_stats
        )

    def _check_exclusivity(
        self,
        codes: List[CodeItem],
        warning_threshold: float,
        error_threshold: float
    ) -> Dict[str, Any]:
        """
        Check mutual exclusivity between codes.

        Returns:
            Dict with 'issues', 'overlap_matrix', and 'score'.
        """
        issues = []

        # Extract all code names (flatten hierarchy for now)
        code_names = self._flatten_code_names(codes)

        if len(code_names) < 2:
            # Can't check overlap with fewer than 2 codes
            return {
                'issues': [],
                'overlap_matrix': np.array([[]]),
                'score': 100.0
            }

        # Generate embeddings for code names + descriptions
        code_texts = []
        for code in self._flatten_codes(codes):
            text = f"{code.name}: {code.description}"
            code_texts.append(text)

        embeddings = self.embedder.generate_embeddings(code_texts)

        # Calculate pairwise similarity
        overlap_matrix = self.embedder.pairwise_cosine_similarity(embeddings)

        # Check for overlaps (exclude diagonal)
        overlap_count = 0
        high_overlap_count = 0

        for i in range(len(code_names)):
            for j in range(i + 1, len(code_names)):
                similarity = overlap_matrix[i, j]

                if similarity >= error_threshold:
                    high_overlap_count += 1
                    issues.append(MECEIssue(
                        type='overlap',
                        severity='error',
                        message=f"High overlap between codes",
                        details={
                            'code1': code_names[i],
                            'code2': code_names[j],
                            'similarity': round(float(similarity), 3)
                        }
                    ))
                elif similarity >= warning_threshold:
                    overlap_count += 1
                    issues.append(MECEIssue(
                        type='overlap',
                        severity='warning',
                        message=f"Potential overlap between codes",
                        details={
                            'code1': code_names[i],
                            'code2': code_names[j],
                            'similarity': round(float(similarity), 3)
                        }
                    ))

        # Calculate exclusivity score
        max_comparisons = (len(code_names) * (len(code_names) - 1)) / 2
        overlap_penalty = (high_overlap_count * 20 + overlap_count * 10)
        exclusivity_score = max(0, 100 - overlap_penalty)

        return {
            'issues': issues,
            'overlap_matrix': overlap_matrix,
            'score': exclusivity_score
        }

    def _check_exhaustiveness(
        self,
        codes: List[CodeItem],
        cluster_texts: List[Dict[str, Any]],
        coverage_threshold: float,
        gap_threshold: float
    ) -> Dict[str, Any]:
        """
        Check collective exhaustiveness (all texts covered by codes).

        Returns:
            Dict with 'issues', 'coverage_stats', and 'score'.
        """
        issues = []

        # Generate embeddings for codes
        code_texts = []
        for code in self._flatten_codes(codes):
            text = f"{code.name}: {code.description}"
            code_texts.append(text)

        code_embeddings = self.embedder.generate_embeddings(code_texts)

        # Generate embeddings for cluster texts
        text_strings = [item['text'] for item in cluster_texts]
        text_embeddings = self.embedder.generate_embeddings(text_strings)

        # For each text, find best matching code
        uncovered_count = 0
        coverage_scores = []

        for i, text_emb in enumerate(text_embeddings):
            # Calculate similarity to all codes
            similarities = [
                self.embedder.cosine_similarity(text_emb, code_emb)
                for code_emb in code_embeddings
            ]
            best_similarity = max(similarities)
            coverage_scores.append(best_similarity)

            if best_similarity < coverage_threshold:
                uncovered_count += 1

        # Calculate coverage statistics
        uncovered_proportion = uncovered_count / len(cluster_texts)
        avg_coverage = float(np.mean(coverage_scores))
        min_coverage = float(np.min(coverage_scores))

        coverage_stats = {
            'total_texts': len(cluster_texts),
            'uncovered_count': uncovered_count,
            'uncovered_proportion': round(uncovered_proportion, 3),
            'avg_coverage_score': round(avg_coverage, 3),
            'min_coverage_score': round(min_coverage, 3)
        }

        # Check if gap is significant
        if uncovered_proportion > gap_threshold:
            issues.append(MECEIssue(
                type='gap',
                severity='warning',
                message=f"Codes may not cover all responses adequately",
                details={
                    'uncovered_count': uncovered_count,
                    'uncovered_proportion': round(uncovered_proportion, 3),
                    'threshold': gap_threshold
                }
            ))

        # Calculate exhaustiveness score
        gap_penalty = uncovered_proportion * 100  # Scale to 0-100
        exhaustiveness_score = max(0, 100 - gap_penalty)

        return {
            'issues': issues,
            'coverage_stats': coverage_stats,
            'score': exhaustiveness_score
        }

    def _flatten_codes(self, codes: List[CodeItem]) -> List[CodeItem]:
        """Flatten hierarchical codes into a single list."""
        flattened = []
        for code in codes:
            flattened.append(code)
            if code.sub_codes:
                flattened.extend(self._flatten_codes(code.sub_codes))
        return flattened

    def _flatten_code_names(self, codes: List[CodeItem]) -> List[str]:
        """Extract all code names from hierarchical structure."""
        return [code.name for code in self._flatten_codes(codes)]

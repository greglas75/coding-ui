"""
Pattern Detection Helper Functions

Shared utility functions for building sources, decision trees, and detecting issues.
Extracted from original pattern_detector.py to reduce code duplication.
"""
from typing import Dict, List, Optional, Any
import logging

logger = logging.getLogger(__name__)


def build_sources_dict(
    pinecone_match: Optional[Any],
    dual_search_results: Optional[Any],
    vision_results: Optional[Any],
    vision_brands_a: Optional[Dict[str, Any]],
    vision_brands_b: Optional[Dict[str, Any]],
    web_brands_a: Optional[Dict[str, Any]],
    web_brands_b: Optional[Dict[str, Any]],
    kg_results: Optional[Dict[str, Optional[Any]]],
    embedding_similarities: Optional[Dict[str, float]],
) -> Dict[str, Any]:
    """
    Build comprehensive sources breakdown with ALL tier data.

    Args:
        pinecone_match: Pinecone search result
        dual_search_results: Google Images dual search
        vision_results: Vision AI analysis
        vision_brands_a: Vision AI results without category filter
        vision_brands_b: Vision AI results with category filter
        web_brands_a: Web Search AI results without category filter
        web_brands_b: Web Search AI results with category filter
        kg_results: Knowledge Graph verification
        embedding_similarities: Embedding similarity scores

    Returns:
        Dictionary with all source data for UI display
    """
    sources = {}

    if pinecone_match:
        sources["pinecone"] = {
            "match": True,
            "similarity": pinecone_match.similarity,
            "namespace": pinecone_match.namespace,
        }

    if dual_search_results:
        sources["google_search_a"] = {
            "results_count": dual_search_results.search_a_count,
            "pattern": dual_search_results.pattern,
        }
        sources["google_search_b"] = {
            "results_count": dual_search_results.search_b_count,
            "pattern": dual_search_results.pattern,
        }

    # Web Search AI (Tier 1.5) - NEW!
    if web_brands_a or web_brands_b:
        sources["web_search_ai_a"] = {
            "total_results": web_brands_a.get("total_results", 0) if web_brands_a else 0,
            "correct_matches": web_brands_a.get("correct_matches", 0) if web_brands_a else 0,
            "mismatched_count": web_brands_a.get("mismatched_count", 0) if web_brands_a else 0,
            "brands": web_brands_a.get("brands", {}) if web_brands_a else {},
        }
        sources["web_search_ai_b"] = {
            "total_results": web_brands_b.get("total_results", 0) if web_brands_b else 0,
            "correct_matches": web_brands_b.get("correct_matches", 0) if web_brands_b else 0,
            "mismatched_count": web_brands_b.get("mismatched_count", 0) if web_brands_b else 0,
            "brands": web_brands_b.get("brands", {}) if web_brands_b else {},
        }

    if vision_results:
        sources["vision_ai"] = {
            "images_analyzed": vision_results.total_analyzed,
            "products_identified": vision_results.total_products,
            "dominant_brand": vision_results.dominant_brand,
            "brands_detected": vision_results.brand_frequencies,
        }

    # Vision AI filtered results (with product type filtering)
    if vision_brands_a or vision_brands_b:
        sources["vision_ai_search_a"] = {
            "total_images": vision_brands_a.get("total_images", 0) if vision_brands_a else 0,
            "correct_matches": vision_brands_a.get("correct_matches", 0) if vision_brands_a else 0,
            "mismatched_count": vision_brands_a.get("mismatched_count", 0) if vision_brands_a else 0,
            "brands": vision_brands_a.get("brands", {}) if vision_brands_a else {},
        }
        sources["vision_ai_search_b"] = {
            "total_images": vision_brands_b.get("total_images", 0) if vision_brands_b else 0,
            "correct_matches": vision_brands_b.get("correct_matches", 0) if vision_brands_b else 0,
            "mismatched_count": vision_brands_b.get("mismatched_count", 0) if vision_brands_b else 0,
            "brands": vision_brands_b.get("brands", {}) if vision_brands_b else {},
        }

    if kg_results:
        # Build comprehensive KG data with verification details
        kg_entities = {}
        verified_count = 0

        for entity, result in kg_results.items():
            if result:
                is_verified = result.verified if hasattr(result, 'verified') else False
                if is_verified:
                    verified_count += 1

                kg_entities[entity] = {
                    "verified": is_verified,
                    "entity_type": result.entity_type if hasattr(result, 'entity_type') else None,
                    "matches_category": result.matches_user_category if hasattr(result, 'matches_user_category') else False,
                    "category": result.category if hasattr(result, 'category') else None,
                    "description": (result.description[:200] if hasattr(result, 'description') and result.description else "")
                }
            else:
                kg_entities[entity] = {
                    "verified": False,
                    "entity_type": None,
                    "matches_category": False,
                    "category": None,
                    "description": ""
                }

        sources["knowledge_graph"] = {
            "entities": kg_entities,
            "total_entities": len(kg_results),
            "verified_count": verified_count,
        }

    if embedding_similarities:
        sources["embeddings"] = embedding_similarities

    return sources


def build_decision_tree(
    vision_brands_a: Optional[Dict],
    vision_brands_b: Optional[Dict],
    web_brands_a: Optional[Dict],
    web_brands_b: Optional[Dict],
    kg_results: Optional[Dict],
    embedding_similarities: Optional[Dict],
    dominant_brand: Optional[str],
    confidence: int
) -> List[Dict[str, Any]]:
    """
    Build step-by-step decision tree showing validation logic.

    Args:
        vision_brands_a: Vision AI results without category filter
        vision_brands_b: Vision AI results with category filter
        web_brands_a: Web Search AI results without category filter
        web_brands_b: Web Search AI results with category filter
        kg_results: Knowledge Graph verification
        embedding_similarities: Embedding similarity scores
        dominant_brand: Detected dominant brand
        confidence: Final confidence score

    Returns:
        List of decision steps with checks, results, and impacts
    """
    steps = []
    step_num = 1

    # Step 1: Vision AI Check
    vision_b_correct = vision_brands_b.get("correct_matches", 0) if vision_brands_b else 0
    vision_b_total = vision_brands_b.get("total_images", 1) if vision_brands_b else 1
    vision_rate = vision_b_correct / vision_b_total if vision_b_total > 0 else 0

    vision_result = vision_rate >= 0.8
    vision_signal = "STRONG" if vision_rate >= 0.8 else "MODERATE" if vision_rate >= 0.5 else "WEAK"

    steps.append({
        "step": step_num,
        "check": "Vision AI Detection Rate",
        "question": "Are most images showing the correct product type?",
        "result": vision_result,
        "details": f"{vision_b_correct}/{vision_b_total} images matched category",
        "signal": vision_signal,
        "impact": f"+{int(vision_rate * 35)}% confidence",
        "icon": "eye"
    })
    step_num += 1

    # Step 2: Web Search Check
    web_b_correct = web_brands_b.get("correct_matches", 0) if web_brands_b else 0
    web_b_total = web_brands_b.get("total_results", 1) if web_brands_b else 1
    web_rate = web_b_correct / web_b_total if web_b_total > 0 else 0

    web_result = web_rate >= 0.8
    web_signal = "STRONG" if web_rate >= 0.8 else "MODERATE" if web_rate >= 0.5 else "WEAK"

    steps.append({
        "step": step_num,
        "check": "Web Search Consensus",
        "question": "Do web results confirm this brand?",
        "result": web_result,
        "details": f"{web_b_correct}/{web_b_total} results mentioned brand",
        "signal": web_signal,
        "impact": f"+{int(web_rate * 30)}% confidence",
        "icon": "search"
    })
    step_num += 1

    # Step 3: Multi-source Agreement
    multi_source_agree = vision_result and web_result
    pattern_detected = "CLEAR_MATCH" if multi_source_agree else "UNCLEAR"

    steps.append({
        "step": step_num,
        "check": "Multi-source Agreement",
        "question": "Do Vision AI and Web Search agree?",
        "result": multi_source_agree,
        "details": f"Vision ({vision_signal}) + Web ({web_signal})",
        "signal": pattern_detected,
        "impact": f"Pattern: {pattern_detected}",
        "icon": "check-circle"
    })
    step_num += 1

    # Step 4: Knowledge Graph Verification
    kg_verified = False
    kg_matches = False
    if kg_results and dominant_brand and dominant_brand in kg_results:
        kg_result = kg_results[dominant_brand]
        if kg_result:
            kg_verified = kg_result.verified if hasattr(kg_result, 'verified') else False
            kg_matches = kg_result.matches_user_category if hasattr(kg_result, 'matches_user_category') else False

    kg_impact = 0
    kg_details = "Not found in Knowledge Graph"
    if kg_verified:
        if kg_matches:
            kg_impact = 15
            kg_details = "Entity verified and category matches"
        else:
            kg_impact = 5
            kg_details = "Entity verified but category mismatch (penalty applied)"

    steps.append({
        "step": step_num,
        "check": "Knowledge Graph Verification",
        "question": "Is this entity in Google's Knowledge Graph?",
        "result": kg_verified,
        "details": kg_details,
        "signal": "VERIFIED" if kg_matches else "MISMATCH" if kg_verified else "NOT_FOUND",
        "impact": f"+{kg_impact}% confidence" if kg_impact > 0 else "No impact",
        "icon": "globe"
    })
    step_num += 1

    # Step 5: Embedding Similarity
    embedding_sim = 0
    if embedding_similarities and dominant_brand and dominant_brand in embedding_similarities:
        embedding_sim = embedding_similarities[dominant_brand]

    embedding_result = embedding_sim >= 0.7
    embedding_signal = "HIGH" if embedding_sim >= 0.7 else "MODERATE" if embedding_sim >= 0.4 else "LOW"

    steps.append({
        "step": step_num,
        "check": "Text Similarity",
        "question": "How similar is the user text to the detected brand?",
        "result": embedding_result,
        "details": f"{round(embedding_sim * 100, 1)}% similarity score",
        "signal": embedding_signal,
        "impact": f"+{int(embedding_sim * 20)}% confidence",
        "icon": "zap"
    })
    step_num += 1

    # Step 6: Final Confidence Calculation
    steps.append({
        "step": step_num,
        "check": "Final Confidence Score",
        "question": "What is the overall confidence?",
        "result": confidence >= 70,
        "details": f"Combined all tier contributions",
        "signal": "HIGH" if confidence >= 70 else "MEDIUM" if confidence >= 50 else "LOW",
        "impact": f"{confidence}% final confidence",
        "icon": "trending-up"
    })

    return steps


def detect_validation_issues(
    vision_brands_a: Optional[Dict],
    vision_brands_b: Optional[Dict],
    web_brands_a: Optional[Dict],
    web_brands_b: Optional[Dict],
    kg_results: Optional[Dict],
    embedding_similarities: Optional[Dict],
    dominant_brand: Optional[str],
    user_text: str,
    category: str
) -> List[Dict[str, Any]]:
    """
    Detect issues and anomalies in validation process.

    Args:
        vision_brands_a: Vision AI results without category filter
        vision_brands_b: Vision AI results with category filter
        web_brands_a: Web Search AI results without category filter
        web_brands_b: Web Search AI results with category filter
        kg_results: Knowledge Graph verification
        embedding_similarities: Embedding similarity scores
        dominant_brand: Detected dominant brand
        user_text: User's input text
        category: Expected category

    Returns:
        List of issues with severity, description, and suggestions
    """
    issues = []

    # Issue 1: Knowledge Graph Wrong Entity
    if kg_results and dominant_brand:
        for query_text, kg_result in kg_results.items():
            if kg_result and kg_result.verified if hasattr(kg_result, 'verified') else False:
                # Check if KG returned different entity than dominant brand
                kg_name = kg_result.name if hasattr(kg_result, 'name') else None
                if kg_name and kg_name.lower() != dominant_brand.lower():
                    issues.append({
                        "severity": "high",
                        "tier": "knowledge_graph",
                        "type": "wrong_entity",
                        "title": "Knowledge Graph Entity Mismatch",
                        "problem": f"KG returned '{kg_name}' for query '{query_text}'",
                        "expected": f"Expected: '{dominant_brand}'",
                        "impact": "Knowledge Graph did not contribute to confidence",
                        "suggestion": "This may indicate issues with query transliteration or entity disambiguation in Google's Knowledge Graph",
                        "icon": "alert-triangle"
                    })

                # Check if KG category doesn't match
                elif not (kg_result.matches_user_category if hasattr(kg_result, 'matches_user_category') else False):
                    kg_category = kg_result.category if hasattr(kg_result, 'category') else "Unknown"
                    issues.append({
                        "severity": "medium",
                        "tier": "knowledge_graph",
                        "type": "category_mismatch",
                        "title": "Knowledge Graph Category Mismatch",
                        "problem": f"KG category is '{kg_category}' but expected '{category}'",
                        "impact": "Reduced KG contribution from 15% to 5%",
                        "suggestion": "Entity exists but is classified differently in Knowledge Graph",
                        "icon": "alert-circle"
                    })

    # Issue 2: Low Embedding Similarity
    if embedding_similarities and dominant_brand:
        similarity = embedding_similarities.get(dominant_brand, 0)
        if similarity < 0.4:
            issues.append({
                "severity": "medium",
                "tier": "embeddings",
                "type": "low_similarity",
                "title": "Low Text Similarity",
                "problem": f"Only {round(similarity * 100, 1)}% similarity between '{user_text}' and '{dominant_brand}'",
                "impact": f"Reduced confidence by {20 - int(similarity * 20)}%",
                "suggestion": "This often occurs with non-Latin scripts. Consider: (1) Adding transliteration step, (2) Using language-specific embedding models, (3) Implementing fuzzy matching",
                "icon": "alert-circle"
            })

    # Issue 3: Vision AI Multiple Product Types (Search A)
    if vision_brands_a:
        correct = vision_brands_a.get("correct_matches", 0)
        mismatched = vision_brands_a.get("mismatched_count", 0)

        if mismatched > correct and mismatched > 0:
            total = correct + mismatched
            accuracy = round((correct/total)*100, 1) if total > 0 else 0
            issues.append({
                "severity": "low",
                "tier": "vision_ai",
                "type": "multi_category_brand",
                "title": "Multiple Product Types Detected",
                "problem": f"Search A found {mismatched}/{total} images with wrong product type",
                "impact": f"Reduced Search A accuracy to {accuracy}%",
                "suggestion": "This brand likely produces multiple product categories (e.g., toothpaste AND whitening strips). This is expected behavior - category filtering in Search B resolves this.",
                "icon": "info"
            })

    # Issue 4: Web Search Low Brand Mention Rate
    if web_brands_b:
        correct = web_brands_b.get("correct_matches", 0)
        total = web_brands_b.get("total_results", 1)
        rate = correct / total if total > 0 else 0

        if rate < 0.5:
            issues.append({
                "severity": "medium",
                "tier": "web_search",
                "type": "low_mention_rate",
                "title": "Low Web Search Brand Mentions",
                "problem": f"Only {correct}/{total} results mentioned the brand ({round(rate*100, 1)}%)",
                "impact": f"Reduced web search contribution to {int(rate * 30)}%",
                "suggestion": "May indicate: (1) Uncommon brand name, (2) Spelling variations, (3) Regional availability issues",
                "icon": "alert-circle"
            })

    # Issue 5: No Knowledge Graph Entity Found
    if kg_results and dominant_brand:
        kg_result = kg_results.get(dominant_brand)
        if not kg_result or not (kg_result.verified if hasattr(kg_result, 'verified') else False):
            issues.append({
                "severity": "low",
                "tier": "knowledge_graph",
                "type": "entity_not_found",
                "title": "Brand Not in Knowledge Graph",
                "problem": f"'{dominant_brand}' not found in Google Knowledge Graph",
                "impact": "No KG contribution (0%)",
                "suggestion": "This is common for: (1) Regional brands, (2) New brands, (3) Private labels. Not necessarily a problem if other tiers agree.",
                "icon": "info"
            })

    # Sort by severity (high > medium > low)
    severity_order = {"high": 0, "medium": 1, "low": 2}
    issues.sort(key=lambda x: severity_order.get(x["severity"], 3))

    return issues

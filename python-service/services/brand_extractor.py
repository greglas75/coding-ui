"""
3-Phase Brand Extraction System using OpenAI Embeddings, Pinecone, Claude AI, and Google APIs.

PHASE 1: Embedding Indexing - Store ALL unique answers as vectors
PHASE 2: Brand Classification - AI + Google validation to mark brands
PHASE 3: Codeframe Building - Group verified brands and create centroids
"""
import hashlib
import logging
import time
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
import json

logger = logging.getLogger(__name__)


@dataclass
class AnswerEmbedding:
    """Represents an answer stored in Pinecone."""
    answer_id: str
    raw_text: str
    category: str
    is_brand: bool = False
    suggested_brand: Optional[str] = None
    confidence: float = 0.0
    verified_by: List[str] = None
    ai_reasoning: Optional[str] = None
    google_verified: bool = False

    def __post_init__(self):
        if self.verified_by is None:
            self.verified_by = []


@dataclass
class BrandCandidate:
    """Brand candidate after AI + Google validation."""
    brand_name: str
    confidence: float
    answer_count: int
    example_texts: List[str]
    verified_by: List[str]
    is_verified: bool


class BrandExtractor:
    """
    3-Phase brand extraction system.

    Architecture:
    - Phase 1: Index all unique answers to Pinecone (no brand detection yet)
    - Phase 2: Classify which indexed answers are brands using AI + Google
    - Phase 3: Build codeframe by grouping verified brands
    """

    def __init__(
        self,
        openai_embedder=None,
        claude_client=None,
        google_client=None,
        index_name: str = "tgm-brand-embeddings",
        namespace: str = "answers",
        progress_callback=None
    ):
        """
        Initialize brand extractor.

        Args:
            openai_embedder: OpenAIEmbedder instance for generating embeddings
            claude_client: ClaudeClient for AI validation
            google_client: GoogleSearchClient for Google validation
            index_name: Pinecone index name
            namespace: Pinecone namespace for answer embeddings
            progress_callback: Optional callback function(progress: int, message: str, phase: int)
        """
        self.embedder = openai_embedder
        self.claude = claude_client
        self.google = google_client
        self.index_name = index_name
        self.namespace = namespace
        self.progress_callback = progress_callback

        logger.info(
            f"BrandExtractor initialized - "
            f"embedder={'✓' if openai_embedder else '✗'}, "
            f"claude={'✓' if claude_client else '✗'}, "
            f"google={'✓' if google_client else '✗'}"
        )

    def _report_progress(self, progress: int, message: str, phase: int = 1):
        """Report progress via callback if available."""
        if self.progress_callback:
            try:
                self.progress_callback(progress, message, phase)
            except Exception as e:
                logger.error(f"Progress callback failed: {e}")

    # ============================================================================
    # PHASE 1: EMBEDDING INDEXING
    # ============================================================================

    def index_unique_answers(
        self,
        answers: List[Dict[str, Any]],
        category: str
    ) -> Dict[str, Any]:
        """
        PHASE 1: Index all unique answers to Pinecone WITHOUT classifying as brands yet.

        Args:
            answers: List of dicts with keys: id, text
            category: Category name (e.g., "toothpaste")

        Returns:
            Dict with indexing stats: {
                "total_answers": int,
                "unique_answers": int,
                "indexed_count": int,
                "skipped_count": int
            }
        """
        logger.info(f"📊 [PHASE 1/3] EMBEDDING INDEXING - Indexing {len(answers)} answers for category '{category}'")

        self._report_progress(5, "Starting Phase 1: Indexing answers to Pinecone", phase=1)

        if not self.embedder or not self.embedder.pc:
            logger.error("❌ OpenAI embedder or Pinecone not configured")
            return {"error": "Embedder not configured"}

        # Deduplicate answers by text
        self._report_progress(10, "Deduplicating answers", phase=1)
        unique_answers = {}
        for answer in answers:
            text = answer.get('text', '').strip().lower()
            if text and text not in unique_answers:
                unique_answers[text] = answer

        logger.info(f"📝 Found {len(unique_answers)} unique answers (from {len(answers)} total)")

        # Generate embeddings in batch
        self._report_progress(15, f"Generating OpenAI embeddings for {len(unique_answers)} answers", phase=1)
        texts = list(unique_answers.keys())
        embeddings = self.embedder.generate_embeddings_batch(texts)

        self._report_progress(25, "OpenAI embeddings generated", phase=1)

        # Prepare vectors for Pinecone
        vectors = []
        for i, (text, embedding) in enumerate(zip(texts, embeddings)):
            if embedding is None:
                logger.warning(f"⚠️ Failed to generate embedding for: {text[:50]}...")
                continue

            answer = unique_answers[text]
            answer_id = self._generate_answer_id(text, category)

            metadata = {
                "raw_text": answer.get('text', '').strip(),
                "category": category,
                "original_answer_id": str(answer.get('id', '')),
                "is_brand": False,  # Not classified yet
                "verified_by": [],
                "confidence": 0.0
            }

            vectors.append({
                "id": answer_id,
                "values": embedding,
                "metadata": metadata
            })

        # Upsert to Pinecone
        if vectors:
            self._report_progress(27, f"Upserting {len(vectors)} vectors to Pinecone", phase=1)
            success = self.embedder.upsert_to_pinecone(
                vectors=vectors,
                index_name=self.index_name,
                namespace=self.namespace
            )

            if success:
                logger.info(f"✅ [PHASE 1/3] Indexed {len(vectors)} unique answers to Pinecone")
                self._report_progress(30, f"Phase 1 complete - {len(vectors)} answers indexed", phase=1)
            else:
                logger.error(f"❌ [PHASE 1/3] Failed to index answers to Pinecone")

        return {
            "total_answers": len(answers),
            "unique_answers": len(unique_answers),
            "indexed_count": len(vectors),
            "skipped_count": len(unique_answers) - len(vectors)
        }

    # ============================================================================
    # PHASE 2: BRAND CLASSIFICATION
    # ============================================================================

    def classify_brands(
        self,
        category: str,
        batch_size: int = 50
    ) -> List[BrandCandidate]:
        """
        PHASE 2: Classify which indexed answers are brands using AI + Google validation.

        Args:
            category: Category to classify brands for
            batch_size: Number of answers to process per batch

        Returns:
            List[BrandCandidate]: Verified brand candidates
        """
        logger.info(f"🤖 [PHASE 2/3] BRAND CLASSIFICATION - Classifying brands for category '{category}'")

        self._report_progress(32, "Starting Phase 2: AI Classification", phase=2)

        if not self.embedder or not self.embedder.index:
            logger.error("❌ Pinecone not initialized")
            return []

        # Fetch all unclassified answers from Pinecone
        self._report_progress(35, "Fetching vectors from Pinecone", phase=2)
        all_vectors = self._fetch_all_vectors_for_category(category)
        logger.info(f"📦 Found {len(all_vectors)} vectors to classify")

        if not all_vectors:
            logger.warning(f"⚠️ No vectors found for category '{category}'. Run PHASE 1 first!")
            return []

        # Process in batches
        brand_candidates = []
        total_batches = (len(all_vectors) - 1) // batch_size + 1
        for i in range(0, len(all_vectors), batch_size):
            batch = all_vectors[i:i + batch_size]
            batch_num = i // batch_size + 1

            # Progress: 40-70% for AI classification (30% range)
            progress = 40 + int((batch_num / total_batches) * 30)
            self._report_progress(progress, f"AI classification: batch {batch_num}/{total_batches}", phase=2)

            logger.info(f"🔄 Processing batch {batch_num}/{total_batches}")

            for vector in batch:
                metadata = vector.get('metadata', {})
                text = metadata.get('raw_text', '')
                vector_id = vector.get('id', '')

                # Skip if already classified
                if metadata.get('is_brand'):
                    logger.debug(f"⏭️ Skipping already classified: {text[:30]}...")
                    continue

                # AI Classification
                ai_result = self._ai_classify_brand(text, category)

                if ai_result.get('is_brand'):
                    # Google Validation
                    google_result = self._google_validate_brand(
                        brand_name=ai_result.get('suggested_brand', text),
                        category=category,
                        original_text=text
                    )

                    # Update metadata in Pinecone
                    # Note: Pinecone only accepts string/number/boolean/list[string] for metadata
                    # So we JSON encode complex objects
                    updated_metadata = {
                        **metadata,
                        "is_brand": True,
                        "suggested_brand": ai_result.get('suggested_brand'),
                        "confidence": ai_result.get('confidence', 0.0),
                        "ai_reasoning": ai_result.get('reason', ''),
                        "verified_by": ["AI"] + (["Google"] if google_result.get('is_verified') else []),
                        "google_verified": google_result.get('is_verified', False),
                        "validation_evidence": json.dumps(google_result.get('evidence', {}))  # JSON encode for Pinecone
                    }

                    # Update in Pinecone
                    self.embedder.index.update(
                        id=vector_id,
                        set_metadata=updated_metadata,
                        namespace=self.namespace
                    )

                    logger.info(f"✅ Classified as brand: {ai_result.get('suggested_brand')} (confidence: {ai_result.get('confidence'):.2f})")

        # Fetch all classified brands
        self._report_progress(70, "Fetching classified brands", phase=2)
        classified_brands = self._fetch_classified_brands(category)
        logger.info(f"🎯 [PHASE 2/3] Classification complete - Found {len(classified_brands)} brand candidates")

        self._report_progress(72, f"Phase 2 complete - {len(classified_brands)} brands identified", phase=2)

        return classified_brands

    # ============================================================================
    # PHASE 3: CODEFRAME BUILDING
    # ============================================================================

    def build_codeframe(
        self,
        category: str,
        similarity_threshold: float = 0.85
    ) -> Dict[str, Any]:
        """
        PHASE 3: Build codeframe by grouping verified brands and creating centroids.

        Args:
            category: Category to build codeframe for
            similarity_threshold: Cosine similarity threshold for grouping

        Returns:
            Dict: {
                "category": str,
                "brands": List[Dict],  # Brand codeframe
                "total_mentions": int,
                "unique_brands": int
            }
        """
        logger.info(f"📊 [PHASE 3/3] CODEFRAME BUILDING - Building codeframe for category '{category}'")

        self._report_progress(75, "Starting Phase 3: Building codeframe", phase=3)

        # Fetch all classified brands
        brand_candidates = self._fetch_classified_brands(category)

        if not brand_candidates:
            logger.warning(f"⚠️ No classified brands found. Run PHASE 2 first!")
            self._report_progress(100, "Complete - No brands found", phase=3)
            return {
                "category": category,
                "brands": [],
                "total_mentions": 0,
                "unique_brands": 0
            }

        # Group by suggested_brand name
        self._report_progress(80, f"Grouping {len(brand_candidates)} brand mentions", phase=3)
        brand_groups = {}
        for candidate in brand_candidates:
            brand_name = candidate.get('suggested_brand', '').lower()
            if brand_name not in brand_groups:
                brand_groups[brand_name] = []
            brand_groups[brand_name].append(candidate)

        # Build codeframe entries with validation evidence
        codeframe_brands = []
        for i, (brand_name, mentions) in enumerate(brand_groups.items()):
            # ✅ FIX: Rate limit Google API calls to prevent 429 errors
            # ~3 requests/second is safe for paid tier
            if i > 0:
                time.sleep(0.3)  # 300ms delay between brands

            # Calculate average confidence
            avg_confidence = sum(m.get('confidence', 0.0) for m in mentions) / len(mentions)

            # Get verification status
            is_google_verified = any(m.get('google_verified', False) for m in mentions)

            # Example texts
            example_texts = [m.get('raw_text', '') for m in mentions[:3]]

            # Collect brand name variants with counts
            # Group by unique raw text to show different spellings/languages
            variant_counts = {}
            for mention in mentions:
                raw_text = mention.get('raw_text', '').strip()
                if raw_text:
                    variant_counts[raw_text] = variant_counts.get(raw_text, 0) + 1

            # Sort variants by count (descending)
            variants_sorted = dict(sorted(variant_counts.items(), key=lambda x: x[1], reverse=True))

            # Get validation evidence from existing metadata (stored during classification)
            # Use evidence from first mention that has it
            validation_evidence = None
            for mention in mentions:
                if mention.get('validation_evidence'):
                    # Parse from JSON if it's a string (stored in Pinecone as JSON string)
                    raw_evidence = mention.get('validation_evidence')
                    if isinstance(raw_evidence, str):
                        try:
                            validation_evidence = json.loads(raw_evidence)
                        except json.JSONDecodeError:
                            logger.warning(f"Failed to parse validation_evidence JSON for '{brand_name}'")
                            validation_evidence = None
                    else:
                        validation_evidence = raw_evidence

                    if validation_evidence:
                        logger.debug(f"📋 Using cached validation evidence for '{brand_name}'")
                        break

            # If no cached evidence, fetch from Google (backwards compatibility)
            if validation_evidence is None and self.google and self.google.is_configured():
                try:
                    logger.info(f"🔍 Fetching validation evidence for '{brand_name}'...")
                    # Search text results
                    search_results = self.google.search_text(
                        query=f"{brand_name} {category}",
                        num_results=5
                    )

                    # Search images
                    image_results = self.google.search_images(
                        query=brand_name,
                        num_results=6
                    )

                    # Knowledge Graph
                    kg_data = self.google.search_knowledge_graph(
                        query=brand_name,
                        limit=1
                    )

                    # Build validation evidence structure (match format from _google_validate_brand)
                    validation_evidence = {
                        "text_search_count": len(search_results),
                        "image_search_count": len(image_results),
                        "knowledge_graph": kg_data,
                        "image_urls": [img.link for img in image_results],
                        "search_results": [
                            {
                                "title": r.title,
                                "snippet": r.snippet,
                                "link": r.link
                            }
                            for r in search_results[:3]
                        ],
                        "brand_indicators": []
                    }

                    logger.info(f"✅ Collected validation evidence for '{brand_name}': {len(search_results)} search results, {len(image_results)} images")

                except Exception as e:
                    logger.warning(f"Failed to collect validation evidence for '{brand_name}': {e}")
                    validation_evidence = None

            codeframe_brands.append({
                "brand_name": brand_name.title(),
                "mention_count": len(mentions),
                "confidence": round(avg_confidence, 2),
                "google_verified": is_google_verified,
                "example_texts": example_texts,
                "variants": variants_sorted,  # Add variants with counts
                "validation_evidence": validation_evidence
            })

        # Sort by mention count
        codeframe_brands.sort(key=lambda x: x['mention_count'], reverse=True)

        logger.info(f"✅ [PHASE 3/3] Codeframe built - {len(codeframe_brands)} unique brands from {len(brand_candidates)} mentions")

        self._report_progress(100, f"Complete! {len(codeframe_brands)} brands in codeframe", phase=3)

        return {
            "category": category,
            "brands": codeframe_brands,
            "total_mentions": len(brand_candidates),
            "unique_brands": len(codeframe_brands)
        }

    # ============================================================================
    # HELPER METHODS
    # ============================================================================

    def _generate_answer_id(self, text: str, category: str) -> str:
        """Generate unique ID for answer based on text + category."""
        content = f"{category}:{text}".encode('utf-8')
        return hashlib.md5(content).hexdigest()

    def _fetch_all_vectors_for_category(self, category: str) -> List[Dict[str, Any]]:
        """Fetch all vectors for a category from Pinecone."""
        try:
            # Pinecone doesn't have list_all, so we query with a dummy vector and high top_k
            # Better approach: Use Pinecone's list() method if available, or query in batches

            # For now, use a workaround: query with random vector and very high top_k
            import random
            dummy_vector = [random.random() for _ in range(3072)]

            results = self.embedder.index.query(
                vector=dummy_vector,
                top_k=10000,  # Max allowed
                namespace=self.namespace,
                include_metadata=True,
                filter={"category": {"$eq": category}}
            )

            vectors = []
            for match in results.matches:
                vectors.append({
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                })

            return vectors

        except Exception as e:
            logger.error(f"Failed to fetch vectors: {e}")
            return []

    def _fetch_classified_brands(self, category: str) -> List[Dict[str, Any]]:
        """Fetch all classified brands (is_brand=True) from Pinecone."""
        try:
            import random
            dummy_vector = [random.random() for _ in range(3072)]

            results = self.embedder.index.query(
                vector=dummy_vector,
                top_k=10000,
                namespace=self.namespace,
                include_metadata=True,
                filter={
                    "category": {"$eq": category},
                    "is_brand": {"$eq": True}
                }
            )

            brands = []
            for match in results.matches:
                brands.append({
                    **match.metadata,
                    "vector_id": match.id
                })

            return brands

        except Exception as e:
            logger.error(f"Failed to fetch classified brands: {e}")
            return []

    def _ai_classify_brand(self, text: str, category: str) -> Dict[str, Any]:
        """
        Use Claude AI to classify if text is a brand.

        Returns:
            Dict: {
                "is_brand": bool,
                "suggested_brand": str,
                "confidence": float,
                "reason": str
            }
        """
        if not self.claude:
            logger.warning("Claude client not configured - skipping AI classification")
            return {"is_brand": False, "confidence": 0.0}

        prompt = f"""You are verifying if a given text refers to a real consumer brand within the category: {category}.

Consider:
- Possible typos, translations, or variants
- Brand names vs. generic product descriptions
- Well-known international brands

Text to classify: "{text}"

Return ONLY a JSON object with this exact structure:
{{
  "is_brand": true or false,
  "suggested_brand": "Corrected Brand Name" or null,
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation"
}}"""

        try:
            # Use Anthropic client directly for simple classification
            # Use model from config (respects user's category settings)
            response = self.claude.client.messages.create(
                model=self.claude.config.model,  # Use configured model (haiku/sonnet/opus)
                max_tokens=200,
                temperature=0.1,
                messages=[{
                    "role": "user",
                    "content": prompt
                }]
            )

            # Extract text from response
            response_text = response.content[0].text.strip()

            # Parse JSON response
            result = json.loads(response_text)
            return result

        except Exception as e:
            logger.error(f"AI classification failed: {e}")
            return {"is_brand": False, "confidence": 0.0, "reason": str(e)}

    def _google_validate_brand(self, brand_name: str, category: str, original_text: str = None) -> Dict[str, Any]:
        """
        Validate brand using Google Knowledge Graph + Search.
        Returns full validation evidence for UI display.

        Returns:
            Dict: {
                "is_verified": bool,
                "confidence": float,
                "evidence": {
                    "text_search_count": int,
                    "image_search_count": int,
                    "knowledge_graph": dict,
                    "image_urls": list,
                    "search_results": list
                }
            }
        """
        if not self.google:
            logger.warning("Google client not configured - skipping Google validation")
            return {
                "is_verified": False,
                "confidence": 0.0,
                "evidence": {}
            }

        try:
            # Use existing Google validation logic
            validation = self.google.validate_brand(
                brand_name=brand_name,
                context=category
            )

            # Extract evidence for UI display
            evidence = validation.get('evidence', {})
            logger.debug(f"📋 Validation evidence keys for '{brand_name}': {list(evidence.keys()) if isinstance(evidence, dict) else type(evidence)}")

            # Get image URLs from image search results
            image_urls = []
            try:
                image_results_data = evidence.get('image_results', [])
                if isinstance(image_results_data, list):
                    for img in image_results_data[:5]:
                        if isinstance(img, dict) and 'link' in img:
                            image_urls.append(img['link'])
            except Exception as e:
                logger.error(f"Failed to extract image URLs: {e}")

            # Get search result snippets
            search_snippets = []
            try:
                text_results_data = evidence.get('text_results', [])
                if isinstance(text_results_data, list):
                    for result in text_results_data[:3]:
                        if isinstance(result, dict):
                            search_snippets.append({
                                'title': result.get('title', ''),
                                'snippet': result.get('snippet', ''),
                                'link': result.get('link', '')
                            })
            except Exception as e:
                logger.error(f"Failed to extract search snippets: {e}")

            result = {
                "is_verified": validation.get('is_valid', False),
                "confidence": validation.get('confidence', 0.0),
                "evidence": {
                    "text_search_count": evidence.get('text_search_count', 0),
                    "image_search_count": evidence.get('image_search_count', 0),
                    "knowledge_graph": evidence.get('knowledge_graph', {}),
                    "image_urls": image_urls,
                    "search_results": search_snippets,
                    "brand_indicators": evidence.get('brand_indicators', [])
                }
            }

            logger.info(f"✅ Google validation for '{brand_name}': verified={result['is_verified']}, confidence={result['confidence']:.2f}, images={len(image_urls)}, results={len(search_snippets)}")
            return result

        except Exception as e:
            logger.error(f"Google validation failed for '{brand_name}': {e}", exc_info=True)
            return {
                "is_verified": False,
                "confidence": 0.0,
                "evidence": {"error": str(e)}
            }

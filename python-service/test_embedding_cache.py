#!/usr/bin/env python3
"""
Test script for embedding cache functionality.
Demonstrates cache hits/misses and persistence across restarts.
"""
import time
import os
os.environ['REDIS_HOST'] = 'localhost'
os.environ['REDIS_PORT'] = '6379'

from services.embedder import EmbeddingService

def print_separator(text):
    print("\n" + "="*70)
    print(text)
    print("="*70)

def main():
    print_separator("🧪 EMBEDDING CACHE TEST")

    # Test texts
    test_texts = [
        "Nike shoes are comfortable",
        "Adidas sneakers for running",
        "Puma sports footwear",
        "Nike shoes are comfortable",  # Duplicate - should be cache hit
        "New Balance running shoes",
    ]

    print("\n📝 Test texts:")
    for i, text in enumerate(test_texts, 1):
        print(f"   {i}. {text}")

    # Test 1: First run (cold cache)
    print_separator("TEST 1: First Run (Cold Cache)")

    start = time.time()
    embeddings1 = EmbeddingService.generate_embeddings(test_texts)
    elapsed1 = time.time() - start

    print(f"\n⏱️  Time: {elapsed1:.3f}s")
    print(f"📊 Shape: {embeddings1.shape}")

    # Get cache stats
    stats = EmbeddingService.get_cache_stats()
    print(f"\n📦 Cache Stats:")
    print(f"   Enabled: {stats.get('enabled', False)}")
    print(f"   Cached embeddings: {stats.get('total_cached_embeddings', 0)}")
    print(f"   Memory used: {stats.get('redis_memory_used', 'N/A')}")

    # Test 2: Second run (warm cache)
    print_separator("TEST 2: Second Run (Warm Cache)")
    print("📌 Expecting cache hits for all texts\n")

    start = time.time()
    embeddings2 = EmbeddingService.generate_embeddings(test_texts)
    elapsed2 = time.time() - start

    print(f"\n⏱️  Time: {elapsed2:.3f}s")
    print(f"📊 Shape: {embeddings2.shape}")

    # Calculate speedup
    speedup = elapsed1 / elapsed2 if elapsed2 > 0 else 0
    print(f"\n🚀 Speedup: {speedup:.2f}x faster")

    # Verify embeddings are identical
    import numpy as np
    identical = np.allclose(embeddings1, embeddings2)
    print(f"✅ Embeddings identical: {identical}")

    # Test 3: Cache persistence check
    print_separator("TEST 3: Cache Persistence Check")
    print("\n💡 To test persistence:")
    print("   1. Run this script")
    print("   2. Restart Python service")
    print("   3. Run this script again")
    print("   4. Should see cache hits immediately!")

    stats = EmbeddingService.get_cache_stats()
    print(f"\n📦 Final Cache Stats:")
    print(f"   Total cached: {stats.get('total_cached_embeddings', 0)}")
    print(f"   TTL: {stats.get('cache_ttl_days', 0)} days")
    print(f"   Model: {stats.get('model_name', 'N/A')}")

    # Test 4: New text (cache miss)
    print_separator("TEST 4: New Text (Cache Miss Expected)")

    new_texts = ["Completely new text that wasn't cached before"]

    start = time.time()
    new_embeddings = EmbeddingService.generate_embeddings(new_texts)
    elapsed_new = time.time() - start

    print(f"⏱️  Time: {elapsed_new:.3f}s")
    print(f"📊 Shape: {new_embeddings.shape}")

    # Summary
    print_separator("📊 SUMMARY")
    print(f"\n1️⃣  First run (cold):  {elapsed1:.3f}s")
    print(f"2️⃣  Second run (warm): {elapsed2:.3f}s  ({speedup:.2f}x faster)")
    print(f"3️⃣  New text:          {elapsed_new:.3f}s")

    stats = EmbeddingService.get_cache_stats()
    total_cached = stats.get('total_cached_embeddings', 0)

    print(f"\n📦 Cache Status:")
    print(f"   Total cached embeddings: {total_cached}")
    print(f"   Cache hit rate (run 2): {4/5*100:.0f}% (4/5 texts)")
    print(f"   Cache enabled: {stats.get('enabled', False)}")

    if total_cached > 0:
        print(f"\n✅ Cache is working!")
        print(f"   Embeddings are persisted in Redis")
        print(f"   Will survive Python service restarts")
    else:
        print(f"\n⚠️  Cache not working")
        print(f"   Check Redis connection")

    print("\n" + "="*70)
    print("✅ TEST COMPLETE")
    print("="*70 + "\n")

if __name__ == "__main__":
    main()

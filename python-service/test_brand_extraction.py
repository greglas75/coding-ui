#!/usr/bin/env python3
"""
Test script for brand extraction API endpoints.
Run this after starting the FastAPI server to verify all endpoints work correctly.
"""
import requests
import json
import sys
from typing import Dict, Any

BASE_URL = "http://localhost:8000"


def print_result(test_name: str, success: bool, data: Any = None):
    """Print test result in a formatted way."""
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"\n{status} - {test_name}")
    if data:
        print(json.dumps(data, indent=2))


def test_health_check():
    """Test health check endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        success = response.status_code == 200
        print_result("Health Check", success, response.json())
        return success
    except Exception as e:
        print_result("Health Check", False, {"error": str(e)})
        return False


def test_extract_brands():
    """Test brand extraction endpoint."""
    try:
        payload = {
            "texts": [
                "I always use Colgate toothpaste",
                "My favorite brands are Nike and Adidas",
                "I prefer Apple products over Samsung"
            ],
            "min_confidence": 0.3
        }

        response = requests.post(
            f"{BASE_URL}/api/extract-brands",
            json=payload,
            timeout=10
        )

        success = response.status_code == 200
        data = response.json() if success else {"error": response.text}

        if success:
            print_result(
                "Extract Brands",
                success,
                {
                    "brands_found": len(data["brands"]),
                    "processing_time_ms": data["processing_time_ms"],
                    "sample_brands": [b["normalized_name"] for b in data["brands"][:3]]
                }
            )
        else:
            print_result("Extract Brands", success, data)

        return success
    except Exception as e:
        print_result("Extract Brands", False, {"error": str(e)})
        return False


def test_normalize_brand():
    """Test brand normalization endpoint."""
    try:
        payload = {
            "brand_name": "Colagte",  # Intentional typo
            "threshold": 0.8
        }

        response = requests.post(
            f"{BASE_URL}/api/normalize-brand",
            json=payload,
            timeout=10
        )

        success = response.status_code == 200
        data = response.json() if success else {"error": response.text}

        if success:
            print_result(
                "Normalize Brand",
                success,
                {
                    "original": data["original"],
                    "normalized": data["normalized"],
                    "known_match": data["known_brand_match"],
                    "confidence": data["match_confidence"]
                }
            )
        else:
            print_result("Normalize Brand", success, data)

        return success
    except Exception as e:
        print_result("Normalize Brand", False, {"error": str(e)})
        return False


def test_validate_brand():
    """Test brand validation endpoint."""
    try:
        payload = {
            "brand_name": "Colgate",
            "context": "toothpaste",
            "use_google_search": True,
            "use_google_images": True
        }

        response = requests.post(
            f"{BASE_URL}/api/validate-brand",
            json=payload,
            timeout=15
        )

        success = response.status_code == 200
        data = response.json() if success else {"error": response.text}

        if success:
            print_result(
                "Validate Brand",
                success,
                {
                    "brand": data["brand_name"],
                    "is_valid": data["is_valid"],
                    "confidence": data["confidence"],
                    "reasoning": data["reasoning"],
                    "validation_methods": data["evidence"].get("validation_methods", [])
                }
            )
        else:
            print_result("Validate Brand", success, data)

        return success
    except Exception as e:
        print_result("Validate Brand", False, {"error": str(e)})
        return False


def test_cache_stats():
    """Test cache stats endpoint."""
    try:
        response = requests.get(f"{BASE_URL}/api/brand-cache/stats", timeout=5)
        success = response.status_code == 200
        data = response.json() if success else {"error": response.text}
        print_result("Cache Stats", success, data)
        return success
    except Exception as e:
        print_result("Cache Stats", False, {"error": str(e)})
        return False


def test_validate_brand_cached():
    """Test brand validation with cache hit."""
    try:
        # First call should populate cache
        payload = {
            "brand_name": "Nike",
            "context": "sports apparel",
            "use_google_search": False,
            "use_google_images": False
        }

        response1 = requests.post(
            f"{BASE_URL}/api/validate-brand",
            json=payload,
            timeout=10
        )

        # Second call should hit cache
        response2 = requests.post(
            f"{BASE_URL}/api/validate-brand",
            json=payload,
            timeout=10
        )

        success = (
            response1.status_code == 200 and
            response2.status_code == 200
        )

        if success:
            data1 = response1.json()
            data2 = response2.json()

            print_result(
                "Brand Validation Cache",
                success,
                {
                    "first_call_time_ms": data1["processing_time_ms"],
                    "second_call_time_ms": data2["processing_time_ms"],
                    "cached": data2["processing_time_ms"] < data1["processing_time_ms"],
                    "confidence": data2["confidence"]
                }
            )
        else:
            print_result("Brand Validation Cache", success, {"error": "Request failed"})

        return success
    except Exception as e:
        print_result("Brand Validation Cache", False, {"error": str(e)})
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("Brand Extraction API Tests")
    print("=" * 60)

    # Check if server is running
    print("\n🔍 Checking if server is running...")
    if not test_health_check():
        print("\n❌ Server is not running. Start it with: python main.py")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("Running tests...")
    print("=" * 60)

    tests = [
        ("Extract Brands", test_extract_brands),
        ("Normalize Brand", test_normalize_brand),
        ("Validate Brand", test_validate_brand),
        ("Cache Stats", test_cache_stats),
        ("Cached Validation", test_validate_brand_cached),
    ]

    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' crashed: {str(e)}")
            results.append((test_name, False))

    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {test_name}")

    print(f"\n📊 Results: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
        sys.exit(0)
    else:
        print(f"\n⚠️ {total - passed} test(s) failed")
        sys.exit(1)


if __name__ == "__main__":
    main()

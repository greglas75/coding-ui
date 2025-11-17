# test_paid_tier.py
import requests
import os
import time

api_key = os.getenv(AIzaSyAn5fu1ssz7OSRDy7maNjsDARbzg5o9LZE)
cx_id = os.getenv(40c7a1c1f37434455)

print("Testing paid tier limits...")
print(f"API Key: {api_key[:10]}...{api_key[-5:]}")
print(f"CX ID: {cx_id}")

# Try 110 requests (should work with paid tier)
success_count = 0
fail_count = 0

for i in range(110):
    response = requests.get(
        "https://www.googleapis.com/customsearch/v1",
        params={
            "key": api_key,
            "cx": cx_id,
            "q": f"test {i}"
        }
    )
    
    if response.status_code == 200:
        success_count += 1
        print(f"✅ Request {i+1}: SUCCESS")
    elif response.status_code == 429:
        fail_count += 1
        print(f"❌ Request {i+1}: QUOTA EXCEEDED - Free tier detected!")
        break
    else:
        print(f"⚠️  Request {i+1}: {response.status_code}")
    
    time.sleep(0.5)  # Rate limiting

print(f"\n📊 Results:")
print(f"  Success: {success_count}")
print(f"  Failed: {fail_count}")

if success_count > 100:
    print("✅ PAID TIER CONFIRMED!")
else:
    print("❌ FREE TIER DETECTED - Fix configuration!")
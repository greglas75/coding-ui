"""
Update existing brands with comprehensive validation data
Fetches images from answers and runs ComprehensiveValidator
"""

import asyncio
import json
import os
from dotenv import load_dotenv
from supabase import create_client, Client
from validators.comprehensive_validator import ComprehensiveValidator

load_dotenv()

# Initialize Supabase
supabase: Client = create_client(
    os.getenv("VITE_SUPABASE_URL"),
    os.getenv("VITE_SUPABASE_ANON_KEY")
)

async def update_brand(brand_id: str, brand_name: str, validator: ComprehensiveValidator):
    """Update a single brand with comprehensive validation"""
    print(f"\n🔄 Updating brand: {brand_name} ({brand_id})")

    # 1. Find answers for this brand (use selected_code or ai_suggested_code)
    response = supabase.table('answers').select('*').eq('category_id', 2).or_(f'selected_code.eq.{brand_name},ai_suggested_code.eq.{brand_name}').limit(10).execute()

    if not response.data:
        print(f"  ⚠️  No answers found for '{brand_name}'")
        return False

    answers = response.data
    print(f"  ✓ Found {len(answers)} answers")

    # 2. Extract images from ai_suggestions
    image_urls = []
    for answer in answers:
        ai_sug = answer.get('ai_suggestions', {})
        if isinstance(ai_sug, dict) and 'images' in ai_sug:
            for img in ai_sug['images'][:6]:  # Max 6 images
                if 'link' in img:
                    image_urls.append(img['link'])

    print(f"  ✓ Found {len(image_urls)} product images")

    if not image_urls:
        print(f"  ⚠️  No images found, skipping validation")
        return False

    # 3. Get user_response (original text in local language)
    user_response = answers[0].get('answer_text', brand_name)

    # 4. Mock Google search results (we don't have real ones stored)
    google_search_results = {
        "query": user_response,
        "web_results": []
    }

    try:
        # 5. Run ComprehensiveValidator
        print(f"  🔍 Running comprehensive validation...")
        result = await validator.validate_response(
            user_response=user_response,
            images=image_urls,
            google_search_results=google_search_results,
            language_code=answers[0].get('language', 'en')
        )

        # 6. Update database
        validation_data = result.dict()

        update_response = supabase.table('codeframe_hierarchy').update({
            'validation_evidence': validation_data
        }).eq('id', brand_id).execute()

        print(f"  ✅ Updated with confidence: {result.confidence}/100")
        print(f"  📊 Recommendation: {result.recommendation}")
        print(f"  🎯 Vision analysis: {result.vision_analysis.get('products_identified', 0)} products")
        return True

    except Exception as e:
        print(f"  ❌ Validation failed: {e}")
        return False

async def main():
    print("\n🚀 Updating brands with comprehensive validation...\n")
    print("=" * 80)

    # Initialize validator with Google API key
    validator = ComprehensiveValidator(
        google_api_key=os.getenv('GOOGLE_API_KEY'),
        openai_key=os.getenv('OPENAI_API_KEY')
    )

    # Get all brands from latest completed generation
    response = supabase.table('codeframe_generations').select('id, config').eq('status', 'completed').order('created_at', desc=True).limit(10).execute()

    if not response.data:
        print("❌ No completed generations found")
        return

    # Find first brand generation
    generation_id = None
    for gen in response.data:
        if gen.get('config', {}).get('coding_type') == 'brand':
            generation_id = gen['id']
            break

    if not generation_id:
        print("❌ No completed brand generations found")
        return
    print(f"📋 Using generation: {generation_id}\n")

    # Get brands from this generation
    brands_response = supabase.table('codeframe_hierarchy').select('id, name').eq('generation_id', generation_id).limit(5).execute()  # Start with 5 brands

    if not brands_response.data:
        print("❌ No brands found in this generation")
        return

    brands = brands_response.data
    print(f"🎯 Found {len(brands)} brands to update\n")

    # Update each brand
    updated = 0
    for brand in brands:
        success = await update_brand(brand['id'], brand['name'], validator)
        if success:
            updated += 1
        await asyncio.sleep(2)  # Rate limiting

    print("\n" + "=" * 80)
    print(f"\n✅ Updated {updated}/{len(brands)} brands")
    print("\n🔗 Refresh your browser to see the new validation data!")

if __name__ == "__main__":
    asyncio.run(main())

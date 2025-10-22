/**
 * Test Google Image Search API - Show raw results
 *
 * Usage: node test-image-search.js "toothpaste ps2"
 */

const query = process.argv[2] || 'toothpaste ps2';

// Read API keys from localStorage (you'll need to add them manually)
const API_KEY = process.env.GOOGLE_CSE_API_KEY || 'YOUR_API_KEY_HERE';
const CX_ID = process.env.GOOGLE_CSE_CX_ID || 'YOUR_CX_ID_HERE';

async function testImageSearch(searchQuery) {
  console.log(`\n🔍 Searching for: "${searchQuery}"\n`);

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('q', searchQuery);
  url.searchParams.set('key', API_KEY);
  url.searchParams.set('cx', CX_ID);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '6');

  console.log(`📡 API URL: ${url.toString().replace(API_KEY, 'API_KEY_HIDDEN')}\n`);

  try {
    const response = await fetch(url.toString());

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ HTTP Error ${response.status}:`, errorText);
      return;
    }

    const data = await response.json();

    if (data.error) {
      console.error(`❌ API Error ${data.error.code}: ${data.error.message}`);
      return;
    }

    const items = data.items || [];

    console.log(`✅ Found ${items.length} images\n`);
    console.log('=' .repeat(80));

    items.forEach((item, idx) => {
      console.log(`\n📸 Image ${idx + 1}/${items.length}`);
      console.log('─'.repeat(80));
      console.log(`Title:        ${item.title}`);
      console.log(`Link:         ${item.link}`);
      console.log(`Display Link: ${item.displayLink || 'N/A'} ✨ DOMAIN`);
      console.log(`Snippet:      ${item.snippet || 'N/A'} ✨ DESCRIPTION`);
      console.log(`MIME:         ${item.mime || 'N/A'}`);
      console.log(`File Format:  ${item.fileFormat || 'N/A'}`);

      if (item.image) {
        console.log(`\n📐 Image Details:`);
        console.log(`  Width:       ${item.image.width || 'N/A'}px ✨`);
        console.log(`  Height:      ${item.image.height || 'N/A'}px ✨`);
        console.log(`  Size:        ${item.image.byteSize ? `${Math.round(item.image.byteSize / 1024)}KB` : 'N/A'} ✨`);
        console.log(`  Thumbnail:   ${item.image.thumbnailLink || 'N/A'}`);
        console.log(`  Context:     ${item.image.contextLink || 'N/A'}`);
      }

      console.log('─'.repeat(80));
    });

    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));

    const domains = [...new Set(items.map(i => i.displayLink).filter(Boolean))];
    const avgWidth = Math.round(items.reduce((sum, i) => sum + (i.image?.width || 0), 0) / items.length);
    const avgHeight = Math.round(items.reduce((sum, i) => sum + (i.image?.height || 0), 0) / items.length);
    const totalSize = items.reduce((sum, i) => sum + (i.image?.byteSize || 0), 0);

    console.log(`Total Images:    ${items.length}`);
    console.log(`Unique Domains:  ${domains.length} → ${domains.join(', ')}`);
    console.log(`Avg Dimensions:  ${avgWidth}×${avgHeight}px`);
    console.log(`Total Size:      ${Math.round(totalSize / 1024)}KB`);
    console.log('='.repeat(80) + '\n');

    // Show full JSON for first item
    console.log('\n📋 FULL JSON (First Item):\n');
    console.log(JSON.stringify(items[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Check if API keys are set
if (API_KEY === 'YOUR_API_KEY_HERE' || CX_ID === 'YOUR_CX_ID_HERE') {
  console.log('❌ Please set environment variables:');
  console.log('   export GOOGLE_CSE_API_KEY="your-api-key"');
  console.log('   export GOOGLE_CSE_CX_ID="your-cx-id"');
  console.log('\nOr edit this file and replace YOUR_API_KEY_HERE and YOUR_CX_ID_HERE');
  process.exit(1);
}

testImageSearch(query);

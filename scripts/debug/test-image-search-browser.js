/**
 * Test Google Image Search API - Browser Console Version
 *
 * USAGE:
 * 1. Open browser console (F12)
 * 2. Go to Settings page (to ensure API keys are loaded)
 * 3. Copy-paste this entire file into console
 * 4. Run: testImageSearch("toothpaste ps2")
 */

async function testImageSearch(query = 'toothpaste ps2') {
  console.log(`\n🔍 Searching for: "${query}"\n`);

  // Get API keys from localStorage (set in Settings page)
  const apiKey = localStorage.getItem('google_cse_api_key');
  const cxId = localStorage.getItem('google_cse_cx_id');

  if (!apiKey || !cxId) {
    console.error('❌ API keys not found! Please configure them in Settings page.');
    return;
  }

  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);
  url.searchParams.set('cx', cxId);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '6');

  console.log(`📡 Calling Google Image Search API...`);

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
    console.log('%c' + '='.repeat(80), 'color: cyan');

    items.forEach((item, idx) => {
      console.log(`\n%c📸 Image ${idx + 1}/${items.length}`, 'color: yellow; font-weight: bold');
      console.log('%c' + '─'.repeat(80), 'color: gray');

      console.log('%cTitle:', 'color: lightblue', item.title);
      console.log('%cLink:', 'color: lightblue', item.link);
      console.log('%c✨ Display Link:', 'color: lime; font-weight: bold', item.displayLink || 'N/A', '%c← DOMAIN', 'color: orange');
      console.log('%c✨ Snippet:', 'color: lime; font-weight: bold', item.snippet || 'N/A', '%c← DESCRIPTION', 'color: orange');
      console.log('%cMIME:', 'color: lightblue', item.mime || 'N/A');
      console.log('%cFile Format:', 'color: lightblue', item.fileFormat || 'N/A');

      if (item.image) {
        console.log(`\n%c📐 Image Details:`, 'color: cyan');
        console.log('%c  ✨ Width:', 'color: lime; font-weight: bold', `${item.image.width || 'N/A'}px`);
        console.log('%c  ✨ Height:', 'color: lime; font-weight: bold', `${item.image.height || 'N/A'}px`);
        console.log('%c  ✨ Size:', 'color: lime; font-weight: bold', item.image.byteSize ? `${Math.round(item.image.byteSize / 1024)}KB` : 'N/A');
        console.log('%c  Thumbnail:', 'color: lightblue', item.image.thumbnailLink || 'N/A');
        console.log('%c  Context:', 'color: lightblue', item.image.contextLink || 'N/A');
      }

      // Show image preview
      if (item.image?.thumbnailLink) {
        console.log(`\n%cPreview:`, 'color: yellow');
        const img = new Image();
        img.src = item.image.thumbnailLink;
        img.onload = () => {
          console.log('%c       ', `
            font-size: 1px;
            padding: 50px 50px;
            background: url(${item.image.thumbnailLink}) no-repeat center;
            background-size: contain;
          `);
        };
      }

      console.log('%c' + '─'.repeat(80), 'color: gray');
    });

    console.log('\n%c' + '='.repeat(80), 'color: cyan');
    console.log('%c📊 SUMMARY', 'color: yellow; font-size: 16px; font-weight: bold');
    console.log('%c' + '='.repeat(80), 'color: cyan');

    const domains = [...new Set(items.map(i => i.displayLink).filter(Boolean))];
    const avgWidth = Math.round(items.reduce((sum, i) => sum + (i.image?.width || 0), 0) / items.length);
    const avgHeight = Math.round(items.reduce((sum, i) => sum + (i.image?.height || 0), 0) / items.length);
    const totalSize = items.reduce((sum, i) => sum + (i.image?.byteSize || 0), 0);

    console.log(`%cTotal Images:`, 'color: lightblue', items.length);
    console.log(`%c✨ Unique Domains:`, 'color: lime; font-weight: bold', `${domains.length} → ${domains.join(', ')}`);
    console.log(`%c✨ Avg Dimensions:`, 'color: lime; font-weight: bold', `${avgWidth}×${avgHeight}px`);
    console.log(`%c✨ Total Size:`, 'color: lime; font-weight: bold', `${Math.round(totalSize / 1024)}KB`);
    console.log('%c' + '='.repeat(80), 'color: cyan');

    // Show full JSON for first item
    console.log('\n%c📋 FULL JSON (First Item):', 'color: yellow; font-weight: bold');
    console.log(items[0]);

    console.log('\n%c📋 ALL RAW DATA:', 'color: yellow; font-weight: bold');
    console.log(data);

    return data;

  } catch (error) {
    console.error('%c❌ Error:', 'color: red; font-weight: bold', error.message);
    console.error(error);
  }
}

console.log('%c🚀 Test script loaded!', 'color: lime; font-size: 16px; font-weight: bold');
console.log('%cUsage: testImageSearch("toothpaste ps2")', 'color: cyan');
console.log('%cOr try: testImageSearch("sensodyne")', 'color: cyan');

// Auto-run with default query
console.log('\n%c▶️ Running test with default query...', 'color: yellow; font-weight: bold');
testImageSearch('toothpaste ps2');

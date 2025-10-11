// ═══════════════════════════════════════════════════════════════
// 🏷️ Brand Validator - Real brand verification with Google Search
// ═══════════════════════════════════════════════════════════════

import { googleImageSearch, googleSearch } from './webContextProvider';
import { logInfo } from '../utils/logger';
import { setCache, getCache } from './cacheLayer';

export interface BrandValidationResult {
  valid: boolean;
  confidence: number; // 0.0 - 1.0
  reasoning: string;
  evidence: {
    textSearchMatches: number;
    imageSearchMatches: number;
    brandIndicators: string[];
  };
}

/**
 * Validates if a term represents a real, verifiable brand.
 *
 * Uses Google Search (text) + Google Image Search to find:
 * - Product pages
 * - Brand logos
 * - Product packaging
 * - Retail listings
 *
 * @param term - Brand name to validate
 * @param category - Product category (e.g., "toothpaste", "payment app")
 * @returns Validation result with confidence score
 */
export async function isRealBrand(
  term: string,
  category: string
): Promise<BrandValidationResult> {
  if (!term || term.trim().length === 0) {
    return {
      valid: false,
      confidence: 0,
      reasoning: 'Empty term provided',
      evidence: { textSearchMatches: 0, imageSearchMatches: 0, brandIndicators: [] },
    };
  }

  // Check cache first
  const cacheKey = `${term}:${category}`;
  const cached = getCache<BrandValidationResult>(cacheKey, { namespace: 'qa' });

  if (cached) {
    logInfo(`Brand validation cache hit: "${term}"`, {
      component: 'BrandValidator',
      tags: { cached: 'true' },
    });
    return cached;
  }

  logInfo(`Validating brand: "${term}" in category "${category}"`, {
    component: 'BrandValidator',
  });

  // Build search query
  const query = `${term} ${category}`;

  // Perform parallel searches
  const [textResults, imageResults] = await Promise.all([
    googleSearch(query, { numResults: 5 }),
    googleImageSearch(query, 5),
  ]);

  // Analyze text search results
  const brandIndicators: string[] = [];
  let textMatches = 0;

  for (const result of textResults) {
    const titleMatch = result.title.toLowerCase().includes(term.toLowerCase());
    const snippetMatch = result.snippet.toLowerCase().includes(term.toLowerCase());

    if (titleMatch || snippetMatch) {
      textMatches++;

      // Look for brand indicators in text
      if (/\b(brand|product|buy|shop|official|store)\b/i.test(result.snippet)) {
        brandIndicators.push('retail_presence');
      }
      if (/\b(company|corporation|inc\.|ltd\.|llc)\b/i.test(result.snippet)) {
        brandIndicators.push('corporate_entity');
      }
      if (/\b(logo|trademark|®|™)\b/i.test(result.snippet)) {
        brandIndicators.push('trademark');
      }
    }
  }

  // Analyze image search results
  let imageMatches = 0;

  for (const result of imageResults) {
    const hasLogo = /\b(logo|brand|official)\b/i.test(result.title);
    const hasPackaging = /\b(packaging|package|product|box)\b/i.test(result.title);
    const hasProduct = /\b(product|item|bottle|tube|container)\b/i.test(result.title);

    if (hasLogo || hasPackaging || hasProduct) {
      imageMatches++;

      if (hasLogo && !brandIndicators.includes('logo_found')) {
        brandIndicators.push('logo_found');
      }
      if (hasPackaging && !brandIndicators.includes('packaging_found')) {
        brandIndicators.push('packaging_found');
      }
    }
  }

  // Calculate confidence score
  let confidence = 0;

  // Text matches contribute 50%
  confidence += Math.min(textMatches / 3, 1.0) * 0.5;

  // Image matches contribute 50%
  confidence += Math.min(imageMatches / 3, 1.0) * 0.5;

  // Bonus for strong indicators
  if (brandIndicators.includes('logo_found')) confidence += 0.1;
  if (brandIndicators.includes('trademark')) confidence += 0.1;
  if (brandIndicators.includes('packaging_found')) confidence += 0.1;

  confidence = Math.min(1.0, confidence);

  // Determine validity
  const valid = confidence >= 0.5; // Threshold: 50% confidence

  // Build reasoning
  let reasoning = '';
  if (valid) {
    if (brandIndicators.length > 0) {
      reasoning = `Verified brand: found ${textMatches} text matches and ${imageMatches} image matches. `;
      reasoning += `Evidence: ${brandIndicators.join(', ')}.`;
    } else {
      reasoning = `Brand found in ${textMatches} search results and ${imageMatches} images.`;
    }
  } else {
    if (textMatches === 0 && imageMatches === 0) {
      reasoning = 'No verifiable web presence found for this brand name.';
    } else {
      reasoning = `Limited evidence: only ${textMatches} text + ${imageMatches} image matches (below threshold).`;
    }
  }

  const result: BrandValidationResult = {
    valid,
    confidence,
    reasoning,
    evidence: {
      textSearchMatches: textMatches,
      imageSearchMatches: imageMatches,
      brandIndicators,
    },
  };

  // Cache result (12 hours for brand validation - brands don't change often)
  setCache(cacheKey, result, { namespace: 'qa', ttl: 12 * 3600000 });

  logInfo(`Brand validation complete: ${valid ? 'VALID' : 'INVALID'} (confidence: ${confidence.toFixed(2)})`, {
    component: 'BrandValidator',
    extra: { term, category, confidence, valid },
  });

  return result;
}

/**
 * Batch validates multiple brands.
 */
export async function validateBrandsBatch(
  terms: string[],
  category: string
): Promise<BrandValidationResult[]> {
  const results: BrandValidationResult[] = [];

  for (const term of terms) {
    const result = await isRealBrand(term, category);
    results.push(result);

    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return results;
}

/**
 * Quick check if brand is likely real (simplified, no API calls).
 * Uses heuristics only.
 */
export function isLikelyRealBrand(term: string): boolean {
  if (!term || term.trim().length === 0) return false;

  const clean = term.trim();

  // Too short - unlikely brand
  if (clean.length < 3) return false;

  // All lowercase - unlikely brand
  if (clean === clean.toLowerCase()) return false;

  // Contains numbers in weird ways - likely fake
  if (/\d{3,}/.test(clean)) return false;

  // Generic terms - not brands
  const genericTerms = ['product', 'item', 'thing', 'stuff', 'brand', 'other', 'none', 'n/a'];
  if (genericTerms.includes(clean.toLowerCase())) return false;

  // Has proper capitalization - likely real
  if (/^[A-Z][a-z]+/.test(clean)) return true;

  return true; // Default to possibly real
}


/**
 * Evidence Score Calculation
 * Validates AI suggestions by analyzing web search results, images, and vision analysis
 */

import type { ImageResult, WebContext } from './types';

/**
 * Calculate evidence score from web search results and images
 *
 * This function validates AI suggestions by analyzing Google search results,
 * images, and Gemini vision analysis to boost confidence when strong evidence is found.
 */
export function calculateEvidenceScore(
  brandName: string,
  webContext: WebContext[],
  images: ImageResult[],
  visionResult?: any
): { boost: number; details: string } {
  let boost = 0;
  const evidenceItems: string[] = [];

  // Normalize brand name for comparison (lowercase, no spaces)
  const normalizedBrand = brandName.toLowerCase().replace(/\s+/g, '');

  // ═══════════════════════════════════════════════════════════
  // 1. Check Web Search Results
  // ═══════════════════════════════════════════════════════════
  if (webContext.length > 0) {
    let hasOfficialSite = false;
    let hasRetailSite = false;
    let brandMentions = 0;
    let brandConsistency = 0;
    const totalResults = webContext.length;

    for (const result of webContext) {
      const url = result.url.toLowerCase();
      const title = result.title.toLowerCase();
      const snippet = result.snippet.toLowerCase();

      // Check if brand name appears in URL (strong evidence)
      if (url.includes(normalizedBrand)) {
        brandMentions++;
        brandConsistency++;

        // Check for official website (domain matches brand)
        if (url.includes(`.${normalizedBrand}.com`) || url.includes(`//${normalizedBrand}.`)) {
          hasOfficialSite = true;
        }
      }

      // Check if brand appears in title or snippet
      if (title.includes(normalizedBrand) || snippet.includes(normalizedBrand)) {
        brandMentions++;
        brandConsistency++;
      }

      // Check for e-commerce/retail sites
      const retailDomains = [
        'amazon',
        'walmart',
        'target',
        'ebay',
        'shopify',
        'carrefour',
        'allegro',
      ];
      if (retailDomains.some(domain => url.includes(domain))) {
        hasRetailSite = true;
      }
    }

    // Calculate boost from web results
    if (hasOfficialSite) {
      boost += 0.1; // +10% for official website
      evidenceItems.push('official site');
    }

    if (hasRetailSite) {
      boost += 0.05; // +5% for retail presence
      evidenceItems.push('retail sites');
    }

    if (brandMentions >= 2) {
      boost += 0.03; // +3% for multiple mentions
      evidenceItems.push(`${brandMentions} mentions`);
    }

    // Brand Consistency Check (AGGRESSIVE - penalize mixed results)
    const consistencyRatio = brandConsistency / totalResults;

    if (consistencyRatio >= 0.8) {
      boost += 0.15; // +15% for high brand consistency
      evidenceItems.push('high brand consistency across results');
    } else if (consistencyRatio >= 0.6) {
      boost -= 0.1; // -10% for mixed brand results (penalty for 60-80%)
      evidenceItems.push('medium brand consistency - reduced confidence');
    } else if (consistencyRatio >= 0.4) {
      boost -= 0.1; // -10% for mixed brand results
      evidenceItems.push('mixed brand results - reduced confidence');
    } else {
      boost -= 0.2; // -20% for low brand consistency
      evidenceItems.push('multiple different brands dominate results');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 2. Check Image Search Results with BRAND CONSISTENCY
  // ═══════════════════════════════════════════════════════════
  if (images.length > 0) {
    let productImagesFound = 0;
    let brandConsistencyImages = 0;
    const totalImages = images.length;

    for (const image of images) {
      const imageUrl = image.link.toLowerCase();
      const imageTitle = image.title.toLowerCase();

      if (imageUrl.includes(normalizedBrand) || imageTitle.includes(normalizedBrand)) {
        productImagesFound++;
        brandConsistencyImages++;
      }
    }

    const imageConsistencyRatio = brandConsistencyImages / totalImages;

    if (imageConsistencyRatio >= 0.8) {
      boost += 0.15; // +15% for high image brand consistency
      evidenceItems.push('high image brand consistency');
    } else if (imageConsistencyRatio >= 0.6) {
      boost -= 0.1; // -10% for mixed brand images
      evidenceItems.push('medium image brand consistency - reduced confidence');
    } else if (imageConsistencyRatio >= 0.4) {
      boost -= 0.1; // -10% for mixed brand images
      evidenceItems.push('mixed brand images - reduced confidence');
    } else if (imageConsistencyRatio < 0.4) {
      boost -= 0.2; // -20% for low image brand consistency
      evidenceItems.push('multiple different brands in images');
    }

    if (productImagesFound >= 4) {
      boost += 0.05; // +5% for many product images
      evidenceItems.push('many product images');
    } else if (productImagesFound >= 2) {
      boost += 0.02; // +2% for some product images
      evidenceItems.push('product images');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. Penalty for lack of evidence
  // ═══════════════════════════════════════════════════════════
  if (webContext.length === 0 && images.length === 0) {
    boost = -0.1; // -10% if no web evidence at all
    evidenceItems.push('no web evidence found');
  } else if (webContext.length === 0) {
    boost -= 0.05; // -5% if no search results
    evidenceItems.push('no search results');
  }

  // ═══════════════════════════════════════════════════════════
  // 4. Vision AI Analysis (Gemini) with BRAND CONSISTENCY
  // ═══════════════════════════════════════════════════════════
  if (visionResult) {
    const visionBrandMatch = visionResult.brandName.toLowerCase() === brandName.toLowerCase();

    if (visionResult.brandDetected && visionBrandMatch) {
      let hasMixedBrands = false;
      const detectedBrands = new Set();

      if (visionResult.objectsDetected && visionResult.objectsDetected.length > 0) {
        visionResult.objectsDetected.forEach((obj: string) => {
          const objLower = obj.toLowerCase();
          if (objLower.includes('sensodyne')) detectedBrands.add('sensodyne');
          if (objLower.includes('oral-b') || objLower.includes('oralb'))
            detectedBrands.add('oral-b');
          if (objLower.includes('parodontax')) detectedBrands.add('parodontax');
          if (objLower.includes('crest')) detectedBrands.add('crest');
          if (objLower.includes('colgate')) detectedBrands.add('colgate');
          if (objLower.includes('burts') || objLower.includes("burt's"))
            detectedBrands.add('burts');
        });

        if (detectedBrands.size > 1) {
          hasMixedBrands = true;
        }
      }

      if (hasMixedBrands) {
        boost -= 0.15; // -15% penalty for mixed brands in Vision AI
        evidenceItems.push(
          `vision AI ignored due to ${detectedBrands.size} different brands detected (mixed results)`
        );
      } else {
        const totalObjects = visionResult.objectsDetected?.length || 0;
        const brandObjects =
          visionResult.objectsDetected?.filter((obj: string) =>
            obj.toLowerCase().includes(brandName.toLowerCase())
          ).length || 0;

        const consistencyRatio = totalObjects > 0 ? brandObjects / totalObjects : 0;

        if (consistencyRatio >= 0.8) {
          if (visionResult.confidence >= 0.8) {
            boost += 0.15; // +15% for high confidence vision match
            evidenceItems.push('strong visual confirmation');
          } else if (visionResult.confidence >= 0.6) {
            boost += 0.1; // +10% for medium confidence
            evidenceItems.push('visual match detected');
          } else if (visionResult.confidence >= 0.4) {
            boost += 0.05; // +5% for weak match
            evidenceItems.push('possible visual match');
          }

          if (visionResult.objectsDetected && visionResult.objectsDetected.length >= 3) {
            boost += 0.03; // +3% for detailed visual analysis
            evidenceItems.push('multiple elements');
          }
        } else {
          boost -= 0.1; // -10% penalty for low consistency
          evidenceItems.push(
            `vision AI ignored - low consistency (${Math.round(consistencyRatio * 100)}% same brand)`
          );
        }
      }
    } else if (visionResult.brandDetected && !visionBrandMatch) {
      boost -= 0.08; // -8% for conflicting visual evidence
      evidenceItems.push(`vision detected "${visionResult.brandName}"`);
    } else if (!visionResult.brandDetected) {
      boost -= 0.03; // -3% for no visual confirmation
      evidenceItems.push('no visual brand detected');
    }
  }

  const details = evidenceItems.length > 0 ? evidenceItems.join(', ') : 'no evidence';

  return { boost, details };
}


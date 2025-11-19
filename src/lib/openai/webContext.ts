/**
 * Web Context & Image Fetching
 */

import { buildWebContextSection, googleImageSearch } from '../../services/webContextProvider';
import { simpleLogger } from '../../utils/logger';
import type { VisionAnalysisResult } from '../../services/geminiVision';
import type { CategorizeRequest, ImageResult, WebContext } from './types';

/**
 * Build search query from request
 */
export function buildSearchQuery(request: CategorizeRequest): string {
  const searchText = request.answerTranslation || request.answer;
  const searchLower = searchText.toLowerCase().trim();
  const categoryLower = request.categoryName.toLowerCase();
  const alreadyIncludesCategory = searchLower.startsWith(categoryLower);

  return alreadyIncludesCategory
    ? searchText.trim()
    : `${request.categoryName} ${searchText}`.trim();
}

/**
 * Fetch web context and images (fallback system)
 */
export async function fetchWebContextAndImages(
  request: CategorizeRequest,
  localizedQuery: string
): Promise<{ webContext: WebContext[]; images: ImageResult[]; visionResult: VisionAnalysisResult | null }> {
  let webContext: WebContext[] = [];
  let images: ImageResult[] = [];
  let visionResult: VisionAnalysisResult | null = null;

  try {
    simpleLogger.info(`🌐 Fetching web context for: "${request.answer.substring(0, 50)}..."`);
    simpleLogger.info(`🔍 Search query: "${localizedQuery}"`);

    // Build web context section
    await buildWebContextSection(localizedQuery, {
      enabled: true,
      numResults: 6,
    });

    // Get raw results for modal
    const { googleSearch } = await import('../../services/webContextProvider');
    webContext = await googleSearch(localizedQuery, { numResults: 6 });
    simpleLogger.info(`✅ Found ${webContext.length} web results`);

    // Fetch related images
    simpleLogger.info(`🖼️ Fetching related images...`);
    images = await googleImageSearch(localizedQuery, 6);
    simpleLogger.info(`✅ Found ${images.length} images`);

    // Vision AI analysis (if configured)
    if (images.length > 0 && request.visionModel) {
      simpleLogger.info(`👁️ Analyzing images with ${request.visionModel}...`);
      try {
        const { analyzeImagesWithGemini } = await import('../../services/geminiVision');
        const brandNames = request.codes.map(c => c.name);
        visionResult = await analyzeImagesWithGemini(
          images,
          request.answer,
          brandNames,
          request.visionModel
        );
        simpleLogger.info('✅ Vision analysis result:', visionResult);
      } catch (visionError) {
        simpleLogger.warn('⚠️ Vision analysis failed:', visionError);
      }
    }
  } catch (error) {
    simpleLogger.warn('⚠️ Web context fetch failed, continuing without it:', error);
  }

  return { webContext, images, visionResult };
}


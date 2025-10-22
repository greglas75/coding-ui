/**
 * 👁️ Gemini Vision API Client
 *
 * Analyzes images using Google Gemini's vision capabilities
 * to detect brands, logos, products, and places.
 */

import type { ImageResult } from '../types';

export interface VisionAnalysisResult {
  brandDetected: boolean;
  brandName: string;
  confidence: number;
  reasoning: string;
  objectsDetected: string[];
}

/**
 * Analyze images using Gemini Vision API
 */
export async function analyzeImagesWithGemini(
  images: ImageResult[],
  searchQuery: string,
  availableBrands: string[],
  visionModel: string = 'gemini-2.5-flash-lite'
): Promise<VisionAnalysisResult> {
  try {
    console.log(`🔍 Analyzing ${images.length} images with ${visionModel}...`);

    // Get Gemini API key from localStorage
    const apiKey = localStorage.getItem('google_gemini_api_key');

    if (!apiKey) {
      console.warn('⚠️ No Gemini API key found - skipping vision analysis');
      return {
        brandDetected: false,
        brandName: '',
        confidence: 0,
        reasoning: 'No Gemini API key configured',
        objectsDetected: [],
      };
    }

    // Prepare image URLs for analysis (max 6 images)
    const imageUrls = images.slice(0, 6).map(img => img.link);

    // Build prompt for Gemini
    const prompt = `You are analyzing images from a Google Image search for: "${searchQuery}"

TASK: Detect if these images show a specific brand, product, or place.

AVAILABLE BRANDS TO MATCH:
${availableBrands.join(', ')}

For each image, look for:
- Brand logos and names
- Product packaging
- Building names or signage
- Distinctive visual elements

Respond with JSON:
{
  "brandDetected": boolean,
  "brandName": "exact brand name from the list or empty string",
  "confidence": 0-100,
  "reasoning": "brief explanation",
  "objectsDetected": ["object1", "object2", ...]
}

Rules:
- Only use exact brand names from the available brands list
- If uncertain, set brandDetected to false
- Confidence should reflect visual clarity and logo presence`;

    // Call Gemini Vision API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${visionModel}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                ...imageUrls.map(url => ({
                  inline_data: {
                    mime_type: 'image/jpeg',
                    data: url, // Gemini can fetch URLs directly
                  },
                })),
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', response.status, errorText);
      return {
        brandDetected: false,
        brandName: '',
        confidence: 0,
        reasoning: `API error: ${response.status}`,
        objectsDetected: [],
      };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('❌ Invalid JSON response from Gemini');
      return {
        brandDetected: false,
        brandName: '',
        confidence: 0,
        reasoning: 'Invalid response format',
        objectsDetected: [],
      };
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log('✅ Vision analysis complete:', result);

    return {
      brandDetected: result.brandDetected || false,
      brandName: result.brandName || '',
      confidence: (result.confidence || 0) / 100, // Convert to 0-1 scale
      reasoning: result.reasoning || '',
      objectsDetected: result.objectsDetected || [],
    };

  } catch (error) {
    console.error('❌ Error in Gemini vision analysis:', error);
    return {
      brandDetected: false,
      brandName: '',
      confidence: 0,
      reasoning: `Error: ${error.message}`,
      objectsDetected: [],
    };
  }
}

/**
 * Calculate evidence boost from vision analysis
 */
export function calculateVisionBoost(visionResult: VisionAnalysisResult): {
  boost: number;
  details: string;
} {
  let boost = 0;
  const details: string[] = [];

  if (visionResult.brandDetected && visionResult.confidence > 0.5) {
    // Strong visual detection
    if (visionResult.confidence >= 0.8) {
      boost += 0.15; // +15% for high confidence
      details.push('strong visual match');
    } else if (visionResult.confidence >= 0.6) {
      boost += 0.10; // +10% for medium confidence
      details.push('visual match detected');
    } else {
      boost += 0.05; // +5% for weak match
      details.push('possible visual match');
    }

    // Bonus for multiple objects detected
    if (visionResult.objectsDetected.length >= 3) {
      boost += 0.05;
      details.push('multiple elements');
    }
  } else {
    // No brand detected visually
    boost -= 0.05; // -5% penalty
    details.push('no visual confirmation');
  }

  return {
    boost,
    details: details.join(', '),
  };
}

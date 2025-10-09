import { categorizeAnswer } from '../lib/openai';

export interface ModelComparisonResult {
  generic: {
    accuracy: number;
    codes: string[];
    avgConfidence: number;
  };
  custom: {
    accuracy: number;
    codes: string[];
    avgConfidence: number;
  };
  improvement: number; // Percentage improvement
}

export class ModelComparison {
  private customModelId: string | null = null;

  constructor() {
    this.customModelId = localStorage.getItem('customModel');
  }

  /**
   * Compare generic vs custom model on a specific answer
   */
  async compareModels(
    answerText: string,
    answerTranslation: string,
    categoryName: string,
    correctCodes: string[],
    availableCodes: any[]
  ): Promise<ModelComparisonResult> {
    console.log('🔬 Comparing models for answer...');

    try {
      // Get predictions from generic model (GPT-4)
      const genericResult = await categorizeAnswer({
        answer: answerText,
        answerTranslation,
        categoryName,
        template: 'Default categorization',
        codes: availableCodes,
        context: { language: 'unknown', country: 'unknown' }
      });

      // Get predictions from custom model (if available)
      let customResult = genericResult; // Fallback to generic if no custom model

      if (this.customModelId) {
        // Would need to modify categorizeAnswer to accept model parameter
        // For now, use same result as placeholder
        customResult = genericResult;
      }

      // Calculate accuracy for both
      const genericCodes = genericResult.map((r: any) => r.code_name);
      const customCodes = customResult.map((r: any) => r.code_name);

      const genericAccuracy = this.calculateAccuracy(genericCodes, correctCodes);
      const customAccuracy = this.calculateAccuracy(customCodes, correctCodes);

      const genericConfidence = this.calculateAvgConfidence(genericResult);
      const customConfidence = this.calculateAvgConfidence(customResult);

      const improvement = customAccuracy - genericAccuracy;

      console.log(`📊 Generic: ${genericAccuracy}%, Custom: ${customAccuracy}%, Improvement: ${improvement}%`);

      return {
        generic: {
          accuracy: genericAccuracy,
          codes: genericCodes,
          avgConfidence: genericConfidence
        },
        custom: {
          accuracy: customAccuracy,
          codes: customCodes,
          avgConfidence: customConfidence
        },
        improvement
      };
    } catch (error) {
      console.error('❌ Model comparison failed:', error);
      throw error;
    }
  }

  /**
   * Calculate accuracy percentage
   */
  private calculateAccuracy(predicted: string[], actual: string[]): number {
    if (actual.length === 0) return 0;

    const correct = predicted.filter(p => actual.includes(p)).length;
    return (correct / actual.length) * 100;
  }

  /**
   * Calculate average confidence
   */
  private calculateAvgConfidence(results: any[]): number {
    if (results.length === 0) return 0;

    const total = results.reduce((acc, r) => acc + (r.confidence || 0), 0);
    return total / results.length;
  }

  /**
   * Run A/B test on multiple answers
   */
  async runABTest(
    testSet: Array<{
      answerText: string;
      answerTranslation: string;
      categoryName: string;
      correctCodes: string[];
      availableCodes: any[];
    }>
  ): Promise<{
    genericAvgAccuracy: number;
    customAvgAccuracy: number;
    improvement: number;
    results: ModelComparisonResult[];
  }> {
    console.log(`🧪 Running A/B test on ${testSet.length} answers`);

    const results: ModelComparisonResult[] = [];

    for (const test of testSet) {
      const comparison = await this.compareModels(
        test.answerText,
        test.answerTranslation,
        test.categoryName,
        test.correctCodes,
        test.availableCodes
      );
      results.push(comparison);

      // Delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Calculate averages
    const genericAvgAccuracy = results.reduce((acc, r) => acc + r.generic.accuracy, 0) / results.length;
    const customAvgAccuracy = results.reduce((acc, r) => acc + r.custom.accuracy, 0) / results.length;
    const improvement = customAvgAccuracy - genericAvgAccuracy;

    console.log(`📊 A/B Test Results: Generic ${genericAvgAccuracy.toFixed(1)}%, Custom ${customAvgAccuracy.toFixed(1)}%, Improvement ${improvement.toFixed(1)}%`);

    return {
      genericAvgAccuracy,
      customAvgAccuracy,
      improvement,
      results
    };
  }

  /**
   * Get current custom model ID
   */
  getCustomModel(): string | null {
    return this.customModelId;
  }

  /**
   * Set custom model ID
   */
  setCustomModel(modelId: string): void {
    this.customModelId = modelId;
    localStorage.setItem('customModel', modelId);
    console.log(`✅ Custom model set: ${modelId}`);
  }

  /**
   * Clear custom model (revert to generic)
   */
  clearCustomModel(): void {
    this.customModelId = null;
    localStorage.removeItem('customModel');
    console.log('🔄 Reverted to generic model');
  }
}

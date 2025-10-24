import { getSupabaseClient } from './supabase';

const supabase = getSupabaseClient();

export interface TrainingExample {
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

export class TrainingDataExporter {
  /**
   * Export coded answers as training data in OpenAI JSONL format
   */
  async exportTrainingData(
    categoryId?: number,
    _minConfidence: number = 0 // TODO: Apply confidence filtering during export
  ): Promise<{ data: TrainingExample[]; count: number; filename: string }> {
    simpleLogger.info(`📦 Exporting training data for category: ${categoryId || 'all'}`);

    try {
      // Fetch all coded answers with codes
      let query = supabase
        .from('answers')
        .select('id, answer_text, translation_en, selected_code, category_id, categories(name)')
        .not('selected_code', 'is', null)
        .order('coding_date', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: answers, error } = await query.limit(5000);

      if (error) {
        simpleLogger.error('Error fetching answers:', error);
        throw error;
      }

      if (!answers || answers.length === 0) {
        simpleLogger.info('⚠️ No coded answers found');
        return { data: [], count: 0, filename: '' };
      }

      simpleLogger.info(`✅ Found ${answers.length} coded answers`);

      // Convert to OpenAI fine-tuning format
      const trainingData: TrainingExample[] = answers.map(answer => {
        const categoryName = (answer.categories as any)?.name || 'Unknown';
        const answerText = answer.answer_text || '';
        const translation = answer.translation_en || '';
        const code = answer.selected_code || '';

        return {
          messages: [
            {
              role: 'system',
              content: `You are an expert at coding survey responses for the category "${categoryName}". Given a response, identify the most relevant code from the available options.`
            },
            {
              role: 'user',
              content: `Code this response:\n\nOriginal: "${answerText}"\n${translation ? `Translation: "${translation}"\n` : ''}\nCategory: ${categoryName}\n\nWhat is the most appropriate code?`
            },
            {
              role: 'assistant',
              content: JSON.stringify({
                code: code,
                confidence: 'high',
                reasoning: `This response best matches the "${code}" code based on the content and context.`
              })
            }
          ]
        };
      });

      // Validate training data
      const validation = await this.validateTrainingData(trainingData);
      if (!validation.isValid) {
        simpleLogger.error('❌ Validation errors:', validation.errors);
        simpleLogger.error(`Training data invalid: ${validation.errors.join(', ')}`);
        return { data: [], count: 0, filename: '' };
      }

      simpleLogger.info(`✅ Training data validated: ${trainingData.length} examples`);

      // Convert to JSONL
      const jsonl = trainingData
        .map(item => JSON.stringify(item))
        .join('\n');

      // Download file
      const blob = new Blob([jsonl], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `training-data-${timestamp}.jsonl`;
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      simpleLogger.info(`✅ Training data exported: ${filename}`);

      return {
        data: trainingData,
        count: trainingData.length,
        filename
      };
    } catch (error) {
      simpleLogger.error('❌ Export failed:', error);
      throw error;
    }
  }

  /**
   * Validate training data format
   */
  async validateTrainingData(data: TrainingExample[]): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Minimum examples
    if (data.length < 10) {
      errors.push(`Need at least 10 examples. Current: ${data.length}`);
    } else if (data.length < 100) {
      warnings.push(`Recommended at least 100 examples for best results. Current: ${data.length}`);
    }

    // Check format
    data.forEach((item, idx) => {
      if (!item.messages || !Array.isArray(item.messages)) {
        errors.push(`Example ${idx + 1}: Missing messages array`);
        return;
      }

      if (item.messages.length !== 3) {
        errors.push(`Example ${idx + 1}: Should have exactly 3 messages (system, user, assistant). Has: ${item.messages.length}`);
      }

      item.messages.forEach((msg, msgIdx) => {
        if (!msg.role || !msg.content) {
          errors.push(`Example ${idx + 1}, Message ${msgIdx + 1}: Missing role or content`);
        }

        if (!['system', 'user', 'assistant'].includes(msg.role)) {
          errors.push(`Example ${idx + 1}, Message ${msgIdx + 1}: Invalid role "${msg.role}"`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get statistics about training data
   */
  getTrainingDataStats(data: TrainingExample[]) {
    const uniqueCodes = new Set<string>();
    const totalTokens = data.reduce((acc, item) => {
      item.messages.forEach(msg => {
        // Rough estimate: 1 token ≈ 4 characters
        acc += Math.ceil(msg.content.length / 4);

        // Extract code from assistant message
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed.code) {
            uniqueCodes.add(parsed.code);
          }
        } catch (e) {
          // Not JSON, skip
        }
      });
      return acc;
    }, 0);

    return {
      totalExamples: data.length,
      uniqueCodes: uniqueCodes.size,
      estimatedTokens: totalTokens,
      estimatedCost: (totalTokens / 1000) * 0.008, // $0.008 per 1K tokens (training)
      estimatedTime: Math.ceil(data.length / 100) * 10 // ~10 min per 100 examples
    };
  }
}

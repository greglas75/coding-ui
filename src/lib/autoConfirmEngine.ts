import { getSupabaseClient } from './supabase';
import { simpleLogger } from '../utils/logger';

const supabase = getSupabaseClient();

export interface AICodeSuggestion {
  codeId: number;
  codeName: string;
  confidence: number; // 0-100
  reasoning: string;
}

export interface AutoConfirmSettings {
  enabled: boolean;
  highConfidenceThreshold: number; // 90% default
  mediumConfidenceThreshold: number; // 60% default
  autoConfirmHighConfidence: boolean;
  requireReviewMediumConfidence: boolean;
  trackRejections: boolean;
}

export interface AutoConfirmResult {
  autoConfirmed: number[];
  needsReview: number[];
  rejected: number[];
  totalProcessed: number;
}

export class AutoConfirmEngine {
  private settings: AutoConfirmSettings = {
    enabled: true,
    highConfidenceThreshold: 90,
    mediumConfidenceThreshold: 60,
    autoConfirmHighConfidence: true,
    requireReviewMediumConfidence: true,
    trackRejections: true
  };

  constructor() {
    this.loadSettings();
  }

  /**
   * Process AI suggestions with auto-confirm logic
   */
  async processSuggestions(
    answerId: number,
    suggestions: AICodeSuggestion[]
  ): Promise<AutoConfirmResult> {
    const results: AutoConfirmResult = {
      autoConfirmed: [],
      needsReview: [],
      rejected: [],
      totalProcessed: suggestions.length
    };

    if (!this.settings.enabled) {
      // If disabled, all need review
      results.needsReview = suggestions.map(s => s.codeId);
      return results;
    }

    simpleLogger.info(`🤖 Processing ${suggestions.length} AI suggestions for answer ${answerId}`);

    for (const suggestion of suggestions) {
      simpleLogger.info(`📊 Suggestion: ${suggestion.codeName} (${suggestion.confidence}% confidence)`);

      if (suggestion.confidence >= this.settings.highConfidenceThreshold) {
        // High confidence - auto-confirm
        if (this.settings.autoConfirmHighConfidence) {
          await this.confirmCode(answerId, suggestion, 'auto-confirmed');
          results.autoConfirmed.push(suggestion.codeId);
          simpleLogger.info(`✅ Auto-confirmed: ${suggestion.codeName} (${suggestion.confidence}%)`);
        } else {
          results.needsReview.push(suggestion.codeId);
          simpleLogger.info(`👀 High confidence but auto-confirm disabled: ${suggestion.codeName}`);
        }
      } else if (suggestion.confidence >= this.settings.mediumConfidenceThreshold) {
        // Medium confidence - queue for review
        results.needsReview.push(suggestion.codeId);
        simpleLogger.info(`⚠️ Needs review: ${suggestion.codeName} (${suggestion.confidence}%)`);
      } else {
        // Low confidence - reject
        results.rejected.push(suggestion.codeId);
        simpleLogger.info(`❌ Rejected: ${suggestion.codeName} (${suggestion.confidence}%)`);

        // Track rejection for learning
        if (this.settings.trackRejections) {
          await this.trackRejection(answerId, suggestion);
        }
      }
    }

    simpleLogger.info(`📊 Results: ${results.autoConfirmed.length} auto-confirmed, ${results.needsReview.length} need review, ${results.rejected.length} rejected`);
    return results;
  }

  /**
   * Confirm a code for an answer
   */
  private async confirmCode(
    answerId: number,
    suggestion: AICodeSuggestion,
    status: 'auto-confirmed' | 'manual' | 'reviewed' // NOTE: Future - store status in database for audit trail
  ): Promise<void> {
    try {
      // Update answer with selected code
      const { error } = await supabase
        .from('answers')
        .update({
          selected_code: suggestion.codeName,
          general_status: 'whitelist',
          coding_date: new Date().toISOString(),
          confirmed_by: status === 'auto-confirmed' ? 'ai-auto-confirm' : 'manual'
        })
        .eq('id', answerId);

      if (error) {
        simpleLogger.error('Error confirming code:', error);
        throw error;
      }

      simpleLogger.info(`✅ Code confirmed: ${suggestion.codeName} for answer ${answerId}`);
    } catch (error) {
      simpleLogger.error('Failed to confirm code:', error);
      throw error;
    }
  }

  /**
   * Track rejected suggestion for learning
   */
  private async trackRejection(
    _answerId: number,
    suggestion: AICodeSuggestion
  ): Promise<void> {
    try {
      // Store rejection data for analysis
      // This could be used to improve AI in the future
      simpleLogger.info(`📝 Tracking rejection: ${suggestion.codeName} (${suggestion.confidence}%)`);

      // Could store in a rejections table or in answer metadata
      // For now, just log it
    } catch (error) {
      simpleLogger.error('Failed to track rejection:', error);
    }
  }

  /**
   * Update settings
   */
  updateSettings(newSettings: Partial<AutoConfirmSettings>): void {
    this.settings = { ...this.settings, ...newSettings };

    // Persist to localStorage
    localStorage.setItem('autoConfirmSettings', JSON.stringify(this.settings));
    simpleLogger.info('💾 Auto-confirm settings saved:', this.settings);
  }

  /**
   * Load settings from localStorage
   */
  loadSettings(): void {
    const saved = localStorage.getItem('autoConfirmSettings');
    if (saved) {
      try {
        this.settings = JSON.parse(saved);
        simpleLogger.info('✅ Auto-confirm settings loaded:', this.settings);
      } catch (error) {
        simpleLogger.error('Failed to load auto-confirm settings:', error);
      }
    }
  }

  /**
   * Get current settings
   */
  getSettings(): AutoConfirmSettings {
    return { ...this.settings };
  }

  /**
   * Reset to default settings
   */
  resetSettings(): void {
    this.settings = {
      enabled: true,
      highConfidenceThreshold: 90,
      mediumConfidenceThreshold: 60,
      autoConfirmHighConfidence: true,
      requireReviewMediumConfidence: true,
      trackRejections: true
    };
    localStorage.setItem('autoConfirmSettings', JSON.stringify(this.settings));
    simpleLogger.info('🔄 Auto-confirm settings reset to defaults');
  }

  /**
   * Get confidence level category
   */
  getConfidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= this.settings.highConfidenceThreshold) return 'high';
    if (confidence >= this.settings.mediumConfidenceThreshold) return 'medium';
    return 'low';
  }

  /**
   * Get statistics about auto-confirm usage
   */
  async getStats(categoryId?: number): Promise<{
    totalAutoConfirmed: number;
    totalManualReview: number;
    totalRejected: number;
    averageConfidence: number;
  }> {
    let query = supabase
      .from('answers')
      .select('confirmed_by, ai_suggestions')
      .eq('confirmed_by', 'ai-auto-confirm');

    if (categoryId) {
      query = query.eq('category_id', categoryId);
    }

    const { data } = await query;

    const autoConfirmed = data?.length || 0;

    // Calculate average confidence from AI suggestions
    let totalConfidence = 0;
    let count = 0;

    data?.forEach(answer => {
      interface AISuggestionData {
        suggestions?: Array<{ confidence?: number }>;
      }
      const aiSuggestions = answer.ai_suggestions as AISuggestionData | null;
      const suggestions = aiSuggestions?.suggestions || [];
      suggestions.forEach(s => {
        if (s.confidence) {
          totalConfidence += s.confidence;
          count++;
        }
      });
    });

    return {
      totalAutoConfirmed: autoConfirmed,
      totalManualReview: 0, // Would need to track this separately
      totalRejected: 0, // Would need to track this separately
      averageConfidence: count > 0 ? totalConfidence / count : 0
    };
  }
}

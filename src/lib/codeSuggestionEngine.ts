// FILE: src/lib/codeSuggestionEngine.ts
// HYBRID VERSION - Combines similarity + frequency + co-occurrence + keywords

import { getSupabaseClient, supabase } from './supabase';
import { simpleLogger } from '../utils/logger';

const supabaseClient = getSupabaseClient();

export interface CodeSuggestion {
  codeId: number;
  codeName: string;
  confidence: number; // 0-1
  reason: string;
  frequency?: number;
  similarity?: number;
  source: 'similarity' | 'frequency' | 'co-occurrence' | 'keyword' | 'hybrid';
}

interface CodeInfo {
  id: number;
  name: string;
  keywords?: string;
}

interface SimilaritySuggestion {
  codeId: number;
  codeName: string;
  confidence: number;
  avgSimilarity: number;
  timesCoded: number;
  similarAnswers: string[];
}

export class CodeSuggestionEngine {
  private userHistory: Map<number, number> = new Map(); // codeId -> count
  private coOccurrences: Map<number, Map<number, number>> = new Map();
  private allCodes: Map<number, CodeInfo> = new Map();
  private isInitialized: boolean = false;

  /**
   * Initialize the suggestion engine with user's coding history
   */
  async initialize(categoryId?: number): Promise<void> {
    try {
      simpleLogger.info('🔧 Initializing HYBRID code suggestion engine...');

      if (!categoryId || categoryId <= 0) {
        simpleLogger.warn('⚠️ Invalid or missing category ID for code suggestions');
        this.isInitialized = false;
        return;
      }

      // Load all codes for the category
      const { data: codes, error: codesError } = await supabaseClient
        .from('codes')
        .select('id, name')
        .eq('category_id', categoryId);

      if (codesError) {
        simpleLogger.error('Error loading codes:', codesError);
        this.isInitialized = false;
        return;
      }

      if (!codes || codes.length === 0) {
        simpleLogger.warn(`⚠️ No codes found for category ${categoryId}`);
        this.isInitialized = false;
        return;
      }

      codes?.forEach(code => {
        this.allCodes.set(code.id, {
          id: code.id,
          name: code.name,
        });
      });

      // Load user's coding history
      const { data: history, error: historyError } = await supabaseClient
        .from('answers')
        .select('id, selected_code, category_id')
        .eq('category_id', categoryId || 0)
        .not('selected_code', 'is', null)
        .order('coding_date', { ascending: false })
        .limit(1000);

      if (historyError) {
        simpleLogger.error('Error loading history:', historyError);
        return;
      }

      // Build frequency map
      history?.forEach(item => {
        if (item.selected_code) {
          const codeEntry = Array.from(this.allCodes.entries()).find(
            ([_, code]) => code.name === item.selected_code
          );

          if (codeEntry) {
            const codeId = codeEntry[0];
            const count = this.userHistory.get(codeId) || 0;
            this.userHistory.set(codeId, count + 1);
          }
        }
      });

      simpleLogger.info(`✅ Loaded ${this.userHistory.size} codes from history`);

      // Build co-occurrence matrix
      const answerGroups = new Map<string, string[]>();

      history?.forEach(answer => {
        if (answer.selected_code) {
          const key = answer.selected_code.split(' ').slice(0, 3).join(' ').toLowerCase();
          const codes = answerGroups.get(key) || [];
          codes.push(answer.selected_code);
          answerGroups.set(key, codes);
        }
      });

      answerGroups.forEach(codes => {
        for (let i = 0; i < codes.length; i++) {
          for (let j = i + 1; j < codes.length; j++) {
            const code1Entry = Array.from(this.allCodes.entries()).find(
              ([_, code]) => code.name === codes[i]
            );
            const code2Entry = Array.from(this.allCodes.entries()).find(
              ([_, code]) => code.name === codes[j]
            );

            if (code1Entry && code2Entry) {
              const code1Id = code1Entry[0];
              const code2Id = code2Entry[0];

              if (!this.coOccurrences.has(code1Id)) {
                this.coOccurrences.set(code1Id, new Map());
              }
              if (!this.coOccurrences.has(code2Id)) {
                this.coOccurrences.set(code2Id, new Map());
              }

              const map1 = this.coOccurrences.get(code1Id)!;
              const map2 = this.coOccurrences.get(code2Id)!;

              map1.set(code2Id, (map1.get(code2Id) || 0) + 1);
              map2.set(code1Id, (map2.get(code1Id) || 0) + 1);
            }
          }
        }
      });

      simpleLogger.info(`✅ Built co-occurrence matrix with ${this.coOccurrences.size} entries`);
      this.isInitialized = true;

    } catch (error) {
      simpleLogger.error('❌ Error initializing suggestion engine:', error);
    }
  }

  /**
   * NEW: Get similarity-based suggestions from SQL function
   */
  private async getSimilaritySuggestions(
    answerText: string,
    translationEn: string | null,
    categoryId: number | null,
    language: string | null
  ): Promise<SimilaritySuggestion[]> {
    try {
      const { data, error } = await supabase.rpc('get_smart_suggestions', {
        p_answer_text: answerText,
        p_translation: translationEn,
        p_category_id: categoryId,
        p_language: language
      });

      if (error) {
        simpleLogger.error('❌ Error fetching similarity suggestions:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row: any) => ({
        codeId: row.suggestion_code_id,
        codeName: row.suggestion_code_name,
        confidence: row.suggestion_confidence,
        avgSimilarity: row.suggestion_avg_similarity,
        timesCoded: row.suggestion_times_coded,
        similarAnswers: row.suggestion_similar_answers || []
      }));
    } catch (error) {
      simpleLogger.error('❌ Exception in similarity suggestions:', error);
      return [];
    }
  }

  /**
   * HYBRID: Get code suggestions combining ALL signals
   */
  async getSuggestions(
    answerText: string,
    currentCodeId: number | null,
    categoryId: number,
    translationEn?: string | null,
    language?: string | null
  ): Promise<CodeSuggestion[]> {
    if (!this.isInitialized) {
      await this.initialize(categoryId);
    }

    const currentCodeIds: number[] = currentCodeId ? [currentCodeId] : [];
    const allScores = new Map<number, {
      similarity: number;
      frequency: number;
      coOccurrence: number;
      keyword: number;
      similarAnswers?: string[];
    }>();

    try {
      simpleLogger.info('🎯 Generating HYBRID suggestions...');

      // ============================================================
      // 1. SIMILARITY SIGNAL (30% weight) - NEW!
      // ============================================================
      const similaritySuggestions = await this.getSimilaritySuggestions(
        answerText,
        translationEn || null,
        categoryId,
        language || null
      );

      simpleLogger.info(`📊 Similarity: Found ${similaritySuggestions.length} suggestions`);

      similaritySuggestions.forEach(sugg => {
        if (!allScores.has(sugg.codeId)) {
          allScores.set(sugg.codeId, {
            similarity: 0,
            frequency: 0,
            coOccurrence: 0,
            keyword: 0
          });
        }
        const score = allScores.get(sugg.codeId)!;
        score.similarity = sugg.confidence;
        score.similarAnswers = sugg.similarAnswers;
      });

      // ============================================================
      // 2. FREQUENCY SIGNAL (30% weight) - EXISTING
      // ============================================================
      const frequentCodes = Array.from(this.userHistory.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const totalFrequency = Math.max(...Array.from(this.userHistory.values()), 1);

      frequentCodes.forEach(([codeId, count]) => {
        if (!allScores.has(codeId)) {
          allScores.set(codeId, {
            similarity: 0,
            frequency: 0,
            coOccurrence: 0,
            keyword: 0
          });
        }
        const score = allScores.get(codeId)!;
        score.frequency = count / totalFrequency;
      });

      simpleLogger.info(`📊 Frequency: Top ${frequentCodes.length} codes`);

      // ============================================================
      // 3. CO-OCCURRENCE SIGNAL (20% weight) - EXISTING
      // ============================================================
      const coOccurringCodes = new Map<number, number>();
      currentCodeIds.forEach(codeId => {
        const related = this.coOccurrences.get(codeId);
        if (related) {
          related.forEach((count, relatedCodeId) => {
            if (!currentCodeIds.includes(relatedCodeId)) {
              coOccurringCodes.set(
                relatedCodeId,
                (coOccurringCodes.get(relatedCodeId) || 0) + count
              );
            }
          });
        }
      });

      const maxCoOccurrence = Math.max(...Array.from(coOccurringCodes.values()), 1);

      coOccurringCodes.forEach((count, codeId) => {
        if (!allScores.has(codeId)) {
          allScores.set(codeId, {
            similarity: 0,
            frequency: 0,
            coOccurrence: 0,
            keyword: 0
          });
        }
        const score = allScores.get(codeId)!;
        score.coOccurrence = count / maxCoOccurrence;
      });

      simpleLogger.info(`📊 Co-occurrence: Found ${coOccurringCodes.size} related codes`);

      // ============================================================
      // 4. KEYWORD SIGNAL (20% weight) - EXISTING
      // ============================================================
      const words = answerText
        .toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 3);

      const keywordMatches = new Map<number, number>();
      this.allCodes.forEach((code, codeId) => {
        const codeWords = `${code.name} ${code.keywords || ''}`
          .toLowerCase()
          .split(/\W+/);

        let matches = 0;
        words.forEach(word => {
          if (codeWords.some(cw => cw.includes(word) || word.includes(cw))) {
            matches++;
          }
        });

        if (matches > 0) {
          keywordMatches.set(codeId, matches);
        }
      });

      const maxKeywordScore = Math.max(...Array.from(keywordMatches.values()), 1);

      keywordMatches.forEach((matches, codeId) => {
        if (!allScores.has(codeId)) {
          allScores.set(codeId, {
            similarity: 0,
            frequency: 0,
            coOccurrence: 0,
            keyword: 0
          });
        }
        const score = allScores.get(codeId)!;
        score.keyword = matches / maxKeywordScore;
      });

      simpleLogger.info(`📊 Keywords: Found ${keywordMatches.size} matches`);

      // ============================================================
      // 5. COMBINE ALL SIGNALS with WEIGHTS
      // ============================================================
      const suggestions: CodeSuggestion[] = [];

      allScores.forEach((scores, codeId) => {
        if (currentCodeIds.includes(codeId)) return; // Skip already applied

        // Weighted combination
        const confidence =
          scores.similarity * 0.30 +      // 30% similarity
          scores.frequency * 0.30 +       // 30% frequency
          scores.coOccurrence * 0.20 +    // 20% co-occurrence
          scores.keyword * 0.20;          // 20% keywords

        if (confidence > 0.05) { // Minimum threshold
          const code = this.allCodes.get(codeId);
          if (!code) return;

          // Build reason string
          let reason = '';
          if (scores.similarity > 0.5) {
            reason += `Similar to "${scores.similarAnswers?.[0]?.substring(0, 30) || 'previous answers'}...". `;
          }
          if (scores.frequency > 0.3) {
            const count = this.userHistory.get(codeId) || 0;
            reason += `You use this often (${count}×). `;
          }
          if (scores.coOccurrence > 0.3) {
            reason += `Often paired with similar codes. `;
          }
          if (scores.keyword > 0.3) {
            reason += `Matches answer keywords. `;
          }

          suggestions.push({
            codeId,
            codeName: code.name,
            confidence: Math.min(confidence, 1),
            reason: reason.trim() || 'Relevant based on multiple signals',
            frequency: this.userHistory.get(codeId),
            similarity: scores.similarity,
            source: 'hybrid'
          });
        }
      });

      // Sort by confidence and return top 5
      const topSuggestions = suggestions
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      simpleLogger.info(`💡 Generated ${topSuggestions.length} HYBRID suggestions`);
      topSuggestions.forEach(s => {
        simpleLogger.info(`  - ${s.codeName}: ${Math.round(s.confidence * 100)}% (sim:${Math.round((s.similarity || 0) * 100)}% freq:${s.frequency || 0}×)`);
      });

      return topSuggestions;

    } catch (error) {
      simpleLogger.error('❌ Error generating HYBRID suggestions:', error);
      return [];
    }
  }

  /**
   * Learn from user action (update history)
   */
  async learnFromAction(codeId: number): Promise<void> {
    const count = this.userHistory.get(codeId) || 0;
    this.userHistory.set(codeId, count + 1);
    simpleLogger.info(`📚 Learned: Code ${codeId} used ${count + 1} times`);
  }

  /**
   * Get statistics about the suggestion engine
   */
  getStats() {
    return {
      initialized: this.isInitialized,
      totalCodes: this.allCodes.size,
      historySize: this.userHistory.size,
      coOccurrenceSize: this.coOccurrences.size,
      topCodes: Array.from(this.userHistory.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([codeId, count]) => ({
          codeId,
          codeName: this.allCodes.get(codeId)?.name || 'Unknown',
          count
        }))
    };
  }

  /**
   * Reset the engine (clear all data)
   */
  reset(): void {
    this.userHistory.clear();
    this.coOccurrences.clear();
    this.allCodes.clear();
    this.isInitialized = false;
    simpleLogger.info('🔄 Suggestion engine reset');
  }

  /**
   * Static factory method
   */
  static create(): CodeSuggestionEngine {
    return new CodeSuggestionEngine();
  }
}

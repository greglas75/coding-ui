import { getSupabaseClient } from './supabase';
import { simpleLogger } from '../utils/logger';

const supabase = getSupabaseClient();

export interface AnalyticsData {
  codingProgress: {
    date: string;
    count: number;
  }[];
  topCodes: {
    codeId: string;
    codeName: string;
    count: number;
    percentage: number;
  }[];
  aiVsManual: {
    ai: number;
    manual: number;
    aiPercentage: number;
  };
  aiAccuracy: {
    accepted: number;
    rejected: number;
    accuracyRate: number;
  };
  codingSpeed: {
    answersPerHour: number;
    averageTimePerAnswer: number; // seconds
    totalTime: number; // minutes
  };
  categoryDistribution: {
    categoryId: string;
    categoryName: string;
    count: number;
    percentage: number;
  }[];
  summary: {
    totalAnswers: number;
    totalCoded: number;
    totalUncoded: number;
    codingRate: number; // percentage
  };
}

export class AnalyticsEngine {
  async generateAnalytics(
    categoryId?: number,
    dateRange?: { from: Date; to: Date }
  ): Promise<AnalyticsData> {
    const defaultRange = {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
      to: new Date()
    };
    const range = dateRange || defaultRange;

    simpleLogger.info('📊 Generating analytics for date range:', range);

    try {
      // Fetch all coded answers in date range
      let answersQuery = supabase
        .from('answers')
        .select('id, answer_text, selected_code, category_id, coding_date, created_at, categories(name)')
        .not('selected_code', 'is', null)
        .gte('coding_date', range.from.toISOString())
        .lte('coding_date', range.to.toISOString());

      if (categoryId) {
        answersQuery = answersQuery.eq('category_id', categoryId);
      }

      const { data: codedAnswers, error: answersError } = await answersQuery.order('coding_date', { ascending: true });

      if (answersError) {
        simpleLogger.error('Error fetching coded answers:', answersError);
        return this.getEmptyAnalytics();
      }

      if (!codedAnswers || codedAnswers.length === 0) {
        simpleLogger.info('⚠️ No coded answers found in date range');
        return this.getEmptyAnalytics();
      }

      simpleLogger.info(`✅ Found ${codedAnswers.length} coded answers`);

      // 1. Coding Progress Over Time
      const progressByDate = new Map<string, number>();
      codedAnswers.forEach(answer => {
        const date = new Date(answer.coding_date).toISOString().split('T')[0];
        progressByDate.set(date, (progressByDate.get(date) || 0) + 1);
      });

      const codingProgress = Array.from(progressByDate.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // 2. Top Codes
      const codeCount = new Map<string, number>();
      codedAnswers.forEach(answer => {
        if (answer.selected_code) {
          const count = codeCount.get(answer.selected_code) || 0;
          codeCount.set(answer.selected_code, count + 1);
        }
      });

      const totalCodedAnswers = codedAnswers.length;
      const topCodes = Array.from(codeCount.entries())
        .map(([codeName, count]) => ({
          codeId: codeName,
          codeName,
          count,
          percentage: (count / totalCodedAnswers) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // 3. AI vs Manual (based on AI suggestions column)
      const { data: aiSuggestedAnswers } = await supabase
        .from('answers')
        .select('id, ai_suggestions')
        .not('selected_code', 'is', null)
        .gte('coding_date', range.from.toISOString())
        .lte('coding_date', range.to.toISOString());

      const aiCoded = aiSuggestedAnswers?.filter(a =>
        a.ai_suggestions &&
        (a.ai_suggestions as any)?.suggestions?.length > 0
      ).length || 0;
      const manualCoded = (aiSuggestedAnswers?.length || 0) - aiCoded;

      const aiVsManual = {
        ai: aiCoded,
        manual: manualCoded,
        aiPercentage: aiCoded + manualCoded > 0 ? (aiCoded / (aiCoded + manualCoded)) * 100 : 0
      };

      // 4. AI Accuracy (accepted suggestions)
      const { data: aiAnswers } = await supabase
        .from('answers')
        .select('id, ai_suggestions, selected_code')
        .not('ai_suggestions', 'is', null)
        .not('selected_code', 'is', null)
        .gte('coding_date', range.from.toISOString())
        .lte('coding_date', range.to.toISOString());

      let accepted = 0;
      let rejected = 0;

      aiAnswers?.forEach(answer => {
        const suggestions = (answer.ai_suggestions as any)?.suggestions || [];
        const selectedCode = answer.selected_code;

        if (suggestions.some((s: any) => s.code_name === selectedCode)) {
          accepted++;
        } else {
          rejected++;
        }
      });

      const aiAccuracy = {
        accepted,
        rejected,
        accuracyRate: accepted + rejected > 0 ? (accepted / (accepted + rejected)) * 100 : 0
      };

      // 5. Coding Speed (based on time between first and last coded answer)
      if (codedAnswers.length > 1) {
        const firstDate = new Date(codedAnswers[0].coding_date);
        const lastDate = new Date(codedAnswers[codedAnswers.length - 1].coding_date);
        const totalMinutes = (lastDate.getTime() - firstDate.getTime()) / (1000 * 60);

        const codingSpeed = {
          answersPerHour: totalMinutes > 0 ? (codedAnswers.length / (totalMinutes / 60)) : 0,
          averageTimePerAnswer: codedAnswers.length > 0 ? (totalMinutes * 60) / codedAnswers.length : 0,
          totalTime: totalMinutes
        };

        // 6. Category Distribution
        const categoryCount = new Map<number, { name: string; count: number }>();
        codedAnswers.forEach(answer => {
          const catId = answer.category_id;
          const catName = (answer.categories as any)?.name || 'Unknown';
          const existing = categoryCount.get(catId);
          if (existing) {
            existing.count++;
          } else {
            categoryCount.set(catId, { name: catName, count: 1 });
          }
        });

        const categoryDistribution = Array.from(categoryCount.entries())
          .map(([categoryId, data]) => ({
            categoryId: categoryId.toString(),
            categoryName: data.name,
            count: data.count,
            percentage: (data.count / codedAnswers.length) * 100
          }))
          .sort((a, b) => b.count - a.count);

        // 7. Summary
        let totalAnswersQuery = supabase
          .from('answers')
          .select('id', { count: 'exact' });

        if (categoryId) {
          totalAnswersQuery = totalAnswersQuery.eq('category_id', categoryId);
        }

        const { count: totalAnswers } = await totalAnswersQuery;

        const summary = {
          totalAnswers: totalAnswers || 0,
          totalCoded: codedAnswers.length,
          totalUncoded: (totalAnswers || 0) - codedAnswers.length,
          codingRate: totalAnswers ? (codedAnswers.length / totalAnswers) * 100 : 0
        };

        simpleLogger.info('✅ Analytics generated successfully');

        return {
          codingProgress,
          topCodes,
          aiVsManual,
          aiAccuracy,
          codingSpeed,
          categoryDistribution,
          summary
        };
      } else {
        // Not enough data for speed calculation
        return {
          codingProgress,
          topCodes,
          aiVsManual,
          aiAccuracy,
          codingSpeed: {
            answersPerHour: 0,
            averageTimePerAnswer: 0,
            totalTime: 0
          },
          categoryDistribution: [],
          summary: {
            totalAnswers: 0,
            totalCoded: codedAnswers.length,
            totalUncoded: 0,
            codingRate: 0
          }
        };
      }
    } catch (error) {
      simpleLogger.error('❌ Error generating analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  private getEmptyAnalytics(): AnalyticsData {
    return {
      codingProgress: [],
      topCodes: [],
      aiVsManual: { ai: 0, manual: 0, aiPercentage: 0 },
      aiAccuracy: { accepted: 0, rejected: 0, accuracyRate: 0 },
      codingSpeed: { answersPerHour: 0, averageTimePerAnswer: 0, totalTime: 0 },
      categoryDistribution: [],
      summary: { totalAnswers: 0, totalCoded: 0, totalUncoded: 0, codingRate: 0 }
    };
  }

  /**
   * Export analytics as JSON
   */
  exportAsJSON(analytics: AnalyticsData): void {
    const json = JSON.stringify(analytics, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
}

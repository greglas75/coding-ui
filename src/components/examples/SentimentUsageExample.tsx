/**
 * Example: How to use Sentiment Analysis components
 *
 * This file shows how to integrate sentiment into your existing answer displays.
 */

import { SentimentBadge } from '@/components/SentimentBadge';
import { SentimentAnalytics } from '@/components/SentimentAnalytics';
import axios from 'axios';
import { toast } from 'sonner';

// ============================================================================
// EXAMPLE 1: Display sentiment in answer table/grid
// ============================================================================

interface Answer {
  id: number;
  answer_text: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed' | null;
  sentiment_score: number | null;
  sentiment_confidence: number | null;
  sentiment_applicable: boolean;
}

interface Category {
  id: number;
  name: string;
  sentiment_enabled: boolean;
  sentiment_mode: 'smart' | 'always' | 'never';
}

export function AnswerRowExample({ answer, category }: { answer: Answer; category: Category }) {
  return (
    <tr className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
      {/* Answer Text */}
      <td className="px-4 py-3">
        <div className="text-sm text-gray-900 dark:text-gray-100">
          {answer.answer_text}
        </div>
      </td>

      {/* Sentiment Badge */}
      <td className="px-4 py-3">
        <SentimentBadge
          sentiment={answer.sentiment}
          sentimentScore={answer.sentiment_score}
          sentimentApplicable={answer.sentiment_applicable}
          sentimentConfidence={answer.sentiment_confidence}
          categoryEnabled={category.sentiment_enabled}
          showScore={true}
          size="md"
        />
      </td>

      {/* Other columns... */}
    </tr>
  );
}

// ============================================================================
// EXAMPLE 2: Bulk sentiment analysis actions
// ============================================================================

export function SentimentBulkActionsExample({
  selectedAnswerIds,
  categoryId,
  onComplete
}: {
  selectedAnswerIds: number[];
  categoryId: number;
  onComplete: () => void;
}) {
  const analyzeSentiment = async () => {
    if (selectedAnswerIds.length === 0) {
      toast.error('Please select answers first');
      return;
    }

    toast.info(`Analyzing sentiment for ${selectedAnswerIds.length} answers...`);

    try {
      const response = await axios.post('/api/v1/sentiment/batch-analyze', {
        answer_ids: selectedAnswerIds,
        force: false
      });

      toast.success(
        `✅ Analyzed ${response.data.processed} answers\n` +
        `Skipped: ${response.data.skipped} (already analyzed)\n` +
        `Ineligible: ${response.data.ineligible} (sentiment disabled)`
      );

      onComplete();
    } catch (error: any) {
      toast.error(`Failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const markAsFactual = async () => {
    if (selectedAnswerIds.length === 0) {
      toast.error('Please select answers first');
      return;
    }

    try {
      await axios.post('/api/v1/sentiment/mark-not-applicable', {
        answer_ids: selectedAnswerIds
      });

      toast.success(`Marked ${selectedAnswerIds.length} answers as factual (no sentiment)`);
      onComplete();
    } catch (error: any) {
      toast.error(`Failed: ${error.response?.data?.message || error.message}`);
    }
  };

  const recalculateSentiment = async () => {
    if (selectedAnswerIds.length === 0) {
      toast.error('Please select answers first');
      return;
    }

    const confirmed = window.confirm(
      `Recalculate sentiment for ${selectedAnswerIds.length} answers?\n\n` +
      `This will override existing sentiment data and consume AI credits.`
    );

    if (!confirmed) return;

    toast.info('Recalculating...');

    try {
      const response = await axios.post('/api/v1/sentiment/batch-analyze', {
        answer_ids: selectedAnswerIds,
        force: true
      });

      toast.success(`Recalculated ${response.data.processed} answers`);
      onComplete();
    } catch (error: any) {
      toast.error(`Failed: ${error.response?.data?.message || error.message}`);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Analyze Sentiment Button */}
      <button
        onClick={analyzeSentiment}
        disabled={selectedAnswerIds.length === 0}
        className="px-4 py-2 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        😊 Analyze Sentiment
        {selectedAnswerIds.length > 0 && (
          <span className="bg-purple-700 px-2 py-0.5 rounded text-xs">
            {selectedAnswerIds.length}
          </span>
        )}
      </button>

      {/* Mark as Factual */}
      <button
        onClick={markAsFactual}
        disabled={selectedAnswerIds.length === 0}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        📋 Mark as Factual
      </button>

      {/* Recalculate */}
      <button
        onClick={recalculateSentiment}
        disabled={selectedAnswerIds.length === 0}
        className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        🔄 Recalculate
      </button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Sentiment filter dropdown
// ============================================================================

interface SentimentFilters {
  sentiment?: string;
}

export function SentimentFilterExample({
  filters,
  setFilters,
  categoryEnabled
}: {
  filters: SentimentFilters;
  setFilters: (filters: SentimentFilters) => void;
  categoryEnabled: boolean;
}) {
  if (!categoryEnabled) return null;

  return (
    <select
      value={filters.sentiment || 'all'}
      onChange={(e) => setFilters({ ...filters, sentiment: e.target.value })}
      className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm rounded focus:ring-2 focus:ring-purple-500 outline-none"
    >
      <option value="all">All Sentiments</option>
      <option value="positive">😊 Positive</option>
      <option value="neutral">😐 Neutral</option>
      <option value="negative">😞 Negative</option>
      <option value="mixed">🤔 Mixed</option>
      <option value="not_applicable">📋 Factual (No Sentiment)</option>
      <option value="not_calculated">⚪ Not Calculated</option>
    </select>
  );
}

// ============================================================================
// EXAMPLE 4: Analytics dashboard page
// ============================================================================

export function SentimentAnalyticsPageExample({ categoryId }: { categoryId: number }) {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Sentiment Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          View sentiment distribution and statistics for this category
        </p>
      </div>

      <SentimentAnalytics categoryId={categoryId} />
    </div>
  );
}

// ============================================================================
// EXAMPLE 5: Inline sentiment analysis trigger
// ============================================================================

export function InlineSentimentTriggerExample({
  answerId,
  onAnalyzed
}: {
  answerId: number;
  onAnalyzed: () => void;
}) {
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const analyzeSingle = async () => {
    setIsAnalyzing(true);

    try {
      const response = await axios.post(`/api/v1/sentiment/analyze/${answerId}`);

      if (response.data.skipped) {
        toast.info('Already analyzed');
      } else {
        toast.success('Sentiment analyzed!');
      }

      onAnalyzed();
    } catch (error: any) {
      toast.error(`Failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <button
      onClick={analyzeSingle}
      disabled={isAnalyzing}
      className="text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50"
    >
      {isAnalyzing ? '⏳ Analyzing...' : '😊 Analyze'}
    </button>
  );
}

// ============================================================================
// EXAMPLE 6: Sentiment badge in mobile card view
// ============================================================================

export function MobileAnswerCardExample({ answer, category }: { answer: Answer; category: Category }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
      {/* Answer Text */}
      <div className="text-sm text-gray-900 dark:text-gray-100 mb-3">
        {answer.answer_text}
      </div>

      {/* Metadata row with sentiment */}
      <div className="flex items-center gap-2 flex-wrap">
        <SentimentBadge
          sentiment={answer.sentiment}
          sentimentScore={answer.sentiment_score}
          sentimentApplicable={answer.sentiment_applicable}
          sentimentConfidence={answer.sentiment_confidence}
          categoryEnabled={category.sentiment_enabled}
          showScore={false}
          size="sm"
        />
      </div>
    </div>
  );
}

// ============================================================================
// HOW TO INTEGRATE INTO YOUR EXISTING CODE
// ============================================================================

/*

1. ADD TO ANSWER TABLE/GRID:

   import { SentimentBadge } from '@/components/SentimentBadge';

   // In your row rendering:
   <SentimentBadge
     sentiment={answer.sentiment}
     sentimentScore={answer.sentiment_score}
     sentimentApplicable={answer.sentiment_applicable}
     sentimentConfidence={answer.sentiment_confidence}
     categoryEnabled={category.sentiment_enabled}
   />

2. ADD BULK ACTIONS:

   import axios from 'axios';
   import { toast } from 'sonner';

   // Add button in your toolbar:
   <button onClick={async () => {
     const response = await axios.post('/api/v1/sentiment/batch-analyze', {
       answer_ids: selectedIds
     });
     toast.success(`Analyzed ${response.data.processed} answers`);
   }}>
     😊 Analyze Sentiment
   </button>

3. ADD FILTER:

   // Add to filters bar:
   <select onChange={(e) => setFilters({...filters, sentiment: e.target.value})}>
     <option value="all">All Sentiments</option>
     <option value="positive">😊 Positive</option>
     <option value="negative">😞 Negative</option>
     <option value="neutral">😐 Neutral</option>
     <option value="mixed">🤔 Mixed</option>
   </select>

4. ADD ANALYTICS TAB:

   import { SentimentAnalytics } from '@/components/SentimentAnalytics';

   // Add tab in your analytics page:
   <TabPanel value="sentiment">
     <SentimentAnalytics categoryId={category.id} />
   </TabPanel>

*/

export type SentimentType = 'positive' | 'neutral' | 'negative' | 'mixed';

export interface SentimentData {
  sentiment: SentimentType | null;
  sentiment_score: number | null;
  sentiment_confidence: number | null;
  sentiment_applicable: boolean;
  sentiment_reasoning?: string;
}

export interface SentimentStats {
  overall: {
    total_answers: number;
    sentiment_applicable_count: number;
    sentiment_not_applicable_count: number;
    applicable_percentage: number;
    positive: { count: number; percentage: number };
    neutral: { count: number; percentage: number };
    negative: { count: number; percentage: number };
    mixed: { count: number; percentage: number };
    avg_sentiment_score: number;
  };
  by_code: Array<{
    code_id: number;
    code_name: string;
    total_count: number;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
    mixed_count: number;
    positive_pct: number;
    neutral_pct: number;
    negative_pct: number;
    mixed_pct: number;
    avg_score: number;
  }>;
}

export interface CategorySentimentSettings {
  sentiment_enabled: boolean;
  sentiment_mode: 'smart' | 'always' | 'never';
}

export interface SentimentAnalysisResult {
  id: number;
  suggested_codes: string[];
  confidence: number;
  sentiment_applicable: boolean;
  sentiment: SentimentType | null;
  sentiment_score: number | null;
  sentiment_confidence: number | null;
  reasoning: string;
  skipped?: boolean;
  message?: string;
  error?: string;
}

export interface BatchSentimentResult {
  processed: number;
  skipped: number;
  ineligible: number;
  results: Array<{
    id: number;
    sentiment: SentimentType | null;
    sentiment_applicable: boolean;
  }>;
}

export interface CostEstimate {
  cost_without: string;
  cost_with: string;
  difference: string;
  percentage_increase: number;
  notes: string[];
}

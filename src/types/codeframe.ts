/**
 * TypeScript types for AI Codeframe Builder
 */

/**
 * Types of coding analysis available
 */
export type CodingType = 'brand' | 'open-ended' | 'sentiment';

export interface CodeframeGeneration {
  id: string;
  category_id: number;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  progress: number;
  n_clusters: number;
  n_themes: number;
  n_codes: number;
  mece_score: number | null;
  processing_time_ms: number | null;
  created_at: string;
  updated_at: string;
  ai_cost_usd: number | null;
  ai_input_tokens: number | null;
  ai_output_tokens: number | null;
}

export interface HierarchyNode {
  id: string;
  name: string;
  description: string | null;
  level: number; // 0=root, 1=theme, 2=code, 3=subcode
  node_type: 'category' | 'theme' | 'code';
  cluster_size?: number;
  cluster_id?: number;
  confidence?: 'high' | 'medium' | 'low';
  frequency_estimate?: 'high' | 'medium' | 'low';
  code_id?: number | null;
  parent_id?: string | null;
  children?: HierarchyNode[];
  is_edited?: boolean;
  is_auto_generated?: boolean;
  example_texts?: Array<{ id: string; text: string }>;
  display_order?: number;
}

export interface MECEIssue {
  type: 'overlap' | 'gap';
  severity: 'error' | 'warning' | 'info';
  message: string;
  details: {
    code1?: string;
    code2?: string;
    similarity?: number;
    uncovered_count?: number;
    uncovered_proportion?: number;
  };
}

export interface CodeframeConfig {
  coding_type?: CodingType; // Type of coding analysis (brand/open-ended/sentiment)
  category_id: number | null;
  answer_ids?: number[];
  algorithm_config: {
    min_cluster_size: number;
    min_samples: number;
    hierarchy_preference: 'flat' | 'two_level' | 'three_level' | 'adaptive';
  };
  target_language: string;
  existing_codes?: string[];
}

export interface GenerationResponse {
  generation_id: string;
  status: 'processing';
  n_clusters: number;
  n_answers: number;
  estimated_time_seconds: number;
  poll_url: string;
  cost_estimate: {
    n_clusters: number;
    estimated_cost_usd: number;
  };
}

export interface StatusResponse {
  generation_id: string;
  status: 'processing' | 'completed' | 'failed' | 'partial';
  progress: number;
  n_clusters: number;
  n_completed: number;
  n_failed: number;
  processing_time_ms: number | null;
  result?: {
    n_themes: number;
    n_codes: number;
    mece_score: number;
    total_cost_usd: number;
    hierarchy?: HierarchyNode[];
  };
}

export interface HierarchyUpdateAction {
  action: 'rename' | 'merge' | 'move' | 'delete';
  node_id?: string;
  node_ids?: string[];
  new_name?: string;
  new_parent_id?: string | null;
  target_name?: string;
}

export interface ApplyConfig {
  auto_confirm_threshold: number;
  overwrite_existing: boolean;
}

export interface ApplyResponse {
  success: boolean;
  total_answers: number;
  assigned: number;
  pending: number;
}

export interface CategoryInfo {
  id: number;
  name: string;
  description?: string;
  total_answers: number;
  uncategorized_count: number;
}
